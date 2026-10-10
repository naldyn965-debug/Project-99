// supabase/functions/farm-subscription-admin/index.ts
//
// الجهة الوحيدة الموثوقة اللي بتكتب بيانات الاشتراك الرسمية (تواريخ الانتهاء + حالة الدفع).
// بتتعامل مع Firestore عن طريق REST API (مش gRPC) لأن gRPC بيفصل في Supabase Edge Functions
// (خطأ: 14 UNAVAILABLE: No connection established). التحقق كله هنا:
//   1) Firebase ID Token صالح (مش مسحوب)  2) الـ uid موجود في admins/{uid} (نفس شرط isAdmin() في القواعد)
//   3) الطلب لسه pending (أو rejected للقبول) → مفيش تفعيل مرتين  4) السعر من PLANS مش من العميل
//   5) رقم المرجع مش مستخدم في طلب تاني اتقبل  6) كل الكتابات (الاشتراك + الطلب + الـ audit + الإشعار) في Transaction واحدة.
//
// ── الإعداد (مرة واحدة) ─────────────
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT='<الـ JSON بتاع service account>'
//   # (اختياري) supabase secrets set ALLOWED_ORIGIN='https://<دومين نبتيكس>'
//   supabase functions deploy farm-subscription-admin --no-verify-jwt
//     (--no-verify-jwt لأن التحقق هنا بـ Firebase ID Token مش Supabase JWT)

import { initializeApp, cert, getApps } from "npm:firebase-admin@12/app";
import { getAuth } from "npm:firebase-admin@12/auth";
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

/* ───────────────────────── Service account + Google access token ───────────────────────── */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let saCache: ServiceAccount | null = null;
function loadSA(): ServiceAccount {
  if (!saCache) {
    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is not set");
    saCache = JSON.parse(raw) as ServiceAccount;
  }
  return saCache;
}

function initFirebaseAdmin() {
  if (getApps().length) return;
  initializeApp({ credential: cert(loadSA() as never) });
}

const enc = new TextEncoder();
function b64url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === "string" ? enc.encode(data) : new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let tokenCache: { token: string; exp: number } | null = null;
async function getAccessToken(): Promise<string> {
  const nowS = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp - 60 > nowS) return tokenCache.token;

  const sa = loadSA();
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowS,
    exp: nowS + 3600,
  }));
  const pem = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${head}.${claim}`));
  const assertion = `${head}.${claim}.${b64url(sig)}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!r.ok) throw new Error(`token_exchange_failed ${r.status} ${await r.text()}`);
  const j = await r.json();
  tokenCache = { token: j.access_token as string, exp: nowS + (Number(j.expires_in) || 3600) };
  return tokenCache.token;
}

/* ───────────────────────── Firestore REST helpers ───────────────────────── */

class Ts { constructor(public ms: number) {} }          // Firestore timestamp value
const SERVER_TS = Symbol("serverTimestamp");             // REQUEST_TIME transform

// deno-lint-ignore no-explicit-any
type Any = any;

function toFs(v: unknown): Record<string, unknown> {
  if (v === null) return { nullValue: null };
  if (v instanceof Ts) return { timestampValue: new Date(v.ms).toISOString() };
  switch (typeof v) {
    case "string": return { stringValue: v };
    case "boolean": return { booleanValue: v };
    case "number": return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    case "object": return { mapValue: { fields: toFields(v as Record<string, unknown>) } };
  }
  throw new Error("unsupported_value_type");
}
function toFields(o: Record<string, unknown>): Record<string, unknown> {
  const f: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== SERVER_TS) f[k] = toFs(v);
  return f;
}
function fromFs(v: Any): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return Date.parse(v.timestampValue); // epoch ms
  if ("mapValue" in v) return fromDocFields(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromFs);
  return null;
}
function fromDocFields(fields: Record<string, Any>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) o[k] = fromFs(v);
  return o;
}

const docsRoot = () => `projects/${loadSA().project_id}/databases/(default)/documents`;
const apiBase = () => `https://firestore.googleapis.com/v1/${docsRoot()}`;
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);

