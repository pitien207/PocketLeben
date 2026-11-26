import { PALETTE as P } from '../shared/palette'
import { place } from '../shared/props'
import type { ShapeItem } from '../shared/Shapes'
import { GLASS, GLASS2, roofX, roofZ, mucHouse } from './munichHouses'
import { kFountain } from './townProps'
import {
  ALTES_RATHAUS,
  CHIN_TURM,
  DIANATEMPEL,
  FELDHERRNHALLE,
  FISCHBRUNNEN,
  FRAUENKIRCHE,
  FRIEDENSENGEL,
  FUZO,
  HAUS_DER_KUNST,
  HBF,
  HOFBRAEU,
  KARLSTOR,
  LMU,
  LUDWIG,
  MARIENSAEULE,
  MONOPTEROS,
  RATHAUS,
  RESIDENZ,
  SENDLINGER,
  SENDLINGER_TOR,
  SIEGESTOR,
  STACHUS,
  THEATINER,
  UNI_FOUNTAINS,
} from './mucLayout'

/**
 * 1.44 The sights of München as primitives (world space). Every builder returns the shapes and the solid
 * footprints ([x, z, halfX, halfZ] — colliders that also block the camera) so they always agree.
 * Proportions are squeezed (the Frauenkirche towers are 38 m instead of 99) but the silhouettes are the real ones.
 */

export type Solid = [number, number, number, number]
export interface Sight {
  s: ShapeItem[]
  glow: ShapeItem[]
  solid: Solid[]
}
const sight = (): Sight => ({ s: [], glow: [], solid: [] })
const GOLD = '#e8c35a'
const COPPER = '#6fa88e'
const STONE = '#e9e2d4'

/** A pointed (lancet) window seen from the front: a slim box with a small roof-shaped top. */
function lancet(s: ShapeItem[], x: number, y: number, z: number, w: number, h: number, color: string, rotY = 0) {
  s.push(
    place(
      [
        { box: [w, h, 0.12], at: [0, 0, 0], color },
        { cyl: [w * 0.58, w * 0.58, 0.12, 3], at: [0, h / 2 + w * 0.12, 0], rot: [-Math.PI / 2, 0, 0], scale: [1, 1, 0.9], color },
      ],
      [x, y, z],
      rotY,
    ),
  )
}

/** A round-arch frame: two half rings (front and back faces of a passage along Z), top of the arch at yTop. */
function archRing(s: ShapeItem[], x: number, yTop: number, z: number, w: number, depth: number, color: string) {
  for (const side of [-1, 1]) s.push({ torus: [w / 2 - 0.12, 0.16, 5, 14, Math.PI], at: [x, yTop - w / 2 + 0.12, z + side * (depth / 2 + 0.02)], color })
}

/** A green onion cap ("welsche Haube") on top of a tower at height y. */
function onion(s: ShapeItem[], x: number, y: number, z: number, r: number, color = COPPER) {
  s.push({ cyl: [r * 0.95, r, r * 0.5, 12], at: [x, y + r * 0.25, z], color })
  s.push({ sphere: [r * 1.05, 14, 10], at: [x, y + r * 1.15, z], scale: [1, 1.25, 1], color })
  s.push({ cyl: [r * 0.22, r * 0.3, r * 0.7, 8], at: [x, y + r * 2.5, z], color })
  s.push({ sphere: [r * 0.32, 10, 8], at: [x, y + r * 3.0, z], color })
  s.push({ cyl: [0.04, 0.07, r * 0.9, 6], at: [x, y + r * 3.65, z], color: GOLD })
  s.push({ box: [r * 0.36, 0.06, 0.06], at: [x, y + r * 3.8, z], color: GOLD })
}

// ------------------------------------------------------------------------------------------------
/** Frauenkirche: red-brick nave with a huge roof, two square towers with green onion caps (west front). */
export function frauenkirche(): Sight {
  const b = sight()
  const { x0, x1, z0, z1, towerW } = FRAUENKIRCHE
  const BRICK = '#b8634b'
  const BRICK2 = '#a95a44'
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const w = x1 - x0
  const d = z1 - z0
  const H = 14
  b.s.push({ box: [w, H, d], at: [cx, H / 2, cz], color: BRICK })
  // buttresses and tall windows along both long sides
  for (let i = 0; i <= 6; i++) {
    const x = x0 + 1 + (i * (w - 2)) / 6
    for (const side of [-1, 1]) b.s.push({ box: [0.7, H - 1, 0.6], at: [x, (H - 1) / 2, cz + side * (d / 2 + 0.25)], color: BRICK2 })
    if (i < 6) for (const side of [-1, 1]) lancet(b.s, x + (w - 2) / 12, 7.5, cz + side * (d / 2 + 0.02), 1.1, 8, '#4c5468', side > 0 ? 0 : Math.PI)
  }
  // the great roof (steep, dark red tiles) and the apse at the east end
  const roof = place([], [0, 0, 0])
  roofX(roof.group, w, d, 0, '#8c4a3c', 1.05)
  b.s.push(place(roof.group, [cx, H, cz]))
  b.s.push({ cyl: [d / 2, d / 2, H, 10, ], at: [x1, H / 2, cz], color: BRICK })
  b.s.push({ cyl: [0.2, d / 2 + 0.3, 7, 10], at: [x1, H + 3.5, cz], color: '#8c4a3c' })
  // the two towers
  const tx = x0 - towerW / 2
  const TH = 30
  for (const tz of [z0 + towerW / 2 + 0.5, z1 - towerW / 2 - 0.5]) {
    b.s.push({ box: [towerW, TH, towerW], at: [tx, TH / 2, tz], color: BRICK })
    for (const y of [9, 17, 24]) b.s.push({ box: [towerW + 0.15, 0.3, towerW + 0.15], at: [tx, y, tz], color: '#d9c6a8' })
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2
      lancet(b.s, tx + Math.sin(a) * (towerW / 2 + 0.03), 27, tz + Math.cos(a) * (towerW / 2 + 0.03), 1.0, 3.2, '#3e4456', a)
      lancet(b.s, tx + Math.sin(a) * (towerW / 2 + 0.03), 20.5, tz + Math.cos(a) * (towerW / 2 + 0.03), 0.8, 3.2, '#3e4456', a)
    }
    b.s.push({ cyl: [towerW * 0.46, towerW * 0.5, 3, 8], at: [tx, TH + 1.5, tz], color: BRICK2 })
    b.s.push({ box: [0.5, 0.9, 0.5], at: [tx + towerW * 0.42, TH + 3.2, tz], color: '#e8dcc4' })
    b.s.push({ sphere: [0.4, 8, 6], at: [tx - towerW * 0.1, TH + 2.9, tz + towerW * 0.42], color: '#e8dcc4' })
    onion(b.s, tx, TH + 3, tz, 2.4)
    b.solid.push([tx, tz, towerW / 2, towerW / 2])
  }
  // the portal between the towers
  b.s.push({ box: [1.2, 5, 4.6], at: [x0 - towerW + 0.4, 2.5, cz], color: BRICK2 })
  lancet(b.s, x0 - towerW - 0.25, 2.2, cz, 2.4, 3.6, '#5b3a2c', -Math.PI / 2)
  b.s.push({ box: [towerW, 9, d - 2 * towerW - 1], at: [tx, 4.5, cz], color: BRICK })
  b.solid.push([cx, cz, w / 2 + 0.6, d / 2 + 0.6], [tx, cz, towerW / 2, d / 2 - towerW], [x1, cz, d / 2, d / 2])
  return b
}

