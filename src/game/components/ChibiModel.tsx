import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bone, Color, Float32BufferAttribute, Quaternion, Skeleton, SkinnedMesh, Sphere, Uint16BufferAttribute, Vector3, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PLAYER_OUTFIT, type Outfit } from '../../data/npcs'
import { characterMaterial } from '../scenes/shared/materials'
import { buildShapes, type ShapeItem } from '../scenes/shared/Shapes'
import { RIDES, type RideAnchors, type RideKind } from '../scenes/shared/vehicles'
import { damp } from '../systems/math'

/**
 * Written by the owner each frame; read here to drive the animation.
 * Optional fields are pose targets (0–1); the model eases toward them.
 * Everything is plain data, so the same state can describe a remote player.
 */
export interface MotionState {
  /** 0 = standing still, 1 = full walking cadence. */
  speed: number
  /** Sitting (on a stool, a chair…). */
  sit?: number
  /** Height of the seat surface when sitting (default: a tiny plastic stool). */
  seatY?: number
  /** Riding a vehicle: hands go to the grips and feet to the footrests / pedals. */
  ride?: RideKind | null
  /** Pedal angle in radians while cycling (advance it with the distance travelled). */
  pedal?: number
  /** Right hand to the mouth (drinking). */
  sip?: number
  /** Fanning with the right hand. */
  fan?: number
  /** Both arms forward (reading a newspaper, carrying). */
  arms?: number
  /** Left-leg kick (đá cầu). */
  kick?: number
  held?: 'glass' | 'fan' | null
}

/**
 * The chibi character (plan §2): the head is ~45% of the ~1.5 m height.
 *
 * One skinned mesh per character = ONE draw call (each body part is rigidly bound to
 * a bone). Arms and legs have two segments, so hands and feet can be placed exactly
 * with two-bone inverse kinematics — on handlebars, pedals, a glass at the mouth.
 * Clothing cuts (sleeves, trousers, skirt) are built from the outfit data.
 */

const HEAD_Y = 1.08
const EYE_Y = -0.02
const TORSO_Y = 0.52
const HIP_Y = 0.3
const HIP_X = 0.1
const SHOULDER_Y = 0.66
const SHOULDER_X = 0.24
const THIGH = 0.12
const SHIN = 0.12
const UPPER = 0.17
const FORE = 0.16
const STOOL_Y = 0.33

const EYE = '#2d2430'
const CHEEK = '#ffa3b1'
const MOUTH = '#c95b6e'
const WHITE = '#ffffff'

/** Bones. Left = +X. */
const B = { root: 0, torso: 1, head: 2, eyes: 3, thighL: 4, shinL: 5, thighR: 6, shinR: 7, armL: 8, foreL: 9, armR: 10, foreR: 11, glass: 12, fan: 13 } as const
const PARENT = [-1, 0, 0, 2, 0, 4, 0, 6, 0, 8, 0, 10, 11, 11]
/** Joint positions in the bind pose (model space). */
const BIND: [number, number, number][] = [
  [0, 0, 0],
  [0, TORSO_Y, 0],
  [0, HEAD_Y, 0],
  [0, HEAD_Y + EYE_Y, 0],
  [HIP_X, HIP_Y, 0],
  [HIP_X, HIP_Y - THIGH, 0],
  [-HIP_X, HIP_Y, 0],
  [-HIP_X, HIP_Y - THIGH, 0],
  [SHOULDER_X, SHOULDER_Y, 0],
  [SHOULDER_X, SHOULDER_Y - UPPER, 0],
  [-SHOULDER_X, SHOULDER_Y, 0],
  [-SHOULDER_X, SHOULDER_Y - UPPER, 0],
  [-SHOULDER_X, SHOULDER_Y - UPPER - FORE - 0.05, 0.03],
  [-SHOULDER_X, SHOULDER_Y - UPPER - FORE - 0.05, 0.03],
]

const _c = new Color()
/** A darker / lighter tone of a colour (for soles, cuffs, eyebrows). */
function shade(hex: string, factor: number) {
  return `#${_c.set(hex).multiplyScalar(factor).getHexString()}`
}

/** Bangs over the forehead (kept above the eyebrows). */
function fringe(color: string, parted = false): ShapeItem[] {
  return [
    { sphere: [0.12, 16, 10], at: [-0.12, 0.225, 0.25], rot: [0, -0.35, parted ? 0.25 : 0.1], scale: [1.15, 0.62, 0.62], color },
    { sphere: [0.12, 16, 10], at: [0.0, 0.245, 0.27], scale: [1.1, 0.6, 0.62], color },
    { sphere: [0.12, 16, 10], at: [0.12, 0.225, 0.25], rot: [0, 0.35, parted ? -0.25 : -0.1], scale: [1.15, 0.62, 0.62], color },
  ]
}

/** The usual hair cap: a slightly bigger sphere shifted up/back leaves the face uncovered. */
const cap = (color: string): ShapeItem => ({ sphere: [0.385, 28, 20], at: [0, 0.065, -0.04], color })

