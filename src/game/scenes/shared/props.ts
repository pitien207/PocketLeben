import { ExtrudeGeometry, Shape as Profile, Vector2, type BufferGeometry } from 'three'
import type { Vec3 } from '../../../data/config'
import { PALETTE as P } from './palette'
import { modelShapes, pickBy } from './models'
import type { ShapeGroup, ShapeItem } from './Shapes'

/**
 * Reusable low-poly prop recipes. Each returns shapes in local space
 * (origin on the ground, facing +Z); place them with `place()`.
 */

export function place(group: ShapeItem[], at: Vec3, rotY = 0, scale = 1): ShapeGroup {
  return { group, at, rot: [0, rotY, 0], scale: [scale, scale, scale] }
}

export type TreeVariant = 'green' | 'blossom' | 'linden' | 'palm' | 'willow' | 'pine' | 'birch'

const frac = (seed: number) => Math.abs(Math.sin(seed * 91.37 + 17.3) * 1000) % 1
/** Leaf colours [lit, shade] of the street trees: sấu, xà cừ, bàng… in several greens. */
const GREENS: [string, string][] = [
  ['#7cc263', '#5aa354'],
  ['#8fd06f', '#69b25d'],
  ['#6db85c', '#4d9650'],
  ['#9bd47a', '#76ba63'],
  ['#86c25a', '#5f9c4a'],
]
/** Flowering trees of Hà Nội: phượng vĩ (red), bằng lăng (purple), hoa ban / đào (pink), muồng hoàng yến (yellow). */
const BLOSSOMS: [string, string][] = [
  ['#f2643a', '#d64b2d'],
  ['#b88de2', '#9a70cc'],
  ['#ff9fca', '#ef7fb1'],
  ['#f7cf3e', '#e3ad2a'],
]
const TRUNK = '#7c5b45'
const LEAF_GRAD: [number, number] = [0.72, 1.14]

/**
 * 1.33: trees from the Quaternius nature pack (CC0) instead of balls on a stick — several species, painted
 * per variant and seed (the same seed always gives the same tree). Null while the pack is not loaded.
 * `detail` 1 = the very simple far-away trees (backdrops). Heights are metres at scale 1 (old trees ≈ 3.5 m).
 */
export function libraryTree(variant: TreeVariant, seed = 0, detail: 1 | 2 = 2): ShapeItem[] | null {
  const f = frac(seed)
  const size = 0.9 + 0.22 * frac(seed + 7.7)
  const leaves = (lit: string, shade: string) => ({ Green: lit, DarkGreen: shade, Leaves: lit, Wood: TRUNK, Tree: TRUNK })
  const grad = { Green: LEAF_GRAD, DarkGreen: LEAF_GRAD, Leaves: LEAF_GRAD }
  if (detail === 1) {
    const [lit, shade] = variant === 'blossom' ? pickBy(BLOSSOMS, seed) : pickBy(GREENS, seed)
    return modelShapes(pickBy(['simple1', 'simple2', 'simple3', 'simple4'], seed), { height: 4.6 * size, maxWidth: 3.4, paint: leaves(lit, shade), grad })
  }
  switch (variant) {
    case 'palm':
      return modelShapes(pickBy(['palm1', 'palm2', 'palm3', 'palm4'], seed), { height: 5.2 * size, maxWidth: 3.2, paint: { Wood: '#8a6a50', Green: '#7cc061', DarkGreen: '#5c9c4c', Coconuts: '#8a6a3a' }, grad })
    case 'willow':
      return modelShapes(pickBy(['willow1', 'willow2', 'willow3', 'willow4', 'willow5'], seed), { height: 4.8 * size, maxWidth: 3.4, paint: { Wood: '#7a6150', DarkGreen: pickBy(['#a6d66e', '#9ccc62', '#b2dc7a'], seed + 1) }, grad: { DarkGreen: [0.7, 1.12] } })
    case 'pine':
      return modelShapes(pickBy(['pine1', 'pine2', 'pine3'], seed), { height: 5.4 * size, maxWidth: 2.8, paint: { Wood: TRUNK, Green: '#4f9a5f' }, grad: { Green: LEAF_GRAD } })
    case 'birch':
      return modelShapes(pickBy(['birch1', 'birch2', 'birch3'], seed), { height: 5.6 * size, maxWidth: 3.0, paint: { White: '#ece6da', Black: '#3a3433', Green: '#8cc66a', DarkGreen: '#69a85a' }, grad })
    default: {
      const [lit, shade] = variant === 'blossom' ? pickBy(BLOSSOMS, seed) : variant === 'linden' ? (f < 0.5 ? ['#7cb87a', '#5fa06a'] : ['#86c07e', '#649f68']) : pickBy(GREENS, seed)
      return modelShapes(pickBy(['common1', 'common2', 'common3', 'common4', 'common5'], seed + 3), { height: (variant === 'linden' ? 5.0 : 4.3) * size, maxWidth: 3.0, paint: leaves(lit, shade), grad })
    }
  }
}

