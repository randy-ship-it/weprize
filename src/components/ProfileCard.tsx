import type { ProfileStub } from '../types/contest'

export function ProfileCard({ profile }: { profile: ProfileStub }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-slate-900">{profile.display_name}</h2>
        <span className="rounded-full bg-slate-100 text-slate-600 text-xs px-2 py-0.5 font-medium">
          Stub only
        </span>
      </div>
      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
          <dd className="text-slate-800">{profile.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Phone</dt>
          <dd className="text-slate-800">{profile.phone || 'Optional - not set'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Mailing address</dt>
          <dd className="text-slate-800">{profile.address_line}</dd>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">City</dt>
            <dd className="text-slate-800">{profile.city}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Province</dt>
            <dd className="text-slate-800">{profile.province}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Postal</dt>
            <dd className="text-slate-800 font-mono">{profile.postal}</dd>
          </div>
        </div>
      </dl>
      <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">{profile.notes}</p>
    </article>
  )
}
