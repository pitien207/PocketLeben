import type { Outfit } from '../../../data/npcs'
import type { ShapeItem } from '../../scenes/shared/Shapes'
import { lightness } from './face'
import { shoeShapes, torsoShapes } from './cloth'
import { hairShapes } from './hair'
import { B, FORE, HEAD_R as R } from './rig'

/**
 * Body parts of the chibi, per bone, in that bone's local space — the look of the user's
 * chibi.js, rebuilt so a whole character still merges into one mesh: hair (hair.ts), clothes
 * and shoes (cloth.ts), hats and accessories (here). Arms and legs are skinned tubes
 * (cloth.ts `limbGeometries`). The head sphere itself is the separately textured face (ChibiModel).
 */

/** Carried things built into the body: the đòn gánh, or (1.39) a pickleball paddle in the right hand (on the fan bone). */
export type Carry = 'pole' | 'paddle' | null
const shade = lightness

const v3 = (x: number, y: number, z: number): [number, number, number] => [x, y, z]

// --- Hats & face accessories ---------------------------------------------------------------
export function accessory(o: Outfit): ShapeItem[] {
  const acc = o.accent
  switch (o.accessory) {
    case 'nonLa': // conical hat with a strap
      return [
        { cyl: [0.01, R * 1.55, R * 0.82, 20], at: v3(0, R * 1.19, -R * 0.1), rot: [-0.12, 0, 0], color: '#efd9a0' },
        { torus: [R * 0.9, 0.006, 3, 18, Math.PI * 2], at: v3(0, R * 1.05, -R * 0.12), rot: [Math.PI / 2 - 0.12, 0, 0], color: '#cdb47c' },
        { torus: [R * 0.55, 0.006, 3, 16, Math.PI * 2], at: v3(0, R * 1.32, -R * 0.13), rot: [Math.PI / 2 - 0.12, 0, 0], color: '#cdb47c' },
        { torus: [R * 0.95, 0.007, 3, 16, Math.PI], at: v3(0, -R * 0.15, R * 0.05), rot: [0, 0, Math.PI], color: acc ?? '#d6455a' },
      ]
    case 'helmet': {
      const col = acc ?? '#ffffff'
      return [
        { sphere: [R * 1.13, 22, 10, Math.PI * 0.52], at: v3(0, R * 0.3, -R * 0.06), scale: [1.04, 1, 1.04], color: col },
        { box: [R * 0.95, 0.012, R * 0.35], at: v3(0, R * 0.36, R * 1.08), rot: [0.25, 0, 0], color: '#2a2a2a' },
        { torus: [R * 1.12, 0.012, 4, 26], at: v3(0, R * 0.31, -R * 0.06), rot: [Math.PI / 2, 0, 0], scale: [1.04, 1.04, 1], color: shade(col, -0.2) },
      ]
    }
    case 'beanie': {
      const col = acc ?? '#d4473b'
      return [
        { sphere: [R * 1.1, 22, 10, Math.PI * 0.52], at: v3(0, R * 0.3, -R * 0.08), scale: [1.02, 1.05, 1.02], color: col },
        { torus: [R * 1.08, R * 0.1, 6, 26], at: v3(0, R * 0.3, -R * 0.08), rot: [Math.PI / 2, 0, 0], scale: [1.02, 1.02, 0.9], color: shade(col, -0.08) },
        { sphere: [R * 0.22, 10, 8], at: v3(0, R * 1.5, -R * 0.1), color: '#ffffff' },
      ]
    }
    case 'tyrolean': {
      const col = acc ?? '#4c5a46'
      return [
        { group: [
          { cyl: [R * 1.1, R * 1.1, 0.015, 22], color: col },
          { cyl: [R * 0.48, R * 0.66, R * 0.55, 16], at: v3(0, R * 0.27, 0), color: col },
          { cyl: [R * 0.67, R * 0.67, R * 0.12, 16], at: v3(0, R * 0.06, 0), color: '#2f3a2c' },
          { cyl: [0, R * 0.06, R * 0.75, 5], at: v3(R * 0.6, R * 0.45, -R * 0.1), rot: [0, 0, -0.5], color: '#e9e3d6' },
        ], at: v3(0, R * 0.92, -R * 0.06), rot: [-0.08, 0, 0.08] },
      ]
    }
    case 'glasses': {
      const fm = '#3a2b2e'
      return [
        ...[-1, 1].map((k): ShapeItem => ({ torus: [R * 0.27, 0.01, 4, 18], at: v3(k * R * 0.5, -R * 0.1, R * 0.97), rot: [0, k * 0.45, 0], color: fm })),
        { cyl: [0.007, 0.007, R * 0.18, 4], at: v3(0, -R * 0.12, R * 1.08), rot: [0, 0, Math.PI / 2], color: fm },
      ]
    }
    case 'sunglasses':
      return [
        ...[-1, 1].map((k): ShapeItem => ({ sphere: [R * 0.24, 12, 8], at: v3(k * R * 0.47, -R * 0.08, R * 0.93), rot: [0, k * 0.45, 0], scale: [1.15, 0.85, 0.3], color: '#2a2330' })),
        { box: [R * 0.3, 0.02, 0.02], at: v3(0, -R * 0.02, R * 1.0), color: '#2a2330' },
      ]
    case 'cap':
      return [
        { sphere: [R * 1.1, 22, 10, Math.PI / 2], at: v3(0, R * 0.25, -R * 0.08), rot: [-0.14, 0, 0], color: acc ?? '#4f86d9' },
        { cyl: [R * 0.58, R * 0.58, 0.03, 16], at: v3(0, R * 0.4, R * 0.92), rot: [0.22, 0, 0], scale: [1, 1, 1.35], color: shade(acc ?? '#4f86d9', -0.12) },
        { sphere: [R * 0.1, 6, 5], at: v3(0, R * 1.36, -R * 0.2), color: shade(acc ?? '#4f86d9', -0.12) },
      ]
    case 'beret':
      return [{ sphere: [R * 0.95, 18, 10], at: v3(R * 0.14, R * 0.86, -R * 0.08), rot: [0, 0, -0.18], scale: [1.12, 0.36, 1.12], color: acc ?? '#c8322b' }]
    case 'bow':
      return [
        { sphere: [R * 0.25, 10, 8], at: v3(R * 0.33, R * 1.05, -R * 0.17), rot: [0, 0, -0.5], scale: [1.2, 0.75, 0.45], color: acc ?? '#ff6f91' },
        { sphere: [R * 0.25, 10, 8], at: v3(R * 0.83, R * 0.83, -R * 0.17), rot: [0, 0, -0.5], scale: [1.2, 0.75, 0.45], color: acc ?? '#ff6f91' },
        { sphere: [R * 0.12, 8, 6], at: v3(R * 0.58, R * 0.94, -R * 0.12), color: shade(acc ?? '#ff6f91', -0.1) },
      ]
    case 'flowerCrown': {
      const s: ShapeItem[] = [{ torus: [R * 1.02, 0.02, 4, 20], at: v3(0, R * 0.62, -R * 0.1), rot: [Math.PI / 2 + 0.15, 0, 0], color: '#6fae5a' }]
      const colors = ['#ff9fb2', '#ffe08a', '#ffffff', '#cdb8f0', '#ff9b8f', '#a9d6ff', '#ffe08a']
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + ((i - 3) / 6) * Math.PI * 1.25
        s.push({ ico: [R * 0.15, 0], at: v3(Math.cos(a) * R * 1.02, R * 0.62 - Math.sin(a) * R * 0.15, -Math.sin(a) * R * 1.02 - R * 0.1), color: colors[i] })
      }
      return s
    }
    case 'catEars':
      return [-1, 1].flatMap((k): ShapeItem[] => [
        { cyl: [0, R * 0.3, R * 0.55, 4], at: v3(k * R * 0.55, R * 1.15, -R * 0.06), rot: [0, Math.PI / 4, k * -0.35], color: acc ?? '#3d3540' },
        { cyl: [0, R * 0.17, R * 0.33, 4], at: v3(k * R * 0.54, R * 1.13, R * 0.04), rot: [0, Math.PI / 4, k * -0.35], color: '#ffb3c7' },
      ])
    case 'headphones':
      return [
        { torus: [R * 1.12, 0.03, 5, 16, Math.PI], at: v3(0, R * 0.1, -R * 0.05), color: '#3a3a44' },
        ...[-1, 1].map((k): ShapeItem => ({ cyl: [R * 0.3, R * 0.3, R * 0.25, 12], at: v3(k * R * 1.06, -R * 0.05, -R * 0.05), rot: [0, 0, Math.PI / 2], color: acc ?? '#ff9b8f' })),
      ]
    default:
      return []
  }
}