// ------------------------------------------------------------------------------------------------
/** Neues Rathaus: neo-Gothic facade along the north side of Marienplatz, the tower with the Glockenspiel. */
export function neuesRathaus(): Sight {
  const b = sight()
  const { x0, x1, z0, z1, towerX } = RATHAUS
  const STONE_R = '#9a907e'
  const DARK = '#7d7464'
  const w = x1 - x0
  const d = z1 - z0
  const cz = (z0 + z1) / 2
  const H = 15
  b.s.push({ box: [w, H, d], at: [(x0 + x1) / 2, H / 2, cz], color: STONE_R })
  // arcade on the ground floor
  for (let i = 0; i < 11; i++) {
    const x = x0 + 1.4 + i * ((w - 2.8) / 10)
    if (Math.abs(x - towerX) < 2) continue
    lancet(b.s, x, 2.0, z1 + 0.03, 1.5, 2.8, '#3b3530')
  }
  // rows of pointed windows, pinnacles along the eaves, three stepped gables
  for (let fl = 0; fl < 3; fl++) {
    for (let i = 0; i < 14; i++) {
      const x = x0 + 1 + i * ((w - 2) / 13)
      if (Math.abs(x - towerX) < 2.6) continue
      lancet(b.s, x, 5.6 + fl * 3.2, z1 + 0.03, 0.7, 2.0, fl === 1 ? GLASS2 : '#5b6272')
    }
  }
  for (let i = 0; i <= 14; i++) {
    const x = x0 + i * (w / 14)
    b.s.push({ cyl: [0.02, 0.22, 1.6, 4], at: [x, H + 0.8, z1 + 0.1], color: DARK })
  }
  for (const gx of [x0 + 4, x1 - 4]) {
    for (let k = 0; k < 4; k++) b.s.push({ box: [5 - k * 1.2, 1.3, 0.6], at: [gx, H + 0.65 + k * 1.3, z1 - 0.2], color: STONE_R })
    b.s.push({ cyl: [0.02, 0.25, 1.4, 4], at: [gx, H + 6, z1 - 0.2], color: DARK })
  }
  const roof: ShapeItem[] = []
  roofX(roof, w, d, 0, '#5d5a5c', 0.8)
  b.s.push(place(roof, [(x0 + x1) / 2, H, cz]))
  // the tower: square shaft, the Glockenspiel oriels, an octagonal top with a copper spire
  const tz = z1 - 2.2
  const TW = 5
  const TH = 30
  b.s.push({ box: [TW, TH, TW], at: [towerX, TH / 2, tz], color: STONE_R })
  for (let k = 0; k < 6; k++) b.s.push({ box: [TW + 0.12, 0.25, TW + 0.12], at: [towerX, 6 + k * 4, tz], color: DARK })
  // two oriels for the figures (the dancers turn in Glockenspiel.tsx)
  for (const [y, h] of [
    [17.2, 2.6],
    [21.0, 2.4],
  ] as const) {
    b.s.push({ box: [TW + 1.2, 0.3, 1.6], at: [towerX, y - h / 2, tz + TW / 2 + 0.6], color: DARK })
    b.s.push({ box: [TW + 1.2, 0.3, 1.6], at: [towerX, y + h / 2, tz + TW / 2 + 0.6], color: DARK })
    b.s.push({ box: [TW + 0.8, h, 0.1], at: [towerX, y, tz + TW / 2 + 0.05], color: '#3e3a36' })
    for (const side of [-1, 1]) b.s.push({ box: [0.25, h, 1.5], at: [towerX + side * (TW / 2 + 0.45), y, tz + TW / 2 + 0.6], color: DARK })
  }
  // clock faces
  b.glow.push({ cyl: [1.0, 1.0, 0.08, 20], at: [towerX, 25.5, tz + TW / 2 + 0.06], rot: [Math.PI / 2, 0, 0], color: '#fff3c4' })
  b.s.push({ box: [0.08, 0.8, 0.05], at: [towerX, 25.8, tz + TW / 2 + 0.12], color: '#2a2a2a' })
  b.s.push({ box: [0.55, 0.08, 0.05], at: [towerX + 0.25, 25.5, tz + TW / 2 + 0.12], color: '#2a2a2a' })
  b.s.push({ cyl: [TW * 0.42, TW * 0.5, 4, 8], at: [towerX, TH + 2, tz], color: STONE_R })
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    b.s.push({ cyl: [0.02, 0.18, 1.5, 4], at: [towerX + Math.cos(a) * 2.3, TH + 4.6, tz + Math.sin(a) * 2.3], color: DARK })
  }
  b.s.push({ cyl: [0.1, TW * 0.42, 7, 8], at: [towerX, TH + 7.5, tz], color: COPPER })
  // the Münchner Kindl on the very top
  b.s.push({ cyl: [0.12, 0.2, 0.6, 6], at: [towerX, TH + 11.3, tz], color: '#2e2a28' })
  b.s.push({ sphere: [0.16, 8, 6], at: [towerX, TH + 11.75, tz], color: '#f0d8c0' })
  // flags on the facade
  for (const fx of [x0 + 7, x1 - 7]) {
    b.s.push({ cyl: [0.04, 0.04, 2.2, 5], at: [fx, 9.5, z1 + 0.9], rot: [0.9, 0, 0], color: '#d8d8d8' })
    b.s.push({ box: [0.9, 1.8, 0.04], at: [fx, 8.8, z1 + 1.6], color: '#f4c04e' })
    b.s.push({ box: [0.45, 1.8, 0.05], at: [fx + 0.22, 8.8, z1 + 1.61], color: '#2a2a2a' })
  }
  b.solid.push([(x0 + x1) / 2, cz, w / 2, d / 2], [towerX, tz, TW / 2, TW / 2])
  return b
}

