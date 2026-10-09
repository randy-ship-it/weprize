# WePrize — Grok Heavy daily brief (living)

> **Audience:** Randy → paste into Grok Heavy each morning. Edit this file freely; it ships at `https://weprize.net/GROK-DAILY.md` after Publish.  
> **Updated:** 2026-10-09 ~08:40 ET · morning routine · cash-rail healthy · paid_tx=0 · post-OKR Sep 30 closed 0 · WePrize on hold (Randy Oct 2; Stripe nudge fired Oct 7 ~10:43 ET) · global outbound HOLD (Oct 7) · CoS mirror
> **Competition Act HARD:** free contests + optional time/research assist only. Estimates ≠ guarantees. No win/odds promises, no ROI-farming framing, no treatment/cure claims.

---

## 0. Daily ops snapshot — Fri Oct 9 2026 ET

**Cash rail health (live `/api/health` @ ~08:35 ET):** `ok:true` · `stripe:true` · `webhook:true` · `resend:true` · `seed.n=25` (rule `min(25, AUTO_OK Canada / CA_ELIGIBLE_US live count)`). Store: postgres (Neon). No SBG email send in this routine.

**SPA:** live bundle still `index-Bjvcc0Vu.js` (unchanged since Oct 3). Payment Links on pricing remain the primary pack path: Once `eVqcN52d75lE0Yu9hc8AE03`, Triple `14AfZh8Bv29sePkalg8AE04`, Year-round `5kQ7sLdVP15o7mS8d88AE02`. No new checkout smoke this morning.

**Paid tx / fulfill (Stripe API live `acct_1TUZ7lDxmCwsLJND`, CAD, charges_enabled true; America/Toronto windows Fri = 2026-10-09 04:00 UTC → now, Thu = 2026-10-08 04:00 → 2026-10-09 04:00 UTC):**
- Charges: today Fri **0** so far; Thu EOD **0**. PaymentIntents: Fri **0** / Thu **0**. Refunds: **0** / **0**.
- Checkout Sessions: Fri none yet; Thu none.
- Neon not re-pulled (no DB client on the box); Stripe is the source of truth and shows nothing to reconcile. Last Neon read (Oct 5): `paid_orders`=0, `orders`=5 demo-only (`demo_once_*`), `qr_codes`=2, `qr_earnings`=0, consents all-time=2. **Real paid stranger fulfill queue: empty.** No invented buyers.

**Inventory / contest notes (no new Randy mutations since Oct 3):** Jamieson Win $100 (`c-050`) **CLOSED** after Sep 30. Lucas x DUSK + YETI = **NEEDS_YOU**; Shoppers×iHeart SeekYourSounds dead; Tell Rexall Q3 HUMAN_ONLY; Rexall×CeraVe dead; NUXE/Marcelle/Redken not AUTO_OK. Canonical book `/workspace/weprize-sot/src/data/contests.json` (n≈338; AUTO_OK≈181).

**HARD OKR reminder:** ≥100 paid Stripe tx / America/Toronto day by Sep 30 on SBG APIs. **Deadline was Sep 30; closed at 0.** Today is Fri Oct 9 (Thu was the 8th straight day at 0; Fri still 0 so far = **9th straight day at 0**). Still track daily paid_tx toward restarting 100/day. Estimates ≠ guarantees. No win/odds promises.

**Overnight / prior pulse (facts only):** WePrize is **on hold per Randy (Oct 2)**; the Stripe nudge fired Oct 7 ~10:43 ET and no restart call has been logged since (memory + CoS files), so 0 paid is expected and not new breakage. Global outbound HOLD since Oct 7 ~1:45 PM ET. Thu closed paid_tx=0 (morning pull ~9:43 ET also 0). **No Oct 8 afternoon or evening pulse files exist in weprize-100day** (last evening pulse is Oct 7). Meta ads HOLD; Instantly Day2 finished on 3 leads with 0 opens/replies; consents all-time still 2. No new consented leads, orders, or QR earnings.

## 1. One-liner + live URLs

**WePrize** mass-applies **free** Canada-first health & wellness contests for you (optional paid time-assist). Mission color (once, paired with free-contest + estimate-only): turn gambling on its head via free-contest entry leverage. You bring one real identity; you tap codes when brands ask. Estimates are not a guarantee.

| Surface | URL |
|---|---|
| Apex | https://weprize.net |
| Exclusives | https://weprize.net/exclusives |
| Pricing | https://weprize.net/pricing |
| Health API | https://weprize.net/api/health |
| This brief | https://weprize.net/GROK-DAILY.md |
| GitHub `main` | https://github.com/randy-ship-it/weprize |
| Agents sheet | https://weprize.net/llms.txt · founder pointer: `/llms-weprize-founder.txt` |

