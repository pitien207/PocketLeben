import type { Vec3 } from '../../../data/config'
import { PALETTE as P } from './palette'
import type { ShapeItem } from './Shapes'

/**
 * Vehicles sized for the chibi characters, plus where a rider sits and holds on.
 * All vehicles face +Z. A rider's hands and feet are placed on the anchors by inverse
 * kinematics (ChibiModel), so nothing floats in the air.
 */

export type RideKind = 'motorbike' | 'bicycle'

/** Rider anchors, relative to the rider's own origin (which sits at `riderZ` in vehicle space). */
export interface RideAnchors {
  /** Where the rider's origin is along the vehicle. */
  riderZ: number
  /** Seat height (hip joint). */
  seatY: number
  /** Left grip (+X side); the right one is mirrored. */
  grip: Vec3
  /** Left ankle position on the footrest / pedal centre; the right one is mirrored. */
  foot: Vec3
  /** Forward lean of the upper body (radians). */
  lean: number
  /** Pedalling: radius of the circle the feet make (bicycles). */
  pedalRadius?: number
}

export const RIDES: Record<RideKind, RideAnchors> = {
  motorbike: { riderZ: -0.12, seatY: 0.56, grip: [0.25, 0.88, 0.32], foot: [0.12, 0.4, 0.17], lean: 0.12 },
  bicycle: { riderZ: -0.14, seatY: 0.56, grip: [0.21, 0.86, 0.34], foot: [0.1, 0.36, 0.15], lean: 0.2, pedalRadius: 0.055 },
}

const TIRE = '#45434f'
const GRIP = '#2f2f38'

/** A cute scooter — the most Vietnamese street prop there is. */
export function motorbikeShapes(color: string): ShapeItem[] {
  const seat = '#5b4038'
  const s: ShapeItem[] = []
  // Wheels with hubs
  for (const z of [-0.46, 0.5]) {
    s.push({ torus: [0.19, 0.07, 6, 16], at: [0, 0.26, z], rot: [0, Math.PI / 2, 0], color: TIRE })
    s.push({ cyl: [0.1, 0.1, 0.12, 10], at: [0, 0.26, z], rot: [0, 0, Math.PI / 2], color: P.steel })
  }
  // Rear body shell, seat cushion, tail light and plate
  s.push({ sphere: [0.4, 16, 12], at: [0, 0.38, -0.3], scale: [0.5, 0.36, 0.98], color })
  s.push({ sphere: [0.2, 14, 10], at: [0, 0.5, -0.26], scale: [0.72, 0.24, 1.5], color: seat })
  s.push({ box: [0.16, 0.07, 0.05], at: [0, 0.42, -0.655], color: '#ff5a4d' })
  s.push({ box: [0.2, 0.11, 0.02], at: [0, 0.3, -0.73], rot: [0.25, 0, 0], color: '#ffffff' })
  s.push({ cyl: [0.045, 0.05, 0.42, 8], at: [-0.17, 0.27, -0.44], rot: [Math.PI / 2 - 0.12, 0, 0], color: P.steel })
  // Footboard and the leg shield rising to the handlebar
  s.push({ box: [0.36, 0.06, 0.44], at: [0, 0.3, 0.06], color: '#6b6878' })
  s.push({ box: [0.36, 0.5, 0.07], at: [0, 0.55, 0.3], rot: [-0.3, 0, 0], color })
  // Front fender hugging the wheel
  s.push({ sphere: [0.27, 12, 6, Math.PI / 2], at: [0, 0.27, 0.5], scale: [0.42, 1, 1], color })
  // Steering column, handlebar with grips, headlight, mirrors
  s.push({ cyl: [0.03, 0.03, 0.56, 6], at: [0, 0.62, 0.36], rot: [-0.42, 0, 0], color: P.darkSteel })
  s.push({ box: [0.24, 0.16, 0.12], at: [0, 0.86, 0.27], rot: [-0.25, 0, 0], color })
  s.push({ sphere: [0.075, 10, 8], at: [0, 0.85, 0.335], color: '#fff6c8' })
  s.push({ cyl: [0.022, 0.022, 0.56, 6], at: [0, 0.88, 0.2], rot: [0, 0, Math.PI / 2], color: P.darkSteel })
  for (const side of [-1, 1]) {
    s.push({ cyl: [0.032, 0.032, 0.11, 8], at: [side * 0.25, 0.88, 0.2], rot: [0, 0, Math.PI / 2], color: GRIP })
    s.push({ cyl: [0.01, 0.01, 0.2, 5], at: [side * 0.2, 0.98, 0.2], rot: [0, 0, -side * 0.25], color: P.darkSteel })
    s.push({ sphere: [0.055, 10, 8], at: [side * 0.225, 1.09, 0.2], scale: [1, 0.8, 0.3], color: P.steel })
  }
  return s
}

