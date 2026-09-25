import { NavLink, Outlet, Link } from 'react-router-dom'
import { CanadaChip } from './CanadaChip'
import { DisclaimerStrip } from './DisclaimerStrip'

const nav = [
  { to: '/', label: 'Home', end: true },
  { to: '/contests', label: 'Contests' },
  { to: '/prizes', label: 'Prizes' },
  { to: '/submit', label: 'Suggest' },
  { to: '/exclusives', label: 'Exclusives' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/advertise', label: 'Advertise' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition ${
    isActive ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-100/90 hover:bg-white/10'
  }`

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col page-mesh">
      <header className="bg-navy-950 text-white border-b border-white/5 sticky top-0 z-40 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600/20 ring-1 ring-teal-500/40 text-teal-500 font-bold text-sm">
              We
            </span>
            <span className="text-lg font-bold tracking-tight group-hover:text-teal-500 transition">
              WePrize
            </span>
            <CanadaChip />
          </Link>
          <nav className="flex flex-wrap gap-1" aria-label="Primary">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="border-t border-white/5">
          <p className="mx-auto max-w-[1200px] px-4 py-1.5 text-[11px] text-slate-400">
            Contest Bot is the engine behind WePrize · Canada-first · live
          </p>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-navy-950/10 bg-navy-950 text-slate-300">
        <div className="mx-auto max-w-[1200px] px-4 py-10 grid gap-6 md:grid-cols-3">
          <div>
            <p className="font-semibold text-white mb-1.5 text-lg">WePrize</p>
            <p className="text-xs leading-relaxed text-slate-400">
              Don't gamble with your time. We apply to free contests for you.
            </p>
          </div>
          <div className="text-xs space-y-1.5">
            <Link to="/methodology" className="block hover:text-teal-500">Methodology</Link>
            <Link to="/for-agents" className="block hover:text-teal-500">For agents</Link>
            <Link to="/prizes" className="block hover:text-teal-500">What you could win</Link>
            <Link to="/exclusives" className="block hover:text-teal-500">Scale exclusives</Link>
            <Link to="/dashboard" className="block hover:text-teal-500">Assist dashboard</Link>
            <Link to="/onboarding" className="block hover:text-teal-500">Identity intake</Link>
            <Link to="/disclaimer" className="block hover:text-teal-500">Disclaimer</Link>
            <Link to="/terms" className="block hover:text-teal-500">Terms</Link>
            <Link to="/privacy" className="block hover:text-teal-500">Privacy</Link>
            <Link to="/profiles" className="block hover:text-teal-500">Profiles (ops stub)</Link>
          </div>
          <div className="text-xs space-y-2.5">
            <a
              href="https://birchreserve.net"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg border border-white/20 px-3 py-2 hover:border-teal-500 hover:text-teal-500 transition"
            >
              Advertise here · Birch Reserve
            </a>
            <a
              href="https://scalehealth.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-slate-400 hover:text-teal-500"
            >
              Scale Health · scalehealth.ca
            </a>
            <p className="text-slate-500">Live: weprize.net · Stripe Payment Links live</p>
            <DisclaimerStrip />
          </div>
        </div>
      </footer>
    </div>
  )
}
