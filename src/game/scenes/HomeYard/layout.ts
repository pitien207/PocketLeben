/**
 * 1.42 The back yard (scene homeYard) in local metres: x across (west −, east +), the house's back wall at
 * z = `house` (north), the low front wall at z = `front` (the camera side).
 */
const W = 14
const coop = { x0: -6.6, x1: -4.0, z0: -4.8, z1: -3.0 }
export const YARD = {
  w: W,
  house: -5,
  front: 5,
  coop,
  /** The fenced run in front of the coop; the gate in its east fence at z = gate. */
  run: { x0: -6.7, x1: -2.6, z0: coop.z1, z1: 1.6, gate: -0.6, feeder: { x: -3.9, z: -0.4 }, water: { x: -5.8, z: 0.9 } },
  /** Where the hens may walk (inside the run). */
  roam: { x0: -6.4, x1: -2.9, z0: -2.7, z1: 1.3 },
  /** Raised beds (centre x, width, z0…z1): rau muống, cải, hành. */
  beds: [
    { x: 3.0, w: 1.0, z0: -3.2, z1: 1.4 },
    { x: 4.4, w: 1.0, z0: -3.2, z1: 1.4 },
    { x: 5.8, w: 1.0, z0: -3.2, z1: 1.4 },
  ],
  jars: [
    [6.3, -4.3],
    [5.3, -4.4],
  ] as [number, number][],
  bananas: [[6.1, 3.9, 0.4]] as [number, number, number][],
  tree: { x: 1.7, z: -3.6 },
  line: { x0: -1.9, x1: 1.9, z: 0.8 },
}