/** Where the Glockenspiel figures dance (centres of the two oriels). */
export const GLOCKENSPIEL = { x: RATHAUS.towerX, z: RATHAUS.z1 - 2.2 + 2.5 + 0.6, y: [17.2, 21.0] }

// ------------------------------------------------------------------------------------------------
/** Altes Rathaus: white Gothic hall with a steep roof and its gate tower (east end of Marienplatz). */
export function altesRathaus(): Sight {
  const b = sight()
  const { x0, x1, z0, z1 } = ALTES_RATHAUS
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const H = 9
  b.s.push({ box: [w, H, d], at: [cx, H / 2, cz], color: '#f4efe6' })
  for (let i = 0; i < 4; i++) lancet(b.s, x0 - 0.03, 5, z0 + 1.5 + i * ((d - 3) / 3), 0.9, 2.4, '#5b6272', -Math.PI / 2)
  for (let i = 0; i < 3; i++) lancet(b.s, x0 + 1.5 + i * ((w - 3) / 2), 5, z1 + 0.03, 0.9, 2.4, '#5b6272')
  roofZ(b.s, w, d, 0, '#b5524a', 1.2, 0)
  // shift the roofZ shape to the building (roofZ is local around x)
  const last = b.s.pop() as ShapeItem
  b.s.push(place([last], [cx, H, cz]))
  for (const [x, z] of [
    [x0 + 0.4, z0 + 0.4],
    [x0 + 0.4, z1 - 0.4],
    [x1 - 0.4, z1 - 0.4],
  ]) {
    b.s.push({ cyl: [0.55, 0.55, 2.2, 8], at: [x, H + 1.1, z], color: '#f4efe6' })
    b.s.push({ cyl: [0.05, 0.65, 2.0, 8], at: [x, H + 3.2, z], color: '#5d5a5c' })
  }
  // the gate tower at the south-west corner
  const tx = x0 + 1.6
  const tz = z1 - 1.6
  b.s.push({ box: [3.2, 19, 3.2], at: [tx, 9.5, tz], color: '#f4efe6' })
  b.s.push({ box: [3.4, 0.25, 3.4], at: [tx, 14, tz], color: '#d9cdb8' })
  b.s.push({ cyl: [0.05, 2.4, 6, 4], at: [tx, 22, tz], rot: [0, Math.PI / 4, 0], color: '#5d5a5c' })
  for (let k = 0; k < 4; k++) b.s.push({ cyl: [0.02, 0.4, 1.6, 4], at: [tx + (k < 2 ? -1.4 : 1.4), 19.8, tz + (k % 2 ? -1.4 : 1.4)], color: '#5d5a5c' })
  b.glow.push({ cyl: [0.7, 0.7, 0.06, 16], at: [tx, 16, tz + 1.63], rot: [Math.PI / 2, 0, 0], color: '#fff3c4' })
  b.solid.push([cx, cz, w / 2, d / 2], [tx, tz, 1.6, 1.6])
  return b
}

// ------------------------------------------------------------------------------------------------
/** Mariensäule (golden Madonna on a column) and the Fischbrunnen. */
export function marienplatzMonuments(): Sight {
  const b = sight()
  const { x, z } = MARIENSAEULE
  b.s.push({ box: [4, 0.35, 4], at: [x, 0.17, z], color: '#d8d0c0' })
  b.s.push({ box: [2.2, 2.4, 2.2], at: [x, 1.55, z], color: '#cfc4b0' })
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4
    b.s.push({ box: [0.6, 0.8, 0.6], at: [x + Math.cos(a) * 1.6, 0.75, z + Math.sin(a) * 1.6], color: '#cfc4b0' })
    b.s.push({ sphere: [0.32, 8, 6], at: [x + Math.cos(a) * 1.6, 1.45, z + Math.sin(a) * 1.6], color: '#6f7a6a' })
  }
  b.s.push({ cyl: [0.38, 0.42, 9, 12], at: [x, 7.2, z], color: '#a4505a' })
  b.s.push({ box: [1.0, 0.5, 1.0], at: [x, 11.9, z], color: '#d9c6a8' })
  b.s.push({ cyl: [0.12, 0.36, 1.4, 8], at: [x, 12.85, z], color: GOLD })
  b.s.push({ sphere: [0.18, 8, 6], at: [x, 13.7, z], color: GOLD })
  b.s.push({ torus: [0.26, 0.04, 4, 12], at: [x, 13.95, z], rot: [Math.PI / 2, 0, 0], color: GOLD })
  // low railing round the plinth
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    b.s.push({ box: [0.06, 0.8, 0.06], at: [x + Math.cos(a) * 2.6, 0.4, z + Math.sin(a) * 2.6], color: '#3a3a40' })
  }
  b.s.push({ torus: [2.6, 0.04, 4, 32], at: [x, 0.78, z], rot: [Math.PI / 2, 0, 0], color: '#3a3a40' })
  b.solid.push([x, z, 2.6, 2.6])
  const f = FISCHBRUNNEN
  const fb = kFountain(1.7)
  if (fb) b.s.push(place(fb, [f.x, 0, f.z]))
  else {
    b.s.push({ cyl: [1.7, 1.8, 0.6, 16], at: [f.x, 0.3, f.z], color: '#bfb6a6' })
    b.s.push({ cyl: [1.5, 1.5, 0.05, 16], at: [f.x, 0.58, f.z], color: '#8cc2d8' })
  }
  // the bronze butchers' boys on the centre column
  b.s.push({ cyl: [0.18, 0.24, 1.0, 8], at: [f.x, 1.2, f.z], color: '#5d6a58' })
  b.s.push({ sphere: [0.24, 8, 6], at: [f.x, 1.85, f.z], color: '#5d6a58' })
  b.solid.push([f.x, f.z, 1.6, 1.6])
  return b
}