function hairShapes(o: Outfit): ShapeItem[] {
  const c = o.hair
  switch (o.hairStyle) {
    case 'short':
      return [
        { sphere: [0.375, 28, 20], at: [0, 0.095, -0.065], color: c },
        { cyl: [0, 0.05, 0.16, 6], at: [-0.06, 0.46, 0.02], rot: [0.3, 0, 0.4], color: c },
        { cyl: [0, 0.05, 0.16, 6], at: [0.07, 0.46, 0.0], rot: [0.2, 0, -0.5], color: c },
        { sphere: [0.1, 10, 8], at: [0.1, 0.25, 0.26], rot: [0, 0.3, -0.3], scale: [1.3, 0.55, 0.6], color: c },
      ]
    case 'buzz':
      return [{ sphere: [0.368, 24, 16], at: [0, 0.075, -0.05], color: c }]
    case 'bun':
      return [
        cap(c),
        ...fringe(c, true),
        { sphere: [0.14, 16, 12], at: [0, 0.36, -0.24], color: c },
        { torus: [0.09, 0.025, 6, 14], at: [0, 0.29, -0.2], rot: [0.9, 0, 0], color: CHEEK },
      ]
    case 'long':
      return [
        cap(c),
        ...fringe(c),
        // Curtain down the back to the shoulders, long locks framing the face
        { sphere: [0.3, 16, 12], at: [0, -0.22, -0.17], scale: [1.18, 1.45, 0.62], color: c },
        { sphere: [0.11, 10, 8], at: [-0.31, -0.2, 0.04], scale: [0.55, 2.3, 0.9], color: c },
        { sphere: [0.11, 10, 8], at: [0.31, -0.2, 0.04], scale: [0.55, 2.3, 0.9], color: c },
      ]
    case 'ponytail':
      return [
        cap(c),
        ...fringe(c, true),
        { torus: [0.05, 0.022, 6, 12], at: [0, 0.2, -0.38], rot: [0.5, 0, 0], color: o.accent ?? CHEEK },
        { sphere: [0.12, 12, 10], at: [0, 0.02, -0.47], rot: [0.35, 0, 0], scale: [0.85, 1.9, 0.8], color: c },
        { sphere: [0.08, 10, 8], at: [0, -0.2, -0.5], rot: [0.2, 0, 0], scale: [0.8, 1.5, 0.8], color: c },
      ]
    case 'twin':
      return [
        cap(c),
        ...fringe(c),
        ...[-1, 1].flatMap((side): ShapeItem[] => [
          { torus: [0.045, 0.02, 6, 12], at: [side * 0.36, 0.1, -0.08], rot: [0, 0, Math.PI / 2], color: o.accent ?? CHEEK },
          { sphere: [0.11, 12, 10], at: [side * 0.42, -0.08, -0.1], rot: [0, 0, side * 0.25], scale: [0.75, 1.9, 0.75], color: c },
        ]),
      ]
    case 'spiky': {
      const s: ShapeItem[] = [{ sphere: [0.375, 24, 16], at: [0, 0.09, -0.06], color: c }]
      const spikes: [number, number, number, number, number][] = [
        [0, 0.47, -0.02, 0.15, 0],
        [-0.17, 0.42, 0.04, 0.3, 0.5],
        [0.17, 0.42, 0.04, 0.3, -0.5],
        [-0.1, 0.4, -0.22, -0.3, 0.3],
        [0.1, 0.4, -0.22, -0.3, -0.3],
        [0, 0.33, 0.24, 0.9, 0],
      ]
      for (const [x, y, z, rx, rz] of spikes) s.push({ cyl: [0, 0.08, 0.22, 6], at: [x, y, z], rot: [rx, 0, rz], color: c })
      return s
    }
    case 'curly': {
      const s: ShapeItem[] = [{ sphere: [0.375, 24, 16], at: [0, 0.08, -0.06], color: c }]
      for (let ring = 0; ring < 2; ring++) {
        const n = ring ? 7 : 11
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ring * 0.3
          const r = ring ? 0.2 : 0.33
          const y = ring ? 0.42 : 0.24
          // Leave the face open: no curls low in front.
          if (!ring && Math.sin(a) > 0.55) continue
          s.push({ ico: [0.13, 1], at: [Math.cos(a) * r, y, Math.sin(a) * r - 0.04], color: c })
        }
      }
      s.push(...fringe(c))
      return s
    }
    case 'bob':
    default:
      return [
        cap(c),
        ...fringe(c),
        { sphere: [0.11, 10, 8], at: [-0.31, -0.13, 0.06], scale: [0.55, 1.5, 0.9], color: c },
        { sphere: [0.11, 10, 8], at: [0.31, -0.13, 0.06], scale: [0.55, 1.5, 0.9], color: c },
      ]
  }
}