async function fsCall(method: string, url: string, body?: unknown) {
  const token = await getAccessToken();
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data: Any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  return { status: r.status, ok: r.ok, data, text };
}

/** Reads one document (optionally inside a transaction). Returns null when it doesn't exist. */
async function getDoc(path: string, tx?: string): Promise<Record<string, unknown> | null> {
  const q = tx ? `?transaction=${encodeURIComponent(tx)}` : "";
  const r = await fsCall("GET", `${apiBase()}/${path}${q}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`firestore_get_failed ${r.status} ${r.text}`);
  return fromDocFields(r.data?.fields || {});
}

/** Builds one commit write. mustExist → update-only; mustNotExist → create-only; merge → patch given fields. */
function setWrite(
  path: string,
  data: Record<string, unknown>,
  opts: { merge?: boolean; mustExist?: boolean; mustNotExist?: boolean } = {},
) {
  const plain = Object.keys(data).filter((k) => data[k] !== undefined && data[k] !== SERVER_TS);
  const serverFields = Object.keys(data).filter((k) => data[k] === SERVER_TS);
  const w: Record<string, unknown> = {
    update: { name: `${docsRoot()}/${path}`, fields: toFields(data) },
  };
  if (opts.merge || opts.mustExist) w.updateMask = { fieldPaths: plain };
  if (opts.mustExist) w.currentDocument = { exists: true };
  if (opts.mustNotExist) w.currentDocument = { exists: false };
  if (serverFields.length) {
    w.updateTransforms = serverFields.map((f) => ({ fieldPath: f, setToServerValue: "REQUEST_TIME" }));
  }
  return w;
}

/** Firestore transaction over REST: begin → reads inside fn → one atomic commit (retries on ABORTED). */
async function runTransaction<T>(
  fn: (tx: string) => Promise<{ writes: unknown[]; result: T }>,
  attempts = 3,
): Promise<T> {
  for (let i = 1; ; i++) {
    const b = await fsCall("POST", `${apiBase()}:beginTransaction`, { options: { readWrite: {} } });
    if (!b.ok) throw new Error(`begin_transaction_failed ${b.status} ${b.text}`);
    const tx = b.data.transaction as string;
    let out;
    try {
      out = await fn(tx);
    } catch (e) {
      await fsCall("POST", `${apiBase()}:rollback`, { transaction: tx }).catch(() => {});
      throw e;
    }
    const c = await fsCall("POST", `${apiBase()}:commit`, { writes: out.writes, transaction: tx });
    if (c.ok) return out.result;
    if (c.status === 409 && i < attempts) continue; // ABORTED (contention) → retry
    throw new Error(`commit_failed ${c.status} ${c.text}`);
  }
}

/* ───────────────────────── Handler ───────────────────────── */

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
    const adminDoc = await getDoc(`admins/${decoded.uid}`);
    if (!adminDoc) return json({ error: "forbidden", message: "مش أدمن" }, 403);
    const admin = { uid: decoded.uid, email: decoded.email };

    // ── 3) Validate input ──
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const paymentId = String(body?.paymentId || "");
    if (action !== "approve" && action !== "reject") return json({ error: "bad_action" }, 400);
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(paymentId)) return json({ error: "bad_payment_id" }, 400);

    const payPath = `farm_subscription_payments/${paymentId}`;
    const nowMs = Date.now(); // server clock — the only time source used for dates
    const now = new Ts(nowMs);

    // ── 4) One transaction: reads first, then every write in a single commit ──
    const result = await runTransaction<Record<string, unknown>>(async (tx) => {
      const pd = await getDoc(payPath, tx);
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

      const auditPath = `farm_subscription_audit/${newId()}`;
      const notifPath = `academy_notifications/${newId()}`;

      if (action === "reject") {
        const plan = planRejection({ paymentId, payment, nowMs, admin, note: body?.note });
        const { atMs: _omit, ...auditRest } = plan.audit;
        return {
          writes: [
            setWrite(payPath, {
              status: plan.payment.status,
              rejectedAt: now,
              rejectedBy: plan.payment.rejectedBy,
              rejectionNote: plan.payment.rejectionNote,
            }, { mustExist: true }),
            setWrite(auditPath, { ...auditRest, at: now }, { mustNotExist: true }),
            setWrite(notifPath, {
              scope: "user", userId: plan.uid, type: "farm_subscription", message: plan.message,
              read: false, createdAt: SERVER_TS, source: "admin",
            }, { mustNotExist: true }),
          ],
          result: { action, status: "rejected" },
        };
      }

      // approve
      const sd = payment?.uid ? await getDoc(`farm_subscriptions/${payment.uid}`, tx) : null;

      // same transaction reference already approved on another payment (any account)?
      let duplicateApproved = false;
      if (payment?.refKey) {
        const q = await fsCall("POST", `${apiBase()}:runQuery`, {
          transaction: tx,
          structuredQuery: {
            from: [{ collectionId: "farm_subscription_payments" }],
            where: {
              compositeFilter: {
                op: "AND",
                filters: [
                  { fieldFilter: { field: { fieldPath: "refKey" }, op: "EQUAL", value: { stringValue: payment.refKey } } },
                  { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "approved" } } },
                ],
              },
            },
          },
        });
        if (!q.ok) throw new Error(`firestore_query_failed ${q.status} ${q.text}`);
        duplicateApproved = (q.data as Any[]).some((row) =>
          row.document && !String(row.document.name).endsWith(`/${paymentId}`)
        );
      }

      const plan = planApproval({
        paymentId,
        payment,
        sub: sd
          ? {
            paidUntil: typeof sd.paidUntil === "number" ? sd.paidUntil : null,
            plan: sd.plan as string,
            anchorDay: sd.anchorDay as number,
          }
          : null,
        duplicateApproved,
        nowMs,
        admin,
        note: body?.note,
      });

      return {
        writes: [
          setWrite(`farm_subscriptions/${plan.sub.uid}`, {
            uid: plan.sub.uid,
            paidUntil: new Ts(plan.sub.paidUntil),
            plan: plan.sub.plan,
            anchorDay: plan.sub.anchorDay,
            lastPaymentId: plan.sub.lastPaymentId,
            updatedAt: now,
            updatedBy: plan.sub.updatedBy,
          }, { merge: true }),
          setWrite(payPath, {
            status: "approved",
            approvedAt: now,
            approvedBy: plan.payment.approvedBy,
            periodStart: new Ts(plan.payment.periodStart),
            periodEnd: new Ts(plan.payment.periodEnd),
            chargedAmount: plan.payment.chargedAmount,
            overrodeRejection: plan.payment.overrodeRejection,
          }, { mustExist: true }),
          setWrite(auditPath, {
            action: plan.audit.action, paymentId: plan.audit.paymentId, uid: plan.audit.uid,
            by: plan.audit.by, byEmail: plan.audit.byEmail, plan: plan.audit.plan, amount: plan.audit.amount,
            prevStatus: plan.audit.prevStatus, stacking: plan.audit.stacking, note: plan.audit.note,
            before: { paidUntil: plan.audit.before.paidUntil ? new Ts(plan.audit.before.paidUntil) : null },
            after: { paidUntil: new Ts(plan.audit.after.paidUntil) },
            at: now,
          }, { mustNotExist: true }),
          setWrite(notifPath, {
            scope: "user", userId: plan.uid, type: "farm_subscription", message: plan.message,
            read: false, createdAt: SERVER_TS, source: "admin",
          }, { mustNotExist: true }),
        ],
        result: { action, status: "approved", periodEnd: plan.periodEnd, stacking: plan.stacking },
      };
    });

    return json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof SubError) return json({ error: e.code, message: e.message }, e.status);
    console.error("[farm-subscription-admin]", e);
    return json({ error: "internal", message: "حصل خطأ في السيرفر — حاول تاني" }, 500);
  }
});