// ------------------------------------------------------------------------------------------------
/** A city gate across a street running along X (axis = 'x': the passage runs along X) or Z. */
function gate(b: Sight, cx: number, cz: number, span: number, depth: number, arch: number, H: number, wall: string, roof: string, along: 'x' | 'z', towers: 'round' | 'hex') {
  // local: the passage runs along local Z, the gate spans local X
  const s: ShapeItem[] = []
  const pier = (span - arch) / 2
  for (const side of [-1, 1]) s.push({ box: [pier, H, depth], at: [side * (arch / 2 + pier / 2), H / 2, 0], color: wall })
  const top = H - arch * 0.9 - 0.4
  s.push({ box: [arch, top, depth], at: [0, H - top / 2, 0], color: wall })
  archRing(s, 0, H - top, 0, arch, depth, '#d9c6a8')
  s.push({ box: [span + 0.3, 0.35, depth + 0.3], at: [0, H, 0], color: '#d9c6a8' })
  for (const side of [-1, 1]) {
    const tx = side * (span / 2 + 0.4)
    const segs = towers === 'round' ? 14 : 6
    s.push({ cyl: [2.0, 2.1, H + 2, segs], at: [tx, (H + 2) / 2, 0], color: wall })
    s.push({ cyl: [0.05, 2.3, 4, segs], at: [tx, H + 4, 0], color: roof })
  }
  for (let k = -2; k <= 2; k++) s.push({ cyl: [0.02, 0.35, 1.6, 4], at: [k * (arch / 4), H + 0.9, 0], color: roof })
  // the roof of the middle part
  const r = depth / Math.sqrt(3) + 0.1
  s.push({ cyl: [r, r, span - 1, 3], at: [0, H + 0.2 + 0.5 * r * 0.9, 0], rot: [-Math.PI / 2, 0, Math.PI / 2], scale: [1, 1, 0.9], color: roof })
  const rotY = along === 'z' ? 0 : Math.PI / 2
  b.s.push(place(s, [cx, 0, cz], rotY))
  // solids: the two piers + towers
  for (const side of [-1, 1]) {
    const o = side * (arch / 2 + pier / 2 + 1)
    const half = pier / 2 + 1.6
    if (along === 'z') b.solid.push([cx + o, cz, half, depth / 2 + 0.6])
    else b.solid.push([cx, cz + o, depth / 2 + 0.6, half])
  }
}

/** Karlstor across the Fußgängerzone, the Stachus fountain in front of it. */
export function karlstor(): Sight {
  const b = sight()
  const cz = (FUZO.z0 + FUZO.z1) / 2
  gate(b, KARLSTOR.x, cz, FUZO.z1 - FUZO.z0, KARLSTOR.depth, KARLSTOR.arch, 11, '#e8dcc6', '#9a4c3c', 'x', 'round')
  const { x, z, r } = STACHUS
  const st = kFountain(r)
  if (st) b.s.push(place(st, [x, 0, z]))
  else {
    b.s.push({ cyl: [r, r + 0.15, 0.55, 24], at: [x, 0.27, z], color: '#cfc8bb' })
    b.s.push({ cyl: [r - 0.2, r - 0.2, 0.05, 24], at: [x, 0.52, z], color: '#8cc2d8' })
  }
  b.solid.push([x, z, r * 0.8, r * 0.8])
  return b
}

/** The Sendlinger Tor across Sendlinger Straße (passage runs north–south). */
export function sendlingerTor(): Sight {
  const b = sight()
  const cx = (SENDLINGER.x0 + SENDLINGER.x1) / 2
  gate(b, cx, SENDLINGER_TOR.z, SENDLINGER.x1 - SENDLINGER.x0, 2.4, SENDLINGER_TOR.arch, 8, '#c99a72', '#8a4a3a', 'z', 'hex')
  return b
}

// ------------------------------------------------------------------------------------------------
/** Hauptbahnhof: a long glass-and-steel hall facing Lindenstraße (Bayerstraße), clock, S-/U-Bahn signs. */
export function hauptbahnhof(): Sight {
  const b = sight()
  const { x0, x1, z0, z1 } = HBF
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const H = 9
  b.s.push({ box: [w, H, d], at: [cx, H / 2, cz], color: '#d6d9dc' })
  // glass front: panes between steel mullions
  b.s.push({ box: [w - 1, H - 2.4, 0.1], at: [cx, (H - 2.4) / 2 + 0.6, z1 + 0.02], color: GLASS })
  for (let i = 0; i <= 24; i++) b.s.push({ box: [0.12, H - 2.4, 0.16], at: [x0 + 0.5 + i * ((w - 1) / 24), (H - 2.4) / 2 + 0.6, z1 + 0.06], color: '#5d6672' })
  b.s.push({ box: [w - 1, 0.12, 0.16], at: [cx, 3.4, z1 + 0.06], color: '#5d6672' })
  // the taller middle hall with the name band, a deep canopy over the entrance
  const mx = cx + 3
  b.s.push({ box: [12, 14, d], at: [mx, 7, cz], color: '#cfd3d8' })
  b.s.push({ box: [11, 9.5, 0.1], at: [mx, 5.6, z1 + 0.03], color: GLASS2 })
  for (let i = 0; i <= 6; i++) b.s.push({ box: [0.16, 9.5, 0.2], at: [mx - 5.5 + i * (11 / 6), 5.6, z1 + 0.08], color: '#4f5864' })
  b.s.push({ box: [w + 0.4, 0.35, 3.2], at: [cx, 3.6, z1 + 1.55], color: '#5d6672' })
  for (let i = 0; i < 9; i++) b.s.push({ cyl: [0.1, 0.1, 3.6, 6], at: [x0 + 2 + i * ((w - 4) / 8), 1.8, z1 + 2.95], color: '#5d6672' })
  // a big clock on the middle hall
  b.glow.push({ cyl: [1.1, 1.1, 0.08, 20], at: [mx, 12.2, z1 + 0.1], rot: [Math.PI / 2, 0, 0], color: '#ffffff' })
  b.s.push({ box: [0.08, 0.85, 0.05], at: [mx, 12.5, z1 + 0.16], color: '#222' })
  b.s.push({ box: [0.6, 0.08, 0.05], at: [mx + 0.28, 12.2, z1 + 0.16], color: '#222' })
  // S-Bahn (green round) and U-Bahn (blue square) signs on posts by the doors
  for (const [x, kind] of [
    [x0 + 6, 'S'],
    [x1 - 5, 'U'],
  ] as const) {
    b.s.push({ cyl: [0.06, 0.06, 3.4, 6], at: [x, 1.7, z1 + 3.6], color: '#5d6672' })
    if (kind === 'S') b.glow.push({ cyl: [0.45, 0.45, 0.1, 18], at: [x, 3.6, z1 + 3.6], rot: [Math.PI / 2, 0, 0], color: '#3fae5a' })
    else b.glow.push({ box: [0.85, 0.85, 0.1], at: [x, 3.6, z1 + 3.6], color: '#2f62b8' })
  }
  b.solid.push([cx, cz, w / 2, d / 2])
  return b
}

