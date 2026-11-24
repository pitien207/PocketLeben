import { modelShapes, type ModelOptions } from '../shared/models'
import { PALETTE as P } from '../shared/palette'
import { place, plantShapes } from '../shared/props'
import type { ShapeItem } from '../shared/Shapes'
import { DOORMAT } from '../shared/Room'

/**
 * 1.41 Furniture kit for the shop rooms (plans.ts). Everything is pushed into one `Build`: `s` = the room's solid
 * vertex-coloured mesh, `glow` = bulbs, tubes, neon and coals (glowMaterial → bloom at night), `block` = footprints
 * [x, z, halfX, halfZ] the player cannot walk through. Library pieces: Quaternius House Interior (pack "interior",
 * names `i…`) and KayKit Restaurant Bits (pack "food"); every helper still draws something while a pack is missing.
 *
 * Room space: centred on the origin, back wall at z = −d/2, the open (camera) side at z = +d/2.
 */

export type Blocker = [number, number, number, number]
export interface Build {
  s: ShapeItem[]
  glow: ShapeItem[]
  block: Blocker[]
}
export const newBuild = (): Build => ({ s: [], glow: [], block: [] })

/** A library model `h` metres high (or scaled), or nothing while its pack is missing. */
export const M = (name: string, h?: number, o: ModelOptions = {}): ShapeItem[] => modelShapes(name, h ? { ...o, height: h } : o) ?? []
export const put = (items: ShapeItem[], x: number, y: number, z: number, rot = 0, scale = 1): ShapeItem => place(items, [x, y, z], rot, scale)
export const paintAll = (color: string): ModelOptions => ({ paint: () => color })

/** Deterministic 0…1 from a seed. */
export const rnd = (seed: number) => {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}
export const pick = <T>(list: readonly T[], seed: number) => list[Math.floor(rnd(seed) * list.length) % list.length]

// --- Walls -----------------------------------------------------------------------------------------------------------

/** A band of wall tiles (or paint) along the back wall from the floor up to `h`, with a trim line on top. */
export function wainscot(b: Build, w: number, d: number, h: number, color: string, trim: string, tiles?: string) {
  const z = -d / 2 + 0.012
  b.s.push({ box: [w, h, 0.02], at: [0, h / 2, z], color })
  b.s.push({ box: [w, 0.05, 0.04], at: [0, h, z + 0.01], color: trim })
  if (tiles) for (let x = -w / 2 + 0.15; x < w / 2; x += 0.3) for (let y = 0.15; y < h - 0.05; y += 0.3) if ((Math.round(x / 0.3) + Math.round(y / 0.3)) % 2 === 0) b.s.push({ box: [0.28, 0.28, 0.006], at: [x, y, z + 0.013], color: tiles })
  // the same band on both side walls (back part)
  for (const side of [-1, 1]) {
    b.s.push({ box: [0.02, h, d * 0.55], at: [side * (w / 2 - 0.012), h / 2, -d / 2 + (d * 0.55) / 2], color })
    b.s.push({ box: [0.04, 0.05, d * 0.55], at: [side * (w / 2 - 0.02), h, -d / 2 + (d * 0.55) / 2], color: trim })
  }
}

/** Doorway in the back wall to the kitchen / storeroom: dark opening, frame, a bead or cloth curtain. */
export function backDoor(b: Build, x: number, d: number, frame: string, curtain: string[] | string = ['#c8322b', '#f4c04e', '#3fae72', '#ffffff']) {
  const z = -d / 2 + 0.02
  b.s.push({ box: [1.0, 2.15, 0.02], at: [x, 1.075, z], color: '#3a2a22' })
  b.s.push({ box: [1.14, 0.08, 0.06], at: [x, 2.19, z + 0.02], color: frame })
  for (const sx of [-1, 1]) b.s.push({ box: [0.07, 2.2, 0.06], at: [x + sx * 0.535, 1.1, z + 0.02], color: frame })
  if (Array.isArray(curtain)) for (let i = 0; i < 8; i++) b.s.push({ box: [0.03, 1.95, 0.02], at: [x - 0.42 + i * 0.12, 1.15, z + 0.05], color: curtain[i % curtain.length] })
  else {
    // a short cloth curtain (noren) with a slit
    for (const sx of [-1, 1]) b.s.push({ box: [0.46, 0.75, 0.02], at: [x + sx * 0.245, 1.78, z + 0.05], color: curtain })
  }
}