/** A small city bicycle with a front basket. */
export function bicycleShapes(color: string): ShapeItem[] {
  const s: ShapeItem[] = []
  for (const z of [-0.38, 0.4]) {
    s.push({ torus: [0.21, 0.028, 5, 18], at: [0, 0.24, z], rot: [0, Math.PI / 2, 0], color: TIRE })
    s.push({ cyl: [0.03, 0.03, 0.06, 6], at: [0, 0.24, z], rot: [0, 0, Math.PI / 2], color: P.steel })
  }
  const tube = (from: [number, number], to: [number, number], r = 0.022, c = color) => {
    const dy = to[0] - from[0]
    const dz = to[1] - from[1]
    s.push({ cyl: [r, r, Math.hypot(dy, dz), 5], at: [0, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2], rot: [Math.atan2(dz, dy), 0, 0], color: c })
  }
  // Frame ([y, z] pairs): seat tube, down tube, top tube, chain stay, fork, stem
  tube([0.28, 0.0], [0.52, -0.13])
  tube([0.28, 0.0], [0.6, 0.27])
  tube([0.5, -0.12], [0.62, 0.27])
  tube([0.28, 0.0], [0.24, -0.38], 0.016)
  tube([0.5, -0.12], [0.24, -0.38], 0.016)
  tube([0.66, 0.26], [0.24, 0.4], 0.02, P.darkSteel)
  tube([0.6, 0.27], [0.86, 0.2], 0.018, P.darkSteel)
  // Handlebar with grips, saddle, pedals, basket
  s.push({ cyl: [0.016, 0.016, 0.46, 5], at: [0, 0.86, 0.2], rot: [0, 0, Math.PI / 2], color: P.darkSteel })
  for (const side of [-1, 1]) s.push({ cyl: [0.026, 0.026, 0.09, 6], at: [side * 0.2, 0.86, 0.2], rot: [0, 0, Math.PI / 2], color: GRIP })
  s.push({ sphere: [0.1, 10, 8], at: [0, 0.535, -0.15], scale: [0.75, 0.3, 1.3], color: '#6a4a40' })
  s.push({ cyl: [0.05, 0.05, 0.03, 10], at: [0, 0.28, 0.0], rot: [0, 0, Math.PI / 2], color: P.steel })
  s.push({ box: [0.26, 0.2, 0.2], at: [0, 0.7, 0.44], color: '#d9b46b' })
  s.push({ box: [0.28, 0.02, 0.22], at: [0, 0.8, 0.44], color: '#c49a55' })
  return s
}

/** Hà Nội's flower bicycle: an old bike with a rack and two baskets overflowing with flowers. */
export function flowerBikeShapes(): ShapeItem[] {
  const s: ShapeItem[] = [...bicycleShapes('#3f7d5c')]
  const rz = -0.38
  // Rear rack + two woven baskets either side of the back wheel
  s.push({ box: [0.44, 0.03, 0.42], at: [0, 0.52, rz], color: '#5d6170' })
  for (const side of [-1, 1]) {
    s.push({ cyl: [0.19, 0.15, 0.32, 10], at: [side * 0.3, 0.44, rz], color: '#c49a6c' })
    s.push({ cyl: [0.195, 0.195, 0.035, 10], at: [side * 0.3, 0.6, rz], color: '#a8754f' })
  }
  // Bunches of flowers: lotus pink, daisies white, roses red, sunflowers yellow
  const COLORS = ['#ff9fcf', '#ffffff', '#ff6b7a', '#ffd84d', '#ffc2e0', '#ffffff']
  let n = 0
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const x = side * 0.3 + Math.cos(a) * 0.1
      const z = rz + Math.sin(a) * 0.1
      s.push({ cyl: [0.008, 0.008, 0.3, 4], at: [x, 0.74, z], color: '#5f9e57' })
      s.push({ ico: [0.065 + (n % 3) * 0.014, 0], at: [x, 0.9 + (i % 2) * 0.06, z], color: COLORS[n++ % COLORS.length] })
    }
  }
  // A bundle across the rack, and more in the front basket
  for (let i = 0; i < 5; i++) s.push({ ico: [0.06, 0], at: [-0.14 + i * 0.07, 0.6 + (i % 2) * 0.04, rz - 0.1], color: COLORS[(i + 2) % COLORS.length] })
  for (let i = 0; i < 4; i++) s.push({ ico: [0.06, 0], at: [-0.08 + (i % 2) * 0.16, 0.88, 0.38 + Math.floor(i / 2) * 0.12], color: COLORS[(i + 1) % COLORS.length] })
  s.push({ ico: [0.1, 0], at: [0, 0.84, 0.44], color: '#7cc27a' })
  return s
}