// ------------------------------------------------------------------------------------------------
/** Feldherrnhalle: an open loggia with three arches at the south end of Odeonsplatz, two lions in front. */
export function feldherrnhalle(): Sight {
  const b = sight()
  const { x0, x1, z0, z1 } = FELDHERRNHALLE
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const H = 10
  const C = '#e6dcc6'
  b.s.push({ box: [w + 2, 0.4, d + 1.5], at: [cx, 0.2, cz + 0.4], color: '#d6ccb6' })
  b.s.push({ box: [w, H, 0.6], at: [cx, H / 2, z1 - 0.3], color: C })
  const arch = 3.0
  for (let i = 0; i < 4; i++) {
    const x = x0 + 0.6 + i * ((w - 1.2) / 3)
    for (const z of [z0 + 0.5, cz]) b.s.push({ box: [1.1, 7, 1.1], at: [x, 3.9, z], color: C })
  }
  for (let i = 0; i < 3; i++) {
    const x = x0 + 0.6 + (i + 0.5) * ((w - 1.2) / 3)
    archRing(b.s, x, 7.4, cz - 0.2, arch, d - 0.8, '#d6ccb6')
  }
  b.s.push({ box: [w, 2.4, d - 0.6], at: [cx, H - 0.8, cz - 0.3], color: C })
  b.s.push({ box: [w + 0.4, 0.4, d], at: [cx, H + 0.6, cz], color: '#d6ccb6' })
  for (let i = 0; i < 14; i++) b.s.push({ box: [0.25, 0.7, 0.25], at: [x0 + 0.4 + i * ((w - 0.8) / 13), H + 1.15, z0 + 0.3], color: C })
  // statues inside (two dark bronze figures)
  for (const x of [cx - 3.6, cx + 3.6]) {
    b.s.push({ box: [1.2, 1.2, 1.2], at: [x, 1.0, cz + 1.4], color: '#cfc4b0' })
    b.s.push({ cyl: [0.25, 0.35, 1.6, 8], at: [x, 2.4, cz + 1.4], color: '#4f5a52' })
    b.s.push({ sphere: [0.25, 8, 6], at: [x, 3.4, cz + 1.4], color: '#4f5a52' })
  }
  // the two lions on the steps
  for (const x of [x0 + 0.8, x1 - 0.8]) {
    b.s.push({ box: [1.3, 1.1, 2.4], at: [x, 0.95, z0 - 0.4], color: '#d6ccb6' })
    b.s.push({ box: [0.8, 0.7, 1.7], at: [x, 1.85, z0 - 0.5], color: '#cfc4b0' })
    b.s.push({ sphere: [0.45, 10, 8], at: [x, 2.45, z0 - 1.25], scale: [1, 1.05, 0.9], color: '#cfc4b0' })
  }
  b.solid.push([cx, z1 - 0.3, w / 2, 0.5])
  for (let i = 0; i < 4; i++) b.solid.push([x0 + 0.6 + i * ((w - 1.2) / 3), z0 + 0.5, 0.6, 0.6])
  for (const x of [x0 + 0.8, x1 - 0.8]) b.solid.push([x, z0 - 0.4, 0.7, 1.2])
  return b
}

/** Theatinerkirche: the yellow baroque church, two towers with scrolled caps and a big dome (front faces east). */
export function theatinerkirche(): Sight {
  const b = sight()
  const { x0, x1, z0, z1 } = THEATINER
  const Y = '#f0bf4c'
  const Y2 = '#e3ad3a'
  const cz = (z0 + z1) / 2
  const d = z1 - z0
  // body
  b.s.push({ box: [x1 - x0, 13, d - 8], at: [(x0 + x1) / 2, 6.5, cz], color: Y })
  // front: middle part with a pediment, columns, the portal
  b.s.push({ box: [1.2, 15, d - 9], at: [x1 - 0.6, 7.5, cz], color: Y })
  for (let i = 0; i < 6; i++) b.s.push({ box: [0.5, 11, 0.6], at: [x1 + 0.2, 6, z0 + 5 + i * ((d - 10) / 5)], color: '#fbf2dc' })
  b.s.push({ cyl: [3.6, 3.6, 0.6, 3], at: [x1 - 0.4, 16.0, cz], rot: [-Math.PI / 2, 0, Math.PI / 2], scale: [1, 1, 0.55], color: Y2 })
  b.s.push({ box: [0.2, 4, 2.4], at: [x1 + 0.1, 2.0, cz], color: '#5b3a2c' })
  for (let i = 0; i < 2; i++) for (const z of [cz - 3, cz + 3]) b.s.push({ box: [0.1, 2.2, 1.0], at: [x1 + 0.12, 7 + i * 4, z], color: GLASS2 })
  // two towers at the corners of the front
  for (const tz of [z0 + 2.2, z1 - 2.2]) {
    b.s.push({ box: [4.4, 22, 4.4], at: [x1 - 2.2, 11, tz], color: Y })
    for (const y of [8, 14, 20]) b.s.push({ box: [4.6, 0.35, 4.6], at: [x1 - 2.2, y, tz], color: '#fbf2dc' })
    b.s.push({ box: [0.1, 2.4, 1.2], at: [x1 + 0.02, 17, tz], color: '#4a4f6a' })
    b.s.push({ sphere: [2.0, 12, 10, Math.PI / 2], at: [x1 - 2.2, 22, tz], color: Y2 })
    b.s.push({ cyl: [0.5, 0.7, 1.6, 8], at: [x1 - 2.2, 24.4, tz], color: Y })
    b.s.push({ sphere: [0.7, 10, 8], at: [x1 - 2.2, 25.6, tz], color: '#5d5a5c' })
    b.s.push({ cyl: [0.03, 0.08, 1.6, 5], at: [x1 - 2.2, 26.8, tz], color: GOLD })
    b.solid.push([x1 - 2.2, tz, 2.2, 2.2])
  }
  // drum and dome behind
  const dx = x0 + 6
  b.s.push({ cyl: [4.2, 4.2, 8, 16], at: [dx, 17, cz], color: Y })
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    b.s.push({ box: [0.9, 2.6, 0.1], at: [dx + Math.cos(a) * 4.22, 17, cz + Math.sin(a) * 4.22], rot: [0, -a + Math.PI / 2, 0], color: GLASS2 })
  }
  b.s.push({ sphere: [4.4, 18, 10, Math.PI / 2], at: [dx, 21, cz], color: '#5d6a64' })
  b.s.push({ cyl: [0.9, 1.1, 2.4, 8], at: [dx, 26.2, cz], color: Y })
  b.s.push({ sphere: [1.0, 10, 8, Math.PI / 2], at: [dx, 27.4, cz], color: '#5d6a64' })
  b.s.push({ cyl: [0.04, 0.1, 2, 5], at: [dx, 29, cz], color: GOLD })
  roofX(b.s, x1 - x0, d - 8, 13, '#8a6a52', 0.4)
  const last = b.s.pop() as ShapeItem
  b.s.push(place([last], [(x0 + x1) / 2, 0, cz]))
  b.solid.push([(x0 + x1) / 2, cz, (x1 - x0) / 2 + 0.6, (d - 8) / 2])
  return b
}

