/**
 * 1.43 "Chơi thử" (sandbox, user: "chơi offline vô hạn tiền và có thể nhảy cảnh sang các mốc game để test").
 * Started from the title screen. It is a separate game: its own save (`visa-hunter-sandbox-save`), never synced to
 * the cloud, no multiplayer, money that never runs out, test tools always on (jump to any milestone, also back).
 * Lives in sessionStorage, so it survives a reload (e.g. an update) but a new tab starts the real game.
 * Title-screen safe: no game imports here.
 */
const FLAG = 'visa-hunter-sandbox'
export const SANDBOX_SAVE_KEY = 'visa-hunter-sandbox-save'
/** The states the test tools can go back to (game/systems/testMode.ts undoTest). */
export const SANDBOX_UNDO_KEY = 'visa-hunter-sandbox-undo'

function session(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function isSandbox(): boolean {
  return session()?.getItem(FLAG) === '1'
}

export function enterSandbox() {
  session()?.setItem(FLAG, '1')
}

/** Back to the title screen and the real game. */
export function leaveSandbox() {
  const s = session()
  s?.removeItem(FLAG)
  s?.removeItem(SANDBOX_UNDO_KEY)
  window.location.reload()
}
