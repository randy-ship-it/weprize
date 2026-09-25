import { Link } from 'react-router-dom'

const steps = [
  {
    title: 'Browse free board with badges before click',
    body: 'Friction, health, and AUTO_OK chips are visible on every card. No signup required for the board.',
  },
  {
    title: 'BYO identity',
    body: 'Legal name + one real mailbox + phone you own. We do not provision second identities or plus-alias farms.',
  },
  {
    title: 'Contest Bot queues AUTO_OK',
    body: 'Statuses: queued → applying → applied → confirm_sent → needs_you → confirmed | failed. Dashboard nudges when you must tap a code.',
  },
  {
    title: 'Stop before CAPTCHA / OTP',
    body: 'Customer verifies. We never claim to auto-enter everything or solve CAPTCHAs.',
  },
  {
    title: 'Entry confirms',
    body: 'Applied to X. Check email/SMS. Estimate, not a guarantee.',
  },
  {
    title: 'Year-round after receipts',
    body: 'Continuous assist ships only after ~30 days of "we applied X this month" receipts.',
  },
]

export function HowItWorks() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-navy-950">How it works</h1>
      <p className="text-slate-600 text-sm leading-relaxed">
        Assist spine for Day 1 story. Contest Bot is the engine behind WePrize. Fee is for research and time to complete eligible free entries. Contests are free. We cannot influence the outcome.
      </p>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="card-surface rounded-2xl p-5">
            <p className="text-teal-600 text-sm font-bold mb-1">Step {i + 1}</p>
            <h2 className="font-semibold text-navy-950 mb-1">{s.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-dashed border-navy-950/15 bg-white/70 p-4 text-sm text-slate-600">
        Screenshot / receipt vault placeholder (coming). No CAPTCHA autofill in this draft.
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/pricing" className="btn-primary px-4 py-2 text-sm">
          See pricing
        </Link>
        <Link to="/dashboard" className="btn-ghost px-4 py-2 text-sm text-navy-950">
          Assist dashboard
        </Link>
        <Link to="/waitlist" className="btn-ghost px-4 py-2 text-sm text-navy-950">
          Join waitlist
        </Link>
      </div>
    </div>
  )
}
