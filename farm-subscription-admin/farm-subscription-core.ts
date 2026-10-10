// supabase/functions/farm-subscription-admin/farm-subscription-core.ts
//
// منطق الاشتراكات الصرف (بدون Deno ولا Firebase ولا شبكة) — عشان يتختبر بـ Node
// (tests/farm-subscription-core.test.mjs) وبيتستورد من index.ts في نفس الفولدر.
//
// القواعد:
//  • الباقات والأسعار هنا هي المرجع الوحيد للسيرفر — أي سعر جاي من العميل مش بيتصدّق.
//  • "شهر ميلادي" = بتوقيت القاهرة (Africa/Cairo)، مع تثبيت يوم الاشتراك (anchorDay)
//    عشان التجديدات ما تنزلقش (31 يناير → 28 فبراير → 31 مارس مش 28 مارس).
//  • التجديد بيتراكم: لو الاشتراك لسه شغال، الفترة الجديدة بتبدأ من نهاية الحالية.
//    لو منتهي، بتبدأ من لحظة التفعيل. باقي أيام التجربة المجانية مش بيتضاف.
//  • مفيش أي حاجة بتتمسح من بيانات المزرعة عند الانتهاء — ده مش مسؤولية الملف ده أصلًا.

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

/* ───────────────────────── Date math (Africa/Cairo) ───────────────────────── */

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

/** Local wall-clock time in `tz` → UTC instant (two-pass: handles DST shifts). */
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

/**
 * Adds `months` calendar months in Africa/Cairo local time, keeping the time of day.
 * The day of month is `anchorDay` (default: the base's own day) clamped to the target month's length.
 */
export function addCalendarMonths(ms: number, months: number, anchorDay?: number, tz: string = SUB_TZ): number {
  const p = wallParts(ms, tz);
  const total = (p.month - 1) + months;
  const y = p.year + Math.floor(total / 12);
  const m = (((total % 12) + 12) % 12) + 1;
  const want = anchorDay && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : p.day;
  const d = Math.min(want, daysInMonth(y, m));
  return wallToMs(y, m, d, p.hour, p.minute, p.second, p.ms, tz);
}

/** YYYY-MM-DD in Cairo time (for notifications / audit text). */
export function fmtDateCairo(ms: number): string {
  const p = wallParts(ms, SUB_TZ);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/* ───────────────────────── Approval / rejection planning ───────────────────────── */

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
  paidUntil?: number | null; // epoch ms
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
  duplicateApproved: boolean; // another APPROVED payment already used the same reference
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
