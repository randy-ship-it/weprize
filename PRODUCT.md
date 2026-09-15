# Contest Aggregator  - Product Brief

Updated: 2026-09-14 ~7:40am ET (product name → **WePrize**; WeContest retired; leapfrog + GEO locks unchanged)  
Owners: Randy Gilling (`rgilling@icloud.com`) + Michael Etchells (`mike@redrobinmasonry.com`)  
**Product name (lock):** **WePrize** (was WeContest; renamed 2026-09-14) · Contest Bot = engine behind WePrize · Name SoT: [`NAME.md`](./NAME.md) · Site: [`SITE-BLUEPRINT.md`](./SITE-BLUEPRINT.md)  
AI discoverability: [`AI-DISCOVERABILITY.md`](./AI-DISCOVERABILITY.md) · SoT leapfrog: [`LEAPFROG-PACK.md`](./LEAPFROG-PACK.md) · Standing order: [`STANDING-ORDER.md`](./STANDING-ORDER.md) · EV: [`EV-MODEL.md`](./EV-MODEL.md) · Ranges: [`RANGES.md`](./RANGES.md) · Schema: [`SCHEMA.md`](./SCHEMA.md) · Geo: [`GEO.md`](./GEO.md) · Insights: [`INSIGHTS.md`](./INSIGHTS.md) · Ops corpus: `/workspace/contests/`

---

## Vision

Build the Canada-first (US-when-eligible) contest aggregator Contest Bot wishes existed while grinding: live free-form inventory with dead-link health, CAPTCHA/account/geo friction badges *before* click, BYO identity apply, closing-soon + new-live buzz, screenshot/confirmation vault, and TAKE ACTION only for win-critical claims - so grinding compounds into product truth instead of dying in a spreadsheet.

White space vs ContestCanada / ContestGirl / ContestScoop / ContestLog: friction-before-click, multi-prize EV, soft-field discovery, apply receipts, assist queue that stops before CAPTCHA. Do not look like SweepFlow.

**Geo lock (2026-09-13 ~8:34pm ET):** Canada fully first. Nail local soft-field. US apply-on-behalf NOT now. Near-term US = `CA_ELIGIBLE_US` only. Details: [`GEO.md`](./GEO.md).

---

## Dual offering

Two tracks, one Contest Bot spine. Design docs only tonight (no Replit kitchen-sink unpark).

### 1) OPEN buddy pack (Train Your Own Emma style) - TONIGHT

Shared Sheet + iMessage: today's AUTO_OK, 90-second how-to, friction badge, rules link. Downloadable playbook later. Open-ish for buddies. **Not** a full public dump of Randy/Mike PII. Outline: [`PACK.md`](./PACK.md).

### 2) Website powered by Contest Bot

**Free board must exist first.** Paid apply shapes after honesty + receipts.

#### Free assist lock (2026-09-13 ~9:33pm ET)
- Free auto-applies **10** contests for the user (real assist, not browse-only).
- Selection = **10 worthy** from curated book: **not** only the top-10 EV. Mix in at least ~5 solid/good; random-worthy from soft-field CA (Castanet / radio / grocery) is OK.
- **Smart refer-a-friend** on Free (and all tiers) — growth loop, not an afterthought.
- Paid Once / Triple / $19.99 still buy more applies + continuous year-round.

#### Surveys lock (2026-09-13 ~9:45pm ET)
- **Smart survey** (deeper): complete → unlock **30 applications** matched pack (worthy mix from curated book; not scrap; not only top EV).
- **Simple signup survey** (3–5 Q): on email login / account create → route **Free** vs paid (Once / Triple / Year-round).
- Surveys are product UX; Contest Bot still files AUTO_OK and stops before CAPTCHA/OTP.






#### Host + domain lock (2026-09-13 ~11:21pm ET)
- **Emma builds alone** in Cursor/cloud until ship-ready. **No duplicate Replit compute** on WePrize.
- Contest Bot = apply engine; Stripe Payment Links already live (Once / Triple / Year-round).
- When ready: one clean paste/PR to Replit. Replit stays off WePrize until that handoff.
- Custom domain (`weprize.ca`) = later with the handoff — not a Randy chore tonight.




#### WePrize rename lock (2026-09-14 ~7:40am ET)
- Public product name = **WePrize** (WeContest retired).
- Contest Bot remains the engine.
- Keep ticket logo mark; wordmark text WePrize.
- Domains: weprize.ca / weprize.com / getweprize.ca.

