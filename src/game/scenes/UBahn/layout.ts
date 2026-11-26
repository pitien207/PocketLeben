/**
 * 1.48 A München U-Bahn station (scene `ubahn`): one island platform between two tracks, Gleis 1 on the −z side (trains
 * drive toward +x, south), Gleis 2 on the +z side (toward −x, north). Stairs / escalators up to the exit in the middle of
 * the platform. The same hall stands for every station (data/transit.ts U_STATIONS): names and wall colour follow flag
 * `ubahn.at`.
 */
export const U = {
  /** Half length of the hall along x (tunnel mouths at ±halfX). */
  halfX: 32,
  /** Platform edge (|z|) and the track centres (|z|). */
  edge: 3.6,
  track: 5.25,
  /** Track bed below the platform floor. */
  bed: -1.15,
  /** Side walls (|z|) and hall height. */
  wall: 7.5,
  height: 4.6,
  /** Stair / escalator block in the middle of the platform. */
  stairs: { x0: -4, x1: 4, z: 1.35 },
  /** Train: car length (model 2.6 × scale), scale, number of cars. */
  car: 2.6 * 2.2,
  carScale: 2.2,
  cars: 5,
  /** Pillars down the middle of the platform. */
  pillars: [-24, -16, -9, 9, 16, 24],
}

/** Spawn points (registry.ts): at the foot of the stairs, and beside each track (getting off a train). */
export const U_SPAWNS = {
  default: { x: -5.6, z: 0, yaw: 0 },
  gleis1: { x: -9, z: -2.4, yaw: 0 },
  gleis2: { x: 9, z: 2.4, yaw: 0 },
}
