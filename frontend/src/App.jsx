import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { SimulatorPage } from './pages/SimulatorPage'
import { FactionsPage } from './pages/FactionsPage'
import { ArmiesPage } from './pages/ArmiesPage'
import { Navbar } from './components/Navbar'
import { useDataStore } from './store/dataStore'
import { useAuthStore } from './store/authStore'

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
      <Navbar />

      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/factions"  element={<FactionsPage />} />
        <Route path="/armies"    element={<ArmiesPage />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
