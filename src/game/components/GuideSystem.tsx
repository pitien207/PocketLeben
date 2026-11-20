import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ConeGeometry, MeshBasicMaterial, RingGeometry, Vector3, type Group, type Mesh } from 'three'
import { useGuide, type GuidePointRef } from '../../store/guideStore'
import { useInteraction } from '../../store/interactionStore'
import { useSettings } from '../../store/settingsStore'
import { useUI } from '../../store/uiStore'
import { playerState } from '../systems/playerState'
import { cameraState } from '../systems/cameraState'
import { COMPASS_PX } from '../../ui/CompassBar'
import { npcPositions } from '../systems/registry'

/**
 * The guide's pointer in the world (plan: step-by-step guide): a bobbing gold arrow and a
 * pulsing ring at the current target, drawn through walls (2 draw calls). The same frame
 * loop moves the compass strip and its objective pin (ui/CompassBar, 1.36).
 */

const GOLD = '#ffc531'
const _target = new Vector3()

/** Where the guide points right now, in world space (null = nothing in this scene). */
function resolve(point: GuidePointRef | null, out: Vector3): { height: number } | null {
  if (!point) return null
  if (point.kind === 'at') {
    out.set(point.at[0], 0, point.at[2])
    return { height: point.at[1] }
  }
  if (point.kind === 'npc') {
    const p = npcPositions.get(point.id)
    if (!p) return null
    out.set(p.x, 0, p.z)
    return { height: 2.55 }
  }
  const def = useInteraction.getState().items[point.id]
  if (!def) return null
  out.set(def.zone.x, 0, def.zone.z)
  return { height: 2.1 }
}

export function GuideSystem() {
  const group = useRef<Group>(null)
  const arrow = useRef<Mesh>(null)
  const ring = useRef<Mesh>(null)

  const { cone, disc, material } = useMemo(() => {
    const cone = new ConeGeometry(0.26, 0.55, 4)
    cone.rotateX(Math.PI) // point down
    const disc = new RingGeometry(0.55, 0.72, 32)
    disc.rotateX(-Math.PI / 2)
    const material = new MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false })
    return { cone, disc, material }
  }, [])

  // 1.36: the compass strip (ui/CompassBar) — elements looked up once, its width cached per screen size.
  const compass = useRef<{ bar: HTMLElement; strip: HTMLElement; mark: HTMLElement; label: HTMLElement; w: number; sw: number } | null>(null)
  useFrame(({ clock, size }) => {
    if (!compass.current?.bar.isConnected) {
      const bar = document.getElementById('compass-bar')
      const strip = document.getElementById('compass-strip')
      const mark = document.getElementById('compass-mark')
      compass.current = bar && strip && mark ? { bar, strip, mark, label: mark.lastElementChild as HTMLElement, w: bar.clientWidth, sw: -1 } : null
    }
    const cp = compass.current
    if (cp && cp.sw !== size.width) {
      cp.w = cp.bar.clientWidth
      cp.sw = size.width
    }
    // Where the camera looks, in degrees clockwise from north (−z): the strip slides under the centre notch.
    const heading = ((((-cameraState.yaw * 180) / Math.PI) % 360) + 360) % 360
    if (cp) cp.strip.style.transform = `translateX(${(cp.w / 2 - (heading + 360) * COMPASS_PX).toFixed(1)}px)`
    const edge = cp
    const { guide, tour } = useGuide.getState()
    const ui = useUI.getState()
    const enabled = useSettings.getState().guideArrows && !ui.transition && !ui.sleeping
    const found = enabled ? resolve(guide?.point ?? null, _target) : null
    const g = group.current
    if (!g) return
    if (!found || tour === 'move' || tour === 'camera') {
      g.visible = false
      if (edge) edge.mark.style.opacity = '0'
      return
    }

    // World marker
    const t = clock.elapsedTime
    const dist = Math.hypot(playerState.position.x - _target.x, playerState.position.z - _target.z)
    const near = dist < 1.3
    g.visible = true
    g.position.set(_target.x, 0, _target.z)
    if (arrow.current) {
      arrow.current.visible = !near
      arrow.current.position.y = found.height + 0.35 + Math.sin(t * 3.2) * 0.14
      arrow.current.rotation.y = t * 1.8
    }
    if (ring.current) {
      const pulse = 1 + Math.sin(t * 3.2) * 0.12
      ring.current.scale.set(pulse, 1, pulse)
      ring.current.position.y = 0.04
    }
    material.opacity = 0.75 + Math.sin(t * 3.2) * 0.2

    // The objective on the compass: its bearing relative to the view, held at the strip's ends when beside / behind.
    if (!edge) return
    const dx = _target.x - playerState.position.x
    const dz = _target.z - playerState.position.z
    const bearing = (Math.atan2(dx, -dz) * 180) / Math.PI
    const rel = ((((bearing - heading) % 360) + 540) % 360) - 180
    const half = edge.w / 2 - 14
    const px = Math.max(-half, Math.min(half, rel * COMPASS_PX))
    edge.mark.style.opacity = near ? '0' : '1'
    edge.mark.style.transform = `translateX(${(edge.w / 2 + px - 14).toFixed(1)}px)`
    const text = Math.abs(rel * COMPASS_PX) > half ? `${rel < 0 ? '◀ ' : ''}${Math.round(dist)} m${rel > 0 ? ' ▶' : ''}` : `${Math.round(dist)} m`
    if (edge.label.textContent !== text) edge.label.textContent = text
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={arrow} geometry={cone} material={material} renderOrder={20} />
      <mesh ref={ring} geometry={disc} material={material} renderOrder={20} />
    </group>
  )
}
