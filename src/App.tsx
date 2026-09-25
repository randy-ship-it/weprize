import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Contests } from './pages/Contests'
import { ContestDetail } from './pages/ContestDetail'
import { Exclusives } from './pages/Exclusives'
import { HowItWorks } from './pages/HowItWorks'
import { Pricing } from './pages/Pricing'
import { Waitlist } from './pages/Waitlist'
import { Submit } from './pages/Submit'
import { Methodology } from './pages/Methodology'
import { Advertise } from './pages/Advertise'
import { Terms, Privacy, Disclaimer } from './pages/Legal'
import { Profiles } from './pages/Profiles'
import { Agents } from './pages/Agents'
import { Prizes } from './pages/Prizes'
import { Success } from './pages/Success'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="contests" element={<Contests />} />
          <Route path="contests/:slug" element={<ContestDetail />} />
          <Route path="prizes" element={<Prizes />} />
          <Route path="what-you-could-win" element={<Navigate to="/prizes" replace />} />
          <Route path="exclusives" element={<Exclusives />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="success" element={<Success />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="waitlist" element={<Waitlist />} />
          <Route path="submit" element={<Submit />} />
          <Route path="methodology" element={<Methodology />} />
          <Route path="advertise" element={<Advertise />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="disclaimer" element={<Disclaimer />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="for-agents" element={<Agents />} />
          <Route path="c/:slug" element={<LegacyContestRedirect />} />
          <Route path="filters" element={<Navigate to="/contests" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function LegacyContestRedirect() {
  const { slug } = useParams()
  return <Navigate to={slug ? `/contests/${slug}` : '/contests'} replace />
}
