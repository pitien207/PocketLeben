import { useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { groundMaterial } from './materials'
import { Shapes, type ShapeItem } from './Shapes'

export interface RoomStyle {
  wall: string
  wallLow: string
  floor: string
  floorAlt: string
  trim: string
  window?: string
}

export interface RoomProps {
  /** Width (x) and depth (z) of the floor; the room is centred on the origin. */
  w: number
  d: number
  h?: number
  style: RoomStyle
  /** Window centres along the back wall (x positions). */
  windows?: number[]
  /** Extra shapes (furniture) merged with the room. */
  furniture?: ShapeItem[]
  /** Solid furniture footprints [x, z, halfX, halfZ]. */
  blockers?: [number, number, number, number][]
  /**
   * 1.41 floor look: 1 m chequer (default), wooden planks, small 0.5 m tiles, or gạch bông (cement tiles with a
   * four-petal motif, old Hà Nội shops). Colours: `style.floor` / `style.floorAlt` (+ `style.trim` for the motif).
   */
  floorKind?: 'check' | 'planks' | 'small' | 'bong'
}

/** The mat at every room's way out: one calm light red. It sits above the floor tiles (top 0.04 m):
 * level with them, the two surfaces fought over the same depth and the mat flickered. */
export const DOORMAT = '#ef9a94'

/**
 * A "dollhouse" interior: chequered floor, a full back wall with windows, low side walls
 * and an open front so the follow camera can look in from outside.
 */
export function Room({ w, d, h = 3, style, windows = [], furniture = [], blockers = [], floorKind = 'check' }: RoomProps) {
  const floor = useMemo<ShapeItem[]>(() => {
    const s: ShapeItem[] = []
    if (floorKind === 'planks') {
      // Boards 0.24 m wide running across the room, staggered joints, two shades
      const bw = 0.24
      let row = 0
      for (let z = -d / 2; z < d / 2 - 0.01; z += bw, row++) {
        let x = -w / 2
        let k = row * 7
        while (x < w / 2 - 0.01) {
          const len = Math.min(w / 2 - x, 1.1 + ((k * 37) % 9) * 0.12 - (x === -w / 2 ? (row % 3) * 0.35 : 0))
          s.push({ box: [len - 0.012, 0.04, bw - 0.012], at: [x + len / 2, 0.02, z + bw / 2], color: (k + row) % 3 === 0 ? style.floorAlt : style.floor })
          x += len
          k++
        }
      }
      s.push({ box: [w, 0.03, d], at: [0, 0.012, 0], color: style.floorAlt })
    } else {
      const tile = floorKind === 'check' ? 1 : 0.5
      const n = (v: number) => Math.round(v / tile)
      for (let x = -w / 2; x < w / 2 - 0.01; x += tile) {
        for (let z = -d / 2; z < d / 2 - 0.01; z += tile) {
          const alt = (n(x + w) + n(z + d)) % 2 === 0
          const cx = x + tile / 2
          const cz = z + tile / 2
          if (floorKind === 'bong') {
            // Gạch bông: a plain tile with a petal cross and a dot in the middle, borders meeting into diamonds
            s.push({ box: [tile - 0.01, 0.04, tile - 0.01], at: [cx, 0.02, cz], color: style.floor })
            s.push({ box: [tile * 0.5, 0.042, tile * 0.5], at: [cx, 0.021, cz], rot: [0, Math.PI / 4, 0], color: style.floorAlt })
            s.push({ cyl: [tile * 0.09, tile * 0.09, 0.044, 8], at: [cx, 0.022, cz], color: style.trim })
          } else s.push({ box: [tile, 0.04, tile], at: [cx, 0.02, cz], color: alt ? style.floor : style.floorAlt })
        }
      }
    }
    // A strip of floor outside the open front, so the room sits on a little stage.
    s.push({ box: [w + 1.2, 0.2, d + 1.2], at: [0, -0.1, 0], color: style.trim })
    return s
  }, [w, d, style, floorKind])

  const shell = useMemo<ShapeItem[]>(() => {
    const s: ShapeItem[] = []
    const t = 0.2
    s.push({ box: [w + t * 2, h, t], at: [0, h / 2, -d / 2 - t / 2], color: style.wall })
    s.push({ box: [w + t * 2, 0.15, t + 0.04], at: [0, 0.07, -d / 2 - t / 2 + 0.02], color: style.trim })
    s.push({ box: [w + t * 2, 0.12, t + 0.06], at: [0, h - 0.06, -d / 2 - t / 2 + 0.03], color: style.trim })
    for (const side of [-1, 1]) {
      // Side walls step down toward the front so the camera sees in.
      s.push({ box: [t, h, d * 0.55], at: [side * (w / 2 + t / 2), h / 2, -d / 2 + (d * 0.55) / 2], color: style.wall })
      s.push({ box: [t, 1.0, d * 0.45], at: [side * (w / 2 + t / 2), 0.5, d / 2 - (d * 0.45) / 2], color: style.wallLow })
      s.push({ box: [t + 0.06, 0.08, d * 0.45], at: [side * (w / 2 + t / 2), 1.04, d / 2 - (d * 0.45) / 2], color: style.trim })
    }
    for (const x of windows) {
      s.push({ box: [1.5, 1.3, 0.06], at: [x, 1.75, -d / 2 + 0.01], color: style.trim })
      s.push({ box: [1.3, 1.1, 0.07], at: [x, 1.75, -d / 2 + 0.02], color: style.window ?? '#bfe6f2' })
      s.push({ box: [0.05, 1.1, 0.09], at: [x, 1.75, -d / 2 + 0.03], color: style.trim })
      s.push({ box: [1.6, 0.08, 0.2], at: [x, 1.08, -d / 2 + 0.08], color: style.trim })
    }
    return [...s, ...furniture]
  }, [w, d, h, style, windows, furniture])

  return (
    <>
      <Shapes shapes={floor} material={groundMaterial} castShadow={false} />
      <Shapes shapes={shell} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2 + 0.3, h / 2, 0.2]} position={[0, h / 2, -d / 2 - 0.2]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[0.2, h / 2, d / 2 + 0.3]} position={[-w / 2 - 0.2, h / 2, 0]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[0.2, h / 2, d / 2 + 0.3]} position={[w / 2 + 0.2, h / 2, 0]} collisionGroups={BUILDING_GROUPS} />
        {/* Invisible front edge: leave through the door, not the open side. */}
        <CuboidCollider args={[w / 2 + 0.3, 1.5, 0.2]} position={[0, 1.5, d / 2 + 0.35]} collisionGroups={PROP_GROUPS} />
        {blockers.map(([x, z, hx, hz], i) => (
          <CuboidCollider key={i} args={[hx, 0.6, hz]} position={[x, 0.6, z]} collisionGroups={PROP_GROUPS} />
        ))}
      </RigidBody>
    </>
  )
}
