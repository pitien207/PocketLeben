import type { CityPlaceId } from '../../../data/cityPlaces'
import type { Lane } from '../../components/npc/Traffic'
import type { PointXZ } from '../../systems/playerState'
import { LAKE } from '../VietnamStreet/layout'

/**
 * Phố Hàng Khay, the south shore of Hồ Gươm (1.33) — since 1.34 part of the Hàng Gai scene (one map): mounted in
 * VietnamStreet, every z below is local and shifted by OZ to sit at the lake's south shore (`LAKE.south`).
 * Top-down, metres; +X = east, −Z = north (toward the lake). Local z:
 *
 *   z<−1   Hồ Gươm (Tháp Rùa across the water)
 *   z −1…6  lakeside promenade: willows, benches, lamps, flower beds; the path back to Hàng Gai at the east end
 *   z 6…16  Phố Hàng Khay, four lanes
 *   z 16…20 south pavement
 *   z 20…28 row A: functional buildings, Phố Bà Triệu going south between them (x 2…10)
 *   z 30…64 west of Bà Triệu: the school, then Vườn hoa Hàng Khay (park) with the flower market;
 *           east of it: the hospital, the ward police, the library
 */

/** Local z 0 of this district in the Hàng Gai scene. */
export const OZ = LAKE.south + 1.2
export const PLAY = { minX: -48, maxX: 48, minZ: OZ - 1, maxZ: OZ + 64 }
export const SHORE_Z = OZ - 1.2
export const PROMENADE = { z0: OZ - 1, z1: OZ + 6 }
export const ROAD = { z0: OZ + 6, z1: OZ + 16 }
export const SOUTH_PAVE = { z0: OZ + 16, z1: OZ + 20 }
export const ROW_FRONT = OZ + 20.5
/** Phố Bà Triệu: road between x0 and x1, pavements out to px0 / px1. */
export const BA_TRIEU = { px0: 2, x0: 3.5, x1: 8.5, px1: 10, z0: OZ + 16, z1: PLAY.maxZ }
export const PARK = { x0: -44, x1: 1.5, z0: OZ + 30, z1: OZ + 63, fountain: { x: -22, z: OZ + 47 } }
export const SCHOOL_YARD = { x0: -16, x1: -6.2, z0: OZ + 30, z1: OZ + 40 }
/**
 * 1.39 Sân pickleball (PickleCourt.tsx) in the north-west corner of the park: centre, fence half sizes (long side
 * along x), and the x of the gate on the park side (+z). registry.ts spawn `pickleball` stands in front of the gate.
 */
export const PICKLE = { x: -34.6, z: OZ + 37, hx: 8.7, hz: 4.6, gate: -30 }
/** Inside the court's fence (plus a margin): no trees, lamps or benches there. */
export const inPickleCourt = (x: number, z: number, r = 0) => Math.abs(x - PICKLE.x) < PICKLE.hx + r + 0.6 && Math.abs(z - PICKLE.z) < PICKLE.hz + r + 0.6

export const TRAFFIC: Lane[] = [
  { z: OZ + 7.3, dir: -1 },
  { z: OZ + 9.7, dir: -1 },
  { z: OZ + 12.3, dir: 1 },
  { z: OZ + 14.7, dir: 1 },
]

export interface Building {
  /** City place (door + sign), or null for a plain house. */
  id: CityPlaceId | null
  /** Model in the "city" pack. */
  model: string
  /** Centre of the front edge, and which way the front faces. */
  x: number
  z: number
  face: 'north' | 'east' | 'west'
  /** Wall / trim colours (painted over the model's bricks / light walls / trims). */
  wall: string
  wall2?: string
  trim?: string
}

