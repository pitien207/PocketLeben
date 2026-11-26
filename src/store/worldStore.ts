import { create } from 'zustand'
import type { ShopSceneId } from '../data/shopRoomIds'

export type SceneId = 'vietnam' | 'home' | 'homeYard' | 'maiOffice' | 'classroom' | 'examHall' | 'embassy' | 'airport' | 'plane' | 'transit' | 'germany' | 'buergeramt' | 'wg' | 'careHome' | 'university' | 'ubahn' | ShopSceneId

interface WorldState {
  scene: SceneId
  setScene: (scene: SceneId) => void
}

/** Which scene (location) the player is in. Saved by game/systems/save.ts. */
export const useWorld = create<WorldState>()((set) => ({
  scene: 'vietnam',
  setScene: (scene) => set({ scene }),
}))
