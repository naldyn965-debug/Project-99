// supabase/functions/farm-subscription-admin/index.ts
import { initializeApp, cert, getApps } from "https://esm.sh/firebase-admin@12.2.0/app?target=deno";
import { getAuth } from "https://esm.sh/firebase-admin@12.2.0/auth?target=deno";
import { getFirestore, FieldValue, Timestamp } from "https://esm.sh/firebase-admin@12.2.0/firestore?target=deno";

export const SUB_TZ = "Africa/Cairo";
export const TRIAL_DAYS = 7;

export const PLANS: Record<string, { price: number; months: number; label: string }> = {
  monthly: { price: 149, months: 1, label: "شهري" },
  annual: { price: 999, months: 12, label: "سنوي" },
};

export class SubError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const _dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string): Intl.DateTimeFormat {
  let f = _dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    _dtfCache.set(tz, f);
  }
  return f;
}

export function wallParts(ms: number, tz: string = SUB_TZ) {
  const o: Record<string, number> = {};
  for (const p of dtf(tz).formatToParts(new Date(ms))) {
    if (p.type !== "literal") o[p.type] = parseInt(p.value, 10);
  }
  return {
    year: o.year,
    month: o.month,
    day: o.day,
    hour: o.hour % 24,
    minute: o.minute,
    second: o.second,
    ms: ((ms % 1000) + 1000) % 1000,
  };
}

function tzOffsetMs(ms: number, tz: string): number {
  const p = wallParts(ms, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.ms) - ms;
}

export function wallToMs(
  y: number, mo: number, d: number, h: number, mi: number, s: number, msPart: number, tz: string = SUB_TZ,
): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s, msPart);
  const t1 = guess - tzOffsetMs(guess, tz);
  return guess - tzOffsetMs(t1, tz);
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

export function addCalendarMonths(ms: number, months: number, anchorDay?: number, tz: string = SUB_TZ): number {
  const p = wallParts(ms, tz);
  const total = (p.month - 1) + months;
  const y = p.year + Math.floor(total / 12);
  const m = (((total % 12) + 12) % 12) + 1;
  const want = anchorDay && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : p.day;
  const d = Math.min(want, daysInMonth(y, m));
  return wallToMs(y, m, d, p.hour, p.minute, p.second, p.ms, tz);
}

