import { useEffect, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { MeshLambertMaterial } from 'three'
import { groundMaterial, lambert } from '../shared/materials'
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

  // Dashed centre lines (skip the junction)
  for (let x = -FAR; x < FAR; x += 2.4) {
    if (x > SIDE_ROAD.minX - 1.5 && x < SIDE_ROAD.maxX + 0.5) continue
    s.push({ box: [1.3, 0.01, 0.14], at: [x, 0.02, roadZ], color: P.roadLine })
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
  const { walk, plaza, rowC, lanes, rowB } = NORTH
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
  s.push({ box: [plaza.x1 - plaza.x0, 0.02, rowC.front - rowC.back], at: [(plaza.x0 + plaza.x1) / 2, 0.006, (rowC.front + rowC.back) / 2], color: '#e3d6bf' })
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
    return { w, d, material: new MeshLambertMaterial({ map }) }
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
        <planeGeometry args={[220, 220]} />
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
        <CuboidCollider args={[60, 0.5, 60]} position={[0, -0.5, 0]} />
      </RigidBody>
    </>
  )
}
