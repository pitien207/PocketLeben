/**
 * Shared, mutable input state.
 * Written by DOM handlers (keyboard, joystick) and read inside useFrame,
 * so moving never triggers React re-renders.
 */

export interface Vec2 {
  x: number
  y: number
}

type Direction = 'up' | 'down' | 'left' | 'right'

const keys: Record<Direction, boolean> = { up: false, down: false, left: false, right: false }
const joystick: Vec2 = { x: 0, y: 0 }
/** Sprint: Shift held (keyboard) or the run toggle (touch). */
const sprint = { shift: false, toggle: false }

export function isSprinting() {
  return sprint.shift || sprint.toggle
}

export function setSprintToggle(on: boolean) {
  sprint.toggle = on
}

export function sprintToggleOn() {
  return sprint.toggle
}

const KEY_MAP: Partial<Record<string, Direction>> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

/** x = right, y = forward, both in [-1, 1]. */
export function setJoystick(x: number, y: number) {
  joystick.x = x
  joystick.y = y
}

/** Combined move input (x = right, y = forward). Length is clamped to 1. */
export function readMoveInput(out: Vec2): Vec2 {
  let x = joystick.x + (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  let y = joystick.y + (keys.up ? 1 : 0) - (keys.down ? 1 : 0)
  const length = Math.hypot(x, y)
  if (length > 1) {
    x /= length
    y /= length
  }
  out.x = x
  out.y = y
  return out
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

/** Binds WASD + arrow keys (+ Shift to run). Returns an unbind function (use in useEffect). */
export function bindKeyboard(): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') sprint.shift = true
    const dir = KEY_MAP[e.code]
    if (!dir || isTypingTarget(e.target)) return
    keys[dir] = true
    e.preventDefault() // stop arrow keys from scrolling
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') sprint.shift = false
    const dir = KEY_MAP[e.code]
    if (dir) keys[dir] = false
  }
  // Avoid "stuck" keys when the window loses focus mid-press.
  const releaseAll = () => {
    keys.up = keys.down = keys.left = keys.right = false
    sprint.shift = false
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', releaseAll)
  document.addEventListener('visibilitychange', releaseAll)
  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', releaseAll)
    document.removeEventListener('visibilitychange', releaseAll)
    releaseAll()
  }
}
