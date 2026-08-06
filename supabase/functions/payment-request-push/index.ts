// supabase/functions/payment-request-push/index.ts

import { initializeApp, cert, getApps } from "npm:firebase-admin@12/app";
import { initializeFirestore } from "npm:firebase-admin@12/firestore";
import { getMessaging } from "npm:firebase-admin@12/messaging";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function initFirebaseAdmin() {
  if (getApps().length) return;

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT or GCP_SERVICE_ACCOUNT_JSON secret is not set");

  let serviceAccount;
  try {
    serviceAccount = typeof raw === "string" ? JSON.parse(raw.trim()) : raw;
  } catch (_e) {
    throw new Error("Failed to parse Service Account JSON");
  }

  if (serviceAccount.private_key && typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  initializeApp({ credential: cert(serviceAccount) });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    initFirebaseAdmin();

    const body = await req.json().catch(() => ({}));
    const courseLabel = String(body?.courseLabel || "").trim();
    const amount = body?.amount;
    const docId = String(body?.docId || "").trim();

    if (!courseLabel || !docId) {
      return new Response(JSON.stringify({ error: "missing courseLabel or docId" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // استخدام REST API بدل gRPC لمنع مشكلة الاتصال في Edge Functions
    const db = initializeFirestore(getApps()[0], { preferRest: true });
    const snap = await db.collection("admin_config").doc("notifications").get();
    const tokens: string[] = (snap.exists && snap.data()?.tokens) || [];

    if (!tokens.length) {
      return new Response(
        JSON.stringify({ pushSent: 0, errors: ["no admin tokens registered — افتح admin.html ودوس زرار إشعارات الدفع"] }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const amountText = amount ? `${amount} جنيه` : "";
    const messaging = getMessaging();
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: "💳 طلب دفع جديد",
        body: amountText ? `${courseLabel} — ${amountText}` : courseLabel,
      },
      data: {
        type: "payment_request",
        docId,
        courseLabel,
      },
      webpush: {
        fcmOptions: { link: "/admin.html" },
      },
    });

    const errors = res.responses
      .map((r, i) => (r.success ? null : `${tokens[i].slice(0, 12)}…: ${r.error?.message || "unknown"}`))
      .filter(Boolean) as string[];

    const deadTokens = res.responses
      .map((r, i) => (!r.success && (r.error?.code === "messaging/registration-token-not-registered" || r.error?.code === "messaging/invalid-registration-token") ? tokens[i] : null))
      .filter(Boolean) as string[];
    if (deadTokens.length) {
      await db.collection("admin_config").doc("notifications").update({
        tokens: tokens.filter((t) => !deadTokens.includes(t)),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ pushSent: res.successCount, errors }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[payment-request-push]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
