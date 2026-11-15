import { lazy, StrictMode, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TitleScreen } from './ui/TitleScreen'
import { pullCloudSave } from './net/auth'
import './index.css'

/**
 * Entry point: only the title screen ships in the first bundle. The 3D game
 * (three.js, physics, all scenes) is imported when the player taps Play — by then the
 * service worker has usually downloaded it in the background.
 */
const Game = lazy(() => import('./boot'))

// Automated tests against the dev server skip the title screen.
const AUTOSTART = import.meta.env.DEV && navigator.webdriver

function Root() {
  const [playing, setPlaying] = useState(AUTOSTART)
  const [syncing, setSyncing] = useState(false)
  // Signed in: take the cloud save first if it is newer than this device's.
  const play = () => {
    setSyncing(true)
    void pullCloudSave().finally(() => setPlaying(true))
  }
  if (!playing) return <TitleScreen onPlay={play} loading={syncing} />
  return (
    <Suspense fallback={<TitleScreen loading />}>
      <Game />
    </Suspense>
  )
}

// PWA: cache the game for offline play (production builds only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
    // Ask the browser not to evict the downloaded game when the device is short on space.
    void navigator.storage?.persist?.().catch(() => false)
  })
}

const root = document.getElementById('root')
if (!root) throw new Error('#root element missing')

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