/** Potted plants (1.33): the eight house plants of the Quaternius interior pack, the pot painted `pot`. */
export function libraryPot(seed: number, pot: string, height = 0.95): ShapeItem[] | null {
  const name = pickBy(['pot1', 'pot2', 'pot3', 'pot4', 'pot5', 'pot6', 'pot7', 'pot8'], seed)
  return modelShapes(name, {
    height: height * (name === 'pot8' ? 1.4 : name === 'pot2' || name === 'pot5' ? 0.7 : 1),
    maxWidth: 0.62,
    paint: { Black: pot, Grey: pot, Brown: '#5a4030', Plant_Green: '#6dbb5a', DarkGreen: '#4f9a4f', LightOrange: '#e9a35a', Wood: '#8a6a50' },
    grad: { Plant_Green: LEAF_GRAD, DarkGreen: LEAF_GRAD },
  })
}
const colorSeed = (a: string, b: string) => [...(a + b)].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) % 997

export function treeShapes(variant: TreeVariant = 'green', seed = 0): ShapeItem[] {
  const lib = libraryTree(variant, seed)
  if (lib) return lib

  const [main, light, dark] =
    variant === 'blossom'
      ? [P.blossom, P.blossomLight, P.leaf]
      : variant === 'linden'
        ? ['#7cb87a', '#9ccf8a', '#5fa06a']
        : [P.leaf, P.leafLight, P.leafDark]
  return [
    { cyl: [0.12, 0.17, 1.5, 7], at: [0, 0.75, 0], color: P.trunk },
    { cyl: [0.05, 0.07, 0.6, 5], at: [0.18, 1.3, 0], rot: [0, 0, -0.7], color: P.trunk },
    { ico: [0.95], at: [0, 2.05, 0], color: main },
    { ico: [0.65], at: [0.55, 2.35, 0.25], rot: [0.4, 0.3, 0], color: light },
    { ico: [0.6], at: [-0.5, 2.3, -0.25], rot: [0.2, 0.8, 0.1], color: dark },
    { ico: [0.5], at: [0.05, 2.75, -0.1], rot: [0.6, 0.1, 0.3], color: light },
  ]
}

/**
 * 1.32 soft tree (Việt Nam scenes): a cluster of smooth leaf balls, darker underneath and sunlit on top,
 * on a tapered trunk with two branches. `detail` 1 for far backdrops (fewer triangles).
 */