// --- Carried things -------------------------------------------------------------------------
export const GLASS: ShapeItem[] = [
  { cyl: [0.055, 0.045, 0.15, 10], at: [0, 0.06, 0], color: '#d8a24e' },
  { cyl: [0.058, 0.058, 0.02, 10], at: [0, 0.135, 0], color: '#f6e7c8' },
]
export const FAN: ShapeItem[] = [
  { cyl: [0.012, 0.012, 0.14, 5], at: [0, 0.05, 0], color: '#b98a64' },
  { cyl: [0.16, 0.16, 0.012, 14], at: [0, 0.2, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.75], color: '#ff9b8f' },
]
/**
 * 1.39 Pickleball paddle, on the fan bone (at the right hand). Unlike the fan it is not kept upright: it follows the
 * forearm, so the grip continues the arm and the face swings with it (ChibiModel, motion `held: 'paddle'`, `swing`).
 */
export const PADDLE: ShapeItem[] = [
  { cyl: [0.02, 0.022, 0.14, 8], at: [0, -0.06, 0.02], color: '#3b2a22' },
  { cyl: [0.135, 0.135, 0.014, 18], at: [0, -0.28, 0.02], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1.25], color: '#3b2a22' },
  { cyl: [0.125, 0.125, 0.026, 18], at: [0, -0.28, 0.02], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1.25], color: '#ff7a59' },
  { cyl: [0.05, 0.05, 0.03, 12], at: [0, -0.3, 0.02], rot: [Math.PI / 2, 0, 0], color: '#ffe08a' },
]
/** Đòn gánh: a bamboo pole on the right shoulder with a basket of bánh mì at each end. */
const POLE: ShapeItem[] = (() => {
  const s: ShapeItem[] = [{ cyl: [0.025, 0.025, 1.75, 6], at: [-0.22, 0.27, 0], rot: [Math.PI / 2, 0, 0], color: '#d9b878' }]
  for (const end of [-0.82, 0.82]) {
    s.push({ cyl: [0.006, 0.006, 0.48, 4], at: [-0.22, 0.03, end], color: '#7a6a5a' })
    s.push({ cyl: [0.25, 0.18, 0.2, 12], at: [-0.22, -0.28, end], color: '#d9b46b' })
    s.push({ cyl: [0.26, 0.26, 0.03, 12], at: [-0.22, -0.18, end], color: '#c49a55' })
    for (let i = 0; i < 3; i++) s.push({ sphere: [0.07, 8, 6], at: [-0.22 + (i - 1) * 0.11, -0.13, end + (i % 2) * 0.05], scale: [1, 0.8, 2.2], rot: [0, 0.6 * i, 0], color: '#e8a25a' })
  }
  return s
})()

