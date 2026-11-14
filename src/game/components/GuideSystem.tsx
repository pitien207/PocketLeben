import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ConeGeometry, MeshBasicMaterial, RingGeometry, Vector3, type Group, type Mesh } from 'three'
import { useGuide, type GuidePointRef } from '../../store/guideStore'
import { useInteraction } from '../../store/interactionStore'
import { useSettings } from '../../store/settingsStore'
import { useUI } from '../../store/uiStore'
import { playerState } from '../systems/playerState'
import { npcPositions } from '../systems/registry'

/**
 * The guide's pointer in the world (plan: step-by-step guide): a bobbing gold arrow and a
 * pulsing ring at the current target, drawn through walls (2 draw calls). The same frame
 * loop places the on-screen edge arrow (ui/GuideEdgeArrow) when the target is off-screen.
 */

const GOLD = '#ffc531'
const _target = new Vector3()
const _ndc = new Vector3()

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

/** Screen-space margins the edge arrow stays inside (HUD on top, joystick/buttons below). */
const EDGE = { side: 34, top: 172, bottom: 196 }

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

  useFrame(({ camera, clock, size }) => {
    const edge = document.getElementById('guide-edge')
    const { guide, tour } = useGuide.getState()
    const ui = useUI.getState()
    const enabled = useSettings.getState().guideArrows && !ui.transition && !ui.sleeping
    const found = enabled ? resolve(guide?.point ?? null, _target) : null
    const g = group.current
    if (!g) return
    if (!found || tour === 'move' || tour === 'camera') {
      g.visible = false
      if (edge) edge.style.opacity = '0'
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

    // Edge arrow when the target is off-screen
    if (!edge) return
    _ndc.copy(_target).setY(1.2).project(camera)
    const behind = _ndc.z > 1
    let x = behind ? -_ndc.x : _ndc.x
    let y = behind ? -_ndc.y : _ndc.y
    const onScreen = !behind && Math.abs(x) < 0.92 && y > -0.62 && y < 0.6
    if (onScreen || near || ui.panel || useGuide.getState().tour === 'done') {
      edge.style.opacity = '0'
      return
    }
    if (behind && Math.abs(x) < 0.05 && Math.abs(y) < 0.05) y = -1 // straight behind: point down
    const px = (x * size.width) / 2
    const py = (-y * size.height) / 2
    const halfW = size.width / 2 - EDGE.side
    const limitY = py < 0 ? size.height / 2 - EDGE.top : size.height / 2 - EDGE.bottom
    const k = Math.min(halfW / Math.max(1e-3, Math.abs(px)), Math.max(10, limitY) / Math.max(1e-3, Math.abs(py)))
    x = size.width / 2 + px * k
    y = size.height / 2 + py * k
    edge.style.opacity = '1'
    edge.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    const pointer = edge.firstElementChild as HTMLElement | null
    if (pointer) pointer.style.transform = `rotate(${Math.atan2(py, px)}rad)`
    const label = edge.lastElementChild as HTMLElement | null
    const text = `${Math.round(dist)} m`
    if (label && label.textContent !== text) label.textContent = text
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={arrow} geometry={cone} material={material} renderOrder={20} />
      <mesh ref={ring} geometry={disc} material={material} renderOrder={20} />
    </group>
  )
}
