import { JackpotCrank } from '../components/JackpotCrank'
import ShareBar from '../components/ShareBar'

/** Public home: one crank, real free contests, one form, one upgrade nudge. */
export function Home() {
  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-8">
      <div className="mb-8 text-center">
        <p className="mb-3 text-sm font-semibold text-teal-700">Legit free contests. The opposite of spam.</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-navy-950 sm:text-5xl">
          Pull the crank. Win free stuff.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg text-slate-600">
          We enter you in 10+ free Canadian contests. Your first round is on us.
        </p>
      </div>
      <JackpotCrank />
      <ShareBar />
      <a href="/spamfun" className="mt-8 block rounded-2xl border border-navy-950/10 bg-white p-5 text-left hover:border-teal-600">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Community project · We take spam seriously</p>
        <p className="mt-1 text-lg font-bold text-navy-950">Spam Fun: help our members beat spam calls</p>
        <p className="mt-1 text-sm text-slate-600">WePrize helps you enter legit free contests, with no robocalls and no mass texts. So we built an automated assistant that wastes spam callers&apos; time instead of yours.</p>
      </a>
    </div>
  )
}
