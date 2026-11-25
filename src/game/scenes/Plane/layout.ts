import { ROW_FIRST, ROW_LAST, SEAT_LETTERS, type SeatLetter } from '../../../data/flight'

/**
 * 1.43 The cabin of flight SH 701 (scenes/Plane). The nose points to +Z (toward the camera's default side), so the
 * passengers face the camera; you board through the front-left door and walk the aisle toward the tail (−Z).
 * Seen the way the passengers sit, A B C are on their left = +X, D E F on −X.
 */
export const CABIN = {
  /** Inner half width (walls just outside). */
  halfW: 2.55,
  front: 3.2,
  tail: -16.4,
  /** Aisle half width. */
  aisle: 0.55,
  /** Door in the −X wall (z range). */
  door: [1.0, 2.2] as [number, number],
  /** Row partition in front of row 20. */
  partitionZ: 0.15,
  pitch: 1.05,
  sitY: 0.46,
}

/** The jet bridge: a corridor along −Z beside the nose, then a short turn into the door. */
export const BRIDGE = { x0: -7.6, x1: -5.4, z0: 0.6, z1: 15, turnZ1: 2.6 }

/** Seat pan centre of a row (rows run toward the tail). */
export const rowZ = (row: number) => -0.8 - (row - ROW_FIRST) * CABIN.pitch
export const ROWS = Array.from({ length: ROW_LAST - ROW_FIRST + 1 }, (_, i) => ROW_FIRST + i)

const SEAT_X: Record<SeatLetter, number> = { A: 2.05, B: 1.45, C: 0.85, D: -0.85, E: -1.45, F: -2.05 }
export const seatX = (l: SeatLetter) => SEAT_X[l]
export const SEAT_W = 0.58

/** Where a body sits in a seat: a little forward of the backrest so it doesn't push into its collider. */
export function seatSpot(row: number, letter: SeatLetter) {
  return { x: seatX(letter), z: rowZ(row) + 0.05, yaw: 0, sitY: CABIN.sitY }
}

export function parseSeat(code: string): { row: number; letter: SeatLetter } | null {
  const m = /^(\d+)([A-F])$/.exec(code)
  if (!m) return null
  const row = Number(m[1])
  if (row < ROW_FIRST || row > ROW_LAST) return null
  return { row, letter: m[2] as SeatLetter }
}

/**
 * The seat the player stands next to (in its leg room, or in the aisle beside an aisle seat), or null.
 * Bands across: C/D from the aisle edge, B/E, A/F.
 */
export function seatAt(x: number, z: number): string | null {
  const ax = Math.abs(x)
  if (ax < 0.3 || ax > CABIN.halfW) return null
  const side = x > 0 ? 0 : 1
  const col = ax < 1.15 ? 2 : ax < 1.75 ? 1 : 0
  const letter = SEAT_LETTERS[side === 0 ? col : 5 - col]
  for (const row of ROWS) {
    const zr = rowZ(row)
    if (z > zr - 0.15 && z < zr + 0.78) return `${row}${letter}`
  }
  return null
}

/** Zone (for the interaction system) of a seat's standing area. */
export function seatZone(code: string) {
  const p = parseSeat(code)
  if (!p) return { x: 0, z: 0, halfX: 0.1, halfZ: 0.1 }
  const x = seatX(p.letter)
  const sign = Math.sign(x)
  const ax = Math.abs(x)
  const [x0, x1] = ax < 1 ? [0.3, 1.15] : ax < 1.6 ? [1.15, 1.75] : [1.75, CABIN.halfW]
  return { x: sign * (x0 + x1) / 2, z: rowZ(p.row) + 0.31, halfX: (x1 - x0) / 2, halfZ: 0.47 }
}