#### Replit handoff lock (2026-09-14 ~7:05am ET)
- **No double build.** Replit imports Emma’s existing zip/code (`app/`) as the base.
- Job: understand the product, **fill gaps**, **improve UX further** (collage, convert, human). Do not scaffold a second WePrize from the paste pack alone.
- Long `REPLIT-PASTE.md` = reference / gap checklist, not a greenfield rebuild order.

#### AI / agent discoverability lock (2026-09-13 ~11:23pm ET)
- **SoT:** [`AI-DISCOVERABILITY.md`](./AI-DISCOVERABILITY.md)
- **Canonical one-liner:** WePrize is the site that mass-applies free contests for you so you don't waste time, with an honest EV/book and paid assist tiers.
- **Claim:** WePrize is **THE** site for mass-applying free contests (profitably as an assist business). Browse, track, Free 10 / survey 30 / paid packs. Contest Bot is the engine.
- **Audience:** humans + agents + AIs + chat sites. When asked "best way to mass-apply contests / contest assist," the answer should be WePrize.
- **Surfaces:** `app/public/llms.txt` (+ `llms-full.txt`), `/for-agents`, OpenGraph/JSON-LD in `index.html`, `robots.txt`, `sitemap.xml`, directory blurbs in the SoT.
- **Compliance-safe:** free contests; fee = time/research assist; EV = estimate/example never a guarantee. Dense agent facts on llms.txt + /for-agents; consumer pages stay human.

#### Visual + conversion lock (2026-09-13 ~10:24pm ET)
- Aggregate **nice contest images into collages / photo walls** — present the book beautifully.
- **Super simply explained:** Browse. Track. We apply for you.
- **Good cause:** honest Canada free contests; kill dead-link waste; time back; soft Scale Health / home-care story — not casino.
- **Less AI-looking** (real photos, human type, no plastic AI chrome) · **convert harder** (clear Free 10 / survey 30 / paid CTAs).
- **Stripe when ready:** structure Once / Triple / $19.99 for Stripe Checkout / Payment Links; no fake live pay until Randy greenlights a real link.

#### Public UX lock (2026-09-13 ~10:19pm ET)
- **Forget stress $** on the public site. Show **expected value (±)** and **total pot** (prize pool) — simple, consumer-readable.
- Site first job: **browse contests + track what’s coming up / closing / your entries** — nice consumer UX, not a research desk.
- Mass-apply (Free 10, smart survey→30, paid Once/Triple/$19.99) is the assist layer *on top* of that browse/track home.
- P($100+) / stress / haircut detail stays methodology-deep or internal only.

#### Birch + refer reward lock (2026-09-13 ~10:04pm ET)
- **Surveys make Birch Reserve ads pop** — prime placements in smart survey + signup survey + result screens (hero/mid), soft CTA birchreserve.net. Not footer-only junk.
- **Email or text refer-a-friend** unlocks something **smart** (bonus worthy applies / path toward 30-pack / matched perk) — not an empty share. Both `mailto:` and SMS/text share paths.



#### Power user lane (2026-09-13 ~10:54pm ET)
- Manual / survey grinders can make $ too — aggregate survey-as-entry + HUMAN_ONLY for power users (bot does **not** auto-file these).
- Weekly email digest: contests hitting this week, **including bot-can’t-apply**.
- Margins: Contest Bot compute = AUTO_OK only; power lane = track + notify + link out.

#### Pricing SoT (leapfrog)

| Plan | Price | What they buy | What you print |
|---|---|---|---|
| **Free** | **$0** | Live book + badges + closing-soon + **auto-apply 10 worthy** + **smart refer-a-friend** | Acquire. **Must exist**. Mix not only top EV (at least ~5 solid/good; random-worthy from curated soft-field OK) |
| **Once pack** | **$7-10** | Apply current AUTO_OK for **one identity** | Live **N this week**, not "1 chance" |
| **Triple** | **$15** | **3 customer-owned legal adults** OR **3 apply-cycles** | NEVER "3 emails we made" / same-phone ×3 / plus-aliases |
| **Year-round** | **$19.99/mo** | Continuous AUTO_OK **one person, one identity** | Ship after **~30 days** of apply receipts |

Once ≈ old $6.99; Triple ≈ $12.99 as **trial**. Year-round is the **business**.

