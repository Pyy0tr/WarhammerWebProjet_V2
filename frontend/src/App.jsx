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
import { Navbar } from './components/Navbar'
import { useDataStore } from './store/dataStore'
import { useAuthStore } from './store/authStore'

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

function HalftoneOverlay() {
  return (
    <>
      {/* Hidden SVG filter definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="halftone" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.8"
              numOctaves="2"
              seed="42"
              stitchTiles="stitch"
              result="noise"
            />
            <feComponentTransfer in="noise" result="dots">
              <feFuncR type="discrete" tableValues="0 1" />
              <feFuncG type="discrete" tableValues="0 1" />
              <feFuncB type="discrete" tableValues="0 1" />
              <feFuncA type="linear" slope="1" />
            </feComponentTransfer>
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0.33 0.33 0.33 0 0"
              result="alpha"
            />
          </filter>
        </defs>
      </svg>

      {/* Overlay div with the halftone filter applied */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          filter: 'url(#halftone)',
          background: 'white',
          opacity: 0.06,
          pointerEvents: 'none',
          zIndex: 0,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)',
        }}
      />
    </>
  )
}

export default function App() {
  const load     = useDataStore((s) => s.load)
  const authInit = useAuthStore((s) => s.init)

  useEffect(() => { load() }, [load])
  useEffect(() => authInit(), [authInit])

  return (
    <BrowserRouter>
      <HalftoneOverlay />
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
        <Route path="/feedback"       element={<FeedbackPage />} />
        <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