function accessoryShapes(o: Outfit): ShapeItem[] {
  const accent = o.accent
  switch (o.accessory) {
    case 'nonLa': // Vietnamese conical hat
      return [
        { cyl: [0.02, 0.6, 0.34, 18], at: [0, 0.5, -0.02], color: '#f2d79c' },
        { torus: [0.58, 0.012, 4, 24], at: [0, 0.34, -0.02], rot: [Math.PI / 2, 0, 0], color: '#d9b878' },
      ]
    case 'glasses':
      return [
        { torus: [0.075, 0.012, 6, 16], at: [-0.125, -0.02, 0.35], color: '#4a3b4a' },
        { torus: [0.075, 0.012, 6, 16], at: [0.125, -0.02, 0.35], color: '#4a3b4a' },
        { box: [0.1, 0.018, 0.018], at: [0, -0.005, 0.36], color: '#4a3b4a' },
      ]
    case 'sunglasses':
      return [
        { sphere: [0.08, 12, 8], at: [-0.125, -0.02, 0.345], scale: [1.15, 0.85, 0.35], color: '#2a2330' },
        { sphere: [0.08, 12, 8], at: [0.125, -0.02, 0.345], scale: [1.15, 0.85, 0.35], color: '#2a2330' },
        { sphere: [0.022, 6, 5], at: [-0.15, 0.01, 0.37], color: '#8a7f99' },
        { sphere: [0.022, 6, 5], at: [0.1, 0.01, 0.37], color: '#8a7f99' },
        { box: [0.1, 0.02, 0.02], at: [0, 0.005, 0.365], color: '#2a2330' },
        { box: [0.03, 0.02, 0.3], at: [-0.33, 0.0, 0.2], color: '#2a2330' },
        { box: [0.03, 0.02, 0.3], at: [0.33, 0.0, 0.2], color: '#2a2330' },
      ]
    case 'beanie': // German Mütze with a pompom
      return [
        { sphere: [0.405, 24, 12, Math.PI / 2], at: [0, 0.1, -0.03], rot: [-0.18, 0, 0], color: accent ?? '#d4473b' },
        { torus: [0.37, 0.045, 6, 24], at: [0, 0.13, -0.01], rot: [Math.PI / 2 - 0.18, 0, 0], color: '#fff6e3' },
        { sphere: [0.09, 10, 8], at: [0, 0.53, -0.1], color: '#fff6e3' },
      ]
    case 'helmet': // half-dome motorbike helmet with a chin strap
      return [
        { sphere: [0.415, 24, 12, Math.PI / 2], at: [0, 0.06, -0.03], rot: [-0.22, 0, 0], color: accent ?? '#ff9b8f' },
        { box: [0.34, 0.03, 0.12], at: [0, 0.16, 0.36], rot: [-0.35, 0, 0], color: '#5d6170' },
      ]
    case 'cap': // baseball cap, brim forward
      return [
        { sphere: [0.4, 24, 12, Math.PI / 2], at: [0, 0.09, -0.03], rot: [-0.14, 0, 0], color: accent ?? '#4f86d9' },
        { cyl: [0.21, 0.21, 0.03, 18], at: [0, 0.14, 0.33], rot: [0.22, 0, 0], scale: [1, 1, 1.35], color: shade(accent ?? '#4f86d9', 0.8) },
        { sphere: [0.035, 8, 6], at: [0, 0.49, -0.08], color: shade(accent ?? '#4f86d9', 0.8) },
        { sphere: [0.08, 10, 8], at: [0, 0.3, 0.3], rot: [-0.6, 0, 0], scale: [1, 1, 0.2], color: '#ffffff' },
      ]
    case 'beret':
      return [
        { sphere: [0.34, 20, 12], at: [0.05, 0.31, -0.03], rot: [0, 0, -0.18], scale: [1.12, 0.36, 1.12], color: accent ?? '#c8322b' },
        { cyl: [0.015, 0.02, 0.06, 5], at: [0.06, 0.45, -0.03], color: accent ?? '#c8322b' },
      ]
    case 'bow': // big hair bow on one side
      return [
        { sphere: [0.09, 10, 8], at: [0.12, 0.38, -0.06], rot: [0, 0, -0.5], scale: [1.2, 0.75, 0.45], color: accent ?? '#ff6f91' },
        { sphere: [0.09, 10, 8], at: [0.3, 0.3, -0.06], rot: [0, 0, -0.5], scale: [1.2, 0.75, 0.45], color: accent ?? '#ff6f91' },
        { sphere: [0.045, 8, 6], at: [0.21, 0.34, -0.04], color: shade(accent ?? '#ff6f91', 0.8) },
      ]
    case 'flowerCrown': {
      const s: ShapeItem[] = [{ torus: [0.36, 0.022, 5, 22], at: [0, 0.24, -0.04], rot: [Math.PI / 2 + 0.15, 0, 0], color: '#6fae5a' }]
      const colors = ['#ff9fb2', '#ffe08a', '#ffffff', '#cdb8f0', '#ff9b8f', '#a9d6ff', '#ffe08a']
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + ((i - 3) / 6) * Math.PI * 1.25
        s.push({ ico: [0.055, 0], at: [Math.cos(a) * 0.36, 0.24 - Math.sin(a) * 0.36 * 0.15, -Math.sin(a) * 0.36 - 0.04], color: colors[i] })
      }
      return s
    }
    case 'catEars':
      return [-1, 1].flatMap((side): ShapeItem[] => [
        { cyl: [0, 0.11, 0.2, 4], at: [side * 0.2, 0.42, -0.02], rot: [0, Math.PI / 4, side * -0.35], color: accent ?? '#3d3540' },
        { cyl: [0, 0.06, 0.12, 4], at: [side * 0.195, 0.41, 0.015], rot: [0, Math.PI / 4, side * -0.35], color: '#ffb3c7' },
      ])
    case 'headphones':
      return [
        { torus: [0.4, 0.028, 6, 18, Math.PI], at: [0, 0.03, -0.02], color: '#3a3a44' },
        { cyl: [0.11, 0.11, 0.09, 14], at: [-0.38, -0.02, -0.02], rot: [0, 0, Math.PI / 2], color: accent ?? '#ff9b8f' },
        { cyl: [0.11, 0.11, 0.09, 14], at: [0.38, -0.02, -0.02], rot: [0, 0, Math.PI / 2], color: accent ?? '#ff9b8f' },
      ]
    default:
      return []
  }
}

