import { PROFILE_STUBS } from '../data/profiles'
import { ProfileCard } from '../components/ProfileCard'

/** Ops stub - not in primary nav. */
export function Profiles() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-950">Profiles (ops stub)</h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        BYO identity stubs for demo only. Product rule: <strong className="text-navy-950">1 personal profile for you</strong>.
        Friends = apply-on-behalf with their consent and their legal identity — never fake emails. Max 10 purchases per
        buyer email (not a bulk business / ROI farm tool). No autofill into brand sites from this draft.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {PROFILE_STUBS.map((p) => (
          <ProfileCard key={p.id} profile={p} />
        ))}
      </div>
    </div>
  )
}
