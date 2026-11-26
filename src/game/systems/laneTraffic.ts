/**
 * 1.48 Who is where in the traffic lanes: every traffic vehicle and every bus writes its x here each frame, so cars queue
 * behind a bus waiting at its stop and the bus does not drive into the car in front (before, vehicles only looked out
 * for the player). Plain module state, no React.
 */

interface Occupant {
  x: number
  z: number
  dir: 1 | -1
  /** Half length along the lane. */
  half: number
}

const occupants = new Map<string, Occupant>()

export function setOccupant(id: string, x: number, z: number, dir: 1 | -1, half: number) {
  const o = occupants.get(id)
  if (o) {
    o.x = x
    o.z = z
    o.dir = dir
    o.half = half
  } else occupants.set(id, { x, z, dir, half })
}

export function clearOccupant(id: string) {
  occupants.delete(id)
}

/**
 * Free road in front of `id` (front bumper to the next vehicle's back) in the same lane and direction, or Infinity.
 * Vehicles that just wrapped round to the far end of the lane are not "ahead" (only up to `range` metres).
 */
export function gapAhead(id: string, x: number, z: number, dir: 1 | -1, half: number, range = 40): number {
  let best = Infinity
  for (const [other, o] of occupants) {
    if (other === id || o.dir !== dir || Math.abs(o.z - z) > 1.2) continue
    const d = (o.x - x) * dir
    if (d <= 0 || d > range) continue
    const gap = d - half - o.half
    if (gap < best) best = gap
  }
  return best
}