Cash rail: Stripe **SBG APIs** livemode (`acct_1TUZ7lDxmCwsLJND`, CAD). Do **not** brand “Stripe” in customer UI copy.


---

## 1b. Mission + voice (Randy call, Sep 25 2026 ET)

**Mission vibe (use once as color, always with free-contest + estimate-only):** WePrize is on a mission to turn gambling on its head.

**Smart math / time leverage (Home How it works + Pricing one-liner):**
- You would never fill all these contests yourself. Not worth your time.
- What if it was worth your time, because you can apply to hundreds in the time it takes to apply to one?
- Prefer framing: free-contest entry leverage / time back. Not "gambling tips."

**Estimates honesty:**
- Combined probability math + average payouts averages out somehow over time.
- We do not know what you will get. Estimates only.
- NEVER guarantee wins, odds, or ROI. Paying never buys better odds.

**Win stories:** Want real people winning really big things. Placeholder only until receipts exist. Do not invent winners.

**Competition Act HARD (unchanged):**
- Contests stay free. Fee = time/research assist.
- No guaranteed wins, no better odds for paying, no treatment claims.

**Voice HARD:** ZERO em dashes in customer-facing copy. Periods, commas, new sentences. Des (Grammar Man) test.

**Site surfaces shipped:** Home mission strip + How it works / Pricing time-leverage one-liners. CoS mirror: `/workspace/weprize-100day/MISSION.md`.

---

## 2. HARD OKR

**≥100 paid Stripe transactions / America/Toronto calendar day by Sep 30, 2026** on SBG APIs.

- Count: Once + Triple + Year-round (incl. subscription invoice payments that succeed that day).
- Do **not** count: free tier, abandoned Checkout, failed/blocked, sandbox.
- Scoreboard ritual: `/workspace/weprize-100day/SCOREBOARD.md` · plan: `100DAY-PLAN.md`.
- Window from this morning: **OKR deadline was Sep 30; closed at 0 paid tx that day.** Today (Fri Oct 9) is 9 days after. Track daily paid_tx toward **restarting** 100/day.

Ask Grok Heavy daily: *What ships today that moves paid tx toward restarting 100/day?*

---

## 3. Product truth (Competition Act–safe)

1. Contests on brand sites stay **free**. WePrize fee (if any) = **research + time assist** on eligible AUTO_OK forms — not better odds, not influence over winners.
2. **Estimates** (EV, pot, “you could make $”) = estimates / examples only — **never** a prize or ROI guarantee.
3. Bot stops before CAPTCHA / OTP. Customer verifies. BYO legal identity — we never invent emails/phones as tickets.
4. Never “3 emails = 3× odds,” never fixed “we enter 400,” never ROI-positive gambling framing, never treatment/cure claims for health prizes.
5. Official contest rules always govern. Household / one-per-person rules: refuse a second apply when rules say so.

---

## 4. Guardrails (personal use · anti farming)

| Rule | Meaning |
|---|---|
| **1 personal profile** | One WePrize account / primary identity for **you**. |
| **Friends OK** | You may **apply on behalf of friends** with their **consent** and **their** legal identity details — not fake / provisioned emails. |
| **Max 10 purchases / person** | Soft cap: **≤10 paid purchases per buyer email**. WePrize is **not** a bulk business / ROI-farming tool. |
| No multi-account farming | No spinning identities to game packs or contests. |

UI must say this on Pricing, Onboarding, Legal, Success, Profiles. Server: soft check / TODO on `orders` by email (do not invent new payment infra).

---

## 5. Share growth (peer links · no cash rewards)

- Peer URLs: `https://weprize.net/?ref={code}` (6–8 `[a-z0-9]`).
- Capture inbound `?ref=` first-touch → Payment Link `client_reference_id` when known.
- **No** referral cash, free packs, or contest-breaking rewards for sharing.
- Share copy stays Competition Act–safe (free contests + optional assist; estimates not guarantees).

Code: `src/lib/shareRef.ts`, `src/components/ShareButton.tsx`.

---

## 6. Live gaps / next ship list (updateable)

*Edit this section every day. Strike done items; add blockers.*

### Stripe Payment Link success URLs (HARD — Randy Dashboard)

Set **After payment → redirect** on each Payment Link to these **exact** templates (must include `{CHECKOUT_SESSION_ID}`):