/** A window cut into a side wall (x = side·w/2), panes glowing a little: the street outside. */
export function sideWindow(b: Build, w: number, side: -1 | 1, z: number, frame: string, glass = '#cfe8f6', y = 1.75, width = 1.4) {
  const x = side * (w / 2 - 0.012)
  b.s.push({ box: [0.03, 1.3, width + 0.12], at: [x, y, z], color: frame })
  b.s.push({ box: [0.035, 1.12, width - 0.06], at: [x, y, z], color: glass })
  b.s.push({ box: [0.04, 1.12, 0.05], at: [x, y, z], color: frame })
  b.s.push({ box: [0.2, 0.06, width + 0.2], at: [x - side * 0.08, y - 0.66, z], color: frame })
}

// --- Light -----------------------------------------------------------------------------------------------------------

/** Fluorescent tube on a wall (back wall when `side` is 0, else on the side wall). */
export function tube(b: Build, x: number, y: number, z: number, len = 1.2, along: 'x' | 'z' = 'x') {
  const box: [number, number, number] = along === 'x' ? [len, 0.06, 0.08] : [0.08, 0.06, len]
  const lit: [number, number, number] = along === 'x' ? [len - 0.08, 0.04, 0.04] : [0.04, 0.04, len - 0.08]
  b.s.push({ box, at: [x, y + 0.03, z], color: '#e6e8ee' })
  b.glow.push({ box: lit, at: [x, y - 0.01, z + (along === 'x' ? 0.03 : 0)], color: '#fffbe8' })
}

/** A pendant lamp hanging from the top of the walls: wire, cone shade, warm bulb. */
export function pendant(b: Build, x: number, z: number, top: number, drop: number, shade = '#2f2f38', bulb = '#ffe7b0', r = 0.2) {
  b.s.push({ cyl: [0.006, 0.006, drop, 4], at: [x, top - drop / 2, z], color: P.wire })
  b.s.push({ cyl: [0.04, r, r * 0.9, 12], at: [x, top - drop - r * 0.45, z], color: shade })
  b.glow.push({ sphere: [r * 0.38, 10, 8], at: [x, top - drop - r * 0.85, z], color: bulb })
}

/** A red silk lantern (đèn lồng) hanging on a cord. */
export function lantern(b: Build, x: number, z: number, top: number, drop = 0.35, color = '#e8372c', r = 0.18) {
  b.s.push({ cyl: [0.005, 0.005, drop, 3], at: [x, top - drop / 2, z], color: P.wire })
  b.s.push({ cyl: [r * 0.4, r * 0.4, 0.05, 8], at: [x, top - drop - 0.02, z], color: '#f4c04e' })
  b.glow.push({ sphere: [r, 10, 8], at: [x, top - drop - r * 0.85, z], scale: [1, 0.85, 1], color })
  b.s.push({ cyl: [r * 0.4, r * 0.4, 0.04, 8], at: [x, top - drop - r * 1.7, z], color: '#f4c04e' })
  for (let i = 0; i < 5; i++) b.s.push({ box: [0.01, 0.18, 0.01], at: [x - 0.04 + i * 0.02, top - drop - r * 1.7 - 0.11, z], color: '#f4c04e' })
}

/** A string of fairy lights along x at height y (on the back wall when z is given). */
export function fairyLights(b: Build, x0: number, x1: number, y: number, z: number, sag = 0.12) {
  const n = Math.max(4, Math.round((x1 - x0) / 0.3))
  const colors = ['#ffe08a', '#ff9fb2', '#a9e6ff', '#b8f2a6']
  for (let i = 0; i <= n; i++) b.glow.push({ sphere: [0.035, 6, 4], at: [x0 + ((x1 - x0) * i) / n, y - Math.sin((i / n) * Math.PI) * sag, z], color: colors[i % colors.length] })
}

