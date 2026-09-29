import { useEffect } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { captureInboundRef } from '../lib/shareRef'
import { DisclaimerStrip } from './DisclaimerStrip'

export function Layout() {
  useEffect(() => {
    captureInboundRef()
  }, [])
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-navy-950/5 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-navy-950 text-sm font-bold text-soft-gold">
              We
            </span>
            <span className="text-lg font-bold tracking-tight text-navy-950">WePrize</span>
          </Link>
          <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-teal-600">
            My entries
          </Link>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-navy-950/10 bg-ice-50 text-slate-600">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 text-sm sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="mb-1.5 font-semibold text-navy-950">WePrize</p>
            <p className="text-xs leading-relaxed">
              We enter free contests for you. Contests stay free on brand sites. We can&apos;t influence who wins.
            </p>
          </div>
          <FooterCol
            title="Contests"
            links={[
              ['/how-it-works', 'How it works'],
              ['/pricing', 'Pricing'],
              ['/prizes', 'What you could win'],
              ['/contests', 'Contest feed'],
              ['/submit', 'Suggest a contest'],
              ['/dashboard', 'My entries'],
            ]}
          />
          <FooterCol
            title="Partners"
            links={[
              ['/partners', 'Partner with WePrize'],
              ['/advertise', 'Advertise'],
              ['/exclusives', 'Exclusives'],
              ['/qr', 'QR stickers'],
              ['/for-agents', 'For agents'],
            ]}
            extra={
              <a href="https://birchreserve.net" target="_blank" rel="noopener noreferrer" className="block hover:text-teal-600">
                Ad space · Birch Reserve
              </a>
            }
          />
          <FooterCol
            title="Legal"
            links={[
              ['/methodology', 'Methodology'],
              ['/disclaimer', 'Disclaimer'],
              ['/terms', 'Terms'],
              ['/privacy', 'Privacy'],
            ]}
          />
        </div>
        <div className="mx-auto max-w-[1200px] px-4 pb-8">
          <DisclaimerStrip />
        </div>
      </footer>
    </div>
  )
}

function FooterCol({ title, links, extra }: { title: string; links: [string, string][]; extra?: React.ReactNode }) {
  return (
    <div className="space-y-1.5 text-xs">
      <p className="mb-2 text-sm font-semibold text-navy-950">{title}</p>
      {links.map(([to, label]) => (
        <Link key={to} to={to} className="block hover:text-teal-600">
          {label}
        </Link>
      ))}
      {extra}
    </div>
  )
}