| Pack | success_url |
|---|---|
| Once | `https://weprize.net/success?pack=once&session_id={CHECKOUT_SESSION_ID}` |
| Triple | `https://weprize.net/success?pack=triple&session_id={CHECKOUT_SESSION_ID}` |
| Year-round | `https://weprize.net/success?pack=year_round&session_id={CHECKOUT_SESSION_ID}` |

Cancel: `https://weprize.net/pricing`. Source of truth also in `src/data/stripe.ts` (`STRIPE_SUCCESS_URLS`) and `FULFILLMENT.md`.

Without `session_id`, Success shows **recover-by-email** (`POST /api/orders/recover-by-email`) and buyers need the Resend `/order/{token}` email after webhook fulfill.

### Ship / ops checklist

- [x] Post-pay identity recovery path (Success CTA + recover-by-email + order-ready Resend email).
- [x] Mission messaging from Randy voice (Home strip + HIW/Pricing leverage; GROK-DAILY §1b; MISSION.md).
- [x] Apex `/api/health` Express path live (stripe/webhook/resend true; postgres; seed n=25) — verified 2026-10-05 morning.
- [x] Vercel apex has Stripe + Resend env loaded (late Mon); `POST /api/checkout` returns `cs_live_` (no charge).
- [ ] **Randy:** paste success URL templates into Stripe Dashboard (above).
- [ ] Confirm webhook endpoint `checkout.session.completed` delivers into Neon `orders` / `paid_orders` on a real paid smoke (health `webhook:true` alone ≠ fulfilled row).
- [ ] Soft enforce **≤10 purchases / email** (stub logged; harden when ready).
- [ ] Fulfillment worker + NEEDS_YOU nudges live for **paid** orders (demo assist_jobs do not count).
- [ ] Morning SCOREBOARD: Fri Oct 9 paid tx today-so-far **0** vs 100 (Thu Oct 8 EOD closed **0**; Wed **0**; OKR deadline day Sep 30 closed at 0). 9th straight day at 0 so far. WePrize on hold; Stripe nudge fired Oct 7, awaiting Randy restart call. Restart 100/day.
- [ ] Partner / community sends from `SEND-QUEUE.md` / `COMMUNITY-QUEUE.md` (authorized only).
- [ ] Ads only with Competition Act–safe creative (`ADS-BRIEF.md`) — Meta still HOLD pending Randy greenlight.
- [ ] Acquisition: Instantly Day3 Draft needs real new consents (do not invent); Day2 finished 0 opens.

CoS mirror of this file: `/workspace/weprize-100day/GROK-DAILY.md`.

---

## 7. Partner / market / sell checklist

Daily / weekly:

- [ ] One partner or community post (contest-ops, H&W, NFP) — **no** guaranteed-win claims.
- [ ] One exclusive / Scale story push (`/exclusives`) when inventory is live.
- [ ] Birch Reserve soft inventory only where appropriate (`/advertise`) — display, not PII resale.
- [ ] Peer share CTA on Home + Success (alluring, no cash referral).
- [ ] Verify Payment Links: Once / Triple / Year-round (**sLd**) + success URLs with `session_id={CHECKOUT_SESSION_ID}` (see §6).
- [ ] Cap messaging visible before checkout (1 profile · friends w/ consent · max 10 purchases).

---

## 8. Code pointers (key paths)

| Area | Path |
|---|---|
| SPA entry | `src/App.tsx`, `src/pages/Home.tsx` |
| Pricing / packs | `src/pages/Pricing.tsx`, `src/components/PricingCards.tsx`, `src/data/stripe.ts` |
| Identity / success | `src/pages/Onboarding.tsx`, `src/pages/Success.tsx`, `src/pages/Profiles.tsx` |
| Legal | `src/pages/Legal.tsx` |
| Share | `src/lib/shareRef.ts`, `src/components/ShareButton.tsx` |
| Express + orders | `server/index.js`, `server/pg-store.js`, `server/json-store.js` |
| Agent / LLM | `public/llms.txt`, `public/llms-full.txt`, `public/llms-weprize-founder.txt`, **this file** |
| Deploy | GitHub `main` → Vercel apex https://weprize.net (Replit Autoscale not required for this brief) |

---

## How Randy uses this with Grok Heavy

1. Open https://weprize.net/GROK-DAILY.md (or this repo file / CoS mirror).
2. Paste into Grok Heavy with: *Act as WePrize CoS. Competition Act HARD. Optimize for restarting 100 paid tx/day (Sep 30 OKR closed at 0).*
3. Ask for today’s ship list, copy diffs, partner pitches, or gap triage — not for inventing odds/guarantees.
4. Edit section 6 after each ship; commit when useful.
