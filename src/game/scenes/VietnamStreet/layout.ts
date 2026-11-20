import type { Vec3 } from '../../../data/config'
import type { Lane } from '../../components/npc/Traffic'
import type { PointXZ, ZoneXZ } from '../../systems/playerState'
import type { PoleSpec } from '../shared/PowerLines'
import { PALETTE as P } from '../shared/palette'
import type { TreeVariant } from '../shared/props'

/**
 * Where everything sits on the street corner (top-down, metres).
 * +X = east (right at the start), -Z = north (toward the buildings).
 *
 *   z=-13  ── back wall ───────────────────────────┐ side
 *          [neighbor][ home ] alley [   café   ]   │ road
 *   z=-4.5 ── building fronts ──────────────────── │
 *             sidewalk (spawn, bikes, café tables)  │
 *   z=3.2  ════════════ main road ══════════════════╪═════
 *   z=8.6  far sidewalk (trees, bench)
 *   z=14   hedge
 *
 * West of x=-14 the street continues (map extension): phở shop, pharmacy, tailor, banyan,
 * then (x < -32.5) the visa offices: photo studio, notary, bank, APS.
 * East of the side road (1.7): the communal house (đình), a hidden alley, two shops, the night market.
 */

/** 1.19: the lake side moved this far south, so Hàng Gai could become a four-lane road with a wide far pavement. */
export const SOUTH = 5
export const PLAY = { minX: -52, maxX: 34, minZ: -84, maxZ: 14 + SOUTH }

/** A shop house on a street. `z` = where its front stands when it is not on Hàng Gai (1.19: some moved north). */
export interface Lot {
  x: number
  width: number
  floors: number
  z?: number
}
const ROW_C_FRONT = -38
const ROW_D_FRONT = -76

export const BUILDING_FRONT_Z = -4.5
export const BUILDING_BACK_Z = -13
export const BUILDING_DEPTH = BUILDING_FRONT_Z - BUILDING_BACK_Z
export const BUILDING_CENTER_Z = (BUILDING_FRONT_Z + BUILDING_BACK_Z) / 2

/** Widened in 1.17 and again in 1.19 (was 3.2…8.6): four lanes now, the user wanted the streets airier. */
export const ROAD = { minZ: 2.7, maxZ: 12.7 }
export const SIDE_ROAD = { minX: 10, maxX: 13.6 }

export const HOME = { x: -5.5, width: 4.5, floors: 3 }
export const NEIGHBOR = { x: -10, width: 4.4, floors: 2 }
export const CAFE = { x: 4.5, width: 7, depth: 6, z: BUILDING_FRONT_Z - 3 }

/**
 * The north quarter (1.17, NorthQuarter.tsx) — houses to look at, no functions:
 *
 *   z=-42  ── row C backs ──────────────┐  square  ┌──────────
 *          [ decor houses (fronts z=-34)]  fountain [ decor … ]
 *   z=-34  ─────────────────────────────┘          └──────────
 *   church   Phố đi bộ Hàng Đào: 13 m wide, trees down the middle
 *   z=-21  ── row B fronts (face north) ──┐ lane ┌──┐ H.Bông ┌──
 *          [ decor houses, back to back ] │      │  │        │
 *   z=-13  ── backs of the Hàng Gai row ──┘      └──┘        └──
 */
export const houseFront = (h: Lot) => h.z ?? BUILDING_FRONT_Z

/** Plots on Hàng Gai left empty by the shops that moved north (1.19): plain houses stand there now. */
export const VACATED = [-39.7, -49.3, -21.9]

/**
 * 1.19 — bigger again. North of row C: row C2 (back to back, faces north), then **Đại lộ Tràng Tiền**
 * (12 m of asphalt, four lanes, wide pavements) and row D with the petrol station and the post office.
 * The square is now a street-wide passage from the walking street to the avenue.
 */