// --- The whole body ---------------------------------------------------------------------------
/**
 * Rigid shapes per bone (bone-local): hair and hats on the head, clothes on the torso, hands,
 * shoes. Arms and legs themselves are skinned tubes (cloth.ts `limbGeometries`).
 */
export function bodyParts(o: Outfit, carry: Carry, k = 1): [number, ShapeItem[]][] {
  const hat = !!o.accessory && ['nonLa', 'helmet', 'beanie', 'cap', 'tyrolean', 'beret'].includes(o.accessory)
  const head: ShapeItem[] = [...hairShapes(o, hat, k), ...accessory(o)]
  const torso = torsoShapes(o, k)
  if (carry === 'pole') torso.push(...POLE)
  const skin = o.skin
  // Round hand with a thumb
  const hand = (side: number): ShapeItem[] => [
    { sphere: [0.062, 12, 8], at: v3(0, -FORE, 0), scale: [0.95, 1.05, 1], color: skin },
    { sphere: [0.026, 8, 6], at: v3(-side * 0.035, -FORE + 0.012, 0.045), color: skin },
  ]
  const shoes = shoeShapes(o, k)
  return [
    [B.head, head],
    [B.torso, torso],
    [B.shinL, shoes],
    [B.shinR, shoes],
    [B.foreL, hand(1)],
    [B.foreR, hand(-1)],
    [B.glass, GLASS],
    [B.fan, carry === 'paddle' ? PADDLE : FAN],
  ]
}

/** Default eye colour (warm brown). */
export const DEFAULT_EYES = '#5a3424'
