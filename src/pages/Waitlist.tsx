import { WaitlistForm } from '../components/WaitlistForm'

export function Waitlist() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-950">Waitlist</h1>
      <p className="text-sm text-slate-600 max-w-xl">
        Email only. No forced account. Draft stores locally in your browser. We will not wire ESP or send mail without greenlight.
      </p>
      <WaitlistForm />
    </div>
  )
}