export const NORTH = {
  rowB: { back: -13, front: -21 },
  rowC: { front: ROW_C_FRONT, back: -46 },
  rowC2: { back: -46, front: -54 },
  rowD: { front: ROW_D_FRONT, back: -84 },
  /** The avenue: asphalt between z0 and z1, pavements out to rows C2 and D. */
  ave: { z0: -59, z1: -71 },
  /** Lanes through rows C and C2 (besides the square). */
  cross: [
    { x0: -31, x1: -27 },
    { x0: 30.5, x1: 34 },
  ],
  /** Petrol station on the avenue (a hole in row D). */
  gas: { x0: -38, x1: -22 },
  /** The walking street between the two rows (17 m wide since 1.19). */
  walk: { x0: -42, x1: 34, z0: -21, z1: ROW_C_FRONT },
  /** Ways through row B: Ngõ Cây Đa (past the banyan), Ngõ Tạp Hóa (beside the grocery). */
  lanes: [
    { x0: -32.6, x1: -29.1 },
    { x0: -14.7, x1: -12.2 },
  ],
  /** Phố Hàng Bông north of the old barrier: the road keeps its width, the pavements get wide. */
  hangBong: { x0: 7.6, x1: 16 },
  /** The square cut into row C, opposite Hàng Bông. */
  plaza: { x0: 6, x1: 18, z0: ROW_C_FRONT, z1: -54, fountain: { x: 12, z: -46 } },
  /** The cathedral closing the west end (faces east), the old post office behind the square. */
  church: { x: -47.6, z: -29.5 },
  clock: { x0: 7, x1: 17 },
}

/** The western block: three shop houses and the banyan tree at the end. */
export const WEST = {
  // phở · pharmacy (1.19: moved to the walking street) · tailor
  houses: [
    { x: -17.0, width: 4.6, floors: 3 },
    { x: 28.2, width: 4.6, floors: 2, z: ROW_C_FRONT },
    { x: -26.8, width: 4.6, floors: 3 },
  ] as Lot[],
  banyan: { x: -30.2, z: -6.5 },
}

/** The visa offices past the banyan (VisaOffices.tsx, 1.13): photo studio, notary, bank, APS. */
export const OFFICES = {
  // photo · notary (1.19: on the walking street) · bank · APS (1.19: on the avenue)
  houses: [
    { x: -34.9, width: 4.6, floors: 3 },
    { x: -20, width: 4.6, floors: 2, z: ROW_C_FRONT },
    { x: -44.5, width: 4.6, floors: 3 },
    { x: -4, width: 4.6, floors: 3, z: ROW_D_FRONT },
  ] as Lot[],
}

/**
 * Đền Ngọc Sơn (NgocSon.tsx): the Thê Húc bridge runs south from the lake railing (z ≈ 14.45)
 * to Jade Island. Walls in Boundaries.tsx leave a gap at the bridge.
 */
/** 1.34: the bridge is longer (user), so the island and everything on it moved this much further out. */
const BRIDGE_PLUS = 7
export const NGOC_SON = {
  bridge: { x: 10, z0: 14.2 + SOUTH, z1: 25.3 + SOUTH + BRIDGE_PLUS, width: 1.9, peak: 1.05 },
  island: { x: 10, z: 31.2 + SOUTH + BRIDGE_PLUS, rx: 7, rz: 6.2 },
  shoreGateZ: 12.9 + SOUTH,
  penTower: { x: 7.0, z: 13.0 + SOUTH },
  gateZ: 26.5 + SOUTH + BRIDGE_PLUS,
  urn: { x: 10, z: 28.9 + SOUTH + BRIDGE_PLUS },
  banyan: { x: 5.4, z: 30.6 + SOUTH + BRIDGE_PLUS },
  hall: { z: 34 + SOUTH + BRIDGE_PLUS, w: 7, d: 4.4 },
  turtle: { x: 14.7, z: 29.8 + SOUTH + BRIDGE_PLUS },
}