// --- Fittings --------------------------------------------------------------------------------------------------------

/** A counter: plinth, body, top with a lip; `trim` paints a band along the front. Blocks the floor. */
export function counter(b: Build, x: number, z: number, w: number, dz: number, top: string, body: string, h = 0.95, trim?: string, rotY = 0) {
  const s: ShapeItem[] = [
    { box: [w - 0.06, 0.1, dz - 0.06], at: [0, 0.05, 0], color: '#3a2f2a' },
    { box: [w, h - 0.15, dz], at: [0, 0.1 + (h - 0.15) / 2, 0], color: body },
    { box: [w + 0.08, 0.05, dz + 0.08], at: [0, h - 0.025, 0], color: top },
  ]
  if (trim) s.push({ box: [w + 0.01, 0.08, 0.02], at: [0, h * 0.62, dz / 2 + 0.005], color: trim })
  b.s.push(put(s, x, 0, z, rotY))
  const turned = Math.abs(Math.sin(rotY)) > 0.5
  b.block.push([x, z, (turned ? dz : w) / 2 + 0.02, (turned ? w : dz) / 2 + 0.02])
}

/** A glass display case on a counter body: frame, glass top band, goods inside (`fill` draws them, local). */
export function glassCase(b: Build, x: number, z: number, w: number, dz: number, h: number, body: string, frame: string, fill?: (s: ShapeItem[], y: number) => void) {
  const s: ShapeItem[] = []
  s.push({ box: [w, h * 0.55, dz], at: [0, (h * 0.55) / 2, 0], color: body })
  const y0 = h * 0.55
  s.push({ box: [w - 0.04, 0.02, dz - 0.04], at: [0, y0 + 0.01, 0], color: '#fbf7f0' })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.push({ box: [0.03, h - y0, 0.03], at: [sx * (w / 2 - 0.015), y0 + (h - y0) / 2, sz * (dz / 2 - 0.015)], color: frame })
  s.push({ box: [w, 0.03, dz], at: [0, h, 0], color: '#d7eef4' })
  s.push({ box: [w, 0.025, 0.03], at: [0, h, dz / 2 - 0.015], color: frame })
  s.push({ box: [w - 0.06, (h - y0) * 0.35, 0.01], at: [0, y0 + 0.08, dz / 2 - 0.01], color: '#d7eef4' })
  fill?.(s, y0 + 0.02)
  b.s.push(put(s, x, 0, z))
  b.glow.push({ box: [w - 0.1, 0.02, 0.03], at: [x, h - 0.03, z - dz / 2 + 0.06], color: '#fff6dc' })
  b.block.push([x, z, w / 2 + 0.02, dz / 2 + 0.02])
}

const GOODS = ['#d4473b', '#f4c04e', '#4f8fd8', '#3fae72', '#ff9fb2', '#ffffff', '#9b7bd0', '#e8a243', '#2f6b4f', '#f6efe0']

export type GoodsKind = 'packs' | 'bottles' | 'books' | 'boxes' | 'jars' | 'binders' | 'pills' | 'cans' | 'fabric'

