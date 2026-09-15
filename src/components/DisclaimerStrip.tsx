import { Link } from 'react-router-dom'

export function DisclaimerStrip() {
  return (
    <p className="text-xs text-slate-600 leading-relaxed">
      ESTIMATE · not a guarantee · contests are free · fee is for research and time when assist ships · we cannot influence outcomes.{' '}
      <Link to="/methodology" className="text-teal-600 underline-offset-2 hover:underline">
        Methodology
      </Link>
      {' · '}
      <Link to="/disclaimer" className="text-teal-600 underline-offset-2 hover:underline">
        Disclaimer
      </Link>
    </p>
  )
}
