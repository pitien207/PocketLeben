import { Color } from 'three'
import type { Vec3 } from '../../../data/config'
import { modelShapes, modelSize } from './models'
import type { ShapeItem } from './Shapes'

/**
 * 1.48 Cars from the Kenney Car Kit (pack "vehicles", names kv…) and the city bus (pack "bus", pBus) for traffic, parked
 * cars and the showroom. Kenney's cars are chunky (1.5 × 2.6 units): they are scaled to a fixed width so a lane still fits
 * them, and the body is repainted: every strongly coloured part (the paint — wheels, glass, chrome and lights are grey,
 * white or tiny) takes the wanted colour, keeping its own light / dark tone.
 */

/** The Kenney cars that look like everyday traffic (+ work vehicles added per country). */
export const KENNEY_TRAFFIC = ['kvSedan', 'kvHatchback', 'kvSuv', 'kvSuvLuxury', 'kvVan', 'kvSedanSports'] as const
export const KENNEY_WORK = ['kvDelivery', 'kvTruck', 'kvTruckFlat', 'kvDeliveryFlat'] as const

/** Width of a library car in metres (the old Quaternius cars are 1.3–1.7 m). */
const CAR_WIDTH = 1.66

export const isLibraryCar = (name: string | undefined): name is string => !!name && (name.startsWith('kv') || name === 'pBus')

const tmp = new Color()
const tmp2 = new Color()
const hsl = { h: 0, s: 0, l: 0 }
const hsl2 = { h: 0, s: 0, l: 0 }

/** Paint for one material: saturated, not-too-small parts (the body) take `color`, keeping their lightness offset. */
export function bodyPaint(color: string | null, extra: Record<string, string> = {}) {
  return (_mat: string, own: string) => {
    if (extra[own]) return extra[own]
    if (!color) return own
    tmp.set(own).getHSL(hsl)
    // lights (#ffd534 headlights, #e74e3e / #e74e3e tail lights) stay; glass (#9da4c4, #99bcec) and greys too
    if (hsl.s < 0.35 || own === '#ffd534' || own === '#e74e3e' || own === '#e7f5ff') return own
    tmp2.set(color).getHSL(hsl2)
    return '#' + tmp.setHSL(hsl2.h, hsl2.s, Math.min(0.92, Math.max(0.08, hsl2.l + (hsl.l - 0.55) * 0.35))).getHexString()
  }
}

/** Scale that makes the model CAR_WIDTH wide (the bus keeps its real size). */
export function libraryCarScale(name: string): number {
  if (name === 'pBus') return 1
  return CAR_WIDTH / modelSize(name)[0]
}

/** Size [w, h, l] in metres after scaling. */
export function libraryCarSize(name: string): Vec3 {
  const k = libraryCarScale(name)
  const s = modelSize(name)
  return [s[0] * k, s[1] * k, s[2] * k]
}

/** The car as Shapes items (front = +z, on the ground), or null while the pack is loading. */
export function libraryCarShapes(name: string, color: string | null, extra?: Record<string, string>): ShapeItem[] | null {
  return modelShapes(name, { scale: libraryCarScale(name), paint: bodyPaint(color, extra) })
}