/** Fills one shelf board (local, along x from −w/2…w/2 at height y, depth centred on 0). */
export function goods(s: ShapeItem[], kind: GoodsKind, w: number, y: number, depth: number, seed: number, palette: readonly string[] = GOODS) {
  let x = -w / 2 + 0.04
  let k = 0
  while (x < w / 2 - 0.06) {
    const c = pick(palette, seed * 13 + k)
    const r = rnd(seed * 7 + k * 3)
    switch (kind) {
      case 'books': {
        const bw = 0.035 + r * 0.04
        const bh = 0.2 + rnd(seed + k) * 0.12
        const lean = rnd(seed * 3 + k) > 0.92 ? 0.25 : 0
        s.push({ box: [bw, bh, depth * 0.8], at: [x + bw / 2, y + bh / 2, 0], rot: [0, 0, lean], color: c })
        if (rnd(seed + k * 5) > 0.6) s.push({ box: [bw + 0.002, 0.02, depth * 0.81], at: [x + bw / 2, y + bh * 0.75, 0], color: '#f4e9cf' })
        x += bw + 0.004 + (lean ? 0.05 : 0)
        break
      }
      case 'binders': {
        const bw = 0.07
        s.push({ box: [bw, 0.3, depth * 0.85], at: [x + bw / 2, y + 0.15, 0], color: c })
        s.push({ box: [0.04, 0.08, 0.005], at: [x + bw / 2, y + 0.2, depth * 0.43], color: '#ffffff' })
        x += bw + 0.006
        break
      }
      case 'bottles':
      case 'cans': {
        const tall = kind === 'bottles' ? 0.2 + r * 0.08 : 0.12
        const rad = kind === 'bottles' ? 0.035 : 0.033
        for (const dz of [-depth / 4, depth / 4]) s.push({ cyl: [rad, rad, tall, 7], at: [x + rad, y + tall / 2, dz], color: c })
        if (kind === 'bottles') s.push({ cyl: [0.012, 0.012, 0.05, 5], at: [x + rad, y + tall + 0.025, depth / 4], color: '#ffffff' })
        s.push({ box: [rad * 2.02, tall * 0.3, 0.005], at: [x + rad, y + tall * 0.5, depth / 4 + rad], color: '#ffffff' })
        x += rad * 2 + 0.012
        break
      }
      case 'jars': {
        s.push({ cyl: [0.06, 0.06, 0.16, 9], at: [x + 0.06, y + 0.08, 0], color: '#e6f3f6' })
        s.push({ cyl: [0.052, 0.052, 0.1, 9], at: [x + 0.06, y + 0.06, 0], color: c })
        s.push({ cyl: [0.062, 0.062, 0.03, 9], at: [x + 0.06, y + 0.175, 0], color: '#d4473b' })
        x += 0.14
        break
      }
      case 'pills': {
        const bw = 0.06 + r * 0.05
        const bh = 0.08 + rnd(seed + k * 2) * 0.06
        s.push({ box: [bw, bh, depth * 0.6], at: [x + bw / 2, y + bh / 2, 0], color: rnd(seed + k) > 0.4 ? '#ffffff' : c })
        s.push({ box: [bw + 0.002, bh * 0.25, depth * 0.61], at: [x + bw / 2, y + bh * 0.6, 0], color: c })
        x += bw + 0.01
        break
      }
      case 'fabric': {
        // bolts of cloth standing on end
        s.push({ cyl: [0.06, 0.06, 0.5, 8], at: [x + 0.06, y + 0.25, 0], color: c })
        x += 0.125
        break
      }
      case 'boxes':
      case 'packs':
      default: {
        const bw = kind === 'packs' ? 0.1 + r * 0.06 : 0.16 + r * 0.1
        const bh = kind === 'packs' ? 0.14 + rnd(seed + k) * 0.1 : 0.12 + rnd(seed + k) * 0.14
        s.push({ box: [bw, bh, depth * 0.75], at: [x + bw / 2, y + bh / 2, 0], color: c })
        s.push({ box: [bw * 0.7, bh * 0.3, 0.005], at: [x + bw / 2, y + bh * 0.55, depth * 0.375 + 0.003], color: rnd(seed + k * 9) > 0.5 ? '#ffffff' : '#ffe08a' })
        x += bw + 0.012
      }
    }
    k++
  }
}

/**
 * A wall shelf unit (local front = +z) full of goods, turned by `rotY` and stood at (x, z). Frame of uprights and
 * boards; `rows` boards from 0.15 m up to `h`.
 */