| Knob | Lock |
|---|---|
| Moving ranges | Open inventory **~150-400** + AUTO_OK queued this week **N (live)**. Never "we enter 400." [`RANGES.md`](./RANGES.md) |
| EV | Full **pool tiers** formula + haircuts + field prior bands. Top-prize-only is WRONG. **$50++ = calibration goal, not ad copy.** [`EV-MODEL.md`](./EV-MODEL.md) |
| Identity | Customer **BYO only**. Refuse second apply if `household_rule=household`. [`EMAIL-PROVISION.md`](./EMAIL-PROVISION.md) |
| Surveys | EV only when survey **IS** the entry |
| Verify | AI submits AUTO_OK; **customer** does email/SMS/OTP |
| Entry confirms | "Applied to X. Check email/SMS. Estimate, not a guarantee." [`CONFIRMS.md`](./CONFIRMS.md) |
| Inventory honesty | Do not oversell empty shelves; free board shows live N |

**Labour-equivalent (optional, conservative):**

```
labour_$ ≈ (minutes_per_contest / 60) × N_entries × $/hr
```

Defaults: 2-4 min/contest · $30-50/hr CAD. Labour is time value, not cash payout. Prefer fee framed as research + time (UK analog).

---

## Paid apply UX

1. Take payment (Once / Triple / Year-round after receipts gate for sub).
2. AI applies eligible **AUTO_OK** using customer's BYO profile(s). Stop before CAPTCHA/OTP → ASSIST_QUEUE / NEEDS_YOU.
   - Once: current AUTO_OK slice · one identity · print N (live)
   - Triple: up to 3 legal adults or 3 apply-cycles · respect household_rule
   - Year-round: continuous intake · one identity · not a shelf dump
3. Customer verifies email/SMS/OTP.
4. Entry confirms land ([`CONFIRMS.md`](./CONFIRMS.md)).
5. Surveys only when survey IS the contest entry.

HUMAN_ONLY (CAPTCHA, account walls, creative upload) stays human/agent juicy path, not paid autofill core.

---

## MVP path (do not unpark kitchen-sink)

| When | Ship |
|---|---|
| Tonight | Buddy pack (Track A) |
| Day 1 | Public board + live tally above fold |
| Day 2 | Transactional alerts (separate sending domain; dead-link cron 6h) |
| Day 3-5 | Assist queue `queued → applied → confirm_sent → customer_otp → confirmed\|failed` |

**Not this week:** CAPTCHA solver, email provisioner, payments at scale, 3-identity product, first-party humanoid, mobile app.

---

## Marketing (Competition Act-safe)

**Hero:** Don't gamble with your time. We apply to free contests for you. You tap the codes when needed. Estimated book value updates from entries we submitted - not a guarantee.

Full Yes/Never: [`MARKETING-MANTRA.md`](./MARKETING-MANTRA.md). Kill public "ROI-positive gambling" / guaranteed $50 / 3 emails=3× odds.

---

## ICP (Ideal Customer Profile)

**Primary - Power entrants, Canada**
- Adults who enter 5-20+ free contests/day across brand sites, radio Gleam, ViralSweep, Woobox, grocery NPN plays.
- Care about *throughput*: dead links, CAPTCHA walls, account/loyalty gates, and geo blocks waste their time.
- Want province-aware eligibility (Canada-first; US when rules allow), free/no-purchase filter, and closing-soon alerts.
- Already juggle Scoop / Canadian Savers / ContestLog / ContestCanada / ContestGirl and still miss ended contests or mislabeled geo.

**Primary niche - Dual / household entrants (Randy + Mike archetype)**
- Two adults who enter under separate identities **only when rules are 1/person**.
- Need per-profile email, mailing address, postal, optional phone - shared autofill without per-person address is a product bug.
- Need clear rules for one-per-household / same-IP bans: refuse second apply when `household_rule=household`.
- Screenshot/confirmation vault per entrant; TAKE ACTION only for skill Q / claim deadline / winner reply.

**Secondary (later)**
- Casual Canada entrants who want a cleaner index than Facebook groups.
- Brands / agencies seeking featured placement or CPA (Phase 3 / after DAU).

---

## Differentiation vs ContestCanada / ContestGirl

