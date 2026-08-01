// ═══════════════════════════════════════════════════════════════════
// Nabtex Academy — immediate broadcast push (companion to
// academy-inactivity-push.ts, same conventions/helpers reused as-is).
// ═══════════════════════════════════════════════════════════════════
//
// Called directly from admin.html right after a broadcast is written to
// Firestore (academy_notifications). That Firestore write already reaches
// any student with a tab open (AcNotif's realtime listener) — this
// function's ONLY job is to also push to closed/backgrounded devices via
// FCM. It never writes academy_notifications itself (admin.html already
// did that) and never touches academy_broadcast_log.
//
// Request body (sent by admin.html):
//   { idToken: string, message: string, courseId: string|null, uids: string[]|null }
//   uids === null  → "all students" audience: push to every fcmToken on
//                     every users/{uid} doc.
//   uids === [...] → course-targeted audience: push only to those uids'
//                     tokens (same list admin.html already fanned the
//                     Firestore docs out to).
//
// Auth model: the caller is an admin's *browser*, not a Supabase-
// authenticated caller, so this deploys with --no-verify-jwt and instead
// verifies the Firebase ID token itself (RS256 against Google's public
// certs for the `securetoken` service account), then confirms that uid
// has an `admins/{uid}` doc — the exact same check firestore.rules'
// isAdmin() uses. Nothing here relaxes or bypasses that rule; it's
// re-implemented here because the service-account credentials used for
// the Firestore/FCM calls below already bypass security rules, so the
// admin check has to happen explicitly in code instead.
//
// Deploy:  supabase functions deploy academy-broadcast-push --no-verify-jwt
// Secrets: none new — reuses GCP_SERVICE_ACCOUNT_JSON + FIREBASE_PROJECT_ID
//          from Part C of ACADEMY NOTIFICATIONS SETUP.md.
// ═══════════════════════════════════════════════════════════════════

import { GoogleAuth } from "npm:google-auth-library@9";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

// ── Config ──────────────────────────────────────────────────────────
const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "nabtex-b8475";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FCM_SEND_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
const USERS_PAGE_SIZE = 300; // Firestore REST listDocuments page size for the "all students" scan

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── Firestore REST value <-> JS helpers (identical to academy-inactivity-push.ts) ──
// deno-lint-ignore no-explicit-any
function fsValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  return { stringValue: String(v) };
}
// deno-lint-ignore no-explicit-any
function fsFields(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) out[k] = fsValue(obj[k]);
  return out;
}
// deno-lint-ignore no-explicit-any
function jsValue(v: any): any {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(jsValue);
  if ("mapValue" in v) return jsDoc(v.mapValue.fields || {});
  return null;
}
// deno-lint-ignore no-explicit-any
function jsDoc(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(fields || {})) out[k] = jsValue(fields[k]);
  return out;
}
function uidFromDocName(name: string): string {
  return name.substring(name.lastIndexOf("/") + 1);
}

// ── Service-account auth (Firestore + FCM) ─────────────────────────────
async function getAccessToken(): Promise<string> {
  const raw = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Missing secret: GCP_SERVICE_ACCOUNT_JSON");
  const credentials = JSON.parse(raw);
  const auth = new GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/datastore",
      "https://www.googleapis.com/auth/firebase.messaging",
    ],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to mint an access token for the service account");
  return token.token;
}

// ── Verify the admin's Firebase ID token (caller identity, not a service account) ──
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);
async function verifyCallerUid(idToken: string): Promise<string> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });
  const uid = (payload.sub || payload.user_id) as string | undefined;
  if (!uid) throw new Error("ID token has no subject/uid");
  return uid;
}
async function isAdminUid(token: string, uid: string): Promise<boolean> {
  const res = await fetch(`${FIRESTORE_BASE}/admins/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok; // 404 => not an admin doc => false
}

// ── Firestore helpers ──────────────────────────────────────────────────
async function getDoc(token: string, path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const doc = await res.json();
  return jsDoc(doc.fields || {});
}
async function patchDoc(token: string, path: string, fields: Record<string, unknown>) {
  const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&");
  const res = await fetch(`${FIRESTORE_BASE}/${path}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: fsFields(fields) }),
  });
  if (!res.ok) throw new Error(`Firestore patch failed (${path}): ${res.status} ${await res.text()}`);
}