export function fluffyTreeShapes(variant: TreeVariant = 'green', detail: 1 | 2 = 2, seed = 0): ShapeItem[] {
  const lib = libraryTree(variant, seed, detail)
  if (lib) return lib
  const [main, light, dark] =
    variant === 'blossom'
      ? ['#ff8fc4', '#ffb8da', '#7cc27a']
      : variant === 'linden'
        ? ['#7cb87a', '#9ccf8a', '#5fa06a']
        : ['#86cc78', '#a6de8e', '#68b46c']
  const big = detail
  const small: 1 | 2 = 1
  const leaf = (r: number, at: Vec3, color: string, d: number): ShapeItem => ({ ico: [r, d], at, color, grad: [0.66, 1.12] })
  return [
    { cyl: [0.1, 0.19, 1.7, 8], at: [0, 0.85, 0], color: P.trunk, grad: [0.72, 1.0] },
    { cyl: [0.04, 0.07, 0.75, 6], at: [0.24, 1.45, 0.02], rot: [0, 0, -0.75], color: P.trunk },
    { cyl: [0.035, 0.06, 0.6, 6], at: [-0.2, 1.55, -0.05], rot: [0.15, 0, 0.7], color: P.trunk },
    leaf(0.95, [0, 2.2, 0], main, big),
    leaf(0.72, [0.66, 2.02, 0.18], main, big),
    leaf(0.7, [-0.64, 2.08, -0.12], dark, big),
    leaf(0.6, [0.12, 2.02, 0.68], light, small),
    leaf(0.58, [-0.16, 2.06, -0.66], main, small),
    leaf(0.6, [0.12, 2.9, 0.04], light, small),
    leaf(0.42, [0.52, 2.62, -0.42], light, small),
  ]
}

/** 1.32 soft potted plant (Việt Nam scenes): smooth leaf balls with a lit top. */
export function softPlantShapes(leaf: string = P.leaf, pot: string = P.terracotta, seed = colorSeed(leaf, pot)): ShapeItem[] {
  const lib = libraryPot(seed, pot)
  if (lib) return lib
  return [
    { cyl: [0.22, 0.16, 0.36, 12], at: [0, 0.18, 0], color: pot, grad: [0.8, 1.05] },
    { cyl: [0.24, 0.24, 0.06, 12], at: [0, 0.36, 0], color: pot },
    { ico: [0.3, 1], at: [0, 0.62, 0], color: leaf, grad: [0.68, 1.1] },
    { ico: [0.2, 1], at: [0.13, 0.82, 0.06], color: P.leafLight, grad: [0.75, 1.12] },
    { ico: [0.17, 1], at: [-0.14, 0.78, -0.05], color: leaf, grad: [0.72, 1.1] },
  ]
}

export function plantShapes(leaf: string = P.leaf, pot: string = P.terracotta, seed = colorSeed(leaf, pot)): ShapeItem[] {
  const lib = libraryPot(seed, pot)
  if (lib) return lib
  return [
    { cyl: [0.22, 0.16, 0.36, 10], at: [0, 0.18, 0], color: pot },
    { cyl: [0.24, 0.24, 0.06, 10], at: [0, 0.36, 0], color: pot },
    { ico: [0.3], at: [0, 0.6, 0], color: leaf },
    { ico: [0.2], at: [0.12, 0.8, 0.05], rot: [0.5, 0.2, 0], color: P.leafLight },
  ]
}

/** Tiny plastic stool, the iconic sidewalk café seat. */
export function stoolShapes(color: string): ShapeItem[] {
  return [
    { cyl: [0.17, 0.2, 0.05, 12], at: [0, 0.3, 0], color },
    { cyl: [0.15, 0.2, 0.27, 12], at: [0, 0.14, 0], color },
  ]
}