/**
 * 1.34 — Hồ Gươm in one piece with the other shore (user: one big map). North shore = Hàng Gai's far pavement
 * (railing at `north`), south shore = Phố Hàng Khay (scenes/HangKhay, its z are offset to start here), a path along
 * the east shore (x `east`…`path`) joins them, east of it the Lý Thái Tổ garden (to `park`).
 */
export const LAKE = { north: PLAY.maxZ + 0.45, south: 70, east: 30.4, path: 34.6, park: 48, tower: { x: -14, z: 44 } }

/** East block (EastBlock.tsx). */
export const EAST = {
  /** Communal house: courtyard between the gate (front) and the hall (hallZ). */
  dinh: { x0: 16, x1: 24, hallZ: -9.6, urn: { x: 20, z: -7.1 } },
  /** Narrow alley between the đình wall and the juice shop. */
  alley: { x0: 24.1, x1: 25.9, cat: { x: 24.75, z: -10.0 }, well: { x: 25.0, z: -12.25 } },
  houses: [
    { x: 28.2, width: 4.4, floors: 3 },
    { x: 32.3, width: 3.4, floors: 2 },
  ],
  market: { z: 11.3 + SOUTH, stalls: [17.6, 21.6, 25.6, 29.6] },
}

/**
 * Café interior in café-local coordinates (origin = centre of the open hall,
 * the street side faces +Z). Shared by the building and the barista job.
 */
export const CAFE_INTERIOR = {
  counter: { x: 0.9, z: -0.5, w: 3.4, d: 0.7 },
  fridge: { x: -2.6, z: -2.25 },
  indoorTable: { x: -2.2, z: 1.7 },
  /** Where the barista stands, behind the counter. */
  workSpot: { x: 1.2, z: -1.55 },
  /** Where customers stand to order. */
  customerSpot: { x: 1.2, z: 0.5 },
  /** Customers appear/disappear here, just outside the entrance. */
  door: { x: 1.2, z: 3.9 },
  /** Path around the counter's left end. */
  aisleX: -1.45,
  aisleFrontZ: 0.35,
  /** Inner floor area, used for the roof cut-away. */
  inner: { halfX: 3.3, minZ: -2.8, maxZ: 3.1 },
}

export const cafeToWorld = (p: { x: number; z: number }) => ({ x: CAFE.x + p.x, z: CAFE.z + p.z })

export const TREES: { at: Vec3; variant: TreeVariant; scale?: number }[] = [
  { at: [-8.2, 0, 2.3], variant: 'green' },
  { at: [-0.6, 0, 2.3], variant: 'blossom' },
  { at: [6.4, 0, 2.3], variant: 'green' },
  { at: [-13, 0, -3.4], variant: 'blossom', scale: 0.8 },
  { at: [9.45, 0, -3.6], variant: 'green', scale: 0.9 },
  { at: [-11, 0, 10.4 + SOUTH], variant: 'green' },
  { at: [-4, 0, 10.4 + SOUTH], variant: 'blossom' },
  { at: [3.2, 0, 10.4 + SOUTH], variant: 'green' },
  { at: [10.6, 0, 10.4 + SOUTH], variant: 'green', scale: 1.1 },
  // a second row by the kerb of the far pavement (1.19)
  { at: [-36, 0, 13.6], variant: 'green' },
  { at: [-21.5, 0, 13.6], variant: 'blossom' },
  { at: [-7.5, 0, 13.6], variant: 'green' },
  { at: [17.5, 0, 13.6], variant: 'green' },
  { at: [30, 0, 13.6], variant: 'blossom' },
  { at: [-42, 0, 15.4], variant: 'green' },
  { at: [-48, 0, 2.3], variant: 'blossom' },
  { at: [-39, 0, 2.3], variant: 'green' },
  { at: [-15.6, 0, 2.3], variant: 'blossom' },
  { at: [-23.0, 0, 2.3], variant: 'green' },
  { at: [-30.0, 0, 2.3], variant: 'blossom', scale: 0.9 },
  { at: [-18.0, 0, 10.4 + SOUTH], variant: 'blossom' },
  { at: [-25.0, 0, 10.4 + SOUTH], variant: 'green' },
  { at: [-31.0, 0, 10.4 + SOUTH], variant: 'green', scale: 1.1 },
]

