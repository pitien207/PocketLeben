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
  /** 1.35: the own vehicle they ride (data/vehicles.ts id), if any. */
  veh?: string | null
}

/** Written by the Player every frame (cheap: no allocation). */
/** `override` (1.39 pickleball): while a match runs, others see my match figure on the court instead of my body. */
export const localSnapshot: { yaw: number; motion: MotionState | null; veh: string | null; override: { x: number; z: number; yaw: number; motion: MotionState } | null } = { yaw: 0, motion: null, veh: null, override: null }
