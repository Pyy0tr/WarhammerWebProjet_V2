import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { SimulatorPage } from './pages/SimulatorPage'
import { FactionsPage } from './pages/FactionsPage'
import { ArmiesPage } from './pages/ArmiesPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { WelcomePage } from './pages/WelcomePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { LearnPage } from './pages/LearnPage'
import { FeedbackPage } from './pages/FeedbackPage'
import { AdminFeedbackPage } from './pages/AdminFeedbackPage'
import { KeywordsPage } from './pages/KeywordsPage'
import { DetachmentsPage } from './pages/DetachmentsPage'
import { ComboPage } from './pages/ComboPage'
import { Navbar } from './components/Navbar'
import { useDataStore } from './store/dataStore'
import { useAuthStore } from './store/authStore'
import { useArmyStore } from './store/armyStore'

const NO_NAVBAR = ['/welcome', '/onboarding', '/learn', '/reset-password']

function NavbarConditional() {
  const { pathname } = useLocation()
  if (NO_NAVBAR.some(p => pathname.startsWith(p))) return null
  return <Navbar />
}

function OnboardingGuard({ children }) {
  const done = localStorage.getItem('ph_onboarding_done')
  if (!done) return <Navigate to="/welcome" replace />
  return children
}

export default function App() {
  const load      = useDataStore((s) => s.load)
  const authInit  = useAuthStore((s) => s.init)
  const user      = useAuthStore((s) => s.user)
  const armyInit  = useArmyStore((s) => s.init)

  useEffect(() => { load() }, [load])
  useEffect(() => authInit(), [authInit])
  useEffect(() => { armyInit(user) }, [user, armyInit])

  return (
    <BrowserRouter>
      <NavbarConditional />

      <Routes>
        <Route path="/welcome"        element={<WelcomePage />} />
        <Route path="/onboarding"     element={<OnboardingPage />} />
        <Route path="/learn"          element={<LearnPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/"               element={<OnboardingGuard><HomePage /></OnboardingGuard>} />
        <Route path="/simulator"      element={<OnboardingGuard><SimulatorPage /></OnboardingGuard>} />
        <Route path="/factions"       element={<OnboardingGuard><FactionsPage /></OnboardingGuard>} />
        <Route path="/armies"         element={<OnboardingGuard><ArmiesPage /></OnboardingGuard>} />
        <Route path="/keywords"       element={<OnboardingGuard><KeywordsPage /></OnboardingGuard>} />
        <Route path="/detachments"    element={<OnboardingGuard><DetachmentsPage /></OnboardingGuard>} />
        <Route path="/combos"         element={<OnboardingGuard><ComboPage /></OnboardingGuard>} />
        <Route path="/feedback"       element={<FeedbackPage />} />
        <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
