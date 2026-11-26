import { useEffect, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { MeshLambertMaterial } from 'three'
import { groundMaterial, lambert, withGroundDetail } from '../shared/materials'
import { PALETTE as P } from '../shared/palette'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { makeTileTexture } from '../shared/textures'
import { NORTH, PLAY, ROAD, SIDE_ROAD } from './layout'

const FAR = 80 // roads run off into the fog
const PAVE = { minX: PLAY.minX - 0.6, maxX: PLAY.maxX + 0.6, minZ: PLAY.minZ - 0.4, maxZ: PLAY.maxZ + 0.6 }

/** Roads, curbs and markings — all one merged mesh. */
function roadShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const roadW = ROAD.maxZ - ROAD.minZ
  const roadZ = (ROAD.minZ + ROAD.maxZ) / 2
  const sideW = SIDE_ROAD.maxX - SIDE_ROAD.minX
  const sideX = (SIDE_ROAD.minX + SIDE_ROAD.maxX) / 2
  // The side road ends at the walking street (1.17); it used to run off into the fog.
  const sideLen = ROAD.minZ - NORTH.walk.z0

  // Asphalt
  s.push({ box: [FAR * 2, 0.02, roadW], at: [0, 0.005, roadZ], color: P.road })
  s.push({ box: [sideW, 0.02, sideLen], at: [sideX, 0.005, ROAD.minZ - sideLen / 2], color: P.road })

  // Sidewalk strips beyond the tiled play area
  for (const sign of [-1, 1]) {
    const len = FAR - PAVE.maxX
    const x = sign * (PAVE.maxX + len / 2)
    s.push({ box: [len, 0.02, 3.2], at: [x, 0.0, ROAD.minZ - 1.6], color: P.pavement })
    s.push({ box: [len, 0.02, 3.2], at: [x, 0.0, ROAD.maxZ + 1.6], color: P.pavement })
  }

  // Four lanes (1.19): a double line in the middle, dashes between the lanes (skip the junction)
  for (const dz of [-0.14, 0.14]) s.push({ box: [FAR * 2, 0.01, 0.1], at: [0, 0.02, roadZ + dz], color: '#ffd76a' })
  for (let x = -FAR; x < FAR; x += 2.4) {
    if (x > SIDE_ROAD.minX - 1.5 && x < SIDE_ROAD.maxX + 0.5) continue
    for (const dz of [-roadW / 4, roadW / 4]) s.push({ box: [1.3, 0.01, 0.12], at: [x, 0.02, roadZ + dz], color: P.roadLine })
  }
  for (let z = ROAD.minZ - 1.5; z > NORTH.walk.z0 + 1; z -= 2.4) {
    s.push({ box: [0.14, 0.01, 1.3], at: [sideX, 0.02, z], color: P.roadLine })
  }

  // Zebra crossings: one across the main road, one across the side road
  for (let z = ROAD.minZ + 0.45; z < ROAD.maxZ - 0.2; z += 0.8) {
    s.push({ box: [2.2, 0.01, 0.42], at: [-1.6, 0.02, z], color: P.roadLine })
  }
  for (let x = SIDE_ROAD.minX + 0.35; x < SIDE_ROAD.maxX - 0.1; x += 0.75) {
    s.push({ box: [0.4, 0.01, 2.0], at: [x, 0.02, ROAD.minZ - 1.3], color: P.roadLine })
  }

  // Curbs (visual only, low enough to walk "through")
  const curb = (len: number, at: [number, number, number], alongX: boolean): ShapeItem => ({
    box: alongX ? [len, 0.12, 0.22] : [0.22, 0.12, len],
    at,
    color: P.curb,
  })
  const westLen = SIDE_ROAD.minX + FAR
  s.push(curb(westLen, [-FAR + westLen / 2, 0.06, ROAD.minZ], true))
  const eastLen = FAR - SIDE_ROAD.maxX
  s.push(curb(eastLen, [SIDE_ROAD.maxX + eastLen / 2, 0.06, ROAD.minZ], true))
  s.push(curb(FAR * 2, [0, 0.06, ROAD.maxZ], true))
  s.push(curb(sideLen, [SIDE_ROAD.minX, 0.06, ROAD.minZ - sideLen / 2], false))
  s.push(curb(sideLen, [SIDE_ROAD.maxX, 0.06, ROAD.minZ - sideLen / 2], false))

  s.push(...northGround())

  // Manhole cover
  s.push({ cyl: [0.42, 0.42, 0.02, 14], at: [4.2, 0.022, roadZ + 1.4], color: '#8e98ab' })
  return s
}