export function shelfUnit(b: Build, x: number, z: number, w: number, h: number, rows: number, wood: string, kind: GoodsKind | GoodsKind[], seed: number, rotY = 0, depth = 0.38, palette?: readonly string[]) {
  const s: ShapeItem[] = []
  s.push({ box: [w, h, 0.03], at: [0, h / 2, -depth / 2], color: wood })
  for (const sx of [-1, 1]) s.push({ box: [0.04, h, depth], at: [sx * (w / 2 - 0.02), h / 2, 0], color: wood })
  s.push({ box: [w, 0.12, depth], at: [0, 0.06, 0], color: wood })
  const gap = (h - 0.2) / rows
  for (let r = 0; r < rows; r++) {
    const y = 0.12 + r * gap
    s.push({ box: [w - 0.06, 0.025, depth], at: [0, y, 0], color: wood })
    const kinds = Array.isArray(kind) ? kind : [kind]
    goods(s, kinds[r % kinds.length], w - 0.1, y + 0.013, depth - 0.06, seed * 31 + r, palette)
  }
  s.push({ box: [w + 0.04, 0.04, depth + 0.02], at: [0, h, 0], color: wood })
  b.s.push(put(s, x, 0, z, rotY))
  const turned = Math.abs(Math.sin(rotY)) > 0.5
  b.block.push([x, z, (turned ? depth : w) / 2 + 0.03, (turned ? w : depth) / 2 + 0.03])
}

/** A glass-door drinks fridge (local front +z) with rows of bottles and a lit strip. */
export function fridge(b: Build, x: number, z: number, rotY = 0, w = 0.8, body = '#e9e6df', h = 1.85) {
  const s: ShapeItem[] = []
  s.push({ box: [w, h, 0.6], at: [0, h / 2, 0], color: body })
  s.push({ box: [w - 0.1, h - 0.4, 0.02], at: [0, h / 2 + 0.05, 0.305], color: '#cfe8f0' })
  for (let r = 0; r < 4; r++) goods(s, r % 2 ? 'cans' : 'bottles', w - 0.16, 0.36 + r * 0.34, 0.4, r * 5 + Math.round(x * 10))
  s.push({ box: [w, 0.22, 0.02], at: [0, h - 0.11, 0.305], color: '#c8322b' })
  b.s.push(put(s, x, 0, z, rotY))
  const g = put([{ box: [w - 0.16, 0.03, 0.03], at: [0, h - 0.32, 0.27], color: '#f4fbff' }], x, 0, z, rotY)
  b.glow.push(g)
  const turned = Math.abs(Math.sin(rotY)) > 0.5
  b.block.push([x, z, (turned ? 0.3 : w / 2) + 0.03, (turned ? w / 2 : 0.3) + 0.03])
}

/** Ancestor / Thần Tài altar shelf hanging on a wall at height y (local front +z): incense, fruit, two candles. */
export function altar(b: Build, x: number, y: number, z: number, rotY = 0) {
  const s: ShapeItem[] = []
  const g: ShapeItem[] = []
  s.push({ box: [0.7, 0.05, 0.34], at: [0, 0, 0], color: '#8a3b1f' })
  s.push({ box: [0.06, 0.14, 0.06], at: [-0.3, -0.09, -0.12], color: '#8a3b1f' })
  s.push({ box: [0.06, 0.14, 0.06], at: [0.3, -0.09, -0.12], color: '#8a3b1f' })
  s.push({ box: [0.56, 0.5, 0.26], at: [0, 0.28, -0.03], color: '#c8322b' })
  s.push({ box: [0.6, 0.06, 0.3], at: [0, 0.55, -0.03], color: '#f4c04e' })
  s.push({ box: [0.44, 0.34, 0.02], at: [0, 0.27, 0.11], color: '#ffd76a' })
  s.push({ sphere: [0.06, 8, 6], at: [-0.1, 0.22, 0.14], color: '#f4c04e' })
  s.push({ sphere: [0.06, 8, 6], at: [0.1, 0.22, 0.14], color: '#f4c04e' })
  s.push({ cyl: [0.06, 0.05, 0.05, 8], at: [0, 0.05, 0.11], color: '#d9cdb5' })
  for (let i = 0; i < 3; i++) g.push({ sphere: [0.012, 4, 3], at: [-0.02 + i * 0.02, 0.2, 0.11], color: '#ff6a3d' })
  for (let i = 0; i < 3; i++) s.push({ cyl: [0.004, 0.004, 0.14, 3], at: [-0.02 + i * 0.02, 0.13, 0.11], color: '#c8322b' })
  for (const sx of [-1, 1]) {
    s.push({ cyl: [0.02, 0.02, 0.1, 6], at: [sx * 0.24, 0.07, 0.1], color: '#c8322b' })
    g.push({ sphere: [0.02, 5, 4], at: [sx * 0.24, 0.13, 0.1], scale: [1, 1.6, 1], color: '#ffb347' })
  }
  ;['#f4c04e', '#7fc27a', '#ff9b3d'].forEach((c, i) => s.push({ sphere: [0.04, 7, 5], at: [0.14 + (i - 1) * 0.06, 0.06, 0.1], color: c }))
  b.s.push(put(s, x, y, z, rotY))
  b.glow.push(put(g, x, y, z, rotY))
}

