import { create } from 'zustand'
import { pushToast, type ToastTone } from '../store/toastStore'
import { onNetMessage, sendNet } from './client'

/**
 * 1.39 Pickleball 1v1 lobby (server/pickleball.mjs): rooms, join requests, invitations, and the match channel.
 * The lobby window is ui/PickleLobby.tsx, invitations / requests pop up anywhere (ui/PickleInvites.tsx), the match is
 * the mini-game `pickleball` (game/minigames/pickleball/).
 */

export type PbRole = 'host' | 'guest'

export interface PbRoomInfo {
  id: number
  host: string
  hostId: number
  guest: string | null
  state: 'open' | 'playing'
}

export interface PbMyRoom {
  id: number
  host: { id: number; name: string }
  guest: { id: number; name: string } | null
  state: 'open' | 'playing'
  asks: { id: number; name: string }[]
}

export interface PbMatch {
  room: number
  match: number
  role: PbRole
  opp: { id: number; name: string }
  first: PbRole
}

export interface PbInvite {
  room: number
  id: number
  name: string
  at: number
}

/** In-match message (engine.ts `Msg`). */
export type PbData = { k: string; [key: string]: unknown }

interface PickleState {
  rooms: PbRoomInfo[]
  room: PbMyRoom | null
  /** Rooms I asked to join (waiting for the host). */
  asked: number[]
  /** Invitations to me, newest last. */
  invites: PbInvite[]
  /** A match that just started (the lobby hands it to the mini-game). */
  match: PbMatch | null
  /** Players I invited (name → time), to show "đã mời". */
  invited: Record<string, number>
  set: (patch: Partial<Omit<PickleState, 'set'>>) => void
}

export const usePickle = create<PickleState>()((set) => ({
  rooms: [],
  room: null,
  asked: [],
  invites: [],
  match: null,
  invited: {},
  set: (patch) => set(patch),
}))

const S = () => usePickle.getState()
const note = (text: string, tone: ToastTone = 'info') => pushToast('toast.event', tone, { text })

const ERRORS: Record<string, string> = {
  full: 'Sân đang quá đông phòng, thử lại sau nhé.',
  offline: 'Người đó không còn online.',
  busy: 'Phòng của bạn đã đủ người hoặc đang đấu.',
  gone: 'Phòng đó không còn chờ nữa.',
}

/** Listeners for in-match data (the engine of the running match). */
const matchListeners = new Set<(d: PbData) => void>()
export function onMatchData(fn: (d: PbData) => void) {
  matchListeners.add(fn)
  return () => {
    matchListeners.delete(fn)
  }
}

/** Called by the lobby UI when a match starts (it opens the mini-game). */
let onStart: ((m: PbMatch) => void) | null = null
export function setMatchStarter(fn: ((m: PbMatch) => void) | null) {
  onStart = fn
}

let started = false
/** Once from boot. */
export function startPickleNet() {
  if (started) return
  started = true
  onNetMessage((msg) => {
    switch (msg.t) {
      case 'welcome':
        // A new connection: ids changed, rooms from before are gone.
        S().set({ room: null, asked: [], invites: [], rooms: [] })
        if (watching) sendNet({ t: 'pb.watch', on: true })
        break
      case 'pb.rooms':
        S().set({ rooms: msg.l as PbRoomInfo[] })
        break
      case 'pb.room': {
        const room = msg.room as PbMyRoom | null
        const prev = S().room
        S().set({ room, asked: room ? [] : S().asked })
        if (room && prev && !prev.guest && room.guest && room.host.id !== room.guest.id) note(`${room.guest.name} đã vào phòng của bạn!`, 'good')
        break
      }
      case 'pb.asked':
        // Someone wants to join my room: shown by PickleInvites / the lobby (from `room.asks`).
        break
      case 'pb.declined': {
        const room = msg.room as number
        S().set({ asked: S().asked.filter((r) => r !== room) })
        note(`${String(msg.name ?? '')} không nhận lời lần này.`)
        break
      }
      case 'pb.invited': {
        const inv: PbInvite = { room: msg.room as number, id: msg.id as number, name: String(msg.name), at: Date.now() }
        S().set({ invites: [...S().invites.filter((i) => i.room !== inv.room), inv].slice(-3) })
        break
      }
      case 'pb.inviteSent':
        S().set({ invited: { ...S().invited, [String(msg.name)]: Date.now() } })
        note(`Đã gửi lời mời tới ${String(msg.name)}.`)
        break
      case 'pb.error':
        note(ERRORS[String(msg.e)] ?? String(msg.e), 'bad')
        break
      case 'pb.start': {
        const m: PbMatch = { room: msg.room as number, match: msg.match as number, role: msg.role as PbRole, opp: msg.opp as PbMatch['opp'], first: msg.first as PbRole }
        S().set({ match: m, invites: [] })
        onStart?.(m)
        break
      }
      case 'pb.msg': {
        const m = S().match
        if (!m || msg.m !== m.match) break
        for (const fn of matchListeners) fn(msg.d as PbData)
        break
      }
      case 'pb.gone':
        for (const fn of matchListeners) fn({ k: 'gone', name: msg.name, reason: msg.reason })
        break
    }
  })
}

let watching = false
/** The lobby window is open: get the room list live. */
export function watchLobby(on: boolean) {
  watching = on
  sendNet({ t: 'pb.watch', on })
}
export const createRoom = () => sendNet({ t: 'pb.create' })
export const leaveRoom = () => sendNet({ t: 'pb.leave' })
export function askJoin(room: number) {
  if (sendNet({ t: 'pb.ask', room })) S().set({ asked: [...S().asked.filter((r) => r !== room), room] })
}
export const answerAsk = (id: number, ok: boolean) => sendNet({ t: 'pb.answer', id, ok })
export const inviteById = (to: number) => sendNet({ t: 'pb.invite', to })
export const inviteByUser = (user: string) => sendNet({ t: 'pb.invite', user })
export function replyInvite(room: number, ok: boolean) {
  S().set({ invites: S().invites.filter((i) => i.room !== room) })
  return sendNet({ t: 'pb.reply', room, ok })
}
export const startMatch = () => sendNet({ t: 'pb.start' })
export const sendMatch = (d: PbData) => sendNet({ t: 'pb.msg', d })
export function endMatch() {
  const m = S().match
  if (m) sendNet({ t: 'pb.over', match: m.match })
  S().set({ match: null })
}
