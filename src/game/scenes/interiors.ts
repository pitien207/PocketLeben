/**
 * Positions inside the Hà Nội interiors, shared by the scenes and by game systems
 * (lessons seat you at a desk, waking up puts you by the bed). No React or three here,
 * so systems can import it without pulling scene code into the main bundle.
 */

export interface Seat {
  x: number
  z: number
  /** Facing direction while seated (0 = +Z, π = toward the back wall). */
  yaw: number
  /** Seat height. */
  sitY: number
}

/** Desk grid: a desk centre plus the bench behind it (students face the board at -Z). */
export interface Desk {
  x: number
  z: number
}

export const BENCH_OFFSET = 0.55

export const CLASSROOM = {
  w: 11,
  d: 8,
  h: 3.2,
  /** Two-person desks in three rows. */
  desks: [
    { x: -2.8, z: -1.2 },
    { x: 0, z: -1.2 },
    { x: 2.8, z: -1.2 },
    { x: -2.8, z: 0.4 },
    { x: 0, z: 0.4 },
    { x: 2.8, z: 0.4 },
    { x: -2.8, z: 2.0 },
    { x: 0, z: 2.0 },
  ] as Desk[],
  /** The player's place: right half of the middle desk in row 2. */
  seat: { x: 0.45, z: 0.4 + BENCH_OFFSET, yaw: Math.PI, sitY: 0.42 } as Seat,
  teacher: { x: -1.5, z: -3.0 },
  exit: { x: 4.6, z: 3.3 },
}

export const EXAM_HALL = {
  w: 11,
  d: 8,
  h: 3.2,
  /** Single exam desks, 3 × 3. */
  desks: [-3, 0, 3].flatMap((x) => [-1.5, 0.3, 2.1].map((z) => ({ x, z }))) as Desk[],
  seat: { x: 0, z: 0.3 + 0.5, yaw: Math.PI, sitY: 0.44 } as Seat,
  proctor: { x: -3.9, z: -3.0 },
  exit: { x: 4.6, z: 3.3 },
}

/** Universität Lindenberg: lecture hall (long desk rows) + library corner + student office. */
export const UNIVERSITY = {
  w: 14,
  d: 10,
  h: 3.6,
  /** Long desks: centre z of each row (they span x ∈ [-3.2, 3.2]). */
  rows: [-1.6, 0.2, 2.0],
  seat: { x: 0.9, z: 0.2 + 0.55, yaw: Math.PI, sitY: 0.58 } as Seat,
  professor: { x: 0, z: -3.9 },
  office: { x: 5.2, z: -3.4 },
  library: { x: -5.2, z: 1.2 },
  exit: { x: 5.6, z: 4.2 },
}

export const HOME_ROOM = {
  w: 9,
  d: 7,
  h: 3,
  bed: { x: -3.0, z: -2.0 },
  desk: { x: 2.6, z: -3.05 },
  /** Studying at the desk by the window. */
  deskSeat: { x: 2.6, z: -2.35, yaw: Math.PI, sitY: 0.46 } as Seat,
  exit: { x: 3.4, z: 3.0 },
}