const GLASS: ShapeItem[] = [
  { cyl: [0.055, 0.045, 0.15, 10], at: [0, 0.06, 0], color: '#d8a24e' },
  { cyl: [0.058, 0.058, 0.02, 10], at: [0, 0.135, 0], color: '#f6e7c8' },
]
const FAN: ShapeItem[] = [
  { cyl: [0.012, 0.012, 0.14, 5], at: [0, 0.05, 0], color: '#b98a64' },
  { cyl: [0.16, 0.16, 0.012, 14], at: [0, 0.2, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.75], color: '#ff9b8f' },
]

/** Đòn gánh: a bamboo pole on the right shoulder with a basket of bánh mì at each end. */
const POLE: ShapeItem[] = (() => {
  const s: ShapeItem[] = [{ cyl: [0.025, 0.025, 1.75, 6], at: [-0.22, 0.27, 0], rot: [Math.PI / 2, 0, 0], color: '#d9b878' }]
  for (const end of [-0.82, 0.82]) {
    s.push({ cyl: [0.006, 0.006, 0.48, 4], at: [-0.22, 0.03, end], color: '#7a6a5a' })
    s.push({ cyl: [0.25, 0.18, 0.2, 12], at: [-0.22, -0.28, end], color: '#d9b46b' })
    s.push({ cyl: [0.26, 0.26, 0.03, 12], at: [-0.22, -0.18, end], color: '#c49a55' })
    for (let i = 0; i < 3; i++) {
      s.push({ sphere: [0.07, 8, 6], at: [-0.22 + (i - 1) * 0.11, -0.13, end + (i % 2) * 0.05], scale: [1, 0.8, 2.2], rot: [0, 0.6 * i, 0], color: '#e8a25a' })
    }
  }
  return s
})()

type Carry = 'pole' | null

