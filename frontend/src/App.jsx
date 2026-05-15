import { useEffect, useState } from 'react'
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
import { ACCENT, BG, BORDER, SURFACE, TEXT, TEXT_SEC, TEXT_WEAK, TYPE } from './theme'
import { useDataStore } from './store/dataStore'
import { useAuthStore } from './store/authStore'
import { useArmyStore } from './store/armyStore'

const NO_NAVBAR = ['/welcome', '/onboarding', '/learn', '/reset-password']

const MOBILE_NOTICE_KEY = 'ph_mobile_notice_ts'
const NOTICE_TTL = 24 * 60 * 60 * 1000  // 1 day in ms

function isMobile() {
  return window.innerWidth <= 1024 || navigator.maxTouchPoints > 0
}

function shouldShowNotice() {
  if (!isMobile()) return false
  const last = localStorage.getItem(MOBILE_NOTICE_KEY)
  if (!last) return true
  return Date.now() - parseInt(last, 10) > NOTICE_TTL
}

function MobileNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (shouldShowNotice()) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(MOBILE_NOTICE_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '28px 24px' }}>

        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ width: '36px', height: '36px', border: `1px solid ${ACCENT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: ACCENT, ...TYPE.statMd }}>
            ⚠
          </div>
          <div>
            <div style={{ ...TYPE.heading, marginBottom: '6px' }}>Desktop recommended</div>
            <p style={{ ...TYPE.body, fontSize: '13px', margin: 0 }}>
              ProbHammer is designed for desktop browsers. Some features may be hard to use on a small screen.
            </p>
          </div>
        </div>

        {/* Action */}
        <button
          onClick={dismiss}
          style={{ ...TYPE.ui, background: 'transparent', border: `1px solid ${ACCENT}`, color: ACCENT, padding: '10px 0', cursor: 'pointer', width: '100%', transition: 'background 150ms' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(47,224,255,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          Got it — continue anyway
        </button>
      </div>
    </div>
  )
}

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
  const load      = useDataStore((s) => s.load)
  const authInit  = useAuthStore((s) => s.init)
  const user      = useAuthStore((s) => s.user)
  const armyInit  = useArmyStore((s) => s.init)

  useEffect(() => { load() }, [load])
  useEffect(() => authInit(), [authInit])
  useEffect(() => { armyInit(user) }, [user, armyInit])

  return (
    <BrowserRouter>
      <HalftoneOverlay />
      <MobileNotice />
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
