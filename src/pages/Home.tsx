import { JackpotCrank } from '../components/JackpotCrank'

/** Public home: one crank, real free contests, one form, one upgrade nudge. */
export function Home() {
  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-navy-950 sm:text-5xl">
          Pull the crank. Win free stuff.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg text-slate-600">
          We enter you in 10+ free Canadian contests. Your first round is on us.
        </p>
      </div>
      <JackpotCrank />
    </div>
  )
}