/** Shapes per bone, in that bone's local space. */
function bodyParts(o: Outfit, carry: Carry): [number, ShapeItem[]][] {
  const top = o.top ?? 'tee'
  const longSleeves = top === 'long' || top === 'hoodie' || top === 'jacket' || top === 'aoDai'
  // A dress replaces the bottom (same colour as the top); an áo dài is worn over silk trousers.
  const bottom = top === 'dress' ? 'skirt' : top === 'aoDai' ? 'pants' : (o.bottom ?? 'shorts')
  if (top === 'dress') o = { ...o, shorts: o.shirt }
  const sleeve = top === 'sleeveless' ? o.skin : o.shirt
  const lowerArm = longSleeves ? o.shirt : o.skin
  const thighColor = bottom === 'skirt' ? o.skin : o.shorts
  const shinColor = bottom === 'pants' ? o.shorts : o.skin
  const brow = shade(o.skin, 0.62)

  const head: ShapeItem[] = [
    { sphere: [0.36, 28, 20], color: o.skin },
    // Ears
    { sphere: [0.055, 10, 8], at: [-0.35, -0.05, 0.02], scale: [0.4, 1, 0.75], color: o.skin },
    { sphere: [0.055, 10, 8], at: [0.35, -0.05, 0.02], scale: [0.4, 1, 0.75], color: o.skin },
    ...hairShapes(o),
    ...accessoryShapes(o),
    // Cheeks, smile, eyebrows
    { sphere: [0.06, 12, 8], at: [-0.2, -0.1, 0.268], rot: [0, -0.62, 0], scale: [1, 0.6, 0.3], color: CHEEK },
    { sphere: [0.06, 12, 8], at: [0.2, -0.1, 0.268], rot: [0, 0.62, 0], scale: [1, 0.6, 0.3], color: CHEEK },
    { torus: [0.035, 0.009, 6, 12, Math.PI], at: [0, -0.115, 0.336], rot: [0, 0, Math.PI], color: MOUTH },
    { sphere: [0.017, 8, 6], at: [0, -0.06, 0.355], scale: [1.2, 0.8, 0.8], color: shade(o.skin, 0.88) },
    { box: [0.07, 0.011, 0.016], at: [-0.13, 0.085, 0.33], rot: [0, -0.33, -0.1], color: brow },
    { box: [0.07, 0.011, 0.016], at: [0.13, 0.085, 0.33], rot: [0, 0.33, 0.1], color: brow },
  ]

  // Eyes are their own bone so they can blink.
  const iris = o.eye ?? EYE
  const eyes: ShapeItem[] = [-1, 1].flatMap(
    (side): ShapeItem[] => [
      { sphere: [0.052, 12, 10], at: [side * 0.125, 0, 0.322], scale: [1, 1.22, 0.55], color: iris },
      { sphere: [0.03, 10, 8], at: [side * 0.125, -0.018, 0.338], scale: [1, 0.9, 0.4], color: shade(iris, 1.6) },
      { sphere: [0.018, 8, 6], at: [side * 0.125 + 0.017, 0.024, 0.352], color: WHITE },
      { sphere: [0.009, 6, 5], at: [side * 0.125 - 0.014, -0.022, 0.352], color: WHITE },
      // Upper lid line with a little flick at the outer corner
      { box: [0.098, 0.014, 0.014], at: [side * 0.125, 0.056, 0.334], rot: [0, side * -0.3, side * -0.12], color: '#2d2430' },
      { box: [0.03, 0.012, 0.012], at: [side * 0.178, 0.05, 0.322], rot: [0, side * -0.6, side * 0.5], color: '#2d2430' },
    ],
  )

  const torso: ShapeItem[] = [
    { sphere: [0.25, 20, 14], scale: [1, 1.1, 0.85], color: o.shirt },
    { sphere: [0.23, 20, 14], at: [0, -0.15, 0], scale: [1, 0.75, 0.85], color: o.shorts },
  ]
  // Collar / neckline, and a hem line where the top meets the bottom
  torso.push({ torus: [0.11, 0.022, 5, 16], at: [0, 0.235, 0.01], rot: [Math.PI / 2, 0, 0], color: top === 'sleeveless' ? o.skin : shade(o.shirt, 0.86) })
  torso.push({ torus: [0.218, 0.014, 4, 20], at: [0, -0.1, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.86, 1], color: shade(o.shorts, 0.82) })
  if (top === 'long') {
    // A row of buttons
    for (let i = 0; i < 3; i++) torso.push({ sphere: [0.016, 6, 5], at: [0, 0.13 - i * 0.085, 0.2 + (i === 1 ? 0.012 : 0)], color: shade(o.shirt, 0.7) })
  }
  if (top === 'hoodie') {
    torso.push(
      { sphere: [0.17, 14, 10], at: [0, 0.2, -0.17], scale: [1.05, 0.62, 0.62], color: shade(o.shirt, 0.9) },
      { box: [0.24, 0.1, 0.03], at: [0, -0.03, 0.205], rot: [-0.12, 0, 0], color: shade(o.shirt, 0.88) },
      { cyl: [0.007, 0.007, 0.12, 4], at: [-0.04, 0.17, 0.215], rot: [-0.2, 0, 0], color: '#ffffff' },
      { cyl: [0.007, 0.007, 0.12, 4], at: [0.04, 0.17, 0.215], rot: [-0.2, 0, 0], color: '#ffffff' },
    )
  }
  if (top === 'jacket') {
    // Open jacket over a white shirt, with lapels
    torso.push(
      { box: [0.1, 0.34, 0.02], at: [0, 0.05, 0.208], rot: [-0.1, 0, 0], color: '#fbfaf5' },
      { box: [0.05, 0.16, 0.02], at: [-0.065, 0.15, 0.212], rot: [-0.1, 0, 0.35], color: shade(o.shirt, 0.8) },
      { box: [0.05, 0.16, 0.02], at: [0.065, 0.15, 0.212], rot: [-0.1, 0, -0.35], color: shade(o.shirt, 0.8) },
      { sphere: [0.015, 6, 5], at: [-0.07, -0.02, 0.215], color: shade(o.shirt, 0.6) },
    )
  }
  if (top === 'aoDai') {
    // High mandarin collar, the diagonal closure, front and back panels to the knees
    torso.push(
      { cyl: [0.085, 0.095, 0.07, 14], at: [0, 0.25, 0.0], color: o.shirt },
      { box: [0.016, 0.16, 0.012], at: [0.07, 0.15, 0.205], rot: [0, 0, 0.6], color: shade(o.shirt, 0.75) },
      { box: [0.26, 0.32, 0.02], at: [0, -0.3, 0.14], rot: [0.12, 0, 0], color: o.shirt },
      { box: [0.26, 0.32, 0.02], at: [0, -0.3, -0.15], rot: [-0.12, 0, 0], color: o.shirt },
    )
  }
  if (o.neck === 'scarf') {
    const c = o.neckColor ?? '#d4473b'
    torso.push(
      { torus: [0.12, 0.05, 6, 16], at: [0, 0.225, 0.01], rot: [Math.PI / 2, 0, 0], color: c },
      { box: [0.08, 0.2, 0.04], at: [0.08, 0.1, 0.2], rot: [-0.15, 0, 0.12], color: c },
      { box: [0.082, 0.025, 0.042], at: [0.072, 0.03, 0.21], rot: [-0.15, 0, 0.12], color: shade(c, 0.75) },
    )
  } else if (o.neck === 'tie') {
    const c = o.neckColor ?? '#2c5aa0'
    torso.push(
      { box: [0.045, 0.035, 0.03], at: [0, 0.2, 0.2], color: c },
      { box: [0.05, 0.2, 0.018], at: [0, 0.07, 0.212], rot: [-0.08, 0, 0], color: c },
    )
  }
  if (bottom === 'skirt') torso.push({ cyl: [0.19, 0.31, 0.2, 16], at: [0, -0.2, 0], color: o.shorts })
  if (o.bag) {
    torso.push(
      { sphere: [0.2, 14, 10], at: [0, 0.03, -0.2], scale: [0.85, 1, 0.5], color: o.bag },
      { sphere: [0.12, 12, 8], at: [0, -0.06, -0.28], scale: [1, 0.6, 0.4], color: WHITE },
      { torus: [0.2, 0.025, 4, 12, Math.PI], at: [-0.13, 0.03, -0.02], rot: [0, Math.PI / 2, 0], scale: [1, 1.1, 1.05], color: o.bag },
      { torus: [0.2, 0.025, 4, 12, Math.PI], at: [0.13, 0.03, -0.02], rot: [0, Math.PI / 2, 0], scale: [1, 1.1, 1.05], color: o.bag },
    )
  }
  if (carry === 'pole') torso.push(...POLE)

  const thigh: ShapeItem[] = [{ cyl: [bottom === 'skirt' ? 0.07 : 0.088, bottom === 'skirt' ? 0.068 : 0.08, THIGH + 0.02, 10], at: [0, -THIGH / 2, 0], color: thighColor }]
  const shin: ShapeItem[] = [
    { sphere: [bottom === 'pants' ? 0.08 : 0.072, 10, 8], color: bottom === 'skirt' ? o.skin : bottom === 'pants' ? o.shorts : o.skin },
    { cyl: [bottom === 'pants' ? 0.078 : 0.07, bottom === 'pants' ? 0.074 : 0.064, SHIN, 10], at: [0, -SHIN / 2, 0], color: shinColor },
    // Shoe with a darker sole
    { sphere: [0.1, 12, 8], at: [0, -SHIN - 0.005, 0.03], scale: [0.9, 0.6, 1.25], color: o.shoe },
    { sphere: [0.1, 12, 6], at: [0, -SHIN - 0.045, 0.03], scale: [0.93, 0.22, 1.28], color: shade(o.shoe, 0.62) },
  ]

  const upperArm: ShapeItem[] = [
    { sphere: [0.088, 12, 8], at: [0, -0.02, 0], color: sleeve },
    { cyl: [0.066, 0.058, UPPER * 0.62, 8], at: [0, -UPPER * 0.36, 0], color: sleeve },
    { cyl: [0.054, 0.052, UPPER * 0.5, 8], at: [0, -UPPER * 0.78, 0], color: longSleeves ? o.shirt : o.skin },
  ]
  if (top === 'tee' || top === 'dress') upperArm.push({ torus: [0.06, 0.012, 4, 12], at: [0, -UPPER * 0.66, 0], rot: [Math.PI / 2, 0, 0], color: shade(o.shirt, 0.86) })
  const forearm = (side: number): ShapeItem[] => [
    { sphere: [0.056, 10, 8], color: lowerArm },
    { cyl: [0.053, 0.048, FORE - 0.04, 8], at: [0, -(FORE - 0.04) / 2, 0], color: lowerArm },
    ...(longSleeves ? [{ torus: [0.05, 0.014, 4, 12], at: [0, -FORE + 0.055, 0], rot: [Math.PI / 2, 0, 0], color: shade(o.shirt, 0.86) } as ShapeItem] : []),
    // Mitten hand with a thumb
    { sphere: [0.066, 12, 8], at: [0, -FORE, 0], scale: [0.9, 1.05, 1], color: o.skin },
    { sphere: [0.03, 8, 6], at: [-side * 0.035, -FORE + 0.012, 0.045], color: o.skin },
  ]

  return [
    [B.head, head],
    [B.eyes, eyes],
    [B.torso, torso],
    [B.thighL, thigh],
    [B.thighR, thigh],
    [B.shinL, shin],
    [B.shinR, shin],
    [B.armL, upperArm],
    [B.armR, upperArm],
    [B.foreL, forearm(1)],
    [B.foreR, forearm(-1)],
    [B.glass, GLASS],
    [B.fan, FAN],
  ]
}

