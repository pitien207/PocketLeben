import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { PerspectiveCamera, Vector3, type Object3D } from 'three'
import { CONFIG } from '../../data/config'
import { cameraState, tiltCamera, zoomCamera } from '../systems/cameraState'
import { occlusion } from '../scenes/shared/materials'
import { CAMERA_RAY_GROUPS } from '../systems/collisionGroups'
import { damp, dampAngle, dampFactor } from '../systems/math'

const _target = new Vector3()
const _look = new Vector3()
const _desired = new Vector3()
const _dir = new Vector3()

/** Gap kept between the camera and a wall it was pulled in front of. */
const WALL_PADDING = 0.35
/** When a building is in the way, first try looking from higher up (degrees added to the pitch). */
const LIFT_STEPS = [10, 20, 30]
const MAX_PITCH = 82

/**
 * Third-person follow camera (plan §2): high angle, smooth follow. Drag to orbit 360° (left/right)
 * and tilt (up/down); pinch with two fingers or use the mouse wheel to zoom.
 * Must live inside <Physics> — it ray-casts against buildings so they never hide the player.
 */
export function CameraRig({ target }: { target: RefObject<Object3D | null> }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const { world, rapier } = useRapier()

  const ray = useRef<InstanceType<typeof rapier.Ray> | null>(null)
  const lookAt = useRef(new Vector3())
  const distance = useRef<number>(CONFIG.camera.distance)
  const zoom = useRef(1)
  /** Extra pitch (degrees) used to look over a building instead of jumping in front of it. */
  const lift = useRef(0)
  const initialized = useRef(false)

  // One finger / mouse: orbit + tilt. Two fingers: pinch to zoom. Wheel: zoom.
  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDist = 0

    const spread = () => {
      const [p, q] = [...pointers.values()]
      return Math.hypot(p.x - q.x, p.y - q.y)
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (pointers.size >= 2) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      cameraState.targetYaw = null // the player takes over
      el.setPointerCapture(e.pointerId)
      if (pointers.size === 2) pinchDist = spread()
    }
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (pointers.size === 2) {
        const d = spread()
        if (pinchDist > 0 && d > 0) zoomCamera(pinchDist / d)
        pinchDist = d
        return
      }
      cameraState.yaw -= dx * CONFIG.camera.dragSensitivity
      tiltCamera(dy * CONFIG.camera.tiltSensitivity)
    }
    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return
      pinchDist = 0
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomCamera(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.0022))
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  // Default priority (0): runs after the player (-100) and the physics step (-50).
  useFrame((state, rawDt) => {
    const t = target.current
    if (!t) return
    if (cameraState.free) {
      camera.position.set(...cameraState.free.from)
      camera.lookAt(...cameraState.free.at)
      // Telephoto from a few metres away: outside the "too close to the lens" fade.
      const fov = cameraState.free.fov ?? 22
      if (camera instanceof PerspectiveCamera && camera.fov !== fov) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
      occlusion.target.value.copy(camera.position)
      occlusion.feet.value = -1000
      return
    }
    const dt = Math.min(rawDt, 0.1)
    const cfg = CONFIG.camera

    t.getWorldPosition(_target)
    _look.copy(_target)
    _look.y += cfg.lookHeight

    // Portrait phones see less horizontally: widen the FOV and back off a little.
    const aspect = state.size.width / Math.max(1, state.size.height)
    const portrait = aspect >= 1 ? 0 : Math.min(1, (1 - aspect) / 0.5)
    zoom.current = damp(zoom.current, cameraState.zoom * cameraState.baseZoom, 3, dt)
    // Rooms keep the authored framing; outdoors the player's own zoom applies.
    const user = cameraState.baseZoom < 1 ? Math.min(cameraState.userZoom, 1.3) : cameraState.userZoom
    let wanted = cfg.distance * (1 + (cfg.portraitDistanceScale - 1) * portrait) * zoom.current * user
    const fov = cfg.fov + (cfg.portraitFov - cfg.fov) * portrait
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    if (cameraState.targetYaw !== null) {
      cameraState.yaw = dampAngle(cameraState.yaw, cameraState.targetYaw, 4, dt)
      if (Math.abs(Math.sin((cameraState.yaw - cameraState.targetYaw) / 2)) < 0.005) cameraState.targetYaw = null
    }
    const yaw = cameraState.yaw

    // A building between the camera and the player? Rather than jumping in close (jarring in
    // narrow lanes), first rise to look over it; only what's left is solved by coming closer,
    // and that happens smoothly. The silhouette shows the player for the moment in between.
    ray.current ??= new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })
    const r = ray.current
    const clearance = (pitchDeg: number) => {
      const p = (Math.min(MAX_PITCH, pitchDeg) * Math.PI) / 180
      _dir.set(Math.sin(yaw) * Math.cos(p), Math.sin(p), Math.cos(yaw) * Math.cos(p))
      r.origin = { x: _look.x, y: _look.y, z: _look.z }
      r.dir = { x: _dir.x, y: _dir.y, z: _dir.z }
      const hit = world.castRay(r, wanted, true, undefined, CAMERA_RAY_GROUPS)
      return hit ? hit.timeOfImpact - WALL_PADDING : wanted
    }
    const basePitch = cameraState.pitchDeg
    // 1.36: outdoors the camera never dodges (user: zooming in at corners was hard to look at) — whatever is in the
    // way fades instead (scenes/shared/materials.ts occlusion). Rooms keep the old behaviour.
    const indoor = cameraState.baseZoom < 1
    let wantLift = 0
    if (indoor && clearance(basePitch) < wanted * 0.85) {
      let best = clearance(basePitch)
      for (const step of LIFT_STEPS) {
        if (basePitch + step > MAX_PITCH + 0.01 && step !== LIFT_STEPS[0]) break
        const c = clearance(basePitch + step)
        if (c > best + 0.4) {
          best = c
          wantLift = step
        }
        if (c >= wanted * 0.85) break
      }
    }
    // Rise fairly quickly, settle back down slowly (no bobbing at corners).
    lift.current = damp(lift.current, wantLift, wantLift > lift.current ? 4 : 1.5, dt)
    const pitchDeg = Math.min(MAX_PITCH, basePitch + lift.current)
    if (indoor) wanted = Math.min(wanted, Math.max(cfg.minDistance, clearance(pitchDeg))) // also sets _dir
    else {
      const p = (pitchDeg * Math.PI) / 180
      _dir.set(Math.sin(yaw) * Math.cos(p), Math.sin(p), Math.cos(yaw) * Math.cos(p))
    }

    // Ease in when blocked (quick but never a jump cut), ease back out when clear.
    distance.current = damp(distance.current, wanted, wanted < distance.current ? 7 : 2.5, dt)

    _desired.copy(_look).addScaledVector(_dir, distance.current)

    if (!initialized.current || cameraState.snap) {
      if (cameraState.snap) {
        zoom.current = cameraState.zoom * cameraState.baseZoom
        distance.current = wanted
        lift.current = 0
        _desired.copy(_look).addScaledVector(_dir, distance.current)
        cameraState.snap = false
      }
      camera.position.copy(_desired)
      lookAt.current.copy(_look)
      initialized.current = true
    } else {
      const k = dampFactor(cfg.followSharpness, dt)
      camera.position.lerp(_desired, k)
      lookAt.current.lerp(_look, Math.min(1, k * 1.5))
    }
    camera.lookAt(lookAt.current)
    occlusion.target.value.copy(_look)
    occlusion.feet.value = _target.y
  })

  return null
}