export const PLANTS: Vec3[] = [
  [-7.6, 0, -4.0],
  [-3.4, 0, -4.0],
  [-12, 0, -4.0],
  [1.4, 0, -4.0],
  [7.6, 0, -4.0],
  [0.5, 0, -8.0],
  [-19.4, 0, -4.0],
  [-24.3, 0, -4.0],
  [-29.0, 0, -4.0],
]

export const MOTORBIKES: { at: Vec3; rotY: number; color: string }[] = [
  { at: [-8.9, 0, -2.2], rotY: Math.PI + 0.15, color: P.rose },
  { at: [-1.7, 0, -6.8], rotY: 0.1, color: P.mint },
  { at: [6.2, 0, 11.0 + SOUTH], rotY: Math.PI / 2 + 0.1, color: P.lilac },
  { at: [11.9, 0, 10.6 + SOUTH], rotY: Math.PI / 2, color: P.butter },
  { at: [-19.6, 0, -2.4], rotY: Math.PI + 0.2, color: P.sky2 },
  { at: [-20.6, 0, -2.3], rotY: Math.PI - 0.1, color: P.coral },
  { at: [-28.6, 0, -2.2], rotY: Math.PI + 0.1, color: P.mint },
]

export const CAFE_TABLES: { at: Vec3; stools: string[] }[] = [
  { at: [2.5, 0, -2.0], stools: [P.coral, P.sky2] },
  { at: [4.9, 0, -1.2], stools: [P.sky2, P.mint] },
  { at: [7.2, 0, -2.2], stools: [P.coral, P.butter] },
]

export const BENCHES: { at: Vec3; rotY: number }[] = [
  { at: [-0.4, 0, 12.6 + SOUTH], rotY: Math.PI },
  { at: [7.6, 0, 12.6 + SOUTH], rotY: Math.PI },
  { at: [-21.0, 0, 12.6 + SOUTH], rotY: Math.PI },
  { at: [-27.5, 0, 12.6 + SOUTH], rotY: Math.PI },
  { at: [-38, 0, 12.6 + SOUTH], rotY: Math.PI },
  { at: [-46, 0, 12.6 + SOUTH], rotY: Math.PI },
]

const POLE_Z = 2.6

export const POLES: PoleSpec[] = [
  { x: -19, z: POLE_Z, lamp: true },
  { x: -11.6, z: POLE_Z, lamp: true },
  { x: -4.2, z: POLE_Z },
  { x: 2.6, z: POLE_Z, lamp: true },
  { x: 9.4, z: POLE_Z, transformer: true },
  { x: 9.4, z: -6.8, lamp: true },
  { x: 9.4, z: -16.5, collider: false },
  { x: 17, z: POLE_Z, lamp: true },
  { x: -26.4, z: POLE_Z },
  { x: -36, z: POLE_Z, collider: false },
  { x: 25, z: POLE_Z, lamp: true },
  { x: 32.6, z: POLE_Z },
  { x: 42, z: POLE_Z, collider: false },
]

export const POLE_SPANS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [4, 7],
  [8, 0],
  [9, 8],
  [7, 10],
  [10, 11],
  [11, 12],
]

export const POLE_DROPS: { from: number; to: Vec3 }[] = [
  // Endpoints sit on bare wall between balconies so wires don't pierce railings.
  { from: 1, to: [-10.6, 4.6, BUILDING_FRONT_Z + 0.05] },
  { from: 2, to: [-3.5, 7.7, BUILDING_FRONT_Z + 0.05] },
  { from: 2, to: [-6.9, 4.8, BUILDING_FRONT_Z + 0.05] },
  { from: 3, to: [1.6, 3.0, BUILDING_FRONT_Z + 0.05] },
]

