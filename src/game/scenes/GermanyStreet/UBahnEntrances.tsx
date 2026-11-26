import { memo, useMemo } from 'react'
import { CuboidCollider } from '@react-three/rapier'
import { U_STATIONS, type UStationId } from '../../../data/transit'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { LabelSheet, SIGN_SANS, type Label } from '../shared/LabelSheet'
import { glowMaterial } from '../shared/materials'
import { Shapes, type ShapeItem } from '../shared/Shapes'

/**
 * 1.48 The U-Bahn entrances in München (data/transit.ts U_STATIONS): a stairwell going down (steps darkening into the
 * ground, granite rim, glass balustrade on three sides), the blue "U" pylon (lit cube) with the station name, and the
 * spot "Xuống U-Bahn" on the open side → `ubahn.enter <station>` (scene `ubahn`).
 */

const LEN = 4.4
const WID = 2.4

function entranceShapes(): { s: ShapeItem[]; glow: ShapeItem[] } {
  const s: ShapeItem[] = []
  const glow: ShapeItem[] = []
  for (const st of Object.values(U_STATIONS)) {
    const { x, z, open } = st.street
    const back = z - open * (LEN / 2)
    // granite rim round the hole
    s.push({ box: [WID + 0.5, 0.08, 0.25], at: [x, 0.04, back - open * 0.12], color: '#b9b4aa' })
    for (const sx of [-1, 1]) s.push({ box: [0.25, 0.08, LEN + 0.25], at: [x + sx * (WID / 2 + 0.12), 0.04, z - open * 0.12], color: '#b9b4aa' })
    // steps going down: each one a little darker, the bottom almost black
    const n = 9
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const g = Math.round(150 - t * 125)
      const col = `rgb(${g},${g},${g + 6})`
      s.push({ box: [WID, 0.02, LEN / n], at: [x, 0.012 + 0.0005 * i, z + open * (LEN / 2 - (i + 0.5) * (LEN / n))], color: col })
      s.push({ box: [WID, 0.006, 0.05], at: [x, 0.024 + 0.0005 * i, z + open * (LEN / 2 - (i + 0.98) * (LEN / n))], color: '#e8c547' })
    }
    // glass balustrade on the two long sides + the back, steel posts and a handrail
    for (const sx of [-1, 1]) {
      s.push({ box: [0.04, 0.95, LEN], at: [x + sx * (WID / 2 + 0.05), 0.55, z], color: '#bcd6e2' })
      s.push({ box: [0.08, 0.06, LEN + 0.1], at: [x + sx * (WID / 2 + 0.05), 1.05, z], color: '#7c8792' })
      for (let k = 0; k <= 3; k++) s.push({ box: [0.07, 1.05, 0.07], at: [x + sx * (WID / 2 + 0.05), 0.52, z - LEN / 2 + (k * LEN) / 3], color: '#7c8792' })
    }
    s.push({ box: [WID + 0.1, 0.95, 0.04], at: [x, 0.55, back], color: '#bcd6e2' })
    s.push({ box: [WID + 0.16, 0.06, 0.08], at: [x, 1.05, back], color: '#7c8792' })
    // the pylon beside the open end: grey post, blue cube with a lit "U"
    const px = x + WID / 2 + 0.55
    const pz = z + open * (LEN / 2 - 0.3)
    s.push({ box: [0.22, 3.2, 0.22], at: [px, 1.6, pz], color: '#5d6672' })
    s.push({ box: [0.86, 0.86, 0.86], at: [px, 3.55, pz], color: '#0065ae' })
    glow.push({ box: [0.7, 0.06, 0.7], at: [px, 3.99, pz], color: '#bfe0ff' })
  }
  return { s, glow }
}

function uFace(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#0065ae'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = W * 0.07
  ctx.strokeRect(W * 0.08, H * 0.08, W * 0.84, H * 0.84)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${H * 0.72}px ${SIGN_SANS}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('U', W / 2, H * 0.55)
}

function namePlate(name: string) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#0065ae'
    let size = H * 0.5
    ctx.font = `800 ${size}px ${SIGN_SANS}`
    while (ctx.measureText(name).width > W * 0.9 && size > 6) {
      size *= 0.92
      ctx.font = `800 ${size}px ${SIGN_SANS}`
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, W / 2, H * 0.36)
    ctx.fillStyle = '#555'
    ctx.font = `700 ${H * 0.26}px ${SIGN_SANS}`
    ctx.fillText('U3 · U6', W / 2, H * 0.76)
  }
}

function labels(): Label[] {
  const out: Label[] = []
  for (const st of Object.values(U_STATIONS)) {
    const { x, z, open } = st.street
    const px = x + WID / 2 + 0.55
    const pz = z + open * (LEN / 2 - 0.3)
    // the four faces of the cube
    out.push({ w: 0.8, h: 0.8, at: [px, 3.55, pz + 0.44], rotY: 0, draw: uFace })
    out.push({ w: 0.8, h: 0.8, at: [px, 3.55, pz - 0.44], rotY: Math.PI, draw: uFace })
    out.push({ w: 0.8, h: 0.8, at: [px + 0.44, 3.55, pz], rotY: Math.PI / 2, draw: uFace })
    out.push({ w: 0.8, h: 0.8, at: [px - 0.44, 3.55, pz], rotY: -Math.PI / 2, draw: uFace })
    // the station name on the post, toward the open side and back
    const plate = namePlate(st.name)
    out.push({ w: 1.3, h: 0.42, at: [px, 2.75, pz + 0.12], rotY: 0, draw: plate })
    out.push({ w: 1.3, h: 0.42, at: [px, 2.75, pz - 0.12], rotY: Math.PI, draw: plate })
  }
  return out
}

const ENTER = (id: UStationId): SpotAction[] => [{ id: 'ubahn', labelKey: 'action.ubahnEnter', icon: 'metro', action: 'ubahn.enter', arg: id, primary: true }]

export const UBahnEntrances = memo(function UBahnEntrances() {
  const { s, glow } = useMemo(entranceShapes, [])
  const lbl = useMemo(labels, [])
  return (
    <>
      <Shapes shapes={s} />
      <Shapes shapes={glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      <LabelSheet labels={lbl} ppm={160} />
      {Object.values(U_STATIONS).map((st) => (
        <CuboidCollider
          key={`c-${st.id}`}
          args={[WID / 2 + 0.1, 0.6, LEN / 2]}
          position={[st.street.x, 0.6, st.street.z]}
          collisionGroups={PROP_GROUPS}
        />
      ))}
      {Object.values(U_STATIONS).map((st) => (
        <CuboidCollider key={`p-${st.id}`} args={[0.15, 1.6, 0.15]} position={[st.street.x + WID / 2 + 0.55, 1.6, st.street.z + st.street.open * (LEN / 2 - 0.3)]} collisionGroups={PROP_GROUPS} />
      ))}
      {Object.values(U_STATIONS).map((st) => (
        <ActionSpot
          key={st.id}
          id={`ubahn-${st.id}`}
          name={{ vi: `U-Bahn ${st.name}`, en: `U-Bahn ${st.name}`, de: `U-Bahn ${st.name}` }}
          zone={{ x: st.street.x, z: st.street.z + st.street.open * (LEN / 2 + 0.9), halfX: 1.5, halfZ: 0.9 }}
          actions={ENTER(st.id)}
        />
      ))}
    </>
  )
})
