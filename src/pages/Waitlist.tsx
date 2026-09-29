import { WaitlistForm } from '../components/WaitlistForm'

export function Waitlist() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-950">Waitlist</h1>
      <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
        Email only. No forced account. Opt in to hear about free Canada contests and optional assist packs.
        Contests stay free on brand sites. Packs buy research and time only, not better odds.
      </p>
      <WaitlistForm source="waitlist" />
    </div>
  )
}
