import type { Vec3 } from '../../../data/config'
import type { BikeStyle, VehicleDef } from '../../../data/vehicles'
import manifest from '../../../assets/models/cars.json'
import { carModelShapes } from './carModels'
import { isLibraryCar, libraryCarShapes, libraryCarSize } from './libraryCars'
import { PALETTE as P } from './palette'
import { bicycleShapes, carShapes, motorbikeShapes } from './props'
import type { ShapeItem } from './Shapes'
import { RIDES, type RideAnchors, type RideKind } from './vehicles'

/**
 * 1.35: what the vehicles you can buy look like (data/vehicles.ts) and how big they are. Two-wheelers keep the
 * rider anchors of RIDES (grips, seat, footrests), so every style below puts its handlebar and seat in the same
 * place as the traffic scooter. Cars are the Quaternius models of the traffic (fallback: the hand-built car).
 * All face +Z.
 */

const TIRE = '#45434f'
const GRIP = '#2f2f38'

/** Scooter family: smaller wheels, a flat floor, a long seat. `vespa` = round retro body, `big` = sporty two-tone. */
function scooterShapes(style: 'scooter' | 'vespa' | 'big', color: string, color2: string): ShapeItem[] {
  const s: ShapeItem[] = []
  const r = style === 'big' ? 0.2 : 0.17
  for (const z of [-0.48, 0.52]) {
    s.push({ torus: [r, 0.07, 6, 16], at: [0, r + 0.07, z], rot: [0, Math.PI / 2, 0], color: TIRE })
    s.push({ cyl: [r * 0.6, r * 0.6, 0.12, 12], at: [0, r + 0.07, z], rot: [0, 0, Math.PI / 2], color: style === 'big' ? '#c9ced8' : P.steel })
  }
  if (style === 'big') {
    // Brake disc on the front wheel
    s.push({ cyl: [0.13, 0.13, 0.01, 14], at: [0.08, 0.27, 0.52], rot: [0, 0, Math.PI / 2], color: '#b8bcc6' })
  }
  // Rear body: one long shell (round side cowls on the retro one)
  if (style === 'vespa') {
    for (const side of [-1, 1]) s.push({ sphere: [0.3, 16, 12], at: [side * 0.1, 0.4, -0.36], scale: [0.62, 0.62, 1.05], color })
    s.push({ box: [0.22, 0.2, 0.5], at: [0, 0.32, -0.3], color })
  } else {
    s.push({ sphere: [0.42, 16, 12], at: [0, 0.42, -0.3], scale: [0.48, 0.38, 1.0], color })
    // Stripe along the side
    for (const side of [-1, 1]) s.push({ box: [0.02, 0.05, 0.62], at: [side * 0.2, 0.42, -0.3], rot: [0.08, 0, 0], color: style === 'big' ? '#2a2a30' : color2 })
  }
  // Long seat, grab rail, tail light, plate
  s.push({ sphere: [0.22, 14, 10], at: [0, 0.535, -0.24], scale: [0.7, 0.24, 1.6], color: color2 })
  s.push({ box: [0.26, 0.04, 0.12], at: [0, 0.56, -0.62], color: style === 'vespa' ? P.steel : '#2a2a30' })
  s.push({ box: [0.18, 0.07, 0.05], at: [0, 0.45, -0.7], color: '#ff5a4d' })
  s.push({ box: [0.2, 0.11, 0.02], at: [0, 0.3, -0.75], rot: [0.25, 0, 0], color: '#ffffff' })
  s.push({ cyl: [0.045, 0.05, 0.4, 8], at: [-0.17, 0.25, -0.46], rot: [Math.PI / 2 - 0.12, 0, 0], color: P.steel })
  // Flat floor and the leg shield (apron) up to the handlebar
  s.push({ box: [0.34, 0.06, 0.46], at: [0, 0.3, 0.06], color: style === 'big' ? '#2a2a30' : '#6b6878' })
  s.push({ box: [0.38, 0.56, 0.08], at: [0, 0.56, 0.32], rot: [-0.26, 0, 0], color })
  if (style === 'vespa') s.push({ sphere: [0.2, 12, 10], at: [0, 0.5, 0.36], scale: [1, 1.4, 0.4], color })
  // Front fender
  s.push({ sphere: [r + 0.08, 12, 6, Math.PI / 2], at: [0, r + 0.08, 0.52], scale: [0.42, 1, 1], color: style === 'big' ? '#2a2a30' : color })
  // Steering column, handlebar cover, lights
  s.push({ cyl: [0.03, 0.03, 0.56, 6], at: [0, 0.62, 0.36], rot: [-0.42, 0, 0], color: P.darkSteel })
  s.push({ box: [0.3, 0.13, 0.16], at: [0, 0.86, 0.25], rot: [-0.25, 0, 0], color })
  if (style === 'vespa') {
    s.push({ cyl: [0.075, 0.075, 0.06, 14], at: [0, 0.92, 0.33], rot: [Math.PI / 2, 0, 0], color: P.steel })
    s.push({ cyl: [0.06, 0.06, 0.02, 14], at: [0, 0.92, 0.365], rot: [Math.PI / 2, 0, 0], color: '#fff6c8' })
  } else {
    s.push({ box: [0.22, 0.06, 0.04], at: [0, 0.74, 0.39], rot: [-0.26, 0, 0], color: '#fff6c8' })
    for (const side of [-1, 1]) s.push({ box: [0.05, 0.04, 0.03], at: [side * 0.17, 0.64, 0.41], color: '#ffb340' })
  }
  if (style === 'big') s.push({ box: [0.3, 0.22, 0.02], at: [0, 1.0, 0.32], rot: [-0.45, 0, 0], color: '#8fb6cf' })
  s.push({ cyl: [0.022, 0.022, 0.56, 6], at: [0, 0.88, 0.2], rot: [0, 0, Math.PI / 2], color: P.darkSteel })
  for (const side of [-1, 1]) {
    s.push({ cyl: [0.032, 0.032, 0.11, 8], at: [side * 0.25, 0.88, 0.2], rot: [0, 0, Math.PI / 2], color: GRIP })
    s.push({ cyl: [0.01, 0.01, 0.2, 5], at: [side * 0.2, 0.98, 0.2], rot: [0, 0, -side * 0.25], color: P.darkSteel })
    s.push({ sphere: [0.055, 10, 8], at: [side * 0.225, 1.09, 0.2], scale: [1, 0.8, 0.3], color: P.steel })
  }
  return s
}