/** A split air-conditioner on a wall (local front +z). */
export function airCon(b: Build, x: number, y: number, z: number, rotY = 0) {
  b.s.push(
    put(
      [
        { box: [0.9, 0.28, 0.2], at: [0, 0, 0], color: '#f4f6f8' },
        { box: [0.8, 0.03, 0.02], at: [0, -0.1, 0.1], color: '#c9ced8' },
        { box: [0.1, 0.03, 0.01], at: [0.33, 0.06, 0.101], color: '#7fc27a' },
      ],
      x,
      y,
      z,
      rotY,
    ),
  )
}

/** A framed picture (local front +z); `inner` the colour of what is in it. */
export function frame(b: Build, x: number, y: number, z: number, w: number, h: number, inner: string, border = '#5b3a2a', rotY = 0) {
  b.s.push(
    put(
      [
        { box: [w, h, 0.03], at: [0, 0, 0], color: border },
        { box: [w - 0.08, h - 0.08, 0.01], at: [0, 0, 0.018], color: inner },
      ],
      x,
      y,
      z,
      rotY,
    ),
  )
}

/** A potted plant from the library (or the hand-built one). */
export function plant(b: Build, x: number, z: number, h = 0.9, seed = 1, rotY = 0) {
  const name = pick(['iHouseplant1', 'iHouseplant4', 'iHouseplant7'], seed)
  const m = M(name, h, { paint: (mat, c) => (mat === 'Black' ? '#c97b63' : c) })
  b.s.push(put(m.length ? m : plantShapes(P.leaf, P.terracotta, seed), x, 0, z, rotY, m.length ? 1 : h))
  b.block.push([x, z, 0.22, 0.22])
}

