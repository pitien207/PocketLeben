// Friends, private messages and the world chat channel (1.10).
// HTTP routes for lists and history; live messages over the same WebSocket as multiplayer.
import { emptySocial, pairKey } from './store.mjs'

/** Messages kept for the world channel (memory only: it's a live channel). */
const WORLD_KEEP = 60
const MAX_TEXT = 200
/** Seconds between messages (per account). */
const WORLD_GAP = 2000
const DM_GAP = 600
const MAX_FRIENDS = 200

// A small word filter (vi / en / de). Not perfect, keeps the public channel friendly.
const BAD = ['địt', 'đụ', 'lồn', 'buồi', 'cặc', 'đéo', 'đĩ', 'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'faggot', 'arschloch', 'fotze', 'hurensohn', 'scheiße', 'wichser']
const BAD_RE = new RegExp(BAD.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'giu')

// Control characters, zero-width and bidi marks, line/paragraph separators.
const CONTROL = new RegExp('[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]', 'g')

/** Clean user text: no control characters, single spaces, length limit, filtered words. */
export function cleanText(raw) {
  if (typeof raw !== 'string') return ''
  return raw
    .normalize('NFC')
    .replace(CONTROL, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT)
    .replace(BAD_RE, (m) => '*'.repeat(m.length))
}

/**
 * @param {{ store: import('./store.mjs').Store, auth: (h: string) => Promise<string|null>, keyOf: (n: string) => string,
 *   readBody: Function, send: Function, clientOf: (user: string) => any, broadcastAll: (msg: object) => void }} deps
 */
export function createSocial({ store, auth, keyOf, readBody, send, clientOf, broadcastAll }) {
  const world = []
  const lastWorld = new Map()
  const lastDm = new Map()
  const nameCache = new Map()

  const nameOf = async (user) => {
    if (nameCache.has(user)) return nameCache.get(user)
    const u = await store.getUser(user)
    const n = u?.name ?? user
    nameCache.set(user, n)
    return n
  }
  const push = (user, msg) => {
    const c = clientOf(user)
    if (c?.ws.readyState === 1) c.ws.send(JSON.stringify(msg))
  }
  const describe = async (keys) => Promise.all(keys.map(async (k) => ({ key: k, name: await nameOf(k), online: !!clientOf(k) })))

  /** Both sides of a friendship change at once. */
  async function update(a, b, change) {
    const [sa, sb] = await Promise.all([store.getSocial(a), store.getSocial(b)])
    change(sa, sb)
    await Promise.all([store.setSocial(a, sa), store.setSocial(b, sb)])
  }
  const without = (list, k) => list.filter((x) => x !== k)

  const routes = {
    async 'GET /api/social'(req, res) {
      const user = await auth(req.headers.authorization)
      if (!user) return send(res, 401, { error: 'auth' })
      const s = await store.getSocial(user)
      send(res, 200, {
        friends: await describe(s.friends),
        incoming: await describe(s.incoming),
        outgoing: await describe(s.outgoing),
        blocked: await describe(s.blocked),
      })
    },
    async 'POST /api/friends/request'(req, res) {
      const user = await auth(req.headers.authorization)
      if (!user) return send(res, 401, { error: 'auth' })
      const { name } = await readBody(req)
      const other = typeof name === 'string' ? keyOf(name) : ''
      if (!other || !(await store.getUser(other))) return send(res, 404, { error: 'notFound' })
      if (other === user) return send(res, 400, { error: 'self' })
      const mine = await store.getSocial(user)
      if (mine.friends.includes(other)) return send(res, 409, { error: 'already' })
      if (mine.friends.length >= MAX_FRIENDS) return send(res, 409, { error: 'tooMany' })
      const theirs = await store.getSocial(other)
      if (theirs.blocked.includes(user)) return send(res, 200, { status: 'sent' }) // silently
      if (mine.incoming.includes(other)) {
        // They already asked me: that's a yes.
        await update(user, other, (a, b) => {
          a.incoming = without(a.incoming, other)
          b.outgoing = without(b.outgoing, user)
          a.friends = [...new Set([...a.friends, other])]
          b.friends = [...new Set([...b.friends, user])]
        })
        push(other, { t: 'social', kind: 'accepted', name: await nameOf(user) })
        return send(res, 200, { status: 'friends' })
      }
      await update(user, other, (a, b) => {
        a.outgoing = [...new Set([...a.outgoing, other])]
        b.incoming = [...new Set([...b.incoming, user])]
        a.blocked = without(a.blocked, other)
      })
      push(other, { t: 'social', kind: 'request', name: await nameOf(user) })
      send(res, 200, { status: 'sent' })
    },
    async 'POST /api/friends/accept'(req, res) {
      const user = await auth(req.headers.authorization)
      if (!user) return send(res, 401, { error: 'auth' })
      const { key } = await readBody(req)
      const mine = await store.getSocial(user)
      if (typeof key !== 'string' || !mine.incoming.includes(key)) return send(res, 404, { error: 'notFound' })
      await update(user, key, (a, b) => {
        a.incoming = without(a.incoming, key)
        b.outgoing = without(b.outgoing, user)
        a.friends = [...new Set([...a.friends, key])]
        b.friends = [...new Set([...b.friends, user])]
      })
      push(key, { t: 'social', kind: 'accepted', name: await nameOf(user) })
      send(res, 200, { status: 'friends' })
    },
    /** Decline a request, cancel mine, or end a friendship. */
    async 'POST /api/friends/remove'(req, res) {
      const user = await auth(req.headers.authorization)
      if (!user) return send(res, 401, { error: 'auth' })
      const { key } = await readBody(req)
      if (typeof key !== 'string') return send(res, 400, { error: 'bad' })
      await update(user, key, (a, b) => {
        for (const l of ['friends', 'incoming', 'outgoing']) {
          a[l] = without(a[l], key)
          b[l] = without(b[l], user)
        }
      })
      push(key, { t: 'social', kind: 'changed' })
      send(res, 200, {})
    },
    /** Block / unblock: no messages, no requests, not a friend any more. */
    async 'POST /api/block'(req, res) {
      const user = await auth(req.headers.authorization)
      if (!user) return send(res, 401, { error: 'auth' })
      const { key, block } = await readBody(req)
      if (typeof key !== 'string' || key === user || !(await store.getUser(key))) return send(res, 404, { error: 'notFound' })
      await update(user, key, (a, b) => {
        if (block === false) {
          a.blocked = without(a.blocked, key)
          return
        }
        a.blocked = [...new Set([...a.blocked, key])]
        for (const l of ['friends', 'incoming', 'outgoing']) {
          a[l] = without(a[l], key)
          b[l] = without(b[l], user)
        }
      })
      push(key, { t: 'social', kind: 'changed' })
      send(res, 200, {})
    },
    async 'GET /api/dm'(req, res) {
      const user = await auth(req.headers.authorization)
      if (!user) return send(res, 401, { error: 'auth' })
      const other = new URL(req.url, 'http://x').searchParams.get('with') ?? ''
      const mine = await store.getSocial(user)
      if (!mine.friends.includes(other)) return send(res, 403, { error: 'notFriends' })
      send(res, 200, { msgs: await store.getDms(pairKey(user, other)) })
    },
    async 'GET /api/chat/world'(_req, res) {
      send(res, 200, { msgs: world })
    },
  }

  /** WebSocket messages from a signed-in client `c` ({ user, name, id, ws }). */
  async function onMessage(c, msg) {
    const now = Date.now()
    if (msg.t === 'chat') {
      if (now - (lastWorld.get(c.user) ?? 0) < WORLD_GAP) return c.ws.send(JSON.stringify({ t: 'chatSlow' }))
      const text = cleanText(msg.text)
      if (!text) return
      lastWorld.set(c.user, now)
      const m = { key: c.user, name: c.name, text, at: now, id: c.id }
      world.push(m)
      if (world.length > WORLD_KEEP) world.shift()
      broadcastAll({ t: 'chat', ...m })
      return true
    }
    if (msg.t === 'dm') {
      if (now - (lastDm.get(c.user) ?? 0) < DM_GAP) return c.ws.send(JSON.stringify({ t: 'chatSlow' }))
      const to = typeof msg.to === 'string' ? msg.to : ''
      const text = cleanText(msg.text)
      if (!text || !to) return
      const mine = await store.getSocial(c.user)
      if (!mine.friends.includes(to)) return c.ws.send(JSON.stringify({ t: 'dmError', to, error: 'notFriends' }))
      lastDm.set(c.user, now)
      const dm = { from: c.user, text, at: now }
      await store.addDm(pairKey(c.user, to), dm)
      const out = { t: 'dm', with: to, from: c.user, name: c.name, text, at: now }
      c.ws.send(JSON.stringify(out))
      push(to, { ...out, with: c.user })
      return true
    }
    return false
  }

  /** Tell friends someone came online / went offline. */
  async function presence(user, online) {
    const s = await store.getSocial(user).catch(() => emptySocial())
    for (const f of s.friends) push(f, { t: 'presence', key: user, online })
  }

  return { routes, onMessage, presence }
}