// Full users-collection scan for the "all students" audience. Paginated via
// listDocuments (not runQuery) since we just need every doc, no filter.
// Same "not built for huge scale yet" tradeoff noted in academy-inactivity-push.ts.
async function listAllUserDocs(token: string): Promise<Array<{ name: string; fields: Record<string, unknown> }>> {
  const out: Array<{ name: string; fields: Record<string, unknown> }> = [];
  let pageToken = "";
  do {
    const url = `${FIRESTORE_BASE}/users?pageSize=${USERS_PAGE_SIZE}` + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Firestore listDocuments(users) failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    for (const doc of page.documents || []) out.push({ name: doc.name, fields: doc.fields || {} });
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return out;
}

// ── FCM send (identical to academy-inactivity-push.ts) ─────────────────
async function sendPush(token: string, fcmToken: string, title: string, body: string, courseId?: string | null) {
  const res = await fetch(FCM_SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        data: { title, body, courseId: courseId || "" },
        webpush: { headers: { Urgency: "normal" } },
      },
    }),
  });
  if (res.ok) return { ok: true as const };
  const errText = await res.text();
  const invalid = res.status === 404 || /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/i.test(errText);
  return { ok: false as const, invalid, errText };
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const stats = { targeted: 0, pushSent: 0, pushFailed: 0, errors: [] as string[] };
  const fail = (status: number, msg: string) => {
    stats.errors.push(msg);
    return new Response(JSON.stringify(stats), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  };

  let body: { idToken?: string; message?: string; courseId?: string | null; uids?: string[] | null };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid JSON body");
  }
  if (!body.idToken) return fail(401, "Missing idToken");
  if (!body.message) return fail(400, "Missing message");

  let saToken: string;
  try {
    saToken = await getAccessToken();
  } catch (e) {
    return fail(500, `auth setup: ${(e as Error).message}`);
  }

  // Verify caller identity + admin membership before doing anything else.
  try {
    const callerUid = await verifyCallerUid(body.idToken);
    const admin = await isAdminUid(saToken, callerUid);
    if (!admin) return fail(403, "Caller is not an admin");
  } catch (e) {
    return fail(401, `ID token verification failed: ${(e as Error).message}`);
  }

  try {
    // Gather { uid -> tokens[] } for the target audience.
    const tokensByUid: Record<string, string[]> = {};

    if (Array.isArray(body.uids)) {
      // Course-targeted: look up just those uids.
      for (const uid of body.uids) {
        const data = await getDoc(saToken, `users/${encodeURIComponent(uid)}`);
        const tokens: string[] = data && Array.isArray(data.fcmTokens) ? (data.fcmTokens as string[]) : [];
        if (tokens.length) tokensByUid[uid] = tokens;
      }
    } else {
      // All students: scan every users/{uid} doc.
      const docs = await listAllUserDocs(saToken);
      for (const doc of docs) {
        const data = jsDoc(doc.fields);
        const tokens: string[] = Array.isArray(data.fcmTokens) ? (data.fcmTokens as string[]) : [];
        if (tokens.length) tokensByUid[uidFromDocName(doc.name)] = tokens;
      }
    }

    stats.targeted = Object.keys(tokensByUid).length;

    for (const uid of Object.keys(tokensByUid)) {
      const tokens = tokensByUid[uid];
      const deadTokens: string[] = [];
      for (const t of tokens) {
        try {
          const r = await sendPush(saToken, t, "نبتيكس أكاديمي", body.message!, body.courseId ?? null);
          if (r.ok) stats.pushSent++;
          else {
            stats.pushFailed++;
            if (r.invalid) deadTokens.push(t);
            else stats.errors.push(`${uid}: ${r.errText}`);
          }
        } catch (e) {
          stats.pushFailed++;
          stats.errors.push(`${uid}: ${(e as Error).message}`);
        }
      }
      if (deadTokens.length) {
        try {
          await patchDoc(saToken, `users/${uid}`, { fcmTokens: tokens.filter((t) => !deadTokens.includes(t)) });
        } catch (e) {
          stats.errors.push(`${uid} token cleanup: ${(e as Error).message}`);
        }
      }
    }
  } catch (e) {
    stats.errors.push(`fatal: ${(e as Error).message}`);
    return new Response(JSON.stringify(stats), { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  return new Response(JSON.stringify(stats), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
});