export function fmtDateCairo(ms: number): string {
  const p = wallParts(ms, SUB_TZ);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export interface PaymentDoc {
  uid?: string;
  plan?: string;
  amount?: number;
  status?: string;
  refKey?: string;
  transactionRef?: string;
  email?: string;
}

export interface SubDoc {
  paidUntil?: number | null;
  plan?: string;
  anchorDay?: number;
}

export interface Admin {
  uid: string;
  email?: string;
}

function cleanNote(n: unknown): string {
  return String(n ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200);
}

export function planApproval(i: {
  paymentId: string;
  payment: PaymentDoc | null;
  sub: SubDoc | null;
  duplicateApproved: boolean;
  nowMs: number;
  admin: Admin;
  note?: string;
}) {
  const { payment, sub, nowMs, admin } = i;
  if (!payment) throw new SubError(404, "payment_not_found", "طلب الدفع غير موجود");
  if (payment.status === "approved") {
    throw new SubError(409, "already_approved", "الطلب ده اتقبل قبل كده — مش هيتفعّل تاني");
  }
  if (payment.status !== "pending" && payment.status !== "rejected") {
    throw new SubError(409, "bad_status", "حالة الطلب غير صالحة للقبول");
  }
  if (typeof payment.uid !== "string" || !payment.uid) {
    throw new SubError(422, "invalid_payment", "الطلب مفيهوش صاحب حساب");
  }
  const plan = PLANS[payment.plan ?? ""];
  if (!plan) throw new SubError(422, "invalid_plan", "الباقة غير معروفة");
  if (payment.amount !== plan.price) {
    throw new SubError(422, "price_mismatch", `المبلغ في الطلب (${payment.amount}) مختلف عن سعر الباقة (${plan.price})`);
  }
  if (i.duplicateApproved) {
    throw new SubError(409, "duplicate_reference", "رقم المرجع ده اتستخدم في طلب تاني اتقبل قبل كده");
  }

  const curEnd = typeof sub?.paidUntil === "number" ? sub.paidUntil : 0;
  const stacking = curEnd > nowMs;
  const base = stacking ? curEnd : nowMs;
  const anchorDay = stacking
    ? (sub?.anchorDay && sub.anchorDay >= 1 && sub.anchorDay <= 31 ? sub.anchorDay : wallParts(curEnd).day)
    : wallParts(nowMs).day;
  const periodEnd = addCalendarMonths(base, plan.months, anchorDay);

  const prevStatus = payment.status;
  return {
    uid: payment.uid,
    periodStart: base,
    periodEnd,
    stacking,
    anchorDay,
    payment: {
      status: "approved",
      approvedAtMs: nowMs,
      approvedBy: admin.uid,
      periodStart: base,
      periodEnd,
      chargedAmount: plan.price,
      overrodeRejection: prevStatus === "rejected",
    },
    sub: {
      uid: payment.uid,
      paidUntil: periodEnd,
      plan: payment.plan as string,
      anchorDay,
      lastPaymentId: i.paymentId,
      updatedAtMs: nowMs,
      updatedBy: admin.uid,
    },
    audit: {
      action: "approve",
      paymentId: i.paymentId,
      uid: payment.uid,
      by: admin.uid,
      byEmail: admin.email ?? null,
      plan: payment.plan as string,
      amount: plan.price,
      prevStatus,
      stacking,
      before: { paidUntil: curEnd || null },
      after: { paidUntil: periodEnd },
      note: cleanNote(i.note),
      atMs: nowMs,
    },
    message: `تم تفعيل اشتراك إدارة المزرعة (${plan.label}) ✅ — صالح حتى ${fmtDateCairo(periodEnd)}`,
  };
}

export function planRejection(i: {
  paymentId: string;
  payment: PaymentDoc | null;
  nowMs: number;
  admin: Admin;
  note?: string;
}) {
  const { payment, nowMs, admin } = i;
  if (!payment) throw new SubError(404, "payment_not_found", "طلب الدفع غير موجود");
  if (payment.status !== "pending") {
    throw new SubError(409, "bad_status", "الرفض متاح للطلبات قيد المراجعة بس");
  }
  if (typeof payment.uid !== "string" || !payment.uid) {
    throw new SubError(422, "invalid_payment", "الطلب مفيهوش صاحب حساب");
  }
  const note = cleanNote(i.note);
  return {
    uid: payment.uid,
    payment: { status: "rejected", rejectedAtMs: nowMs, rejectedBy: admin.uid, rejectionNote: note },
    audit: {
      action: "reject",
      paymentId: i.paymentId,
      uid: payment.uid,
      by: admin.uid,
      byEmail: admin.email ?? null,
      plan: payment.plan ?? null,
      amount: typeof payment.amount === "number" ? payment.amount : null,
      prevStatus: payment.status,
      note,
      atMs: nowMs,
    },
    message: note
      ? `تعذّر تفعيل اشتراك إدارة المزرعة — السبب: ${note}. تقدر تبعت طلب جديد ببيانات صحيحة.`
      : "تعذّر تفعيل اشتراك إدارة المزرعة — راجع بيانات الدفع وابعت طلب جديد.",
  };
}

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

    const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("Authorization") || "");
    if (!m) return json({ error: "unauthenticated", message: "سجّل دخول الأدمن الأول" }, 401);
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(m[1], true);
    } catch (_e) {
      return json({ error: "unauthenticated", message: "جلسة الأدمن منتهية — سجّل دخول تاني" }, 401);
    }

    const db = getFirestore();
    const adminSnap = await db.collection("admins").doc(decoded.uid).get();
    if (!adminSnap.exists) return json({ error: "forbidden", message: "مش أدمن" }, 403);
    const admin = { uid: decoded.uid, email: decoded.email };

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const paymentId = String(body?.paymentId || "");
    if (action !== "approve" && action !== "reject") return json({ error: "bad_action" }, 400);
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(paymentId)) return json({ error: "bad_payment_id" }, 400);

    const payRef = db.collection("farm_subscription_payments").doc(paymentId);
    const nowMs = Date.now();
    const now = Timestamp.fromMillis(nowMs);

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
        const { atMs: _omit, ...auditRest } = plan.audit;
        tx.set(auditRef, { ...auditRest, at: now });
        tx.set(notifRef, {
          scope: "user", userId: plan.uid, type: "farm_subscription", message: plan.message,
          read: false, createdAt: FieldValue.serverTimestamp(), source: "admin",
        });
        return { action, status: "rejected" };
      }

      const subRef = db.collection("farm_subscriptions").doc(payment?.uid || "_");
      const subSnap = payment?.uid ? await tx.get(subRef) : null;
      const sd = subSnap && subSnap.exists ? (subSnap.data() as Record<string, unknown>) : null;

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
