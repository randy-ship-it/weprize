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
    title: 'Contest Bot queues open AUTO_OK contests',
    body: 'Queued is not a submission. A contest counts as submitted only when the order has a receipt. Statuses include queued, failed, needs_you, and confirmed. You tap a code only after a brand asks.',
  },
  {
    title: 'Stop before CAPTCHA / OTP',
    body: 'Customer verifies. We never claim to auto-enter everything or solve CAPTCHAs.',
  },
  {
    title: 'Entry confirms',
    body: 'A receipt on the order is the submission record. Your own "I finished this" note is not a brand receipt. Estimates are not a guarantee.',
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
        Browse the free board first. Paid packs queue contests that are still open. Nothing on this site is a brand-site submission until an order shows a receipt.
      </p>
      <p className="text-slate-600 text-sm leading-relaxed">
        Contests stay free. Fee is research and time assist on eligible forms. Estimates only. We do not know what you will get. We cannot influence who wins.
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
