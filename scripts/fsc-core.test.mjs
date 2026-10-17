// Run: npx tsx scripts/fsc-core.test.ts
import assert from "node:assert";
import { decide, callCostUsd, normPhone, worstMarginCad, MAX_SCREENED_CALL_USD, PLANS } from "../server/fsc-core.js";
const base = { off: false, globalTodayUsd: 0, globalCapUsd: 3, poolTodayUsd: 0, poolCapUsd: 1, caller: { blocked: false, today: 0, burst: 0 }, user: null };
const user = (o = {}) => ({ status: "active", plan: "basic", voice: "female", monthUsd: 0, today: 0, burst: 0, ...o });
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

t("normPhone handles E.164, 10-digit, SIP Diversion", () => {
  assert.equal(normPhone("+14165551234"), "+14165551234");
  assert.equal(normPhone("(416) 555-1234"), "+14165551234");
  assert.equal(normPhone("<sip:+14165551234@carrier.example;user=phone>;reason=no-answer"), "+14165551234");
  assert.equal(normPhone("anonymous"), "");
});
t("call cost: Twilio per started minute + AI per minute", () => {
  assert.equal(callCostUsd(34, true), 0.0085 + 0.051);
  assert.equal(callCostUsd(5, false), 0.0085);
  assert.ok(MAX_SCREENED_CALL_USD >= callCostUsd(70, true), "real call 69s cost must fit the reserve");
});
t("every plan keeps a positive worst-case margin after Stripe fees", () => {
  for (const p of Object.keys(PLANS)) assert.ok(worstMarginCad(p) > 0, p + " margin " + worstMarginCad(p));
});
t("active basic user under cap is screened in their voice", () => {
  const d = decide({ ...base, user: user() }); assert.equal(d.action, "screen"); assert.equal(d.voice, "female");
});
t("basic user is cut over BEFORE COGS can pass $0.25 and gets the $3.99 prompt", () => {
  let month = 0, screened = 0;
  for (let i = 0; i < 50; i++) {
    const d = decide({ ...base, user: user({ monthUsd: month }) });
    if (d.action !== "screen") { assert.equal(d.reason, "user_cap"); assert.equal(d.upgradePrompt, "to_premium"); break; }
    month += MAX_SCREENED_CALL_USD; screened++;
  }
  assert.ok(month <= PLANS.basic.capUsd, "worst-case COGS " + month);
  console.log("   basic: " + screened + " worst-case calls before cutoff, max COGS $" + month.toFixed(3));
});
t("premium caps at $1.50 (prompt Super), super caps at $3.00", () => {
  assert.equal(decide({ ...base, user: user({ plan: "premium", monthUsd: 1.45 }) }).upgradePrompt, "to_super");
  assert.equal(decide({ ...base, user: user({ plan: "premium", monthUsd: 1.35 }) }).action, "screen");
  assert.equal(decide({ ...base, user: user({ plan: "super", monthUsd: 2.95 }) }).upgradePrompt, "super_cap");
  assert.equal(decide({ ...base, user: user({ plan: "super", monthUsd: 2.85 }) }).action, "screen");
});
t("trial users are screened; canceled/past_due/pending are not", () => {
  assert.equal(decide({ ...base, user: user({ status: "trialing" }) }).action, "screen");
  for (const s of ["canceled", "past_due", "pending", "unpaid"]) assert.equal(decide({ ...base, user: user({ status: s }) }).reason, "user_inactive");
});
t("abuse: >30 calls/day or burst suspends the user", () => {
  const d = decide({ ...base, user: user({ today: 30 }) }); assert.equal(d.suspendUser, true); assert.equal(d.action, "say");
  assert.equal(decide({ ...base, user: user({ burst: 6 }) }).suspendUser, true);
  assert.equal(decide({ ...base, user: user({ status: "suspended" }) }).reason, "user_suspended");
});
t("abuse: a single caller with 30/day or a burst is blocked", () => {
  assert.equal(decide({ ...base, caller: { blocked: false, today: 30, burst: 0 } }).blockCaller, true);
  assert.equal(decide({ ...base, caller: { blocked: false, today: 2, burst: 4 } }).blockCaller, true);
  assert.equal(decide({ ...base, caller: { blocked: true, today: 0, burst: 0 } }).reason, "caller_blocked");
});
t("unmatched calls use the shared pool with a hard daily cap", () => {
  assert.equal(decide(base).reason, "pool");
  assert.equal(decide({ ...base, poolTodayUsd: 0.9 }).reason, "pool_cap");
});
t("global daily cap beats everything, kill switch beats all", () => {
  assert.equal(decide({ ...base, globalTodayUsd: 2.9, user: user() }).reason, "global_cap");
  assert.equal(decide({ ...base, off: true }).reason, "off");
});
console.log(`PASS ${n} tests; margins CAD: basic ${worstMarginCad("basic")}, premium ${worstMarginCad("premium")}, super ${worstMarginCad("super")}`);
