import { create } from 'zustand'
import type { Outfit } from '../../../data/npcs'
import type { PickleEngine } from './engine'

/**
 * 1.39 The running pickleball match, shared between the DOM controls (Pickleball.tsx, which steps the engine) and the
 * 3D view on the real court (PickleMatchView.tsx, mounted in Game).
 */
export interface PickleSession {
  engine: PickleEngine
  me: Outfit
  them: Outfit
  themName: string
  /** The opponent's connection id (online): their normal remote model is hidden meanwhile. */
  themId: number | null
}

export const usePickleSession = create<{ session: PickleSession | null }>()(() => ({ session: null }))

/** Remote players drawn by the match view instead of RemotePlayers. */
export const matchHiddenRemotes = new Set<number>()
