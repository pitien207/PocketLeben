// 1.39 Pickleball 1v1 (Sân pickleball Hàng Khay): lobby rooms, join requests, invitations, and a relay for the match.
// The match itself runs on the two clients (src/game/minigames/pickleball/engine.ts): whoever the ball flies toward
// judges it, so the server only forwards small messages between the two players of a room. Rooms live in memory.

const ROOM_LIMIT = 40
const MSG_MAX = 600

/**
 * @param {{ clients: Map<number, any> }} deps
 */
export function createPickleball({ clients }) {
  /** @type {Map<number, { id: number, host: number, guest: number | null, state: 'open' | 'playing', asks: Map<number, string>, invites: Set<number>, match: number }>} */
  const rooms = new Map()
  /** Clients with the lobby window open (they get the room list live). */
  const watchers = new Set()
  /** Client id → room id. */
  const roomOf = new Map()
  let nextRoom = 1

  const sendTo = (id, msg) => {
    const c = clients.get(id)
    if (c && c.ws.readyState === 1) c.ws.send(JSON.stringify(msg))
  }
  const nameOf = (id) => clients.get(id)?.name ?? '?'

  const listing = () =>
    [...rooms.values()].map((r) => ({ id: r.id, host: nameOf(r.host), hostId: r.host, guest: r.guest === null ? null : nameOf(r.guest), state: r.state }))

  /** The room as its members see it. */
  const view = (r) => ({
    id: r.id,
    host: { id: r.host, name: nameOf(r.host) },
    guest: r.guest === null ? null : { id: r.guest, name: nameOf(r.guest) },
    state: r.state,
    asks: [...r.asks].map(([id, name]) => ({ id, name })),
  })

  function changed(r) {
    if (r) for (const id of [r.host, r.guest]) if (id !== null) sendTo(id, { t: 'pb.room', room: view(r) })
    const text = JSON.stringify({ t: 'pb.rooms', l: listing() })
    for (const id of watchers) {
      const c = clients.get(id)
      if (c && c.ws.readyState === 1) c.ws.send(text)
    }
  }

  function leave(c, reason = 'left') {
    const rid = roomOf.get(c.id)
    if (rid === undefined) return
    roomOf.delete(c.id)
    const r = rooms.get(rid)
    if (!r) return
    const other = r.host === c.id ? r.guest : r.host
    if (r.state === 'playing' && other !== null) sendTo(other, { t: 'pb.gone', name: c.name, reason })
    if (r.host === c.id) {
      // The host leaves: the guest (if any) takes the room over.
      if (r.guest !== null) {
        r.host = r.guest
        r.guest = null
        r.state = 'open'
        r.asks.clear()
        r.invites.clear()
        changed(r)
      } else {
        for (const id of r.asks.keys()) sendTo(id, { t: 'pb.declined', room: r.id, name: c.name })
        rooms.delete(rid)
        changed(null)
      }
    } else {
      r.guest = null
      r.state = 'open'
      changed(r)
    }
    sendTo(c.id, { t: 'pb.room', room: null })
  }

  function create(c) {
    if (roomOf.has(c.id)) return rooms.get(roomOf.get(c.id))
    if (rooms.size >= ROOM_LIMIT) {
      sendTo(c.id, { t: 'pb.error', e: 'full' })
      return null
    }
    const r = { id: nextRoom++, host: c.id, guest: null, state: 'open', asks: new Map(), invites: new Set(), match: 0 }
    rooms.set(r.id, r)
    roomOf.set(c.id, r.id)
    changed(r)
    return r
  }

  /** Put `id` into room `r` as the guest (leaving any other room first). */
  function seat(r, id) {
    const c = clients.get(id)
    if (!c || r.guest !== null || r.host === id) return false
    if (roomOf.has(id)) leave(c)
    // leave() may have changed this room (it could have been the one we were in)
    if (!rooms.has(r.id) || r.guest !== null || r.host === id) return false
    r.guest = id
    roomOf.set(id, r.id)
    for (const [askId] of r.asks) if (askId !== id) sendTo(askId, { t: 'pb.declined', room: r.id, name: nameOf(r.host) })
    r.asks.clear()
    r.invites.delete(id)
    changed(r)
    return true
  }

  /** @returns {boolean} true when the message was a pickleball one */
  function onMessage(c, msg) {
    if (typeof msg.t !== 'string' || !msg.t.startsWith('pb.')) return false
    const now = Date.now()
    const myRoom = () => rooms.get(roomOf.get(c.id))
    switch (msg.t) {
      case 'pb.watch':
        if (msg.on) {
          watchers.add(c.id)
          sendTo(c.id, { t: 'pb.rooms', l: listing() })
          const r = myRoom()
          sendTo(c.id, { t: 'pb.room', room: r ? view(r) : null })
        } else watchers.delete(c.id)
        break
      case 'pb.create':
        create(c)
        break
      case 'pb.leave':
        leave(c)
        break
      case 'pb.ask': {
        // Ask the host of an open room to let me in.
        if ((c.pbAskAt ?? 0) > now - 800) break
        c.pbAskAt = now
        const r = rooms.get(Number(msg.room))
        if (!r || r.state !== 'open' || r.guest !== null || r.host === c.id || r.asks.has(c.id)) break
        r.asks.set(c.id, c.name)
        sendTo(r.host, { t: 'pb.asked', room: r.id, id: c.id, name: c.name })
        changed(r)
        break
      }
      case 'pb.answer': {
        // The host lets someone in (or not).
        const r = myRoom()
        const id = Number(msg.id)
        if (!r || r.host !== c.id || !r.asks.has(id)) break
        if (msg.ok && r.guest === null && r.state === 'open') seat(r, id)
        else {
          r.asks.delete(id)
          sendTo(id, { t: 'pb.declined', room: r.id, name: c.name })
          changed(r)
        }
        break
      }
      case 'pb.invite': {
        // Invite a player (by connection id, or by account key for a friend elsewhere). Makes a room if needed.
        if ((c.pbInviteAt ?? 0) > now - 800) break
        c.pbInviteAt = now
        let target = null
        if (typeof msg.to === 'number') target = clients.get(msg.to) ?? null
        else if (typeof msg.user === 'string') for (const o of clients.values()) if (o.user === msg.user) target = o
        if (!target || target.id === c.id) {
          sendTo(c.id, { t: 'pb.error', e: 'offline' })
          break
        }
        const r = myRoom() ?? create(c)
        if (!r || r.host !== c.id || r.guest !== null || r.state !== 'open') {
          sendTo(c.id, { t: 'pb.error', e: 'busy' })
          break
        }
        r.invites.add(target.id)
        sendTo(target.id, { t: 'pb.invited', room: r.id, id: c.id, name: c.name })
        sendTo(c.id, { t: 'pb.inviteSent', name: target.name })
        break
      }
      case 'pb.reply': {
        // An invited player answers.
        const r = rooms.get(Number(msg.room))
        if (!r || !r.invites.has(c.id)) {
          sendTo(c.id, { t: 'pb.error', e: 'gone' })
          break
        }
        if (msg.ok && r.state === 'open' && r.guest === null) {
          if (!seat(r, c.id)) sendTo(c.id, { t: 'pb.error', e: 'gone' })
        } else {
          r.invites.delete(c.id)
          sendTo(r.host, { t: 'pb.declined', room: r.id, name: c.name })
          if (msg.ok) sendTo(c.id, { t: 'pb.error', e: 'gone' })
        }
        break
      }
      case 'pb.start': {
        const r = myRoom()
        if (!r || r.host !== c.id || r.guest === null || r.state !== 'open') break
        r.state = 'playing'
        r.match++
        const first = Math.random() < 0.5 ? 'host' : 'guest'
        sendTo(r.host, { t: 'pb.start', room: r.id, match: r.match, role: 'host', opp: { id: r.guest, name: nameOf(r.guest) }, first })
        sendTo(r.guest, { t: 'pb.start', room: r.id, match: r.match, role: 'guest', opp: { id: r.host, name: nameOf(r.host) }, first })
        changed(r)
        break
      }
      case 'pb.msg': {
        // In-match data between the two players (positions, hits, points). Bounded and rate-limited.
        const r = myRoom()
        if (!r || r.state !== 'playing' || r.guest === null) break
        const win = Math.floor(now / 1000)
        if (c.pbWin !== win) {
          c.pbWin = win
          c.pbCount = 0
        }
        if (++c.pbCount > 60) break
        const d = msg.d
        if (!d || typeof d !== 'object' || typeof d.k !== 'string') break
        const text = JSON.stringify(d)
        if (text.length > MSG_MAX) break
        sendTo(r.host === c.id ? r.guest : r.host, { t: 'pb.msg', m: r.match, d })
        break
      }
      case 'pb.over': {
        // The match ended (either player may report it): back to the room for a rematch.
        const r = myRoom()
        if (!r || r.state !== 'playing' || Number(msg.match) !== r.match) break
        r.state = 'open'
        changed(r)
        break
      }
    }
    return true
  }

  function onClose(c) {
    watchers.delete(c.id)
    leave(c, 'disconnected')
    for (const r of rooms.values()) {
      r.invites.delete(c.id)
      if (r.asks.delete(c.id)) changed(r)
    }
  }

  return { onMessage, onClose, stats: () => ({ rooms: rooms.size, watchers: watchers.size }) }
}
