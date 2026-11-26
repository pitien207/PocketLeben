// 1.44 Pfand bottles in München that every player of a room sees (scene `germany`, rooms germany, germany#2 …).
// The server owns them: it spawns one now and then at a random spot of PFAND_SPOTS (shared with the client), lets
// unpicked ones disappear after a while, and decides who got a bottle when two players grab it at the same time.
// Clients announce the cap 'pfand' in 'auth'; others never get these messages. Offline players spawn their own
// (src/game/systems/pfandWorld.ts, same rules, gold 1 in 5 instead of 1 in 1000).
//
// Messages server → client:  {t:'pfand', l:[[id, spot, kind, gold]]}   full list (after joining the room)
//                             {t:'pfand+', b:[id, spot, kind, gold]}    a new bottle
//                             {t:'pfand-', id}                           gone (picked by someone / expired)
//                             {t:'pfand.got', id, gold}                  you got it
//                             {t:'pfand.no', id}                         too late / too far
//          client → server:   {t:'pfand.take', id}
import { PFAND_SCENE, PFAND_SPOTS } from './pfandSpots.mjs'

export const PFAND_RULES = {
  /** Never more than this many bottles in one room. */
  max: 10,
  /** Bottles already lying around when a room opens. */
  start: 3,
  /** A new bottle every … ms while there are fewer than `max`. */
  gapMs: [20_000, 45_000],
  /** Unpicked bottles disappear after … ms. */
  lifeMs: [5 * 60_000, 9 * 60_000],
  goldChance: 1 / 1000,
  /** A new bottle never appears closer than this to a player (no popping up under your nose) … */
  playerGap: 9,
  /** … nor next to another bottle. */
  bottleGap: 6,
  /** How far from the bottle the taker may stand (their last snapshot lags a little). */
  takeRadius: 4,
}

const R = PFAND_RULES
const between = ([a, b]) => a + Math.random() * (b - a)
const sceneOf = (room) => room.split('#')[0]

/** @param {{ clients: Map<number, any>, rooms: Map<string, Set<number>>, rules?: Partial<typeof PFAND_RULES> }} deps */
export function createPfand({ clients, rooms, rules = {} }) {
  const cfg = { ...R, ...rules }
  /** room → { bottles: Map<id, {id, spot, kind, gold, until}>, next } */
  const state = new Map()
  let nextId = 1

  const members = (room) => [...(rooms.get(room) ?? [])].map((id) => clients.get(id)).filter(Boolean)
  const wire = (b) => [b.id, b.spot, b.kind, b.gold ? 1 : 0]

  function toRoom(room, msg, except) {
    let text = null
    for (const c of members(room)) {
      if (!c.pfand || c.id === except || c.ws.readyState !== 1) continue
      text ??= JSON.stringify(msg)
      c.ws.send(text)
    }
  }

  /** A free spot away from players and other bottles (null if none fits right now). */
  function freeSpot(room, st) {
    const players = members(room)
      .map((c) => c.snap)
      .filter((s) => s && s.scene === PFAND_SCENE)
    const used = [...st.bottles.values()].map((b) => PFAND_SPOTS[b.spot])
    const ok = []
    PFAND_SPOTS.forEach(([x, z], i) => {
      if (players.some((p) => Math.hypot(p.x - x, p.z - z) < cfg.playerGap)) return
      if (used.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < cfg.bottleGap)) return
      ok.push(i)
    })
    return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null
  }

  function spawn(room, st, now) {
    const spot = freeSpot(room, st)
    if (spot === null) return null
    const b = { id: nextId++, spot, kind: Math.floor(Math.random() * 3), gold: Math.random() < cfg.goldChance, until: now + between(cfg.lifeMs) }
    st.bottles.set(b.id, b)
    return b
  }

  function ensure(room, now) {
    let st = state.get(room)
    if (!st) {
      st = { bottles: new Map(), next: now + between(cfg.gapMs) }
      state.set(room, st)
      for (let i = 0; i < cfg.start; i++) spawn(room, st, now)
    }
    return st
  }

  /** Server tick (1 s): expire, spawn, forget empty rooms. */
  function tick(now = Date.now()) {
    for (const [room, st] of state) {
      if (!rooms.get(room)?.size) {
        state.delete(room)
        continue
      }
      for (const b of st.bottles.values()) {
        if (b.until > now) continue
        st.bottles.delete(b.id)
        toRoom(room, { t: 'pfand-', id: b.id })
      }
      if (st.bottles.size < cfg.max && now >= st.next) {
        st.next = now + between(cfg.gapMs)
        const b = spawn(room, st, now)
        if (b) toRoom(room, { t: 'pfand+', b: wire(b) })
      }
    }
  }
  const timer = setInterval(tick, 1000)
  timer.unref?.()

  return {
    /** After joinRoom: the joiner gets the bottles of the room (the room starts its own list on the first player). */
    onJoin(c, room) {
      if (!c.pfand || sceneOf(room) !== PFAND_SCENE) return
      const st = ensure(room, Date.now())
      c.ws.send(JSON.stringify({ t: 'pfand', l: [...st.bottles.values()].map(wire) }))
    },
    /** @returns {boolean} true when the message was a Pfand message */
    onMessage(c, msg) {
      if (msg.t !== 'pfand.take') return false
      const st = c.room ? state.get(c.room) : undefined
      const b = st?.bottles.get(msg.id)
      const [x, z] = b ? PFAND_SPOTS[b.spot] : [0, 0]
      const near = !!b && c.snap?.scene === PFAND_SCENE && Math.hypot(c.snap.x - x, c.snap.z - z) <= cfg.takeRadius
      if (!b || !near) {
        c.ws.send(JSON.stringify({ t: 'pfand.no', id: msg.id }))
        return true
      }
      st.bottles.delete(b.id)
      c.ws.send(JSON.stringify({ t: 'pfand.got', id: b.id, gold: b.gold ? 1 : 0 }))
      toRoom(c.room, { t: 'pfand-', id: b.id }, c.id)
      return true
    },
    tick,
    state,
    stop: () => clearInterval(timer),
  }
}
