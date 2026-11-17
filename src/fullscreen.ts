/**
 * Landscape play (1.30). Phones and tablets are played on their side, so tapping Play goes
 * full screen and asks the browser to keep the screen landscape (Android Chrome / installed PWA;
 * iPhone Safari has neither API — there the rotate hint in the game does the job).
 * Tiny and title-safe: imported by main.tsx.
 */

const PREF = 'visa-hunter-fullscreen'

const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
/** Already an installed app without browser bars. */
const isApp = () => typeof window !== 'undefined' && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches

export const fullscreenSupported = () => typeof document !== 'undefined' && !!document.fullscreenEnabled

type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void> }

/** Keep the screen landscape where the browser allows it (needs full screen or an installed app). */
export function lockLandscape() {
  const o = screen.orientation as LockableOrientation | undefined
  void o?.lock?.('landscape').catch(() => {})
}

export function enterFullscreen() {
  if (!fullscreenSupported() || document.fullscreenElement) return
  void document.documentElement
    .requestFullscreen({ navigationUI: 'hide' })
    .then(lockLandscape)
    .catch(() => {})
}

export function exitFullscreen() {
  if (!document.fullscreenElement) return
  void document.exitFullscreen().catch(() => {})
}

/** Settings switch: remembers the choice so Play doesn't force full screen on someone who turned it off. */
export function setFullscreen(on: boolean) {
  try {
    localStorage.setItem(PREF, on ? 'on' : 'off')
  } catch {
    /* private mode */
  }
  if (on) enterFullscreen()
  else exitFullscreen()
}

/** Called from the Play tap (a user gesture): full screen + landscape on phones and tablets. */
export function startLandscapePlay() {
  if (!isTouch()) return
  if (isApp()) {
    lockLandscape()
    return
  }
  let pref: string | null = null
  try {
    pref = localStorage.getItem(PREF)
  } catch {
    /* private mode */
  }
  if (pref !== 'off') enterFullscreen()
}
