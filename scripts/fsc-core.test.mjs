// Run: npx tsx scripts/fsc-core.test.ts
import assert from "node:assert";
import { decide, callCostUsd, normPhone, worstMarginCad, grossMarginPct, MAX_SCREENED_CALL_USD, PLANS, worstCostUsd } from "../server/fsc-core.js";
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
  assert.ok(MAX_SCREENED_CALL_USD + 1e-9 >= callCostUsd(70, true), "real 69s call must fit the reserve"); assert.ok(worstCostUsd(60) >= callCostUsd(70, true) - 1e-9);
});
t("every plan keeps >= 50% gross margin with the cap fully used (Randy's rule)", () => {
  for (const p of Object.keys(PLANS)) assert.ok(grossMarginPct(p) >= 50, p + " GM " + grossMarginPct(p));
});
t("active basic user under cap is screened in their voice", () => {
  const d = decide({ ...base, user: user() }); assert.equal(d.action, "screen"); assert.equal(d.voice, "female");
});
t("calls are trimmed so a user's month can never pass their cap", () => {
  for (const plan of Object.keys(PLANS)) {
    let month = 0, screened = 0;
    for (let k = 0; k < 200; k++) {
      const d = decide({ ...base, user: user({ plan, monthUsd: month }) });
      if (d.action !== "screen") { assert.equal(d.reason, "user_cap"); break; }
      assert.ok(d.maxSec >= 20 && d.maxSec <= 60);
      month += d.reserveUsd; screened++;
    }
    assert.ok(month <= PLANS[plan].capUsd + 1e-9, plan + " worst-case COGS " + month);
    console.log(`   ${plan}: cap $${PLANS[plan].capUsd} USD, ${screened} worst-case calls, max COGS $${month.toFixed(3)}, GM ${grossMarginPct(plan)}%`);
  }
  assert.equal(decide({ ...base, user: user({ plan: "basic", monthUsd: 0.07 }) }).upgradePrompt, "to_premium");
  assert.equal(decide({ ...base, user: user({ plan: "premium", monthUsd: 1.1 }) }).upgradePrompt, "to_super");
  assert.equal(decide({ ...base, user: user({ plan: "super", monthUsd: 2.12 }) }).upgradePrompt, "to_smart");
  assert.equal(decide({ ...base, user: user({ plan: "smart", monthUsd: 3.14 }) }).upgradePrompt, "smart_cap");
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
console.log(`PASS ${n} tests`);
