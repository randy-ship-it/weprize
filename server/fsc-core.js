// FunSpamCover metering rules (pure, no I/O). Unit tests: scripts/fsc-core.test.mjs
// All money is USD (Twilio + ElevenLabs bill in USD). Prices are CAD on Stripe; margins below assume
// 1 USD = 1.40 CAD and Stripe 2.9% + C$0.30 per charge.

export const RATES = {
  twilioPerMin: 0.0085, // inbound local, billed per started minute
  aiPerMin: 0.09, // voice AI, per minute of conversation
};

// Worst-case cost of ONE screened call: the voice agent hard-stops at 60s, but the Twilio leg runs ~70s
// (notice + setup) and we bill AI on the full Twilio duration, so budget 2 Twilio min + 1.2 AI min.
export const MAX_SCREENED_CALL_USD = 2 * RATES.twilioPerMin + (70 / 60) * RATES.aiPerMin; // 0.122 = worstCostUsd(60)
// Cost of a short "say a line and hang up" call (no AI): 1 Twilio minute.
export const SHORT_CALL_USD = RATES.twilioPerMin;

// Randy's rule: every tier keeps >= 50% gross margin: (price - Stripe fee - max COGS) / price >= 0.5.
// So capUsd = (price * 0.5 - Stripe fee) / FX. Stripe CA: 2.9% + C$0.30.
export const FX_CAD_PER_USD = 1.4
export const TARGET_GM = 0.5
const capFrom = (priceCad) => Math.floor(((priceCad * (1 - TARGET_GM) - stripeFeeCad(priceCad)) / FX_CAD_PER_USD) * 1000) / 1000
export const PLANS = {
  basic: { name: "Basic", priceCad: 0.99, capUsd: capFrom(0.99) }, // ~0.117
  premium: { name: "Premium", priceCad: 3.99, capUsd: capFrom(3.99) }, // ~1.125
  super: { name: "Super", priceCad: 6.99, capUsd: capFrom(6.99) }, // ~2.132
  smart: { name: "Smart", priceCad: 9.99, capUsd: capFrom(9.99), contacts: true }, // ~3.146; contact-aware message taking
};

// Seconds of AI talk we can afford with `budgetUsd` left (Twilio leg ~= talk + 10s, AI billed on the whole leg).
export const OVERHEAD_SEC = 10, MIN_TALK_SEC = 20, MAX_TALK_SEC = 60
export function worstCostUsd(talkSec) {
  const leg = talkSec + OVERHEAD_SEC
  return Math.ceil(leg / 60) * RATES.twilioPerMin + (leg / 60) * RATES.aiPerMin
}
export function affordableTalkSec(budgetUsd) {
  for (let t = MAX_TALK_SEC; t >= MIN_TALK_SEC; t -= 5) if (worstCostUsd(t) <= budgetUsd) return t
  return 0
}

export const LIMITS = {
  userCallsPerDay: 30, // > this => auto-suspend + flag
  callerCallsPerDay: 30, // same caller number > this => block + flag
  burstWindowSec: 120,
  userBurst: 6, // calls for one user inside the burst window
  callerBurst: 4, // calls from one caller inside the burst window
};

export function stripeFeeCad(priceCad) {
  return Math.ceil((priceCad * 0.029 + 0.3) * 100) / 100;
}

// Worst-case monthly margin per plan in CAD (cap fully used).
export function worstMarginCad(plan, fx = FX_CAD_PER_USD) {
  const p = PLANS[plan];
  return Math.round((p.priceCad - stripeFeeCad(p.priceCad) - p.capUsd * fx) * 100) / 100;
}
export const grossMarginPct = (plan) => Math.round((worstMarginCad(plan) / PLANS[plan].priceCad) * 1000) / 10