/** Low table + four stools + two iced coffees. */
export function cafeTableSetShapes(stoolColors: string[]): ShapeItem[] {
  const items: ShapeItem[] = [
    { cyl: [0.42, 0.42, 0.05, 16], at: [0, 0.5, 0], color: P.steel },
    { cyl: [0.05, 0.05, 0.46, 6], at: [0, 0.25, 0], color: P.darkSteel },
    { cyl: [0.22, 0.22, 0.03, 10], at: [0, 0.02, 0], color: P.darkSteel },
    // cà phê sữa đá: glass + coffee + straw
    { cyl: [0.055, 0.045, 0.16, 8], at: [0.15, 0.6, 0.05], color: P.coffee },
    { cyl: [0.01, 0.01, 0.12, 4], at: [0.17, 0.72, 0.05], rot: [0, 0, -0.25], color: P.rose },
    { cyl: [0.055, 0.045, 0.16, 8], at: [-0.12, 0.6, -0.12], color: P.coffee },
    { cyl: [0.01, 0.01, 0.12, 4], at: [-0.1, 0.72, -0.12], rot: [0, 0, -0.25], color: P.mint },
  ]
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    items.push(place(stoolShapes(stoolColors[i % stoolColors.length]), [Math.sin(a) * 0.68, 0, Math.cos(a) * 0.68]))
  }
  return items
}

export function benchShapes(color: string = P.mint): ShapeItem[] {
  return [
    { box: [1.6, 0.08, 0.45], at: [0, 0.45, 0], color },
    { box: [1.6, 0.4, 0.07], at: [0, 0.75, -0.2], rot: [-0.15, 0, 0], color },
    { box: [0.08, 0.45, 0.4], at: [-0.7, 0.22, 0], color: P.darkSteel },
    { box: [0.08, 0.45, 0.4], at: [0.7, 0.22, 0], color: P.darkSteel },
  ]
}

/** Striped road barrier (marks the edge of the playable area). */
export function barrierShapes(width: number): ShapeItem[] {
  const items: ShapeItem[] = [
    { box: [0.12, 0.9, 0.12], at: [-width / 2 + 0.1, 0.45, 0], color: P.darkSteel },
    { box: [0.12, 0.9, 0.12], at: [width / 2 - 0.1, 0.45, 0], color: P.darkSteel },
  ]
  const segments = Math.max(2, Math.round(width / 0.5))
  const segment = width / segments
  for (let i = 0; i < segments; i++) {
    items.push({
      box: [segment, 0.22, 0.08],
      at: [-width / 2 + segment * (i + 0.5), 0.72, 0],
      color: i % 2 === 0 ? P.coral : P.white,
    })
  }
  return items
}

export function coneShapes(): ShapeItem[] {
  return [
    { box: [0.4, 0.05, 0.4], at: [0, 0.025, 0], color: P.coral },
    { cyl: [0.04, 0.16, 0.55, 10], at: [0, 0.3, 0], color: P.coral },
    { cyl: [0.105, 0.125, 0.1, 10], at: [0, 0.3, 0], color: P.white },
  ]
}

const cabins = new Map<string, BufferGeometry>()
/** The glass part of a car cabin: its side profile (z, y) extruded across the width, centred on x = 0. */
function cabinGeometry(z0: number, z1: number, rz0: number, rz1: number, y0: number, y1: number, width: number) {
  const key = [z0, z1, rz0, rz1, y0, y1, width].join()
  let g = cabins.get(key)
  if (!g) {
    const profile = new Profile([new Vector2(z0, y0), new Vector2(z1, y0), new Vector2(rz1, y1), new Vector2(rz0, y1)])
    g = new ExtrudeGeometry(profile, { depth: width, bevelEnabled: false })
    // shape x → car z, extrusion → car x
    g.rotateY(-Math.PI / 2)
    g.translate(width / 2, 0, 0)
    cabins.set(key, g)
  }
  return g
}

/**
 * A city car (faces +Z), 1.21: bigger (1.5 × 3.1 m) and detailed — sloped windshield, pillars,
 * dark wheel arches, rims, grille, lights, plates, mirrors, door seams and handles. Two bodies,
 * picked by the colour so a street gets a mix: a round hatchback and a sedan with a boot.
 */
