import { create } from 'zustand'

/**
 * 1.42 How a new deploy reaches players who already have the game open (user: "khi push update game thì nó ảnh
 * hưởng như nào… game được tải lại ở cache browser à"). See docs/DEPLOY.md "Cập nhật khi đang có người chơi".
 *
 * A push to main builds a new image; Azure swaps the container (the WebSocket closes with 1012, clients reconnect
 * with jitter). The new service worker installs in the background. An open tab keeps running the OLD code — that is
 * fine until it lazy-loads a chunk (a scene) the server no longer has. So:
 * - we notice a new version (the new service worker is installed, or the server's 'welcome' names another version)
 *   → `useUpdate.ready`;
 * - on the title screen we reload at once; in the game we show a small "Có bản cập nhật" pill (save + reload on tap)
 *   and reload by ourselves when the page goes to the background (the player does not see it);
 * - if a chunk fails to load anyway (`vite:preloadError`), we save and reload once (guarded against loops);
 * - the service worker keeps the previous version's cache, so old tabs still find their chunks offline/meanwhile.
 * Saves are versioned (systems/save.ts) and stay compatible; unknown items are dropped when loading.
 */

declare const __APP_VERSION__: string

interface UpdateState {
  ready: boolean
  /** What told us: 'sw' (new service worker installed) or 'server' (server ships another version). */
  reason: 'sw' | 'server' | null
  /** The game (not the title screen) is running: reload only at a good moment. */
  inGame: boolean
}
export const useUpdate = create<UpdateState>()(() => ({ ready: false, reason: null, inGame: false }))

const beforeReload = new Set<() => void>()
/** The game registers its "save now" here (boot.tsx). */
export function onBeforeReload(fn: () => void) {
  beforeReload.add(fn)
  return () => beforeReload.delete(fn)
}

const GUARD = 'vh-update-reload'
/** Save, then reload into the new version. `force` skips the loop guard (a tap on the pill). */
export function applyUpdate(force = false) {
  const last = Number(sessionStorage.getItem(GUARD) ?? 0)
  if (!force && Date.now() - last < 60_000) return false // reloaded a minute ago: do not loop
  sessionStorage.setItem(GUARD, String(Date.now()))
  for (const fn of beforeReload) {
    try {
      fn()
    } catch {
      // keep going: the reload matters more
    }
  }
  // let a waiting service worker take over first, then load the new page
  navigator.serviceWorker?.getRegistration().then((r) => r?.waiting?.postMessage('skipWaiting')).catch(() => {})
  window.setTimeout(() => window.location.reload(), 150)
  return true
}

function markReady(reason: 'sw' | 'server') {
  if (useUpdate.getState().ready) return
  useUpdate.setState({ ready: true, reason })
  if (!useUpdate.getState().inGame) applyUpdate()
}

/** The server's 'welcome' names the game version it ships (null in dev). */
export function noteServerVersion(v: string | null) {
  if (v && v !== __APP_VERSION__) markReady('server')
}

/** boot.tsx: the game is running now. */
export function setInGame(on: boolean) {
  useUpdate.setState({ inGame: on })
}

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch|Unable to preload|MIME type/i

/**
 * Wrap a dynamic import (the boot chunk, scenes, lazy panels): if this version's file is gone from the server (a
 * deploy happened while the tab was open and the file is not cached), save and reload into the new version instead
 * of hanging on the loading screen. Other errors are passed on.
 */
export function chunk<T>(load: Promise<T>): Promise<T> {
  return load.catch((err: unknown) => {
    if (CHUNK_ERROR.test(String((err as Error)?.message ?? err)) && applyUpdate()) return new Promise<T>(() => {})
    throw err
  })
}

/** Called once from main.tsx. */
export function startUpdates() {
  // A lazily loaded chunk of this (old) version is gone from the server: save and reload into the new version.
  window.addEventListener('vite:preloadError', (e) => {
    if (applyUpdate()) e.preventDefault()
  })
  // any other lazy import that failed the same way
  window.addEventListener('unhandledrejection', (e) => {
    if (CHUNK_ERROR.test(String(e.reason?.message ?? e.reason))) applyUpdate()
  })
  // In the background the player does not see a reload: take the update then.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && useUpdate.getState().ready) applyUpdate()
  })
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        const watch = (w: ServiceWorker | null) =>
          w?.addEventListener('statechange', () => {
            // installed while another version controls the page = an update is waiting / taking over
            if (w.state === 'installed' && navigator.serviceWorker.controller) markReady('sw')
          })
        watch(reg.installing)
        reg.addEventListener('updatefound', () => watch(reg.installing))
        if (reg.waiting && navigator.serviceWorker.controller) markReady('sw')
        // Long sessions: ask for a new version every 20 minutes and whenever the game comes back to the foreground.
        const check = () => void reg.update().catch(() => {})
        window.setInterval(check, 20 * 60_000)
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
      })
      .catch(() => {})
    // Ask the browser not to evict the downloaded game when the device is short on space.
    void navigator.storage?.persist?.().catch(() => false)
  })
}