/**
 * Mesh detail. The shapes above are authored generously; a street has ~30 characters, all
 * casting shadows, so the segment counts are scaled down: "high" for your own character (always
 * close to the camera), "low" for everyone else. ~9,000 → ~2,000 triangles per NPC.
 */
export type ChibiDetail = 'high' | 'low'
const DETAIL: Record<ChibiDetail, number> = { high: 0.8, low: 0.42 }

const seg = (n: number | undefined, fallback: number, k: number, min: number) => Math.max(min, Math.round((n ?? fallback) * k))

function simplify(items: ShapeItem[], k: number): ShapeItem[] {
  return items.map((it): ShapeItem => {
    if ('group' in it) return { ...it, group: simplify(it.group, k) }
    if ('sphere' in it) {
      const [r, w, h, theta] = it.sphere
      return { ...it, sphere: [r, seg(w, 32, k, r < 0.05 ? 6 : 8), seg(h, 16, k, r < 0.05 ? 4 : 6), theta] }
    }
    if ('cyl' in it) {
      const [rt, rb, h, radial] = it.cyl
      return { ...it, cyl: [rt, rb, h, seg(radial, 32, k * 1.2, 5)] }
    }
    if ('torus' in it) {
      const [r, tube, radial, tubular, arc] = it.torus
      return { ...it, torus: [r, tube, Math.max(3, Math.round((radial ?? 12) * 0.7)), seg(tubular, 48, k * 1.1, 8), arc] }
    }
    // Curls and flowers: a faceted icosahedron is plenty at this size.
    if ('ico' in it) return { ...it, ico: [it.ico[0], k < 0.6 ? 0 : Math.min(1, it.ico[1] ?? 0)] }
    return it
  })
}

/** All parts merged into one geometry, each vertex bound to its bone. */
function buildGeometry(o: Outfit, carry: Carry, detail: ChibiDetail): BufferGeometry {
  const k = DETAIL[detail]
  const parts = bodyParts(o, carry).map(([bone, shapes]) => {
    const g = buildShapes([{ group: simplify(shapes, k), at: BIND[bone] }])
    const n = g.attributes.position.count
    const index = new Uint16Array(n * 4)
    const weight = new Float32Array(n * 4)
    for (let i = 0; i < n; i++) {
      index[i * 4] = bone
      weight[i * 4] = 1
    }
    g.setAttribute('skinIndex', new Uint16BufferAttribute(index, 4))
    g.setAttribute('skinWeight', new Float32BufferAttribute(weight, 4))
    return g
  })
  const merged = mergeGeometries(parts, false)
  for (const p of parts) p.dispose()
  if (!merged) throw new Error('ChibiModel: failed to merge body parts')
  return merged
}