export function carShapes(color: string): ShapeItem[] {
  const sedan = [...color].reduce((a, c) => a + c.charCodeAt(0), 0) % 2 === 0
  const tire = '#34343e'
  const arch = '#26262e'
  const glass = '#8fb6cf'
  const chrome = '#dfe6ee'
  const plastic = '#4a4a55'
  const L = 3.1
  const Wd = 1.5
  const hw = Wd / 2
  const wz = 1.0 // wheel base half
  const s: ShapeItem[] = []
  // Underbody shadow + sills
  s.push({ box: [Wd - 0.12, 0.08, L - 0.3], at: [0, 0.2, 0], color: '#2f2f38' })
  // Lower body (two boxes so the corners look rounded from above)
  s.push({ box: [Wd, 0.5, L - 0.36], at: [0, 0.56, 0], color })
  s.push({ box: [Wd - 0.16, 0.48, L], at: [0, 0.55, 0], color })
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) s.push({ cyl: [0.18, 0.18, 0.48, 10], at: [sx * (hw - 0.18), 0.56, sz * (L / 2 - 0.18)], color })
  // A soft shoulder line along both sides
  for (const sx of [-1, 1]) s.push({ box: [0.03, 0.04, L - 0.5], at: [sx * (hw + 0.005), 0.72, 0], color: chrome })
  // Wheel arches (dark discs that show above the tyres), tyres, rims, hubs
  for (const sz of [-1, 1]) {
    s.push({ cyl: [0.37, 0.37, Wd + 0.02, 16], at: [0, 0.34, sz * wz], rot: [0, 0, Math.PI / 2], color: arch })
    for (const sx of [-1, 1]) {
      const x = sx * (hw - 0.08)
      s.push({ torus: [0.21, 0.1, 8, 18], at: [x, 0.31, sz * wz], rot: [0, Math.PI / 2, 0], color: tire })
      s.push({ cyl: [0.17, 0.17, 0.1, 14], at: [x + sx * 0.02, 0.31, sz * wz], rot: [0, 0, Math.PI / 2], color: '#b9c0ca' })
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        s.push({ box: [0.03, 0.2, 0.04], at: [x + sx * 0.075, 0.31 + Math.cos(a) * 0.07, sz * wz + Math.sin(a) * 0.07], rot: [a, 0, 0], color: '#8e98ab' })
      }
      s.push({ cyl: [0.05, 0.05, 0.03, 10], at: [x + sx * 0.085, 0.31, sz * wz], rot: [0, 0, Math.PI / 2], color: chrome })
    }
  }
  // Hood sloping to the nose; the boot on a sedan
  const cabinZ0 = sedan ? -0.75 : -1.05 // back of the cabin
  const cabinZ1 = 0.42 // bottom of the windshield
  s.push({ box: [Wd - 0.06, 0.1, L / 2 - cabinZ1 - 0.05], at: [0, 0.84, (cabinZ1 + L / 2) / 2], rot: [0.07, 0, 0], color })
  if (sedan) s.push({ box: [Wd - 0.06, 0.1, L / 2 + cabinZ0], at: [0, 0.86, (cabinZ0 - L / 2) / 2], rot: [-0.04, 0, 0], color })
  // Cabin: one glass solid in the car's side profile (windshield and rear window sloped), the roof
  // on top, pillars in the body colour standing slightly proud of the glass
  const roofZ0 = cabinZ0 + (sedan ? 0.3 : 0.12)
  const roofZ1 = cabinZ1 - 0.42
  const roofY = 1.46
  const beltY = 0.86
  s.push({ geometry: cabinGeometry(cabinZ0, cabinZ1, roofZ0, roofZ1, beltY, roofY, Wd - 0.2), color: glass })
  s.push({ box: [Wd - 0.14, 0.07, roofZ1 - roofZ0 + 0.12], at: [0, roofY + 0.02, (roofZ0 + roofZ1) / 2], color })
  s.push({ box: [Wd - 0.34, 0.012, roofZ1 - roofZ0 - 0.12], at: [0, roofY + 0.06, (roofZ0 + roofZ1) / 2], color: '#ffffff' })
  const ws = Math.hypot(cabinZ1 - roofZ1, roofY - beltY)
  const wa = Math.atan2(cabinZ1 - roofZ1, roofY - beltY)
  const rs = Math.hypot(roofZ0 - cabinZ0, roofY - beltY)
  const ra = Math.atan2(roofZ0 - cabinZ0, roofY - beltY)
  for (const sx of [-1, 1]) {
    const x = sx * (hw - 0.1)
    // A pillar leans back with the windshield, C pillar forward with the rear window
    s.push({ box: [0.08, ws, 0.07], at: [x, (roofY + beltY) / 2, (cabinZ1 + roofZ1) / 2], rot: [-wa, 0, 0], color })
    s.push({ box: [0.08, rs, sedan ? 0.1 : 0.16], at: [x, (roofY + beltY) / 2, (cabinZ0 + roofZ0) / 2], rot: [ra, 0, 0], color })
    s.push({ box: [0.08, roofY - beltY, 0.12], at: [x, (roofY + beltY) / 2, sedan ? -0.12 : -0.22], color })
    // window frame line at the belt
    s.push({ box: [0.04, 0.05, cabinZ1 - cabinZ0], at: [sx * (hw - 0.08), beltY + 0.02, (cabinZ0 + cabinZ1) / 2], color: plastic })
    // door seams and handles
    for (const z of [0.4, sedan ? -0.12 : -0.22, sedan ? -0.72 : -0.9]) s.push({ box: [0.012, 0.44, 0.025], at: [sx * (hw + 0.004), 0.58, z], color: '#3a3a44' })
    for (const z of [0.05, sedan ? -0.5 : -0.62]) s.push({ box: [0.03, 0.04, 0.14], at: [sx * (hw + 0.01), 0.76, z], color: chrome })
    // side mirror
    s.push({ box: [0.18, 0.1, 0.12], at: [sx * (hw + 0.06), 0.97, cabinZ1 - 0.05], color })
    s.push({ box: [0.012, 0.07, 0.09], at: [sx * (hw + 0.15), 0.97, cabinZ1 - 0.05], color: glass })
  }
  // Wipers
  for (const x of [-0.3, 0.2]) s.push({ box: [0.42, 0.02, 0.02], at: [x, 0.93, cabinZ1 + 0.02], rot: [0, 0, 0.12], color: '#2f2f38' })
  // Front: bumper, grille, headlights, fog lights, plate
  const fz = L / 2
  s.push({ box: [Wd + 0.02, 0.2, 0.16], at: [0, 0.38, fz - 0.02], color: plastic })
  s.push({ box: [0.78, 0.17, 0.05], at: [0, 0.6, fz + 0.005], color: '#2f2f38' })
  for (let i = 0; i < 3; i++) s.push({ box: [0.72, 0.018, 0.055], at: [0, 0.54 + i * 0.05, fz + 0.01], color: '#6b6878' })
  s.push({ cyl: [0.045, 0.045, 0.02, 12], at: [0, 0.6, fz + 0.035], rot: [Math.PI / 2, 0, 0], color: chrome })
  for (const sx of [-1, 1]) {
    s.push({ box: [0.34, 0.14, 0.05], at: [sx * 0.5, 0.7, fz - 0.005], color: chrome })
    s.push({ box: [0.28, 0.1, 0.05], at: [sx * 0.5, 0.7, fz + 0.01], color: '#fff6c8' })
    s.push({ cyl: [0.045, 0.045, 0.03, 10], at: [sx * 0.55, 0.38, fz + 0.07], rot: [Math.PI / 2, 0, 0], color: '#fff2b8' })
    s.push({ box: [0.1, 0.05, 0.03], at: [sx * (hw - 0.04), 0.7, fz - 0.05], color: '#ffb347' })
  }
  s.push({ box: [0.44, 0.13, 0.02], at: [0, 0.38, fz + 0.07], color: '#ffffff' })
  s.push({ box: [0.36, 0.05, 0.022], at: [0, 0.38, fz + 0.072], color: '#2f3a4d' })
  // Rear: bumper, tail lights, plate, boot seam, antenna
  const bz = -L / 2
  s.push({ box: [Wd + 0.02, 0.2, 0.16], at: [0, 0.38, bz + 0.02], color: plastic })
  for (const sx of [-1, 1]) {
    s.push({ box: [0.3, 0.16, 0.05], at: [sx * 0.52, 0.72, bz + 0.005], color: '#e8463b' })
    s.push({ box: [0.12, 0.16, 0.052], at: [sx * 0.63, 0.72, bz + 0.004], color: '#ffb347' })
  }
  s.push({ box: [0.44, 0.13, 0.02], at: [0, 0.6, bz - 0.01], color: '#ffffff' })
  s.push({ box: [0.36, 0.05, 0.022], at: [0, 0.6, bz - 0.012], color: '#2f3a4d' })
  s.push({ box: [Wd - 0.3, 0.012, 0.012], at: [0, 0.8, bz - 0.004], color: '#3a3a44' })
  s.push({ cyl: [0.008, 0.008, 0.36, 4], at: [0.4, roofY + 0.18, roofZ0 + 0.15], rot: [-0.35, 0, 0], color: '#2f2f38' })
  return s
}



