import { create } from 'zustand'

export interface Bottle {
  id: number
  /** Index into PFAND_SPOTS (server/pfandSpots.mjs). */
  spot: number
  x: number
  z: number
  /** 0 = green glass, 1 = brown glass, 2 = plastic. */
  kind: number
  /** 1.44 the rare golden Pfand bottle. */
  gold: boolean
  /** Local (offline) bottles: disappear at this time (performance.now() ms). Shared ones: the server decides. */
  until?: number
}

interface PfandState {
  /** 'shared' = the server's bottles of my München room (everyone sees the same); 'local' = my own (offline). */
  mode: 'local' | 'shared'
  /** The bottles lying around München right now (transient; carried counts are saved flags). */
  bottles: Bottle[]
  /** Bottles I reached and asked the server for (hidden until it answers). */
  pending: number[]
  set: (p: Partial<Omit<PfandState, 'set'>>) => void
}

export const usePfand = create<PfandState>()((set) => ({
  mode: 'local',
  bottles: [],
  pending: [],
  set: (p) => set(p),
}))