export function callCostUsd(durationSec, usedAi) {
  const d = Math.max(0, Number(durationSec) || 0);
  const tw = Math.max(1, Math.ceil(d / 60)) * RATES.twilioPerMin;
  const ai = usedAi ? (d / 60) * RATES.aiPerMin : 0;
  return Math.round((tw + ai) * 100000) / 100000;
}

// Normalise a phone number or SIP Diversion header to +1XXXXXXXXXX (NANP only). Returns "" if not parseable.
export function normPhone(raw) {
  let s = String(raw ?? "").trim();
  const sip = s.match(/sip:([^@;>]+)/i);
  if (sip) s = sip[1];
  const digits = s.replace(/[^0-9]/g, "");
  if (digits.length === 10 && /^[2-9]/.test(digits)) return "+1" + digits;
  if (digits.length === 11 && digits[0] === "1" && /^[2-9]/.test(digits[1])) return "+" + digits;
  return "";
}

export const MSG = {
  off: "Hi! This line's assistant is taking a nap. Bye for now!",
  pool: "Hi! The assistant on this line is all booked up today. Bye for now!",
  global: "Hi! The assistant on this line is all booked up today. Bye for now!",
  blockedCaller: "Thanks for calling. This line can't take more calls from this number today. Goodbye!",
  inactive: "Hi! The person you're calling isn't available. Please try again later. Bye!",
  suspended: "Hi! The person you're calling isn't available. Please try again later. Bye!",
  capped: "Hi! You've reached a voicemail-style message. The person you're calling isn't available right now. Bye!",
};

/**
 * Decide what happens to an incoming forwarded call. Pure function: the caller supplies counters.
 * s = {
 *   off, globalTodayUsd, globalCapUsd, poolTodayUsd, poolCapUsd,
 *   caller: { blocked, today, burst },
 *   user: null | { status, plan, voice, monthUsd, today, burst },
 * }
 * Returns { action: "screen"|"say", reason, text?, voice?, suspendUser?, blockCaller?, upgradePrompt?, reserveUsd }
 */
export function decide(s) {
  const say = (reason, text, extra = {}) => ({ action: "say", reason, text, reserveUsd: SHORT_CALL_USD, ...extra });
  if (s.off) return say("off", MSG.off);
  if (s.caller?.blocked) return say("caller_blocked", MSG.blockedCaller);
  if ((s.caller?.today ?? 0) >= LIMITS.callerCallsPerDay || (s.caller?.burst ?? 0) >= LIMITS.callerBurst)
    return say("caller_abuse", MSG.blockedCaller, { blockCaller: true });
  if ((s.globalTodayUsd ?? 0) + MAX_SCREENED_CALL_USD > s.globalCapUsd) return say("global_cap", MSG.global);

  const u = s.user;
  if (u) {
    if (u.status === "suspended") return say("user_suspended", MSG.suspended);
    if (u.status !== "trialing" && u.status !== "active") return say("user_inactive", MSG.inactive);
    if ((u.today ?? 0) >= LIMITS.userCallsPerDay || (u.burst ?? 0) >= LIMITS.userBurst)
      return say("user_abuse", MSG.suspended, { suspendUser: true });
    const plan = PLANS[u.plan] ?? PLANS.basic;
    const talk = affordableTalkSec(plan.capUsd - (u.monthUsd ?? 0));
    if (!talk)
      return say("user_cap", MSG.capped, { upgradePrompt: u.plan === "smart" ? "smart_cap" : u.plan === "super" ? "to_smart" : u.plan === "premium" ? "to_super" : "to_premium" });
    return { action: "screen", reason: "user", voice: u.voice || "male", maxSec: talk, reserveUsd: worstCostUsd(talk) };
  }
  if ((s.poolTodayUsd ?? 0) + MAX_SCREENED_CALL_USD > s.poolCapUsd) return say("pool_cap", MSG.pool);
  return { action: "screen", reason: "pool", voice: "default", maxSec: MAX_TALK_SEC, reserveUsd: MAX_SCREENED_CALL_USD };
}
