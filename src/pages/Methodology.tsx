import { EstimateChip } from '../components/EstimateChip'
import { Link } from 'react-router-dom'
import tally from '../data/tally.json'
import type { Tally } from '../types/contest'
import { formatPoolM } from '../lib/filters'

export function Methodology() {
  const t = tally as Tally
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-navy-950">Methodology</h1>
        <EstimateChip />
        <EstimateChip label="EXAMPLE" />
      </div>
      <p className="text-slate-600 text-sm leading-relaxed">
        We publish the formula class whenever dollar EV appears. Bands are ESTIMATES, not guarantees. Dead contests drop from EV. $50++ is a calibration goal for ops, not ad copy. Contest Bot keeps the operator book honest.
      </p>

      <section className="card-surface rounded-2xl p-5">
        <h2 className="font-semibold text-navy-950 mb-3">EXAMPLE operator book (display)</h2>
        <dl className="grid sm:grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-ice-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Face prize pools</dt>
            <dd className="tabular font-semibold text-navy-950">~{formatPoolM(t.face_pool_cad)} CAD</dd>
          </div>
          <div className="rounded-xl bg-ice-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Adjusted pot</dt>
            <dd className="tabular font-semibold text-navy-950">~{formatPoolM(t.haircut_pool_cad)} CAD</dd>
          </div>
          <div className="rounded-xl bg-ice-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Expected (mid)</dt>
            <dd className="tabular font-semibold text-teal-600">~${t.est_ev_mid_cad} CAD</dd>
          </div>
          <div className="rounded-xl bg-ice-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Conservative band (lower band)</dt>
            <dd className="tabular font-semibold text-teal-600">~${t.est_ev_high_field_cad} CAD</dd>
          </div>
        </dl>
        <p className="text-xs text-slate-500 mt-3">
          {t.person_entries} person-entries · {t.unique_contests} unique · full pools · field_mid
        </p>
      </section>

      <section className="card-surface rounded-2xl p-5">
        <h2 className="font-semibold text-navy-950 mb-2">Full-pool EV formula</h2>
        <pre className="overflow-x-auto rounded-xl bg-navy-950 text-teal-500 p-4 text-sm tabular">
{`EV_hat = sum_i sum_t  (n_{i,t} * v_{i,t} * h_t / F_i) * d_i * m_i`}
        </pre>
        <ul className="mt-3 text-sm text-slate-600 space-y-1 list-disc pl-5">
          <li>n, v = prize count and ARV in CAD for tier t</li>
          <li>h = haircut by prize type</li>
          <li>F = field-size prior (low / mid / high)</li>
          <li>d = remaining legal entries this period</li>
          <li>m = 1.0 unless rules are 1/person and a second legal adult is actually entered</li>
        </ul>
      </section>

      <section className="card-surface rounded-2xl p-5 space-y-2 text-sm text-slate-600">
        <h2 className="font-semibold text-navy-950">Haircuts</h2>
        <p>Cash / GC: 0.90-1.00 · Goods: 0.70-0.85 · Trips / experiences: 0.40-0.60</p>
        <h2 className="font-semibold text-navy-950 pt-2">Field priors (mid)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Soft-field (radio / mall / grocery / Castanet): 200-3,000</li>
          <li>Provincial / regional brand form: 1,000-8,000</li>
          <li>National CA brand form: 5,000-40,000</li>
          <li>Gleam / ViralSweep with heavy social: 20,000-200,000</li>
        </ul>
        <h2 className="font-semibold text-navy-950 pt-2">Survey rule</h2>
        <p>
          Count survey EV only when the survey is the contest entry. Wage-style grind is a separate lane and does not pollute contest EV.
        </p>
      </section>

      <Link to="/" className="text-sm text-teal-600 hover:underline">
        Back to home
      </Link>
    </div>
  )
}
