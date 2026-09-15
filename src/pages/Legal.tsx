import { Link } from 'react-router-dom'

export function Terms() {
  return (
    <LegalShell title="Terms (draft stub)">
      <p>
        WePrize is a draft Canada-first contest board + assist preview. Contests remain free on brand sites. Any future fee is for research and time, not for influencing outcomes. Contest Bot is the engine behind WePrize.
      </p>
      <p>
        You bring your own legal identity. We do not provision extra emails as tickets. Assist stops before CAPTCHA / OTP.
      </p>
      <p>Not legal advice. Official contest rules always govern.</p>
    </LegalShell>
  )
}

export function Privacy() {
  return (
    <LegalShell title="Privacy (draft stub)">
      <p>
        Waitlist emails in this draft are stored in your browser localStorage only (`weprize_waitlist`). No ESP. No third-party sale of PII. Birch Reserve ads are soft-linked display inventory, not data resale.
      </p>
      <p>Health checks and profiles are local stubs for ops demos.</p>
    </LegalShell>
  )
}

export function Disclaimer() {
  return (
    <LegalShell title="Disclaimer">
      <p>
        All expected-value figures are ESTIMATES. Example operator book numbers on the home tally are not a customer outcome promise and not a guarantee.
      </p>
      <p>
        We do not claim ROI-positive gambling, guaranteed returns, or that we auto-enter everything. Dead links drop from EV. See{' '}
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