/** Width of each model's front (x of the model, see city.json). */
export const BUILDINGS: Building[] = [
  // Row A, west of Bà Triệu (fronts face the lake)
  { id: 'bank', model: 'b4Story_Center', x: -40.2, z: ROW_FRONT, face: 'north', wall: '#e9e1cf', wall2: '#d7c7a6', trim: '#ffffff' },
  { id: 'cinema', model: 'b4Story_Wide_2Doors', x: -27.0, z: ROW_FRONT, face: 'north', wall: '#e8b9a6', wall2: '#f3d9c9', trim: '#fff6ea' },
  { id: 'bookstore', model: 'b3Story_Balcony', x: -14.2, z: ROW_FRONT, face: 'north', wall: '#f2c46d', wall2: '#f6dca0', trim: '#fff3d6' },
  { id: 'restaurant', model: 'b2Story_Columns', x: -7.9, z: ROW_FRONT, face: 'north', wall: '#c9dcc0', wall2: '#e3eedb', trim: '#ffffff' },
  { id: 'hotel', model: 'b6Story_Stack', x: -1.6, z: ROW_FRONT, face: 'north', wall: '#d9cbe8', wall2: '#ebe2f3', trim: '#ffffff' },
  // Row A, east of Bà Triệu
  { id: 'supermarket', model: 'b2Story_Wide', x: 15.9, z: ROW_FRONT, face: 'north', wall: '#f4dfae', wall2: '#fbefd0', trim: '#ffffff' },
  { id: 'phoneShop', model: 'b1Story_Sign', x: 24.5, z: ROW_FRONT, face: 'north', wall: '#a9d6e8', wall2: '#d2ebf3', trim: '#ffffff' },
  { id: 'karaoke', model: 'b2Story_Sign', x: 30.8, z: ROW_FRONT, face: 'north', wall: '#f0b9c8', wall2: '#f8dbe3', trim: '#ffffff' },
  { id: 'gym', model: 'b2Story_Double', x: 37.6, z: ROW_FRONT, face: 'north', wall: '#bfe0cf', wall2: '#def0e6', trim: '#ffffff' },
  { id: 'goldShop', model: 'b3Story_Small', x: 43.9, z: ROW_FRONT, face: 'north', wall: '#f6e7c4', wall2: '#fbf2dc', trim: '#ffffff' },
  // Bà Triệu, east side (fronts face west)
  { id: 'hospital', model: 'b4Story_Wide_2Doors', x: BA_TRIEU.px1 + 0.5, z: OZ + 40, face: 'west', wall: '#f4f4f0', wall2: '#dfe9ee', trim: '#ffffff' },
  { id: 'police', model: 'b2Story_Center', x: BA_TRIEU.px1 + 0.5, z: OZ + 53.2, face: 'west', wall: '#f2d48a', wall2: '#f8e6b8', trim: '#ffffff' },
  { id: 'library', model: 'b3Story_Small', x: BA_TRIEU.px1 + 0.5, z: OZ + 59.6, face: 'west', wall: '#cfd8b8', wall2: '#e5ebd3', trim: '#ffffff' },
  // Bà Triệu, west side: the school (fronts face east)
  { id: 'school', model: 'b2Story_Sidehouse', x: BA_TRIEU.px0 - 0.5, z: OZ + 35.2, face: 'east', wall: '#f6d38a', wall2: '#fbe7bd', trim: '#ffffff' },
]

/** The flower market's stalls at the park edge on Bà Triệu. */
export const FLOWER_MARKET = { x: -1.2, z0: OZ + 44, z1: OZ + 54 }

export const WALKERS: Record<'bacTapDuong' | 'anhChayBo' | 'chiDiDao' | 'coDoanhNhan', PointXZ[]> = {
  bacTapDuong: [
    { x: -36, z: OZ + 1.6 },
    { x: -6, z: OZ + 1.6 },
  ],
  anhChayBo: [
    { x: -44, z: OZ + 3.0 },
    { x: 32.5, z: OZ + 3.0 },
    { x: 32.5, z: LAKE.north + 2 },
  ],
  chiDiDao: [
    { x: -40, z: OZ + 18.2 },
    { x: 2.6, z: OZ + 18.2 },
    { x: 2.6, z: OZ + 28.6 },
  ],
  coDoanhNhan: [
    { x: 9.3, z: OZ + 61 },
    { x: 9.3, z: OZ + 18.4 },
    { x: 40, z: OZ + 18.4 },
  ],
}