// Same outfit (by value) = same geometry, shared by every character wearing it.
const geometryCache = new Map<string, BufferGeometry>()
function chibiGeometry(key: string, o: Outfit, carry: Carry, detail: ChibiDetail) {
  let g = geometryCache.get(key)
  if (!g) {
    g = buildGeometry(o, carry, detail)
    geometryCache.set(key, g)
  }
  return g
}

function createRig(geometry: BufferGeometry) {
  const bones = BIND.map((_, i) => {
    const bone = new Bone()
    const p = PARENT[i]
    const from = p < 0 ? [0, 0, 0] : BIND[p]
    bone.position.set(BIND[i][0] - from[0], BIND[i][1] - from[1], BIND[i][2] - from[2])
    return bone
  })
  bones.forEach((bone, i) => {
    if (PARENT[i] >= 0) bones[PARENT[i]].add(bone)
  })
  const mesh = new SkinnedMesh(geometry, characterMaterial)
  mesh.add(bones[0])
  mesh.bind(new Skeleton(bones))
  mesh.castShadow = true
  mesh.receiveShadow = true
  // Poses move the body around (sitting, riding): cull with a generous fixed sphere.
  mesh.boundingSphere = new Sphere(new Vector3(0, 0.85, 0), 1.6)
  return { mesh, bones }
}

// --- Two-bone inverse kinematics (allocation-free) -------------------------------------
const DOWN = new Vector3(0, -1, 0)
const _dir = new Vector3()
const _perp = new Vector3()
const _elbow = new Vector3()
const _v = new Vector3()
const _target = new Vector3()
const _q1 = new Quaternion()
const _q2 = new Quaternion()
const _qi = new Quaternion()
const POLE_ARM_L = new Vector3(0.45, -0.8, -0.4).normalize()
const POLE_ARM_R = new Vector3(-0.45, -0.8, -0.4).normalize()
const POLE_LEG_L = new Vector3(0.25, 0.3, 1).normalize()
const POLE_LEG_R = new Vector3(-0.25, 0.3, 1).normalize()

/**
 * Bend a two-segment limb so its end reaches `target` (in the space of the upper bone's
 * parent), blended over the current pose by `weight`. `pole` is where the joint points.
 */
function solveLimb(upper: Bone, lower: Bone, target: Vector3, a: number, b: number, pole: Vector3, weight: number) {
  if (weight < 0.002) return
  _dir.subVectors(target, upper.position)
  const len = _dir.length() || 1e-4
  const d = Math.min(Math.max(len, Math.abs(a - b) + 0.01), a + b - 0.002)
  _dir.divideScalar(len)
  const angle = Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))))
  _perp.copy(pole).addScaledVector(_dir, -pole.dot(_dir))
  if (_perp.lengthSq() < 1e-6) _perp.set(0, 0, 1)
  _perp.normalize()
  _elbow.copy(_dir).multiplyScalar(Math.cos(angle)).addScaledVector(_perp, Math.sin(angle))
  _q1.setFromUnitVectors(DOWN, _elbow)
  _v.copy(_dir).multiplyScalar(d).addScaledVector(_elbow, -a).normalize()
  _v.applyQuaternion(_qi.copy(_q1).invert())
  _q2.setFromUnitVectors(DOWN, _v)
  upper.quaternion.slerp(_q1, weight)
  lower.quaternion.slerp(_q2, weight)
}

/** A point given in model space → the root bone's local space (root moves up and leans). */
function toRoot(out: Vector3, x: number, y: number, z: number, rootY: number, lean: number) {
  const c = Math.cos(-lean)
  const s = Math.sin(-lean)
  const py = y - rootY
  return out.set(x, py * c - z * s, py * s + z * c)
}

export interface ChibiModelProps {
  motion: RefObject<MotionState>
  outfit?: Outfit
  /** Carried object attached to the body. */
  carry?: Carry
  /** Mesh detail: "high" only for the local player (see DETAIL). */
  detail?: ChibiDetail
}

