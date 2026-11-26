import { memo, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, MeshLambertMaterial, MeshBasicMaterial, RepeatWrapping, SRGBColorSpace } from 'three'
import { groundMaterial, lambert, withGroundDetail } from '../shared/materials'
import { PALETTE as P } from '../shared/palette'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { makeTileTexture } from '../shared/textures'
import { BRIDGES, EISBACH, EISBACH_BRIDGES, FRAUENPLATZ, FUZO, GARTEN, HOFGARTEN, ISAR, LUDWIG, MARIENPLATZ, MAXSTR, MUC, ODEONSPLATZ, PRINZ, SENDLINGER, VIKTUALIEN, type Rect } from './mucLayout'

/**
 * 1.44 The ground of München: one big paving plane (tile texture) for the city, flat shapes on top for squares,
 * roads, lawns and gravel, the Isar and the Eisbach with a slowly flowing streak layer (texture offset only —
 * nothing is rebuilt per frame).
 */

const PAVE = { x0: -96, x1: ISAR.beach1, z0: -165, z1: 26 }
const WATER_Z = { z0: -190, z1: 60 }

const flat = (r: Rect, y: number, color: string, h = 0.02): ShapeItem => ({ box: [r.x1 - r.x0, h, r.z1 - r.z0], at: [(r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2], color })

function roadShapes(s: ShapeItem[], z0: number, z1: number, zebras: number[]) {
  const cz = (z0 + z1) / 2
  s.push({ box: [190, 0.02, z1 - z0], at: [-10, 0.006, cz], color: '#8f97a6' })
  for (let x = -100; x < 80; x += 4) s.push({ box: [2, 0.012, 0.14], at: [x, 0.02, cz], color: P.roadLine })
  for (const z of [z0, z1]) s.push({ box: [190, 0.12, 0.22], at: [-10, 0.06, z], color: '#cfcac0' })
  for (const x of zebras) for (let z = z0 + 0.45; z < z1 - 0.2; z += 0.8) s.push({ box: [2.4, 0.01, 0.42], at: [x, 0.022, z], color: P.roadLine })
}

function groundShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  // squares and pedestrian streets (slightly different stone than the pavements)
  s.push(flat(MARIENPLATZ, 0.008, '#d9d2c4'))
  s.push(flat(FUZO, 0.008, '#e2dacb'))
  s.push(flat(FRAUENPLATZ, 0.007, '#ddd5c6'))
  s.push(flat(SENDLINGER, 0.008, '#e2dacb'))
  s.push(flat(ODEONSPLATZ, 0.008, '#ddd6c8'))
  s.push(flat({ x0: LUDWIG.x0, x1: LUDWIG.x1, z0: MUC.minZ - 10, z1: PRINZ.walk0 }, 0.008, '#e0dacd'))
  s.push(flat(VIKTUALIEN, 0.008, '#e6dcc6'))
  // the granite pattern of Marienplatz: a ring round the column
  s.push({ torus: [5.5, 0.18, 3, 40], at: [-19, 0.012, -33], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.05], color: '#b9b0a0' })
  // roads with zebra crossings at the paths that cross them
  roadShapes(s, MAXSTR.z0, MAXSTR.z1, [-43, -14, 38])
  roadShapes(s, PRINZ.z0, PRINZ.z1, [-43, -20, 38])
  // Hofgarten: gravel, lawns in four quarters, the cross of paths
  s.push(flat(HOFGARTEN, 0.009, '#e6dcc6'))
  const hx = (HOFGARTEN.x0 + HOFGARTEN.x1) / 2
  const hz = (HOFGARTEN.z0 + HOFGARTEN.z1) / 2
  for (const [qx, qz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const cx = qx < 0 ? (HOFGARTEN.x0 + hx) / 2 - 1.2 : (hx + HOFGARTEN.x1) / 2 + 1.2
    const cz = hz + qz * 6.5
    s.push({ box: [(HOFGARTEN.x1 - HOFGARTEN.x0) / 2 - 7, 0.03, 8], at: [cx, 0.014, cz], color: '#a8d08d' })
  }
  // Englischer Garten: meadow with gravel paths
  s.push(flat(GARTEN, 0.01, '#9fcd82', 0.03))
  for (const [x0, z0, x1, z1, w] of [
    [-34, -120.3, 34, -120.3, 2],
    [-18.5, -150, -18.5, -121, 2.2],
    [10, -150, 10, -110, 2.2],
    [-18.5, -132, 20, -132, 2.2],
    [20, -150, 20, -127, 2.2],
    [-18.5, -140, -9.5, -140, 2],
  ] as const) {
    const len = Math.hypot(x1 - x0, z1 - z0)
    s.push({ box: [w, 0.03, len], at: [(x0 + x1) / 2, 0.018, (z0 + z1) / 2], rot: [0, Math.atan2(x1 - x0, z1 - z0), 0], color: '#e6dcc6' })
  }
  s.push({ cyl: [9, 9, 0.03, 24], at: [20, 0.019, -137], color: '#e2d6bc' })
  // the Eisbach: stone edges and water
  const eb = EISBACH
  s.push({ box: [eb.x1 - eb.x0, 0.04, eb.z1 - eb.z0 + 1.2], at: [(eb.x0 + eb.x1) / 2, 0.012, (eb.z0 + eb.z1) / 2], color: '#bfb8aa' })
  s.push({ box: [eb.x1 - eb.x0, 0.04, eb.z1 - eb.z0], at: [(eb.x0 + eb.x1) / 2, 0.02, (eb.z0 + eb.z1) / 2], color: '#5f9fb3' })
  // the Isar: promenade (paved), gravel beaches, the river, the east bank
  s.push({ box: [ISAR.beach1 - ISAR.walk1, 0.03, WATER_Z.z1 - WATER_Z.z0], at: [(ISAR.walk1 + ISAR.beach1) / 2, 0.012, (WATER_Z.z0 + WATER_Z.z1) / 2], color: '#d8cfbc' })
  s.push({ box: [ISAR.water1 - ISAR.water0, 0.03, WATER_Z.z1 - WATER_Z.z0], at: [(ISAR.water0 + ISAR.water1) / 2, 0.006, (WATER_Z.z0 + WATER_Z.z1) / 2], color: '#6aa9b8' })
  s.push({ box: [ISAR.beach2 - ISAR.water1, 0.03, WATER_Z.z1 - WATER_Z.z0], at: [(ISAR.water1 + ISAR.beach2) / 2, 0.012, (WATER_Z.z0 + WATER_Z.z1) / 2], color: '#d8cfbc' })
  s.push({ box: [ISAR.east1 - ISAR.beach2 + 0.2, 0.03, WATER_Z.z1 - WATER_Z.z0], at: [(ISAR.beach2 + ISAR.east1) / 2, 0.012, (WATER_Z.z0 + WATER_Z.z1) / 2], color: '#ddd6c8' })
  // pebbles on the beaches
  for (let i = 0; i < 90; i++) {
    const a = Math.sin(i * 91.7) * 0.5 + 0.5
    const z = WATER_Z.z0 + 30 + ((i * 37.3) % 200)
    const x = i % 2 ? ISAR.walk1 + 0.4 + a * 3.2 : ISAR.water1 + 0.3 + a * 2.4
    s.push({ ico: [0.12 + (i % 3) * 0.05, 0], at: [x, 0.04, z], scale: [1.2, 0.5, 1], color: i % 3 ? '#b8afa0' : '#cfc6b4' })
  }
  // bridges: decks over the beaches and the water
  for (const b of BRIDGES) s.push({ box: [ISAR.beach2 - ISAR.walk1 + 0.4, 0.06, b.z1 - b.z0], at: [(ISAR.walk1 + ISAR.beach2) / 2, 0.035, (b.z0 + b.z1) / 2], color: '#cbc3b4' })
  for (const [x0, x1] of EISBACH_BRIDGES) s.push({ box: [x1 - x0, 0.06, eb.z1 - eb.z0 + 1.6], at: [(x0 + x1) / 2, 0.04, (eb.z0 + eb.z1) / 2], color: x0 > 0 && x0 < 20 ? '#a07a52' : '#cbc3b4' })
  // the road continues on the bridges
  for (const b of [BRIDGES[0], BRIDGES[1], BRIDGES[2]]) {
    const r0 = b.z0 + 1.0
    const r1 = b.z1 - 1.0
    s.push({ box: [ISAR.east1 - ISAR.walk1 + 40, 0.02, r1 - r0], at: [(ISAR.walk1 + ISAR.east1) / 2 + 20, 0.07, (r0 + r1) / 2], color: '#8f97a6' })
  }
  return s
}