/** Low plastic table + stools (the Hà Nội pavement set), a few bowls, chilli sauce, a tissue roll. Returns seats. */
export function plasticSet(b: Build, x: number, z: number, table: string, stools: readonly string[], seed: number, seats = 4, bowls = true) {
  const tb = M('tableSmall', 0.46, paintAll(table))
  b.s.push(put(tb.length ? tb : [{ box: [0.62, 0.04, 0.62], at: [0, 0.44, 0], color: table }, { cyl: [0.05, 0.08, 0.42, 6], at: [0, 0.21, 0], color: table }], x, 0, z, seed))
  const out: { x: number; z: number; yaw: number }[] = []
  for (let i = 0; i < seats; i++) {
    const a = (i / seats) * Math.PI * 2 + seed * 0.7
    const sx = x + Math.sin(a) * 0.62
    const sz = z + Math.cos(a) * 0.62
    const st = M('stool', 0.3, paintAll(stools[(i + seed) % stools.length]))
    b.s.push(put(st.length ? st : [{ cyl: [0.15, 0.12, 0.3, 8], at: [0, 0.15, 0], color: stools[i % stools.length] }], sx, 0, sz, a))
    out.push({ x: sx, z: sz, yaw: a + Math.PI })
  }
  if (bowls) {
    b.s.push(put(M('bowl', 0.06), x + 0.12, 0.46, z - 0.06))
    if (seed % 2) b.s.push(put(M('bowl', 0.06), x - 0.14, 0.46, z + 0.1))
    else b.s.push(put(M('plate', 0.03), x - 0.12, 0.46, z + 0.1))
  }
  b.s.push(put(M('ketchup', 0.15, paintAll('#d4473b')), x - 0.02, 0.46, z - 0.18))
  b.s.push({ cyl: [0.035, 0.035, 0.12, 8], at: [x + 0.18, 0.52, z + 0.16], color: '#f6efe0' })
  b.s.push({ cyl: [0.03, 0.03, 0.14, 6], at: [x - 0.2, 0.53, z + 0.18], color: '#7fc27a' })
  for (let i = 0; i < 5; i++) b.s.push({ cyl: [0.004, 0.004, 0.22, 3], at: [x - 0.2 + (i % 3) * 0.008, 0.6, z + 0.18 + Math.floor(i / 3) * 0.008], color: '#e8c58a' })
  b.block.push([x, z, 0.36, 0.36])
  return out
}

/** A wooden table at sitting height with chairs from the library (restaurant / office). Returns seats. */
export function diningSet(b: Build, x: number, z: number, seed: number, o: { round?: boolean; cloth?: string; chair?: string; seats?: number } = {}) {
  const seats = o.seats ?? 4
  const t = M(o.round ? 'iTableRoundSmall' : 'tableSmall', 0.74, o.round ? {} : paintAll('#8a5a3c'))
  b.s.push(put(t.length ? t : [{ box: [0.9, 0.05, 0.9], at: [0, 0.72, 0], color: '#8a5a3c' }], x, 0, z, seed))
  if (o.cloth) b.s.push({ cyl: o.round ? [0.5, 0.52, 0.04, 16] : [0.52, 0.52, 0.04, 4], at: [x, 0.76, z], rot: [0, o.round ? 0 : Math.PI / 4, 0], color: o.cloth })
  const out: { x: number; z: number; yaw: number }[] = []
  for (let i = 0; i < seats; i++) {
    const a = (i / seats) * Math.PI * 2 + 0.4 + seed
    const cx = x + Math.sin(a) * 0.72
    const cz = z + Math.cos(a) * 0.72
    const ch = M('iChair2', 0.88, o.chair ? { paint: (m, c) => (m === 'Cushin' ? o.chair! : c) } : {})
    b.s.push(put(ch.length ? ch : [{ box: [0.4, 0.05, 0.4], at: [0, 0.45, 0], color: '#8a5a3c' }], cx, 0, cz, a + Math.PI))
    out.push({ x: cx, z: cz, yaw: a + Math.PI })
  }
  b.block.push([x, z, 0.5, 0.5])
  return out
}

/** A rug from the library (or a flat box), repainted. */
export function rug(b: Build, x: number, z: number, w: number, d: number, main: string, edge: string, rotY = 0, round = false) {
  const name = round ? 'iCarpetRound' : 'iCarpet1'
  const m = modelShapes(name, { paint: (mat) => (mat === 'DarkRed' ? main : edge) })
  if (m) {
    const s = round ? w / 1.25 : Math.min(w / 1.07, d / 1.55)
    b.s.push(put(m, x, 0.03, z, rotY, s))
  } else b.s.push({ box: [w, 0.015, d], at: [x, 0.05, z], rot: [0, rotY, 0], color: main })
}

/** The doormat at the exit (calm red, above the floor tiles so it never z-fights). */
export function exitMat(b: Build, x: number, z: number) {
  b.s.push({ box: [1.3, 0.025, 0.7], at: [x, 0.055, z], color: DOORMAT })
  b.s.push({ box: [1.2, 0.027, 0.06], at: [x, 0.056, z - 0.24], color: '#d97c76' })
}
