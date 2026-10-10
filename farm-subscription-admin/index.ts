// supabase/functions/farm-subscription-admin/index.ts
//
// الجهة الوحيدة الموثوقة اللي بتكتب بيانات الاشتراك الرسمية (تواريخ الانتهاء + حالة الدفع).
// بتشتغل بـ Firebase Admin SDK، فبتتخطى Firestore Rules — عشان كده كل التحقق هنا:
//   1) Firebase ID Token صالح (مش مسحوب)  2) الـ uid موجود في admins/{uid} (نفس شرط isAdmin() في القواعد)
//   3) الطلب لسه pending (أو rejected للقبول) → مفيش تفعيل مرتين  4) السعر من PLANS مش من العميل
//   5) رقم المرجع مش مستخدم في طلب تاني اتقبل  6) كل الكتابات (الاشتراك + الطلب + الـ audit + الإشعار) في Transaction واحدة.
//
// ── الإعداد (مرة واحدة) — نفس أسلوب payment-request-push ─────────────
//   mkdir -p supabase/functions/farm-subscription-admin
//   cp farm-subscription-admin.ts supabase/functions/farm-subscription-admin/index.ts
//   cp farm-subscription-core.ts  supabase/functions/farm-subscription-admin/farm-subscription-core.ts
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT='<نفس الـ JSON المستخدم في الدوال التانية>'
//   # (اختياري) supabase secrets set ALLOWED_ORIGIN='https://<دومين نبتيكس>'
//   supabase functions deploy farm-subscription-admin --no-verify-jwt
//     (--no-verify-jwt لأن التحقق هنا بـ Firebase ID Token مش Supabase JWT)

import { initializeApp, cert, getApps } from "npm:firebase-admin@12/app";
import { getAuth } from "npm:firebase-admin@12/auth";
import { getFirestore, FieldValue, Timestamp } from "npm:firebase-admin@12/firestore";
import { planApproval, planRejection, SubError } from "./farm-subscription-core.ts";

const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function initFirebaseAdmin() {
  if (getApps().length) return;
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is not set");
  initializeApp({ credential: cert(JSON.parse(raw)) });
}

