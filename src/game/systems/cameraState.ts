import { CONFIG } from '../../data/config'

const VIEW_KEY = 'visa-hunter-camera'
function loadView(): { zoom: number; pitch: number } {
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null') as { zoom?: unknown; pitch?: unknown } | null
    return {
      zoom: typeof v?.zoom === 'number' ? v.zoom : CONFIG.camera.userZoom.default,
      pitch: typeof v?.pitch === 'number' ? v.pitch : CONFIG.camera.pitchDeg,
    }
  } catch {
    return { zoom: CONFIG.camera.userZoom.default, pitch: CONFIG.camera.pitchDeg }
  }
}
const view = loadView()

/**
 * Camera state shared between the CameraRig (reads/writes) and gameplay code.
 * yaw = 0 → camera sits on +Z looking toward -Z.
 */
export const cameraState = {
  yaw: CONFIG.camera.initialYaw,
  /** If set, the rig eases `yaw` toward this, then clears it. Dragging cancels it. */
  targetYaw: null as number | null,
  /** Distance multiplier for interactions (1 = normal, < 1 = zoomed in), eased by the rig. */
  zoom: 1,
  /** Per-scene distance multiplier (rooms are viewed closer). */
  baseZoom: 1,
  /** Jump to the target next frame instead of easing (after a scene change). */
  snap: false,
  /** Player zoom (pinch / wheel / +− buttons): distance multiplier, remembered on this device. */
  userZoom: view.zoom,
  /** Player-chosen downward angle (drag up/down), degrees. */
  pitchDeg: view.pitch,
  /** Dev only: a fixed camera for inspecting models (`__vh.look(from, at)`, null = follow the player). */
  free: null as null | { from: [number, number, number]; at: [number, number, number] },
}

/** Turn and zoom the camera for an interaction; call `resetCameraFocus()` afterwards. */
export function focusCamera(yaw: number, zoom: number) {
  cameraState.targetYaw = yaw
  cameraState.zoom = zoom
}

export function resetCameraFocus() {
  cameraState.targetYaw = null
  cameraState.zoom = 1
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
let saveTimer: number | undefined

/** Zoom by a factor (> 1 = farther). */
export function zoomCamera(factor: number) {
  const { min, max } = CONFIG.camera.userZoom
  cameraState.userZoom = clamp(cameraState.userZoom * factor, min, max)
  saveView()
}

/** Tilt by degrees (> 0 = look more from above). */
export function tiltCamera(deg: number) {
  const { minPitchDeg, maxPitchDeg } = CONFIG.camera
  cameraState.pitchDeg = clamp(cameraState.pitchDeg + deg, minPitchDeg, maxPitchDeg)
  saveView()
}

function saveView() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify({ zoom: cameraState.userZoom, pitch: cameraState.pitchDeg }))
    } catch {
      // storage blocked: the view just isn't remembered
    }
  }, 400)
}
