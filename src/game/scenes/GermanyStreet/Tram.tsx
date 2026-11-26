import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { damp } from '../../systems/math'
import { playerState } from '../../systems/playerState'
import { streetHorn } from '../../systems/audio'
import { LabelSheet, SIGN_SANS, type Label } from '../shared/LabelSheet'
import { modelShapes } from '../shared/models'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { MAXSTR, MUC, ROAD_WRAP } from './mucLayout'

/**
 * 1.48 Tram 19 on Maximilianstraße (Kenney Train Kit "tram-modern" ×3 as one articulated tram, MVG blue): rails down the
 * middle of the road between the two car lanes; the tram runs to the end of the street, then comes back the other way.
 * It slows and stops for the player standing on the track. Purely street life (no boarding — the U-Bahn and buses do that).
 */

const Z = (MAXSTR.z0 + MAXSTR.z1) / 2
const K = 2.0
const MOD = 2.687 * K
const N = 3
const HALF_LEN = (MOD * N) / 2
const SPEED = 6

const PAINT: Record<string, string> = { '#6f748c': '#2a62b0', '#9ba3c3': '#eef1f4', '#5e72ca': '#2a62b0', '#99bcec': '#34465c', '#3e3e46': '#2b2e33' }

function tramShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const m = modelShapes('klTramModern', { scale: K, paint: (_m, c) => PAINT[c] ?? c })
  for (let i = 0; i < N; i++) {
    const z = ((N - 1) / 2 - i) * MOD
    // the last module is turned round so the tram has a cab at both ends
    if (m) s.push({ group: m, at: [0, 0, z], rot: [0, i === N - 1 ? Math.PI : 0, 0] })
    else s.push({ box: [2.3, 3.1, MOD - 0.2], at: [0, 1.7, z], color: '#2a62b0' }, { box: [2.32, 1.0, MOD - 0.2], at: [0, 2.4, z], color: '#eef1f4' })
  }
  return s
}

function railShapes(): ShapeItem[] {
  const L = MUC.maxX - MUC.minX
  const cx = (MUC.maxX + MUC.minX) / 2
  return [-0.72, 0.72].flatMap((dz) => [
    { box: [L, 0.012, 0.16], at: [cx, 0.012, Z + dz], color: '#55585e' },
    { box: [L, 0.014, 0.05], at: [cx, 0.014, Z + dz], color: '#a7adb5' },
  ]) as ShapeItem[]
}

function sign(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#121212'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#ffb000'
  ctx.font = `800 ${H * 0.66}px ${SIGN_SANS}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('19  St. Veit-Straße', W / 2, H * 0.54)
}

export const Tram = memo(function Tram() {
  const shapes = useMemo(tramShapes, [])
  const rails = useMemo(railShapes, [])
  const labels = useMemo<Label[]>(() => [{ w: 1.6, h: 0.28, at: [0, 3.05, HALF_LEN + 0.03], draw: sign }], [])
  const group = useRef<Group>(null)
  const rb = useRef<RapierRigidBody>(null)
  const st = useRef({ x: -20, dir: 1 as 1 | -1, v: SPEED, rang: false })
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1)
    const s = st.current
    const p = playerState.position
    const ahead = (p.x - s.x) * s.dir - HALF_LEN
    const onTrack = Math.abs(p.z - Z) < 1.7
    const blocked = onTrack && ahead > -1 && ahead < 10
    const target = blocked ? Math.max(0, (SPEED * (ahead - 2)) / 8) : SPEED
    // 1.49 the tram rings its bell at you
    if (blocked && !s.rang) streetHorn('tram')
    s.rang = blocked || (onTrack && ahead > -1 && ahead < 16 && s.rang)
    s.v = damp(s.v, target, target < s.v ? 5 : 1.2, dt)
    s.x += s.dir * s.v * dt
    if (s.x * s.dir > ROAD_WRAP) {
      s.dir = s.dir > 0 ? -1 : 1
      s.x = -s.dir * ROAD_WRAP * 0.98
    }
    const g = group.current
    if (g) {
      g.position.x = s.x
      g.rotation.y = s.dir > 0 ? Math.PI / 2 : -Math.PI / 2
    }
    rb.current?.setNextKinematicTranslation({ x: s.x, y: 0, z: Z })
  })
  return (
    <>
      <Shapes shapes={rails} castShadow={false} />
      <group ref={group} position={[-20, 0, Z]} rotation={[0, Math.PI / 2, 0]}>
        <Shapes shapes={shapes} />
        <LabelSheet labels={labels} ppm={160} />
      </group>
      <RigidBody ref={rb} type="kinematicPosition" colliders={false} position={[-20, 0, Z]}>
        <CuboidCollider args={[HALF_LEN, 1.4, 1.1]} position={[0, 1.4, 0]} />
      </RigidBody>
    </>
  )
})
