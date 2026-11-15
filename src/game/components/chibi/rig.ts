/**
 * The chibi skeleton (shared by the geometry builder and the animation in ChibiModel).
 * Model space, metres; the character faces +Z. Head ≈ half the height (plan §2).
 */

export const HEAD_Y = 1.08
/** Head sphere radius (the face texture is painted on it). */
export const HEAD_R = 0.36
export const EYE_Y = -0.02
export const TORSO_Y = 0.52
export const HIP_Y = 0.3
export const HIP_X = 0.1
export const SHOULDER_Y = 0.66
export const SHOULDER_X = 0.24
export const THIGH = 0.12
export const SHIN = 0.12
export const UPPER = 0.17
export const FORE = 0.16
export const STOOL_Y = 0.33

/** Bones. Left = +X. */
export const B = { root: 0, torso: 1, head: 2, eyes: 3, thighL: 4, shinL: 5, thighR: 6, shinR: 7, armL: 8, foreL: 9, armR: 10, foreR: 11, glass: 12, fan: 13 } as const
export const PARENT = [-1, 0, 0, 2, 0, 4, 0, 6, 0, 8, 0, 10, 11, 11]
/** Joint positions in the bind pose (model space). */
export const BIND: [number, number, number][] = [
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
