# WePrize ship notes — customer assist UI

Updated: 2026-09-25 (ET)  
Branch: `feat/customer-assist-ui`  
Site: https://weprize.net (SPA; no `/api` on apex yet)

## Stripe Payment Links (live)

| Pack | Payment Link |
|---|---|
| Once | https://buy.stripe.com/eVqcN52d75lE0Yu9hc8AE03 |
| Triple | https://buy.stripe.com/14AfZh8Bv29sePkalg8AE04 |
| Year-round | https://buy.stripe.com/5kQ7sLdVP15o7mS8d88AE02 |

## Exact `success_url` values (set in Stripe Dashboard → each Payment Link → After payment)

| Pack | success_url |
|---|---|
| Once | `https://weprize.net/success?pack=once` |
| Triple | `https://weprize.net/success?pack=triple` |
| Year-round | `https://weprize.net/success?pack=year_round` |

Optional cancel / back: `https://weprize.net/pricing`

Do **not** put secrets in the SPA. Confirmation of payment for fulfillment must come from Stripe **webhooks** on the Replit WePrize Bot server (see `ASSIST-LOOP.md`), not from trusting the success page alone.

## New customer routes

| Path | Role |
|---|---|
| `/success?pack=` | Calm post-checkout; CTA → identity |
| `/onboarding?pack=` | BYO identity form (localStorage mock) |
| `/dashboard` | Assist progress, NEEDS_YOU cards, apply list |

## Local demo (no backend)

```bash
cd /workspace/weprize-sot
npm install
npm run dev
```

1. Open http://localhost:5173/success?pack=once  
2. Continue → fill onboarding → dashboard seeds a mock apply queue  
3. Clear demo: DevTools → Application → Local Storage → delete `weprize_assist_v1`

## Blockers for full live E2E

1. Stripe Payment Link **success_url** not yet confirmed updated to the values above  
2. No real `/api` on weprize.net (SPA shell only) — need Replit Contest/WePrize Bot: `POST /api/orders`, `/api/identity`, `/api/applies` + Stripe webhook `checkout.session.completed`  
3. www.weprize.net is NXDOMAIN — stick to apex `weprize.net`  
4. Email/SMS nudge channel (Resend / Twilio / etc.) not wired  
5. Contest Bot AUTO_OK runner not connected to per-customer queue  
6. Auth / session cookie so dashboard is not only localStorage  

Until then, UI is demoable via the mock store; stubs in `src/lib/api.ts` flip to live when `VITE_USE_LIVE_API=1` and `VITE_API_BASE` point at the bot.