/** The Residenz: a long palace facade facing Odeonsplatz (west). */
export function residenz(): Sight {
  const b = sight()
  const { x0, x1, z0, z1 } = RESIDENZ
  const len = z1 - z0
  b.s.push(place(mucHouse('palais', len, x1 - x0, 77), [(x0 + x1) / 2, 0, (z0 + z1) / 2], -Math.PI / 2))
  // two lions on posts at the gate
  for (const z of [(z0 + z1) / 2 - 2.2, (z0 + z1) / 2 + 2.2]) {
    b.s.push({ box: [0.8, 1.6, 0.8], at: [x0 - 0.7, 0.8, z], color: '#cfc4b0' })
    b.s.push({ sphere: [0.4, 8, 6], at: [x0 - 0.7, 1.9, z], color: '#4f5a52' })
  }
  b.solid.push([(x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, len / 2], [x0 - 0.7, (z0 + z1) / 2, 0.5, 2.8])
  return b
}

/** Dianatempel in the middle of the Hofgarten: an open pavilion with a copper dome and Diana on top. */
export function dianatempel(): Sight {
  const b = sight()
  const { x, z } = DIANATEMPEL
  b.s.push({ cyl: [4.6, 4.8, 0.3, 16], at: [x, 0.15, z], color: '#d6ccb6' })
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    b.s.push({ box: [0.7, 4.2, 0.7], at: [x + Math.cos(a) * 3.8, 2.4, z + Math.sin(a) * 3.8], rot: [0, -a, 0], color: STONE })
    b.solid.push([x + Math.cos(a) * 3.8, z + Math.sin(a) * 3.8, 0.4, 0.4])
  }
  b.s.push({ cyl: [4.4, 4.4, 1.0, 16], at: [x, 5.0, z], color: STONE })
  b.s.push({ sphere: [4.3, 16, 8, Math.PI / 2], at: [x, 5.4, z], scale: [1, 0.6, 1], color: COPPER })
  b.s.push({ cyl: [0.2, 0.3, 1.2, 6], at: [x, 8.4, z], color: '#3f5a4e' })
  b.s.push({ sphere: [0.2, 8, 6], at: [x, 9.2, z], color: '#3f5a4e' })
  return b
}

// ------------------------------------------------------------------------------------------------
/** Hofbräuhaus am Platzl: cream walls, arched windows, a big arched door with lanterns, blue-white banners. */
export function hofbraeuhaus(): Sight {
  const b = sight()
  const { x0, x1, z0, z1 } = HOFBRAEU
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const H = 12
  const WALL = '#f2ead6'
  b.s.push({ box: [w, H, d], at: [cx, H / 2, cz], color: WALL })
  b.s.push({ box: [w + 0.06, 3.6, 0.08], at: [cx, 1.8, z1 + 0.02], color: '#e2d6bc' })
  for (let i = 0; i < 7; i++) {
    const x = x0 + 1.4 + i * ((w - 2.8) / 6)
    if (i === 3) continue
    b.s.push({ box: [1.3, 2.0, 0.08], at: [x, 1.9, z1 + 0.04], color: GLASS2 })
    b.s.push({ cyl: [0.65, 0.65, 0.08, 10, ], at: [x, 2.9, z1 + 0.04], rot: [Math.PI / 2, 0, 0], color: GLASS2 })
    for (const fl of [0, 1]) {
      b.s.push({ box: [1.0, 1.7, 0.08], at: [x, 5.6 + fl * 3.2, z1 + 0.03], color: GLASS })
      b.s.push({ box: [1.2, 0.12, 0.18], at: [x, 4.7 + fl * 3.2, z1 + 0.08], color: '#c9b48a' })
      // flower boxes with red geraniums
      b.s.push({ box: [1.0, 0.18, 0.2], at: [x, 4.85 + fl * 3.2, z1 + 0.16], color: '#7a4a2a' })
      for (let k = 0; k < 3; k++) b.s.push({ ico: [0.1], at: [x - 0.3 + k * 0.3, 5.0 + fl * 3.2, z1 + 0.2], color: '#e0485a' })
    }
  }
  // the arched main door, two lanterns
  b.s.push({ box: [3.0, 3.4, 0.12], at: [cx, 1.7, z1 + 0.05], color: '#5b3a2c' })
  b.s.push({ cyl: [1.5, 1.5, 0.12, 14, ], at: [cx, 3.4, z1 + 0.05], rot: [Math.PI / 2, 0, 0], color: '#5b3a2c' })
  b.s.push({ box: [3.6, 0.3, 0.3], at: [cx, 5.1, z1 + 0.1], color: '#c9b48a' })
  for (const x of [cx - 2.2, cx + 2.2]) b.glow.push({ box: [0.3, 0.45, 0.3], at: [x, 3.3, z1 + 0.35], color: '#ffd98a' })
  // the gable over the door and the crown
  for (let k = 0; k < 3; k++) b.s.push({ box: [6 - k * 1.8, 1.2, 0.5], at: [cx, H + 0.6 + k * 1.2, z1 - 0.25], color: WALL })
  b.s.push({ box: [1.6, 0.25, 0.1], at: [cx, H + 0.9, z1 + 0.02], color: '#2f4f8f' })
  // steep red roof
  const roof: ShapeItem[] = []
  roofX(roof, w, d, 0, '#a8493c', 0.75)
  b.s.push(place(roof, [cx, H, cz]))
  // blue-white pennants and flags across the front
  for (let i = 0; i < 16; i++) {
    const x = x0 + 0.6 + i * ((w - 1.2) / 15)
    b.s.push({ cyl: [0.18, 0.01, 0.42, 3], at: [x, 3.9 - Math.sin((i / 15) * Math.PI) * 0.25, z1 + 0.25], rot: [Math.PI, 0, 0], color: i % 2 ? '#ffffff' : '#3f7fc8' })
  }
  for (const x of [x0 + 2, x1 - 2]) {
    b.s.push({ cyl: [0.04, 0.04, 2.0, 5], at: [x, 7.4, z1 + 0.9], rot: [0.85, 0, 0], color: '#d8d8d8' })
    b.s.push({ box: [0.9, 1.6, 0.04], at: [x, 6.8, z1 + 1.55], color: '#ffffff' })
    for (let k = 0; k < 4; k++) b.s.push({ box: [0.22, 0.22, 0.05], at: [x - 0.33 + k * 0.22, 6.2 + (k % 2) * 0.22, z1 + 1.56], color: '#3f7fc8' })
  }
  // beer barrels at the door
  for (const x of [cx - 3.2, cx + 3.2]) {
    b.s.push({ cyl: [0.42, 0.42, 0.9, 12], at: [x, 0.45, z1 + 0.7], color: '#8a5a32' })
    for (const y of [0.2, 0.7]) b.s.push({ torus: [0.43, 0.03, 4, 14], at: [x, y, z1 + 0.7], rot: [Math.PI / 2, 0, 0], color: '#3a3a40' })
  }
  b.solid.push([cx, cz, w / 2, d / 2])
  return b
}