export function ChibiModel({ motion, outfit = PLAYER_OUTFIT, carry = null, detail = 'low' }: ChibiModelProps) {
  const key = `${JSON.stringify(outfit)}|${carry ?? ''}|${detail}`
  const rig = useMemo(
    () => createRig(chibiGeometry(key, outfit, carry, detail)),
    // The key describes the outfit by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  useEffect(() => () => rig.mesh.skeleton.dispose(), [rig])

  const anim = useRef({
    walkPhase: 0,
    time: Math.random() * 10,
    nextBlink: 2.5,
    blinkT: -1,
    sit: 0,
    ride: 0,
    sip: 0,
    fan: 0,
    arms: 0,
    kick: 0,
    anchors: RIDES.motorbike as RideAnchors,
  })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const a = anim.current
    const m = motion.current
    const bone = rig.bones
    const s = m?.speed ?? 0
    const riding = m?.ride ? RIDES[m.ride] : null
    if (riding) a.anchors = riding
    a.time += dt
    a.walkPhase += dt * (4 + 9 * s)
    a.ride = damp(a.ride, riding ? 1 : 0, 10, dt)
    a.sit = damp(a.sit, riding ? 1 : (m?.sit ?? 0), 10, dt)
    a.sip = damp(a.sip, m?.sip ?? 0, 7, dt)
    a.fan = damp(a.fan, m?.fan ?? 0, 6, dt)
    a.arms = damp(a.arms, m?.arms ?? 0, 8, dt)
    a.kick = damp(a.kick, m?.kick ?? 0, 18, dt)
    const seatY = riding ? riding.seatY : (m?.seatY ?? STOOL_Y)

    const stand = 1 - a.sit
    const sin = Math.sin(a.walkPhase)
    // Running (s > 1): longer, faster strides, capped so legs stay plausible.
    const swing = sin * 0.75 * Math.min(s, 1.4) * stand
    const bounce = Math.abs(sin) * 0.07 * s * stand
    const breathe = Math.sin(a.time * 2.4) * Math.max(0, 1 - s)

    // Body: bounce while walking, drop onto the seat, lean
    const rootY = bounce + (seatY - HIP_Y) * a.sit
    const lean = 0.1 * s * stand - 0.06 * a.sit * (1 - a.ride) + a.anchors.lean * a.ride
    bone[B.root].position.y = rootY
    bone[B.root].rotation.x = lean

    // Legs: swing from the hip, knees bend on the lifting leg and when seated
    const kneeSit = 1.3 * a.sit
    bone[B.thighL].rotation.set(swing - 1.4 * a.sit - 1.5 * a.kick, 0, 0)
    bone[B.thighR].rotation.set(-swing - 1.4 * a.sit, 0, 0)
    bone[B.shinL].rotation.set((Math.max(0, Math.sin(a.walkPhase + 1.1)) * 0.9 * s * stand + kneeSit) * (1 - a.kick), 0, 0)
    bone[B.shinR].rotation.set(Math.max(0, Math.sin(a.walkPhase + 1.1 + Math.PI)) * 0.9 * s * stand + kneeSit, 0, 0)

    // Arms: swing opposite to the legs with a soft elbow
    const forward = 1 - a.arms
    let rxR = swing * 0.9 * forward - 1.0 * a.arms
    let rzR = -0.22
    let elbowR = -(0.2 + 0.3 * s) - 0.55 * a.arms
    rxR += (-1.0 - rxR) * a.fan
    elbowR += (-1.0 - elbowR) * a.fan
    rzR += a.fan * (0.1 + Math.sin(a.time * 11) * 0.3)
    bone[B.armL].rotation.set(-swing * 0.9 * forward - 1.0 * a.arms, 0, 0.22)
    bone[B.foreL].rotation.set(-(0.2 + 0.3 * s) - 0.55 * a.arms, 0, 0)
    bone[B.armR].rotation.set(rxR, 0, rzR)
    bone[B.foreR].rotation.set(elbowR, 0, 0)

    // Riding: hands on the grips, feet on the footrests / turning the pedals
    if (a.ride > 0.002) {
      const r = a.anchors
      const [gx, gy, gz] = r.grip
      solveLimb(bone[B.armL], bone[B.foreL], toRoot(_target, gx, gy, gz, rootY, lean), UPPER, FORE, POLE_ARM_L, a.ride)
      solveLimb(bone[B.armR], bone[B.foreR], toRoot(_target, -gx, gy, gz, rootY, lean), UPPER, FORE, POLE_ARM_R, a.ride)
      const pr = r.pedalRadius ?? 0
      const phase = m?.pedal ?? 0
      const [fx, fy, fz] = r.foot
      solveLimb(bone[B.thighL], bone[B.shinL], toRoot(_target, fx, fy + Math.sin(phase) * pr, fz + Math.cos(phase) * pr, rootY, lean), THIGH, SHIN, POLE_LEG_L, a.ride)
      solveLimb(bone[B.thighR], bone[B.shinR], toRoot(_target, -fx, fy - Math.sin(phase) * pr, fz - Math.cos(phase) * pr, rootY, lean), THIGH, SHIN, POLE_LEG_R, a.ride)
    }
    // Drinking: the right hand comes up under the chin
    if (a.sip > 0.002) solveLimb(bone[B.armR], bone[B.foreR], _target.set(-0.1, 0.74, 0.3), UPPER, FORE, POLE_ARM_R, a.sip)

    // Held things stay upright whatever the arm does; the glass tips toward the mouth.
    _qi.copy(bone[B.armR].quaternion).multiply(bone[B.foreR].quaternion).invert()
    const glass = bone[B.glass]
    glass.quaternion.copy(_qi).multiply(_q2.setFromAxisAngle(_v.set(1, 0, 0), -0.75 * a.sip))
    glass.scale.setScalar(m?.held === 'glass' ? 1 : 0.0001)
    const fan = bone[B.fan]
    fan.quaternion.copy(_qi)
    fan.scale.setScalar(m?.held === 'fan' ? 1 : 0.0001)

    bone[B.torso].scale.set(1 - breathe * 0.01, 1 + breathe * 0.025, 1)
    const head = bone[B.head]
    head.position.y = HEAD_Y + breathe * 0.012
    head.rotation.z = sin * 0.06 * s * stand + Math.sin(a.time * 1.1) * 0.035 * (1 - s)
    head.rotation.x = -0.15 * a.sip - a.anchors.lean * 0.7 * a.ride

    // Blink every few seconds
    const eyes = bone[B.eyes]
    if (a.blinkT < 0 && a.time > a.nextBlink) a.blinkT = 0
    if (a.blinkT >= 0) {
      a.blinkT += dt
      const k = a.blinkT / 0.14
      eyes.scale.y = k < 1 ? Math.max(0.1, Math.abs(1 - 2 * k)) : 1
      if (k >= 1) {
        a.blinkT = -1
        a.nextBlink = a.time + 2 + Math.random() * 3
      }
    }
  })

  return <primitive object={rig.mesh} />
}
