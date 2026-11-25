import { lazy, StrictMode, Suspense, useState } from 'react'
import { chunk, startUpdates } from './updates'
import { createRoot } from 'react-dom/client'
import { TitleScreen } from './ui/TitleScreen'
import { pullCloudSave } from './net/auth'
import { startLandscapePlay } from './fullscreen'
import { enterSandbox, isSandbox } from './sandbox'
import './index.css'

/**
 * Entry point: only the title screen ships in the first bundle. The 3D game
 * (three.js, physics, all scenes) is imported when the player taps Play — by then the
 * service worker has usually downloaded it in the background.
 */
const Game = lazy(() => chunk(import('./boot')))

// Automated tests against the dev server skip the title screen.
const AUTOSTART = import.meta.env.DEV && navigator.webdriver

function Root() {
  // 1.43 a sandbox game (Chơi thử) reloads straight into the game (after a milestone reset or an update)
  const [playing, setPlaying] = useState(AUTOSTART || isSandbox())
  const [syncing, setSyncing] = useState(false)
  // Signed in: take the cloud save first if it is newer than this device's.
  const play = () => {
    // Phones / tablets: full screen + landscape, the way the game is meant to be played (1.30).
    startLandscapePlay()
    setSyncing(true)
    void pullCloudSave().finally(() => setPlaying(true))
  }
  // Chơi thử: offline, its own save, no cloud pull
  const sandbox = () => {
    startLandscapePlay()
    enterSandbox()
    setPlaying(true)
  }
  if (!playing) return <TitleScreen onPlay={play} onSandbox={sandbox} loading={syncing} />
  return (
    <Suspense fallback={<TitleScreen loading />}>
      <Game />
    </Suspense>
  )
}

// PWA: cache the game for offline play (production builds only), and pick up new versions (1.42, src/updates.ts).
startUpdates()

const root = document.getElementById('root')
if (!root) throw new Error('#root element missing')

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