/** A parked xích lô (cyclo): passenger seat with a folded hood in front, rider seat at the back. Faces +Z. */
export function cycloShapes(color = '#2f6b8f'): ShapeItem[] {
  const s: ShapeItem[] = []
  for (const side of [-1, 1]) s.push({ torus: [0.28, 0.03, 5, 16], at: [side * 0.42, 0.3, 0.55], rot: [0, Math.PI / 2, 0], color: '#3d3d48' })
  s.push({ torus: [0.3, 0.03, 5, 16], at: [0, 0.32, -0.75], rot: [0, Math.PI / 2, 0], color: '#3d3d48' })
  // Passenger seat
  s.push({ box: [0.78, 0.1, 0.55], at: [0, 0.55, 0.45], color })
  s.push({ box: [0.72, 0.1, 0.48], at: [0, 0.64, 0.45], color: '#c8322b' })
  s.push({ box: [0.78, 0.55, 0.08], at: [0, 0.88, 0.2], color })
  s.push({ box: [0.7, 0.45, 0.06], at: [0, 0.9, 0.24], color: '#c8322b' })
  for (const side of [-1, 1]) s.push({ box: [0.06, 0.3, 0.5], at: [side * 0.39, 0.75, 0.45], color })
  // Folded canvas hood
  s.push({ sphere: [0.42, 10, 6, Math.PI / 2], at: [0, 0.92, 0.18], rot: [-0.9, 0, 0], scale: [0.95, 0.75, 0.6], color: '#2f3a4d' })
  // Frame to the rider seat
  s.push({ cyl: [0.03, 0.03, 1.1, 5], at: [0, 0.55, -0.25], rot: [Math.PI / 2 - 0.25, 0, 0], color })
  s.push({ cyl: [0.03, 0.03, 0.6, 5], at: [0, 0.8, -0.75], color })
  s.push({ box: [0.2, 0.06, 0.3], at: [0, 1.12, -0.72], color: '#6a4a40' })
  s.push({ cyl: [0.02, 0.02, 0.5, 5], at: [0, 1.0, -0.38], rot: [0, 0, Math.PI / 2], color: '#4a4a55' })
  return s
}

export { bicycleShapes, flowerBikeShapes, motorbikeShapes, RIDES, type RideAnchors, type RideKind } from './vehicles'