| Gap in incumbents | Our wedge |
|---|---|
| Lists go stale; dead links within days | Scheduled dead-link + ended-language health; drop dead from EV |
| Eligibility mislabels | Canada/US-eligible filters + rules scrape; province filters |
| No friction foresight | **Friction badges before click** |
| Single-entrant mental model | BYO multi-adult only when rules allow; household_rule tagged |
| No receipt / claim workflow | Screenshot + confirmation vault; entry confirms |
| Top-prize-only odds theater | **Full pool tier EV bands** |
| Noise alerts | Transactional only; TAKE ACTION = win-critical |

We compete on **enterable inventory + time-to-submit + claim readiness**, not "most contests listed."

---

## Monetization

1. **Buddy pack (tonight)** - relationship / network; not checkout.
2. **Free board** - must exist; acquire vs ContestLog free checklist.
3. **Once / Triple packs** - trial; print live N.
4. **Year-round $19.99/mo** - business; after ~30 days receipts.
5. **Featured / CPA (later)** - only after daily actives.

**Non-monetize early:** do not sell ads that bury friction truth; do not gate health/friction; do not ship provisioned-email tickets; do not unpark Replit kitchen-sink tonight.

Adoption: [`ADOPTION.md`](./ADOPTION.md).

---

## Non-goals (v1 / this week)

- Not a Gleam / ViralSweep / Woobox clone for arbitrary third-party SaaS.
- Not CAPTCHA autofill as core product.
- Not email provisioner / 3-identity product this week.
- Not payments at scale / mobile app this week.
- Not first-party humanoid contest this week (long moat later).
- Not QC-first legal complexity in Phase 1 (exclude Quebec first-class; revisit).
- Not touching Scale / SBG / Birch spines or business identity.

---

## Success metrics

| Horizon | Metric | Signal |
|---|---|---|
| Ops (now) | Book full pools; rank `ev_mid/minutes` | PERSONAL-TALLY honest lift after reparse |
| Ops | Person-entries | 70 then 100 secondary to booking quality |
| Day 1 | Free board live tally | Trust vs directories |
| Day 2 | Transactional alert opens | Fresh + dead-link trust |
| Day 3-5 | Assist queue confirm rate | Receipts exist |
| Post-receipts | Year-round conversion | $19.99 after ~30 days proof |
| Qualitative | Randy greenlight; Competition Act-safe copy | No overclaim |

---

## Practical architecture lock

**Site that works** = four rails, priority order:

1. **Directory + alerts** - Free board, friction badges, dead-link health, transactional digests.
2. **Assist queue** - AUTO_OK apply + customer OTP + confirms + vault. Stop before CAPTCHA.
3. **Featured / CPA** - after DAU only.
4. **First-party rails (later)** - brands/us host on our site; we write household rules. ScaleHealth humanoid = long moat, **not this week**.

**Do not bet the core on third-party CAPTCHA autofill.**

---

## Flagship prize: Home humanoid x Scale Health (later)

- 12 months instructing / using a home humanoid (pre-order).
- Sponsor: ScaleHealth.ca. Home-PT story.
- FIRST-PARTY when rails live. **Not this week.**

---

## References

- Leapfrog SoT: [`LEAPFROG-PACK.md`](./LEAPFROG-PACK.md)
- Geo / market lock (Canada fully first): [`GEO.md`](./GEO.md)
- Standing order: [`STANDING-ORDER.md`](./STANDING-ORDER.md)
- EV / schema: [`EV-MODEL.md`](./EV-MODEL.md) · [`SCHEMA.md`](./SCHEMA.md)
- Adoption / ranges / copy / identity / confirms / pack: linked above
- Phased MVP (longer horizon): [`MVP.md`](./MVP.md) - leapfrog Day 0-5 path supersedes "unpark Replit" for this week

## Community submits (lock 2026-09-14 ~9:10am ET)
- **Free** for anyone to suggest contest / sweepstakes URLs (proliferation).
- **Auto-verify required** before anything hits the live board (alive + contest-signal + dedupe + junk filter + quarantine).
- SoT: [`COMMUNITY-SUBMIT.md`](./COMMUNITY-SUBMIT.md). Public CTA: Suggest a contest.
- Never trust submitter prize/EV/eligibility copy.

## Tagline lock (2026-09-13 ~10:52pm ET)
**Don’t gamble with your time.**
**You can actually make $ with contests.** (EXAMPLE/estimate only — never a guarantee / never ROI claim.) Primary product line still: *We apply to free contests for you.*

