# Replit Bot Brief - WePrize

Updated: 2026-09-13 ~9:23pm ET  
Audience: Replit Agent / Bot coached by Emma  
Humans: Randy Gilling (greenlight), Emma (coach)  
**Product name (lock):** **WePrize**  
**Engine:** Contest Bot is the engine behind WePrize.  
**Voice:** Cute confident (WeFlush-adjacent, no bathroom).  
**Tagline:** Free contests. Badges before you click. We file the easy ones.  
**Domains (Randy picks DNS later - do NOT attach until yes):** weprize.ca · weprize.com · getweprize.ca

## Start here (paste pack)

**Primary build instructions:** paste / follow [`REPLIT-PASTE.md`](./REPLIT-PASTE.md) end-to-end.  
That file is the **ONE self-contained** Replit Agent paste (stack, pages, components, seed shape, Birch slots, Do/Don't, success checklist).

Also read:
- [`SITE-BLUEPRINT.md`](./SITE-BLUEPRINT.md) - IA + visual system + Birch inventory map
- [`NAME.md`](./NAME.md) - WePrize lock; EnterBook = primary runner-up
- [`LEAPFROG-PACK.md`](./LEAPFROG-PACK.md) · [`PRODUCT.md`](./PRODUCT.md) · [`MARKETING-MANTRA.md`](./MARKETING-MANTRA.md)
- [`SCHEMA.md`](./SCHEMA.md) · [`EV-MODEL.md`](./EV-MODEL.md) · [`GEO.md`](./GEO.md) · [`ADOPTION.md`](./ADOPTION.md)
- [`PERSONAL-TALLY.md`](./PERSONAL-TALLY.md) - EXAMPLE tally numbers (~$198 EV mid, 123 PE / 77 unique)

---

## Draft-only until Randy greenlights

- Build **draft / preview only**. Do **not** publish, custom-domain, or announce publicly without explicit **Emma + Randy** approval.
- Prefer private Replit project or password-gated preview.
- If unsure whether something is "publish," ask Emma - default to draft.
- Randy greenlit **build-toward** on 2026-09-13 (see Build lock in `INSIGHTS.md`); that is **not** a publish greenlight and **not** a custom-domain greenlight.

---

## Positioning (hard)

Canada-first contest board + assist. **NOT** another ContestCanada clone.  
White space = friction badges, full-pool ESTIMATED EV book, apply receipts, soft-field discovery.  
**Do not look like SweepFlow.**

Geo: Canada fully first. Soft-field first. US apply-on-behalf **NOT now**. Near-term US = `CA_ELIGIBLE_US` only ([`GEO.md`](./GEO.md)).

---

## Birch Reserve display inventory

WePrize is **Birch Reserve display inventory**. Birch sells private ads on WePrize (high-intent contester traffic).

| Slot | Where |
|---|---|
| `home_hero_strip` | Home hero |
| `feed_right_rail` | Contests feed desktop rail |
| `feed_between_cards` | Feed mobile / between cards |
| `detail_mid` | Contest detail mid |
| `pricing_footer` | Assist/pricing page footer |

Copy: **"Advertise here"** · soft link https://birchreserve.net  
Design: tasteful branded placements (not junk banner hell). Never hide friction badges for ads. Never sell user PII.  
Do **not** couple to Birch code/DNS/mail spines - soft link only.

---

## Stack (lock for this build)

**Vite + React + TypeScript + Tailwind** (see REPLIT-PASTE).

Also fine later:
- SQLite / Replit DB for listings + health + waitlist
- Scheduled dead-link checks (Phase / Day 2)

Avoid for v1:
- Microservices, heavy auth, Gleam-like contest hosting engines
- CAPTCHA solvers, email provisioners
- Anything that ingests Scale / SBG / Birch credentials or mail

---

## Pages (minimum = REPLIT-PASTE set)

1. **Home** - hero + **live tally above fold** (EXAMPLE from PERSONAL-TALLY: ~$198 EV mid, 123 PE / 77 unique - label ESTIMATE) + Birch hero strip
2. **Contests feed** - cards, friction badges before click, filters, Birch rail / between cards
3. **Contest detail** - badges, EV band, rules, enter CTA, Birch mid
4. **How it works** - BYO identity, assist queue stops before CAPTCHA
5. **Pricing / Assist** - Free $0 · Once $7-10 · Triple $15 · Year-round $19.99/mo + Birch footer
6. **Waitlist** - email only; store only; no ESP until greenlight
7. **Methodology** - publish EV formula class (required if showing $ EV)
8. **Advertise** - Birch Reserve CTA
9. Legal stubs - ESTIMATE / not a guarantee

---

## Pricing SoT (print exactly)

| Plan | Price | Print |
|---|---|---|
| Free board | $0 | Live book + friction badges + closing-soon (**must exist**) |
| Once | $7-10 | Live **N this week** AUTO_OK for one identity (not "1 chance") |
| Triple | $15 | 3 customer-owned legal adults OR 3 apply-cycles (NEVER provisioned emails) |
| Year-round | $19.99/mo | Continuous AUTO_OK one person one identity (after ~30 days receipts) |

Ranges always: open inventory **~150-400** · AUTO_OK **N (live)**. Never "We enter 400."

---

## Copy Do / Don't (short)

**Yes:** estimated live book · badges first · fee = research and time · contests are free · we cannot influence outcome · "Applied to X. Check email/SMS. Estimate, not a guarantee."

**Never:** ROI-positive gambling · guaranteed $50 · 3 emails = 3x odds · "we auto-enter everything" · prize-notice tone · casino/medical/addiction claims · $50++ as ad copy.

Full list: [`MARKETING-MANTRA.md`](./MARKETING-MANTRA.md) · leapfrog §5.

---

## Data / seed

Prefer seed from `inventory_export.json` / `inventory/live-list.json` when available in the Repl.  
Shape: [`SCHEMA.md`](./SCHEMA.md). Sort: `ev_mid / minutes_to_enter`, AUTO_OK first, closing-soon, soft-field.  
Tally mock: [`PERSONAL-TALLY.md`](./PERSONAL-TALLY.md) EXAMPLE numbers only.

---

## Hard constraints - spines and publish

- **Do NOT change Scale / SBG / Birch spines** - ads soft-link only
- Contest mail identities stay customer BYO / ops personal - no provisioned ticket product this week
- **No publish / no custom domain without Emma + Randy**
- Do not store passwords, SIN, or unrelated third-party PII
- TAKE ACTION = win-critical only (later); never spam routine entry noise

---

## Implementation order

Follow [`REPLIT-PASTE.md`](./REPLIT-PASTE.md) § Implementation order. Demo to Emma/Randy before any public deploy or domain.

When insights contradict UI assumptions, defer to `INSIGHTS.md` / leapfrog pack and append a question rather than guessing.
