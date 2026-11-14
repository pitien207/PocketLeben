import type { Outfit } from '../../data/npcs'
import type { SceneId } from '../../store/worldStore'
import type { MotionState } from '../components/ChibiModel'

/**
 * Multiplayer groundwork: everything another client needs to draw this player is plain,
 * serialisable data — where (scene, x, z, yaw), how they move (MotionState: walk speed,
 * sit / ride / sip poses) and what they wear (Outfit). A remote player is just a
 * ChibiModel fed with a received snapshot; no networking exists yet.
 */
export interface PlayerSnapshot {
  scene: SceneId
  x: number
  z: number
  yaw: number
  motion: MotionState
  outfit: Outfit
}

/** Written by the Player every frame (cheap: no allocation). */
export const localSnapshot: { yaw: number; motion: MotionState | null } = { yaw: 0, motion: null }