// ------------------------------------------------------------------------------------------------
/** Haus der Kunst: a long row of columns (faces south onto Prinzregentenstraße). */
export function hausDerKunst(): Sight {
  const b = sight()
  const { x0, x1, z0, z1 } = HAUS_DER_KUNST
  const w = x1 - x0
  const cx = (x0 + x1) / 2
  b.s.push({ box: [w, 9, z1 - z0 - 2.5], at: [cx, 4.5, (z0 + z1) / 2 - 1.25], color: '#ece6da' })
  b.s.push({ box: [w + 1, 0.5, z1 - z0], at: [cx, 0.25, (z0 + z1) / 2], color: '#dcd4c4' })
  for (let i = 0; i < 18; i++) b.s.push({ cyl: [0.32, 0.36, 8.2, 10], at: [x0 + 0.6 + i * ((w - 1.2) / 17), 4.6, z1 - 0.8], color: '#f4efe4' })
  b.s.push({ box: [w + 0.6, 1.0, 2.8], at: [cx, 9.1, z1 - 1.2], color: '#e2dacb' })
  b.solid.push([cx, (z0 + z1) / 2 - 1.25, w / 2, (z1 - z0 - 2.5) / 2])
  return b
}

/** Monopteros: a round temple with ten columns on its little hill. */
export function monopteros(): Sight {
  const b = sight()
  const { x, z, mound } = MONOPTEROS
  // a low grassy hill (no collider: you can walk up into the temple)
  b.s.push({ sphere: [mound, 20, 8, Math.PI / 2], at: [x, 0, z], scale: [1, 0.05, 1], color: '#8fbf6a' })
  const top = 0.3
  b.s.push({ cyl: [3.0, 3.2, 0.2, 20], at: [x, top + 0.1, z], color: '#e4dccb' })
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2
    b.s.push({ cyl: [0.2, 0.24, 4.2, 8], at: [x + Math.cos(a) * 2.5, top + 2.6, z + Math.sin(a) * 2.5], color: '#f4efe4' })
  }
  b.s.push({ cyl: [2.9, 2.9, 0.6, 20], at: [x, top + 5.0, z], color: '#ece6da' })
  b.s.push({ sphere: [2.8, 18, 8, Math.PI / 2], at: [x, top + 5.3, z], scale: [1, 0.5, 1], color: COPPER })
  b.s.push({ sphere: [0.25, 8, 6], at: [x, top + 6.8, z], color: GOLD })
  // steps up the hill (south)
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2
    b.solid.push([x + Math.cos(a) * 2.5, z + Math.sin(a) * 2.5, 0.25, 0.25])
  }
  return b
}

/** Chinesischer Turm: a five-tier wooden pagoda in the beer garden. */
export function chinesischerTurm(): Sight {
  const b = sight()
  const { x, z } = CHIN_TURM
  const WOOD = '#9a6a3e'
  const ROOF = '#4f7f5e'
  let y = 0
  for (let i = 0; i < 5; i++) {
    const r = 3.4 - i * 0.55
    const h = i === 0 ? 3.2 : 2.4
    b.s.push({ cyl: [r * 0.8, r * 0.8, h, 8], at: [x, y + h / 2, z], color: i === 0 ? '#c9a06a' : WOOD })
    if (i > 0) for (let k = 0; k < 8; k++) b.s.push({ box: [0.5, 1.2, 0.05], at: [x + Math.cos((k / 8) * Math.PI * 2) * r * 0.8, y + h / 2, z + Math.sin((k / 8) * Math.PI * 2) * r * 0.8], rot: [0, -(k / 8) * Math.PI * 2 + Math.PI / 2, 0], color: '#f2e2b8' })
    y += h
    b.s.push({ cyl: [r * 0.45, r * 1.25, 0.9, 8], at: [x, y + 0.3, z], color: ROOF })
    b.glow.push({ torus: [r * 1.2, 0.05, 4, 16], at: [x, y - 0.12, z], rot: [Math.PI / 2, 0, 0], color: '#ffd98a' })
    y += 0.5
  }
  b.s.push({ cyl: [0.06, 0.4, 1.4, 8], at: [x, y + 0.6, z], color: GOLD })
  b.solid.push([x, z, 2.5, 2.5])
  return b
}

