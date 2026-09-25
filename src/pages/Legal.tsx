import { Link } from 'react-router-dom'

export function Terms() {
  return (
    <LegalShell title="Terms (draft stub)">
      <p>
        WePrize is a Canada-first contest board + optional time/research assist. Contests remain free on brand sites.
        Any fee is for research and time, not for influencing outcomes. Contest Bot is the engine behind WePrize.
      </p>
      <p>
        <strong>Personal use.</strong> One personal profile for you. You may apply on behalf of friends only with their
        consent and their legal identity. We do not provision extra emails as tickets. Assist stops before CAPTCHA / OTP.
      </p>
      <p>
        <strong>Purchase cap.</strong> Maximum 10 paid purchases per buyer email. WePrize is not a bulk business or
        ROI-farming tool. We may refuse or pause further purchases beyond that soft cap.
      </p>
      <p>Not legal advice. Official contest rules always govern. Competition Act: estimates are not guarantees.</p>
    </LegalShell>
  )
}

export function Privacy() {
  return (
    <LegalShell title="Privacy (draft stub)">
      <p>
        Waitlist emails in this draft may be stored in browser localStorage (`weprize_waitlist`) and/or server order
        identity records you submit. No third-party sale of PII. Birch Reserve ads are soft-linked display inventory, not data resale.
      </p>
      <p>
        Identity you share for assist (including friends you apply for with consent) is used only to complete eligible
        free contest forms and related order fulfillment.
      </p>
      <p>Health checks and profiles stubs may be local/ops demos.</p>
    </LegalShell>
  )
}

export function Disclaimer() {
  return (
    <LegalShell title="Disclaimer">
      <p>
        All expected-value figures are ESTIMATES. Example operator book numbers on the home tally are not a customer
        outcome promise and not a guarantee.
      </p>
      <p>
        We do not claim ROI-positive gambling, guaranteed returns, or that we auto-enter everything. Dead links drop from
        EV. Contests are free; fees (if any) are for research and time assist only.
      </p>
      <p>
        One personal profile; friends = apply-on-behalf with consent; max 10 purchases per buyer. Not a bulk entry
        business. See{' '}
        <Link to="/methodology" className="text-teal-600 hover:underline">
          methodology
        </Link>
        .
      </p>
    </LegalShell>
  )
}

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-navy-950">{title}</h1>
      <div className="card-surface rounded-2xl p-5 space-y-3 text-sm text-slate-600">{children}</div>
      <Link to="/" className="text-sm text-teal-600 hover:underline">
        Home
      </Link>
    </div>
  )
}
