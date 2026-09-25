# WePrize fulfillment (stranger auto-apply)

Branch intent: Stripe Payment Links → webhook → BYO identity → assist queue → NEEDS_YOU nudges.

## Live Payment Links (CAD)

| Pack | Link |
|---|---|
| Once | https://buy.stripe.com/eVqcN52d75lE0Yu9hc8AE03 |
| Triple | https://buy.stripe.com/14AfZh8Bv29sePkalg8AE04 |
| Year-round | https://buy.stripe.com/5kQ7sLdVP15o7mS8d88AE02 |

**Note:** Year-round `…sHd…` is dead. Live link uses **`sLd`**: `5kQ7sLdVP15o7mS8d88AE02`.

## Stripe Dashboard — success URLs

Set **After payment → redirect** on each Payment Link:

| Pack | success_url |
|---|---|
| Once | `https://weprize.net/success?pack=once&session_id={CHECKOUT_SESSION_ID}` |
| Triple | `https://weprize.net/success?pack=triple&session_id={CHECKOUT_SESSION_ID}` |
| Year-round | `https://weprize.net/success?pack=year_round&session_id={CHECKOUT_SESSION_ID}` |

Cancel URL: `https://weprize.net/pricing`

Prefer `{CHECKOUT_SESSION_ID}` so `/success` can resolve `/order/:token` via `GET /api/orders/by-session/:id`.

## Webhook

- Endpoint: `POST https://<host>/api/stripe/webhook` (raw body)
- Events: `checkout.session.completed`
- Signing secret → `STRIPE_WEBHOOK_SECRET`

## Secrets / env (never commit)

| Var | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Retrieve sessions / verify webhook |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature |
| `DATABASE_URL` | **Prefer Postgres in prod** |
| `RESEND_API_KEY` | NEEDS_YOU email nudges (no-op if missing) |
| `RESEND_FROM` | Verified from-address |
| `APP_BASE_URL` | Absolute links in emails (e.g. `https://weprize.net`) |
| `PORT` | Default `5000` |
| `ALLOW_DEMO_ORDER=1` | Dev only — `POST /api/dev/demo-order` |
| `ALLOW_UNSIGNED_WEBHOOK=1` | Dev only |
| `DRY_RUN=1` | Worker marks jobs `applied` instead of `needs_you` |
| `PGSSL=0` | Disable Postgres SSL (local) |

Local fallback store: `data/weprize.json` when `DATABASE_URL` is unset. **TODO(prod): Postgres only** — JSON is single-box.

## Pack seed rules

AUTO_OK + Canada / `ca_us` only, health ≠ dead.

- **Once:** `N = min(25, available)` jobs when identity submitted
- **Triple:** same slice × up to 3 identity slots (multiple POSTs)
- **Year-round:** Once-sized slice once; `year_round=true` for later continuous (not built out here)

## Customer routes

| Path | Role |
|---|---|
| `/success` | Post-checkout; resolves `session_id` → `/order/:token`; if only `?pack=`, recover-by-email CTA |
| `/order/:token` | Live identity + job dashboard (source of truth for applies) |
| `POST/GET /api/orders/recover-by-email` | Exact checkout email → latest paid order token (rate-limited; 404 if none) |
| `/onboarding`, `/dashboard` | Local mock demo (Emma UI) until token link is shared |

After `fulfillCheckoutSession`, if Resend is configured, buyer gets an email with `/order/{token}` (order-ready). Identity form on the order page remains required before applies (legal_name, email, address, city, province, postal; phone/dob optional).

## Worker (box-side, not Replit)

```bash
node scripts/fulfill-worker.mjs
DRY_RUN=1 LIMIT=10 node scripts/fulfill-worker.mjs
```

Marks `queued` → `applying` → `needs_you` (`worker_stub_pending_browser_apply`) or `applied` if `DRY_RUN=1`. Does **not** invent PII. Parent WePrize agent owns real browser apply.

## www DNS (Emma)

Point apex + www at the same Replit custom domain:

```
weprize.net.     A / ALIAS    <Replit target from dashboard>
www.weprize.net. CNAME        weprize.net.
```

Or both CNAMEs to the Replit hostname shown in **Hosting → Custom domains**. Keep apex and www on the same deployment.

## E2E test plan

1. `npm run build && ALLOW_DEMO_ORDER=1 npm start`
2. `curl -s localhost:5000/api/health`
3. `curl -s -X POST localhost:5000/api/dev/demo-order -H 'content-type: application/json' -d '{"pack":"once"}'` → save `token`
4. Open `/order/<token>` → submit BYO identity → jobs seed
5. `node scripts/fulfill-worker.mjs` → jobs → `needs_you`
6. Stripe CLI (with secrets): forward webhook, pay Once link, land on `/success?session_id=…` → order page
7. Confirm Resend no-op without keys; with keys, NEEDS_YOU email fires

## Run

```bash
npm install
npm run build
npm start   # Express serves dist/ + /api on 0.0.0.0:$PORT
```