/** Soft white streaks that drift downstream (Isar: towards +z, Eisbach: towards +x). */
function streakTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 128, 128)
  for (let i = 0; i < 26; i++) {
    const x = (i * 53) % 128
    const y = (i * 29) % 128
    const len = 14 + ((i * 7) % 22)
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + ((i * 13) % 10) / 30})`
    ctx.lineWidth = 1.5 + (i % 3)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + len)
    ctx.stroke()
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  return t
}

function FlowingWater() {
  const { isar, eisbach } = useMemo(() => {
    const mk = (rx: number, ry: number) => {
      const map = streakTexture()
      map.repeat.set(rx, ry)
      return new MeshBasicMaterial({ map, transparent: true, opacity: 0.55, depthWrite: false })
    }
    return { isar: mk(3, 60), eisbach: mk(20, 1.2) }
  }, [])
  useEffect(
    () => () => {
      for (const m of [isar, eisbach]) {
        m.map?.dispose()
        m.dispose()
      }
    },
    [isar, eisbach],
  )
  useFrame((_, dt) => {
    if (isar.map) isar.map.offset.y -= dt * 0.035
    if (eisbach.map) eisbach.map.offset.y -= dt * 0.9
  })
  const eb = EISBACH
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[(ISAR.water0 + ISAR.water1) / 2, 0.03, (WATER_Z.z0 + WATER_Z.z1) / 2]} material={isar} renderOrder={1}>
        <planeGeometry args={[ISAR.water1 - ISAR.water0, WATER_Z.z1 - WATER_Z.z0]} />
      </mesh>
      {/* Eisbach: the texture's v runs along the channel (plane turned 90°) */}
      <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 2]} position={[(eb.x0 + eb.x1) / 2, 0.045, (eb.z0 + eb.z1) / 2]} material={eisbach} renderOrder={1}>
        <planeGeometry args={[eb.z1 - eb.z0, eb.x1 - eb.x0]} />
      </mesh>
    </>
  )
}

export const MunichGround = memo(function MunichGround() {
  const paving = useMemo(() => {
    const map = makeTileTexture('#dcd7cf', '#c2bbb0', PAVE.x1 - PAVE.x0, PAVE.z1 - PAVE.z0)
    return withGroundDetail(new MeshLambertMaterial({ map }), 'concrete', 3.1, 0.45)
  }, [])
  useEffect(
    () => () => {
      paving.map?.dispose()
      paving.dispose()
    },
    [paving],
  )
  const shapes = useMemo(groundShapes, [])
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[-5, -0.02, -70]} material={lambert('#bcd6a6')} receiveShadow>
        <planeGeometry args={[480, 480]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(PAVE.x0 + PAVE.x1) / 2, 0, (PAVE.z0 + PAVE.z1) / 2]} material={paving} receiveShadow>
        <planeGeometry args={[PAVE.x1 - PAVE.x0, PAVE.z1 - PAVE.z0]} />
      </mesh>
      <Shapes shapes={shapes} material={groundMaterial} castShadow={false} />
      <FlowingWater />
    </>
  )
})
