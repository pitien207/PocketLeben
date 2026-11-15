import { create } from 'zustand'

export type NetStatus = 'off' | 'connecting' | 'online' | 'offline' | 'replaced'

export interface RemoteInfo {
  id: number
  name: string
}

interface NetState {
  status: NetStatus
  /** Display name of the signed-in account. */
  name: string | null
  /** My account key (lower-case name). */
  key: string | null
  /** World-chat lines shown above heads, by player id (mine: id -1). */
  chats: Record<number, { text: string; key: number }>
  /** Players online on the whole server. */
  online: number
  /** Other players in my room (positions live in net/client.ts, not in React state). */
  roster: RemoteInfo[]
  /** Last emote I sent (shown above my own head). */
  myEmote: { e: EmoteId; key: number } | null
  /** Emotes received, by player id. */
  emotes: Record<number, { e: EmoteId; key: number }>
  set: (patch: Partial<Omit<NetState, 'set'>>) => void
}

export type EmoteId = 'wave' | 'heart' | 'laugh' | 'wow' | 'sad' | 'dance' | 'hello' | 'thanks' | 'luck' | 'tschuess' | 'follow' | 'yes'

/** Multiplayer connection state (net/client.ts writes it, the HUD and remote players read it). */
export const useNet = create<NetState>()((set) => ({
  status: 'off',
  name: null,
  key: null,
  chats: {},
  online: 0,
  roster: [],
  myEmote: null,
  emotes: {},
  set: (patch) => set(patch),
}))
