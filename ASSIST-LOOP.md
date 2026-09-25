# WePrize assist loop — webhook → queue → bot → nudge

Contract for **WePrize Bot** (Replit server-side). SPA at weprize.net stays secret-free; it only collects BYO identity and shows status.

## State machine (per apply)

```
queued → applying → applied → confirm_sent → needs_you → confirmed
                                              ↘ failed
                         ↘ failed (early)
```

| Status | Meaning | Who acts |
|---|---|---|
| `queued` | Eligible AUTO_OK contest reserved for this identity/order | Bot scheduler |
| `applying` | Bot filling the form now | Bot |
| `applied` | Submit succeeded; waiting for brand confirm mail/SMS or silent OK | Bot |
| `confirm_sent` | Brand sent confirm link; we detected / customer should open | Customer (+ bot detect) |
| `needs_you` | OTP / CAPTCHA stop / skill Q — customer must act | Customer |
| `confirmed` | Entry confirmed (receipt / vault) | Bot or customer ack |
| `failed` | Wall, dead link, household refuse, timeout | Bot (honest) |

Aligns with PRODUCT.md: AI applies AUTO_OK; customer does OTP; stop before CAPTCHA.

## End-to-end contract

### 1) Stripe webhook (source of truth for $)

- Endpoint: `POST /webhooks/stripe` on Replit (raw body + `Stripe-Signature`)
- Event: `checkout.session.completed` (Payment Links)
- Create `orders` row: `{ id, pack: once|triple|year_round, stripe_session_id, email_from_stripe, status: paid }`
- Never trust SPA `?pack=` alone for fulfillment credits

### 2) Identity intake

- SPA `POST /api/identity` with BYO fields (name, email, mailing address, optional phone/DOB)
- Bind identity → latest paid order for that email (or magic-link session later)
- Refuse second household apply when contest `household_rule=household`

### 3) Queue build

- On identity save (or webhook if identity already exists): enqueue N AUTO_OK from curated book
  - Once: current week slice, one identity, print live N
  - Triple: up to 3 legal adults **or** 3 cycles — never fabricated emails
  - Year-round: continuous intake, not a shelf dump
- Each row starts `queued`

### 4) Bot worker

- Claim `queued` → `applying`
- Fill with BYO profile only
- Success → `applied` (then `confirm_sent` if confirm mail expected)
- CAPTCHA / OTP / account wall → `needs_you` (+ `next_step` copy) **or** `failed` if HUMAN_ONLY and out of scope
- Persist screenshot / confirmation vault pointer when available

### 5) Nudge

When status enters `confirm_sent` or `needs_you`:

- In-app: dashboard NEEDS_YOU card (SPA polls `GET /api/applies` or websocket later)
- Email (and optional SMS): short, Competition Act-safe
  - Subject example: `WePrize: code needed for {contest}`
  - Body: what to do, link to `https://weprize.net/dashboard`, no ROI / odds claims
- Customer ack: `POST /api/applies/:id/ack` → `confirmed` (or bot flips on receipt detect)

### 6) SPA API surface (stubs already named)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/orders` | Rarely from SPA; prefer webhook-created |
| GET | `/api/orders/me` | Current pack |
| POST | `/api/identity` | BYO save |
| GET | `/api/identity` | Prefill |
| GET | `/api/applies` | Dashboard list |
| POST | `/api/applies/:id/ack` | Customer finished OTP |

CORS: allow `https://weprize.net`. Auth: start with signed email link or Stripe customer id; do not put API keys in Vite.

## Copy rules (nudges + UI)

- Contests are free; fee = research + time
- Estimate / example — never guarantee, never “ROI-positive”
- “We apply; you tap codes when asked”
- Never “3 emails = 3× odds”

## Demo vs live

- Today: `src/lib/assistStore.ts` + `src/lib/api.ts` mock the loop in localStorage
- Live: set `VITE_API_BASE` + `VITE_USE_LIVE_API=1` on the SPA build once Replit routes exist