/** Sidewalk trà đá stall at the mouth of the alley. */
export const TRA_DA = {
  seller: { x: -2.55, z: -2.95 },
  jugTable: { x: -2.0, z: -3.45 },
  iceBox: { x: -2.85, z: -3.75 },
  table: { x: -0.55, z: -2.2 },
  chuNam: { x: -0.55, z: -2.85 },
  anhHai: { x: 0.12, z: -2.2 },
  /** The free stool where the player sits. */
  playerSeat: { x: -1.22, z: -2.2 },
  spareStool: { x: -0.55, z: -1.55 },
  umbrella: { x: -1.3, z: -2.65 },
  zone: { x: -1.25, z: -2.3, halfX: 1.75, halfZ: 1.6 } as ZoneXZ,
}

/** Cô Liên's grocery in the neighbour's ground floor. */
export const GROCERY = {
  coBa: { x: -11.35, z: -3.7 },
  zone: { x: NEIGHBOR.x, z: BUILDING_FRONT_Z + 1.05, halfX: 2.1, halfZ: 1.15 } as ZoneXZ,
}

export const HOME_DOOR_ZONE: ZoneXZ = { x: HOME.x, z: BUILDING_FRONT_Z + 0.9, halfX: 1.7, halfZ: 0.95 }

/** Bánh mì vendor with a shoulder pole, strolling the near sidewalk. */
export const VENDOR_PATH: PointXZ[] = [
  { x: -29.0, z: 1.35 },
  { x: -20.5, z: 1.35 },
  { x: -12.4, z: 1.35 },
  { x: -6.2, z: 1.35 },
  { x: 0.6, z: 1.35 },
  { x: 7.6, z: 1.35 },
]

export const WALKER_PATHS: Record<'coHoa' | 'anhKhoa' | 'chiLan', PointXZ[]> = {
  coHoa: [
    { x: -29.5, z: 0.45 },
    { x: 8.8, z: 0.45 },
  ],
  anhKhoa: [
    { x: -30.5, z: 14.6 },
    { x: 32.5, z: 14.6 },
  ],
  // Cô Lan comes down Hàng Bông from the walking street (1.17).
  chiLan: [
    { x: 9.0, z: -25.5 },
    { x: 9.0, z: -14.5 },
    { x: 9.9, z: -12.5 },
    { x: 9.9, z: -4.6 },
    { x: 8.65, z: 0.4 },
  ],
}

/** Two kids playing đá cầu on the far sidewalk. */
export const KIDS = { a: { x: -8.7, z: 12.1 + SOUTH }, b: { x: -5.9, z: 12.1 + SOUTH } }

/** Drive on the right: eastbound on the far side, westbound on the near side. */
export const TRAFFIC_LANES: Lane[] = [
  { z: 11.4, dir: 1 },
  { z: 9.0, dir: 1 },
  { z: 6.4, dir: -1 },
  { z: 4.0, dir: -1 },
]

/**
 * Phố Hàng Bông, the side road (story 2.1, HangBong.tsx): Văn phòng Mai Anh on the west side
 * (front faces the road, +X), Hoàng Kim opposite (front faces -X), Circle K on the Hàng Gai corner.
 */
export const HANG_BONG = {
  mai: { x0: 8.05, x1: 9.75, z0: -12.9, z1: -8.3, door: -10.6 },
  hoangKim: { x0: 13.85, x1: 15.95, z0: -12.9, z1: -8.6, desk: { x: 14.75, z: -11.6 }, khai: { x: 13.3, z: -9.7 } },
  circleK: { x0: 13.85, x1: 15.95, z0: -8.3, z1: -4.6, manager: { x: 14.35, z: -3.95 } },
}

/** Đại lộ Tràng Tiền (1.19): two lanes each way. */
export const AVENUE_LANES: Lane[] = [
  { z: -60.6, dir: -1 },
  { z: -63.5, dir: -1 },
  { z: -66.5, dir: 1 },
  { z: -69.4, dir: 1 },
]
