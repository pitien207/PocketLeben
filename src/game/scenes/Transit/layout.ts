import type { GateId } from '../../../data/flight'

/**
 * 1.43 Transit at Frankfurt (scenes/Transit). You come off the plane at the +Z end and walk toward −Z:
 * arrival corridor (with the wrong way out, "Ausgang") → Passkontrolle (EU lane / all passports) → transit hall
 * with the departures board → two piers, gates G on the left, H on the right.
 */
export const T = {
  /** Arrival corridor. */
  corridor: { x0: -2.2, x1: 2.2, z0: 7, z1: 16 },
  /** The exit you must NOT take (left wall of the corridor). */
  exit: { x: -2.2, z: 10.8 },
  /** Passkontrolle: back wall at z1, barrier at z0. */
  control: { x0: -9, x1: 9, z0: 2.6, z1: 7 },
  /** Lanes through the barrier (centre x, half width). */
  euLane: { x: -4, half: 0.6 },
  allLane: { x: 3, half: 0.6 },
  /** Transit hall. */
  hall: { x0: -14, x1: 14, z0: -8, z1: 2.6 },
  board: { x: 0, z: -2.6 },
  /** Piers (x ranges) and their depth. */
  pierG: { x0: -14, x1: -6 },
  pierH: { x0: 6, x1: 14 },
  pierEnd: -24,
}

export interface GateSpot {
  id: GateId
  /** Counter centre. */
  x: number
  z: number
  /** +1 = on the right wall (H), −1 = on the left wall (G). */
  side: 1 | -1
}

const GZ = [-11.5, -16, -20.5]
export const GATE_SPOTS: GateSpot[] = [
  ...(['G10', 'G12', 'G14'] as const).map((id, i): GateSpot => ({ id, x: -12.4, z: GZ[i], side: -1 })),
  ...(['H27', 'H29', 'H31'] as const).map((id, i): GateSpot => ({ id, x: 12.4, z: GZ[i], side: 1 })),
]

export const gateSpot = (id: GateId) => GATE_SPOTS.find((g) => g.id === id)!