function bikeShapes(style: BikeStyle, color: string, color2: string): ShapeItem[] {
  if (style === 'bicycle') return bicycleShapes(color)
  if (style === 'cub') return motorbikeShapes(color)
  return scooterShapes(style, color, color2)
}

const CAR_SIZE = new Map((manifest as unknown as { models: { name: string; size: [number, number, number] }[] }).models.map((m) => [m.name, m.size]))

/** The vehicle as Shapes items (cars use the model once `carsReady`, else the hand-built car). */
export function vehicleShapes(def: VehicleDef, carsReady: boolean): ShapeItem[] {
  if (def.kind === 'car') {
    if (isLibraryCar(def.model)) return libraryCarShapes(def.model, def.color) ?? carShapes(def.color)
    return (carsReady && def.model ? carModelShapes(def.model, def.color) : null) ?? carShapes(def.color)
  }
  return bikeShapes(def.style ?? 'cub', def.color, def.color2)
}

/** Half extents [x, y, z] of the collider while riding / of the display stand. */
export function vehicleHalf(def: VehicleDef): Vec3 {
  if (def.kind === 'car') {
    const size = isLibraryCar(def.model) ? libraryCarSize(def.model) : (def.model && CAR_SIZE.get(def.model)) || [1.5, 1.4, 3.1]
    return [size[0] / 2 - 0.02, 0.55, size[2] / 2 - 0.04]
  }
  return def.kind === 'bicycle' ? [0.22, 0.45, 0.6] : [0.26, 0.45, 0.74]
}

/** 1.49 Real outer size [w, h, l] in metres (the showroom frames the vehicle with it). Two-wheelers include the rider's height. */
export function vehicleSize(def: VehicleDef): Vec3 {
  if (def.kind === 'car') return isLibraryCar(def.model) ? libraryCarSize(def.model) : (def.model && CAR_SIZE.get(def.model)) || [1.5, 1.4, 3.1]
  return def.kind === 'bicycle' ? [0.5, 1.1, 1.7] : [0.6, 1.2, 1.9]
}

/** The rider pose for two-wheelers (cars hide the driver). */
export const rideKindOf = (def: VehicleDef): RideKind | null => (def.kind === 'car' ? null : def.kind)
export const rideAnchorsOf = (def: VehicleDef): RideAnchors | null => {
  const k = rideKindOf(def)
  return k ? RIDES[k] : null
}