/** Ludwigstraße: the LMU main building (front faces the boulevard), its two fountains, the Siegestor. */
export function ludwigstrasse(): Sight {
  const b = sight()
  const { x0, x1, z0, z1 } = LMU
  const len = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  b.s.push(place(mucHouse('palais', len, x1 - x0, 41), [cx, 0, cz], Math.PI / 2))
  // central portal (round arch) and the name band
  b.s.push({ box: [0.6, 7, 6], at: [x1 + 0.3, 3.5, cz], color: '#f4efe4' })
  b.s.push({ box: [0.2, 3.4, 2.4], at: [x1 + 0.65, 1.7, cz], color: '#5b3a2c' })
  b.solid.push([cx, cz, (x1 - x0) / 2, len / 2])
  for (const f of UNI_FOUNTAINS) {
    const uf = kFountain(2.6)
    if (uf) b.s.push(place(uf, [f.x, 0, f.z]))
    else {
      b.s.push({ cyl: [2.6, 2.7, 0.55, 24], at: [f.x, 0.27, f.z], color: '#cfc8bb' })
      b.s.push({ cyl: [2.4, 2.4, 0.05, 24], at: [f.x, 0.53, f.z], color: '#8cc2d8' })
    }
    b.solid.push([f.x, f.z, 2.1, 2.1])
  }
  // Siegestor: triumphal arch across the boulevard (3 openings), the lion quadriga on top
  const sx = (LUDWIG.x0 + LUDWIG.x1) / 2
  const sz = SIEGESTOR.z
  const span = 14
  const C = '#e9e2d4'
  const piers = [-span / 2 + 1, -2.6, 2.6, span / 2 - 1]
  for (const px of piers) {
    b.s.push({ box: [2, 9, SIEGESTOR.depth], at: [sx + px, 4.5, sz], color: C })
    b.s.push({ cyl: [0.35, 0.4, 8.4, 10], at: [sx + px, 4.2, sz + SIEGESTOR.depth / 2 + 0.4], color: '#f4efe4' })
    b.solid.push([sx + px, sz, 1.0, SIEGESTOR.depth / 2 + 0.6])
  }
  archRing(b.s, sx, 9, sz, 5.2, SIEGESTOR.depth, '#d6ccb6')
  for (const px of [-span / 2 + 3.25, span / 2 - 3.25]) archRing(b.s, sx + px, 6.6, sz, 2.5, SIEGESTOR.depth, '#d6ccb6')
  b.s.push({ box: [5.2, 2.6, SIEGESTOR.depth], at: [sx, 10.3, sz], color: C })
  for (const px of [-span / 2 + 3.25, span / 2 - 3.25]) b.s.push({ box: [2.5, 2.4, SIEGESTOR.depth], at: [sx + px, 7.8, sz], color: C })
  b.s.push({ box: [span, 5, SIEGESTOR.depth], at: [sx, 11.5, sz], color: C })
  b.s.push({ box: [span + 0.6, 0.6, SIEGESTOR.depth + 0.6], at: [sx, 14.2, sz], color: '#d6ccb6' })
  // Bavaria with four lions
  const BR = '#4f5a52'
  b.s.push({ box: [3.2, 1.2, 2.2], at: [sx, 15.1, sz], color: BR })
  for (let k = 0; k < 4; k++) b.s.push({ box: [0.5, 1.0, 1.6], at: [sx - 1.5 + k, 15.4, sz + 1.8], color: BR })
  b.s.push({ cyl: [0.35, 0.5, 2.0, 8], at: [sx, 16.7, sz], color: BR })
  b.s.push({ sphere: [0.3, 8, 6], at: [sx, 17.9, sz], color: BR })
  return b
}

/** Friedensengel: the golden angel on a tall column on the east bank. */
export function friedensengel(): Sight {
  const b = sight()
  const { x, z } = FRIEDENSENGEL
  b.s.push({ box: [4.4, 1.2, 4.4], at: [x, 0.6, z], color: '#d8d0c0' })
  b.s.push({ box: [2.6, 3.4, 2.6], at: [x, 2.9, z], color: '#e4dccb' })
  b.s.push({ cyl: [0.55, 0.6, 13, 14], at: [x, 11.1, z], color: '#e9e2d4' })
  b.s.push({ box: [1.4, 0.7, 1.4], at: [x, 17.9, z], color: '#d8d0c0' })
  b.s.push({ cyl: [0.2, 0.4, 1.6, 8], at: [x, 19.1, z], color: GOLD })
  b.s.push({ sphere: [0.22, 8, 6], at: [x, 20.1, z], color: GOLD })
  for (const side of [-1, 1]) b.s.push({ box: [1.4, 0.7, 0.08], at: [x + side * 0.65, 19.6, z], rot: [0, 0, side * 0.5], color: GOLD })
  b.solid.push([x, z, 2.2, 2.2])
  return b
}

/** Across the Isar (outside the walkable area, seen from the bridges): the Maximilianeum and the Deutsches Museum. */
export function acrossTheIsar(): ShapeItem[] {
  const s: ShapeItem[] = []
  // Maximilianeum: two tiers of arches, a central tower block, green roofs
  const mx = 80
  const mz = -66
  s.push({ box: [10, 14, 40], at: [mx, 7, mz], color: '#e3cfa8' })
  for (let i = 0; i < 12; i++) {
    for (const y of [3.5, 9]) {
      s.push({ box: [0.12, 3.6, 2.2], at: [mx - 5.05, y, mz - 17 + i * 3.1], color: '#6a6a74' })
      s.push({ cyl: [1.1, 1.1, 0.12, 10], at: [mx - 5.05, y + 1.8, mz - 17 + i * 3.1], rot: [0, 0, Math.PI / 2], scale: [1, 1, 1], color: '#6a6a74' })
    }
  }
  s.push({ box: [11, 6, 10], at: [mx, 17, mz], color: '#e3cfa8' })
  s.push({ box: [10.6, 0.6, 40.4], at: [mx, 14.3, mz], color: COPPER })
  s.push({ box: [11.4, 0.6, 10.4], at: [mx, 20.3, mz], color: COPPER })
  s.push({ sphere: [0.4, 8, 6], at: [mx - 5.6, 21.2, mz], color: GOLD })
  // Deutsches Museum: a long ochre block with a square tower
  const dx = 78
  const dz = 30
  s.push({ box: [16, 12, 26], at: [dx, 6, dz], color: '#e2c79c' })
  for (let i = 0; i < 8; i++) s.push({ box: [0.12, 5, 1.8], at: [dx - 8.05, 6.5, dz - 11 + i * 3.1], color: GLASS2 })
  s.push({ box: [6, 30, 6], at: [dx - 4, 15, dz - 9], color: '#e8d2ac' })
  s.push({ box: [6.6, 0.8, 6.6], at: [dx - 4, 30.4, dz - 9], color: '#9a6a3e' })
  s.push({ cyl: [1.2, 1.2, 0.1, 16], at: [dx - 7.06, 25, dz - 9], rot: [0, 0, Math.PI / 2], color: '#ffffff' })
  // the Müllersches Volksbad (domed bath house)
  s.push({ box: [10, 9, 14], at: [74, 4.5, -24], color: '#efe0c4' })
  s.push({ sphere: [4.2, 14, 8, Math.PI / 2], at: [74, 9, -24], color: '#8a6a5a' })
  s.push({ box: [3, 16, 3], at: [70.5, 8, -16], color: '#efe0c4' })
  s.push({ cyl: [0.1, 2.2, 3, 4], at: [70.5, 17.5, -16], rot: [0, Math.PI / 4, 0], color: '#8a6a5a' })
  return s
}

/** For the map: (x, z) of each sight's label. */
export const SIGHT_COLORS = { brick: '#c9826a', stone: '#c9c0ae', yellow: '#f2c14e', copper: COPPER }
export { P as _P }