const toMs = (v: unknown): number | null =>
  v && typeof (v as { toMillis?: unknown }).toMillis === "function" ? (v as Timestamp).toMillis() : null;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    initFirebaseAdmin();

    // ── 1) Authenticate: Firebase ID token (revocation-checked) ──
    const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("Authorization") || "");
    if (!m) return json({ error: "unauthenticated", message: "سجّل دخول الأدمن الأول" }, 401);
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(m[1], true);
    } catch (_e) {
      return json({ error: "unauthenticated", message: "جلسة الأدمن منتهية — سجّل دخول تاني" }, 401);
    }

    // ── 2) Authorize: same rule as firestore.rules isAdmin() → admins/{uid} must exist ──
    const db = getFirestore();
    const adminSnap = await db.collection("admins").doc(decoded.uid).get();
    if (!adminSnap.exists) return json({ error: "forbidden", message: "مش أدمن" }, 403);
    const admin = { uid: decoded.uid, email: decoded.email };

    // ── 3) Validate input ──
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const paymentId = String(body?.paymentId || "");
    if (action !== "approve" && action !== "reject") return json({ error: "bad_action" }, 400);
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(paymentId)) return json({ error: "bad_payment_id" }, 400);

    const payRef = db.collection("farm_subscription_payments").doc(paymentId);
    const nowMs = Date.now(); // server clock — the only time source used for dates
    const now = Timestamp.fromMillis(nowMs);

    // ── 4) One transaction: reads first, then every write ──
    const result = await db.runTransaction(async (tx) => {
      const paySnap = await tx.get(payRef);
      const pd = paySnap.exists ? (paySnap.data() as Record<string, unknown>) : null;
      const payment = pd
        ? {
          uid: pd.uid as string | undefined,
          plan: pd.plan as string | undefined,
          amount: pd.amount as number | undefined,
          status: pd.status as string | undefined,
          refKey: pd.refKey as string | undefined,
          email: pd.email as string | undefined,
        }
        : null;

      const auditRef = db.collection("farm_subscription_audit").doc();
      const notifRef = db.collection("academy_notifications").doc();

      if (action === "reject") {
        const plan = planRejection({ paymentId, payment, nowMs, admin, note: body?.note });
        tx.update(payRef, {
          status: plan.payment.status,
          rejectedAt: now,
          rejectedBy: plan.payment.rejectedBy,
          rejectionNote: plan.payment.rejectionNote,
        });
        const { atMs: _omit, ...auditRest } = plan.audit; // Firestore rejects `undefined`, so drop atMs explicitly
        tx.set(auditRef, { ...auditRest, at: now });
        tx.set(notifRef, {
          scope: "user", userId: plan.uid, type: "farm_subscription", message: plan.message,
          read: false, createdAt: FieldValue.serverTimestamp(), source: "admin",
        });
        return { action, status: "rejected" };
      }

      // approve
      const subRef = db.collection("farm_subscriptions").doc(payment?.uid || "_");
      const subSnap = payment?.uid ? await tx.get(subRef) : null;
      const sd = subSnap && subSnap.exists ? (subSnap.data() as Record<string, unknown>) : null;

      // same transaction reference already approved on another payment (any account)?
      let duplicateApproved = false;
      if (payment?.refKey) {
        const dup = await tx.get(
          db.collection("farm_subscription_payments")
            .where("refKey", "==", payment.refKey)
            .where("status", "==", "approved"),
        );
        duplicateApproved = dup.docs.some((d) => d.id !== paymentId);
      }

      const plan = planApproval({
        paymentId,
        payment,
        sub: sd ? { paidUntil: toMs(sd.paidUntil), plan: sd.plan as string, anchorDay: sd.anchorDay as number } : null,
        duplicateApproved,
        nowMs,
        admin,
        note: body?.note,
      });

      tx.set(subRef, {
        uid: plan.sub.uid,
        paidUntil: Timestamp.fromMillis(plan.sub.paidUntil),
        plan: plan.sub.plan,
        anchorDay: plan.sub.anchorDay,
        lastPaymentId: plan.sub.lastPaymentId,
        updatedAt: now,
        updatedBy: plan.sub.updatedBy,
      }, { merge: true });

      tx.update(payRef, {
        status: "approved",
        approvedAt: now,
        approvedBy: plan.payment.approvedBy,
        periodStart: Timestamp.fromMillis(plan.payment.periodStart),
        periodEnd: Timestamp.fromMillis(plan.payment.periodEnd),
        chargedAmount: plan.payment.chargedAmount,
        overrodeRejection: plan.payment.overrodeRejection,
      });

      tx.set(auditRef, {
        action: plan.audit.action, paymentId: plan.audit.paymentId, uid: plan.audit.uid,
        by: plan.audit.by, byEmail: plan.audit.byEmail, plan: plan.audit.plan, amount: plan.audit.amount,
        prevStatus: plan.audit.prevStatus, stacking: plan.audit.stacking, note: plan.audit.note,
        before: { paidUntil: plan.audit.before.paidUntil ? Timestamp.fromMillis(plan.audit.before.paidUntil) : null },
        after: { paidUntil: Timestamp.fromMillis(plan.audit.after.paidUntil) },
        at: now,
      });

      tx.set(notifRef, {
        scope: "user", userId: plan.uid, type: "farm_subscription", message: plan.message,
        read: false, createdAt: FieldValue.serverTimestamp(), source: "admin",
      });

      return { action, status: "approved", periodEnd: plan.periodEnd, stacking: plan.stacking };
    });

    return json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof SubError) return json({ error: e.code, message: e.message }, e.status);
    console.error("[farm-subscription-admin]", e);
    return json({ error: "internal", message: "حصل خطأ في السيرفر — حاول تاني" }, 500);
  }
});