/** Phố đi bộ Hàng Đào: pale stone setts with darker bands, the lanes, the round pattern of the square. */
function northGround(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { walk, plaza, lanes, rowB, ave, cross, gas, rowD, rowC, rowC2 } = NORTH
  const midZ = (walk.z0 + walk.z1) / 2
  const depth = walk.z0 - walk.z1
  const x1 = FAR
  const len = x1 - (walk.x0 - 1)
  const cx = (walk.x0 - 1 + x1) / 2
  s.push({ box: [len, 0.02, depth - 6], at: [cx, 0.006, midZ], color: '#e3d6bf' })
  s.push({ box: [len, 0.02, 0.5], at: [cx, 0.008, walk.z0 - 3.2], color: '#c9b9a0' })
  s.push({ box: [len, 0.02, 0.5], at: [cx, 0.008, walk.z1 + 3.2], color: '#c9b9a0' })
  for (let x = walk.x0 + 2; x < walk.x1 + 4; x += 4.25) s.push({ box: [0.3, 0.02, depth - 7], at: [x, 0.009, midZ], color: '#d3c4aa' })
  s.push({ box: [len, 0.02, 1.5], at: [cx, 0.011, midZ], color: '#d9c7a6' })
  // The square: a ring of darker stone around the fountain
  const { x: fx, z: fz } = plaza.fountain
  s.push({ box: [plaza.x1 - plaza.x0, 0.02, plaza.z0 - plaza.z1], at: [(plaza.x0 + plaza.x1) / 2, 0.006, (plaza.z0 + plaza.z1) / 2], color: '#e3d6bf' })
  // Đại lộ Tràng Tiền: asphalt, a planted double line, lane dashes, kerbs, zebra at the square
  const aw = ave.z0 - ave.z1
  const az = (ave.z0 + ave.z1) / 2
  s.push({ box: [FAR * 2, 0.02, aw], at: [0, 0.005, az], color: P.road })
  for (const dz of [-0.14, 0.14]) s.push({ box: [FAR * 2, 0.01, 0.1], at: [0, 0.02, az + dz], color: '#ffd76a' })
  for (let x = -FAR; x < FAR; x += 2.4) for (const dz of [-aw / 4, aw / 4]) s.push({ box: [1.3, 0.01, 0.12], at: [x, 0.02, az + dz], color: P.roadLine })
  for (const z of [ave.z0, ave.z1]) s.push({ box: [FAR * 2, 0.12, 0.22], at: [0, 0.06, z], color: P.curb })
  for (let z = ave.z1 + 0.5; z < ave.z0 - 0.2; z += 0.8) s.push({ box: [3, 0.012, 0.42], at: [plaza.fountain.x, 0.021, z], color: P.roadLine })
  // Petrol station forecourt (drive-in gap in the kerb)
  s.push({ box: [gas.x1 - gas.x0, 0.02, ave.z1 - rowD.back], at: [(gas.x0 + gas.x1) / 2, 0.012, (ave.z1 + rowD.back) / 2], color: '#b9bfca' })
  s.push({ box: [gas.x1 - gas.x0 - 0.6, 0.13, 0.26], at: [(gas.x0 + gas.x1) / 2, 0.06, ave.z1], color: '#b9bfca' })
  // Cross lanes through rows C and C2
  for (const lane of cross) s.push({ box: [lane.x1 - lane.x0, 0.02, rowC.front - rowC2.front], at: [(lane.x0 + lane.x1) / 2, 0.006, (rowC.front + rowC2.front) / 2], color: '#d3c9b8' })
  s.push({ cyl: [3.6, 3.6, 0.02, 28], at: [fx, 0.009, fz], color: '#c9b9a0' })
  s.push({ cyl: [3.1, 3.1, 0.02, 28], at: [fx, 0.012, fz], color: '#ead9bb' })
  // Lanes through the back row: worn grey setts
  for (const lane of lanes) s.push({ box: [lane.x1 - lane.x0, 0.02, rowB.back - rowB.front], at: [(lane.x0 + lane.x1) / 2, 0.006, (rowB.back + rowB.front) / 2], color: '#d3c9b8' })
  // Hàng Bông's north stretch: kerbs along the widened pavements
  for (const x of [SIDE_ROAD.minX, SIDE_ROAD.maxX]) s.push({ box: [0.22, 0.12, 0.2], at: [x, 0.06, walk.z0 + 0.1], color: P.curb })
  return s
}

export function StreetGround() {
  const roads = useMemo(roadShapes, [])

  const paving = useMemo(() => {
    const w = PAVE.maxX - PAVE.minX
    const d = PAVE.maxZ - PAVE.minZ
    // One repeat = 2×2 m (the texture holds 4 tiles).
    const map = makeTileTexture(P.pavement, P.pavementGrout, w / 2, d / 2)
    return { w, d, material: withGroundDetail(new MeshLambertMaterial({ map }), 'concrete', 3.1, 0.45) }
  }, [])
  useEffect(
    () => () => {
      paving.material.map?.dispose()
      paving.material.dispose()
    },
    [paving],
  )

  return (
    <>
      {/* Grass under everything */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} material={lambert(P.grass)} receiveShadow>
        <planeGeometry args={[340, 340]} />
      </mesh>

      {/* Tiled sidewalk covering the play area */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[(PAVE.minX + PAVE.maxX) / 2, 0, (PAVE.minZ + PAVE.maxZ) / 2]}
        material={paving.material}
        receiveShadow
      >
        <planeGeometry args={[paving.w, paving.d]} />
      </mesh>

      <Shapes shapes={roads} material={groundMaterial} castShadow={false} />

      {/* Physical floor */}
      <RigidBody type="fixed" colliders={false}>
        {/* 1.36: big enough for the whole lake and Hàng Khay (it ended at z 130 — the south of Hàng Khay fell through) */}
        <CuboidCollider args={[200, 0.5, 200]} position={[0, -0.5, 30]} />
      </RigidBody>
    </>
  )
}
