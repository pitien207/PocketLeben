// Visa Hunter server: accounts, cloud saves and multiplayer rooms (docs/MULTIPLAYER_PLAN.md, phase 1).
// Plain Node + `ws`, no build step. Usage: `npm run server` (PORT=8787, DATA_DIR=server/data).
// In production (Docker / Azure Container Apps, see docs/DEPLOY.md) it also serves dist/ so the whole
// game runs from one process, and stores data in Azure Cosmos DB for MongoDB (MONGO_URI, MONGO_DB).
// Rooms live in memory: run exactly ONE instance (Container App max replicas = 1).
import { createServer } from 'node:http'
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { existsSync, statSync, createReadStream } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { WebSocketServer } from 'ws'
import { openStore } from './store.mjs'
import { GOOGLE_CLIENT_ID, verifyGoogleToken } from './google.mjs'
import { createSocial } from './social.mjs'

const scrypt = promisify(scryptCb)
const PORT = Number(process.env.PORT ?? 8787)
const ROOT = resolve(import.meta.dirname, '..')
const DATA_DIR = resolve(process.env.DATA_DIR ?? join(ROOT, 'server', 'data'))
const DIST = join(ROOT, 'dist')
const MAX_SAVE = 512 * 1024
const ROOM_CAP = 25

/** Scenes everyone shares. Homes, exams and interviews stay private (instances). */
const PUBLIC_SCENES = new Set(['vietnam', 'germany', 'classroom', 'buergeramt', 'university', 'airport', 'careHome'])
const ALL_SCENES = new Set([...PUBLIC_SCENES, 'home', 'examHall', 'embassy', 'wg'])
const EMOTES = new Set(['wave', 'heart', 'laugh', 'wow', 'sad', 'dance', 'hello', 'thanks', 'luck', 'tschuess', 'follow', 'yes'])

// ---------------------------------------------------------------------------------------
// Storage (server/store.mjs): DocumentDB / MongoDB in production, JSON files locally.
const store = await openStore({ mongoUri: process.env.MONGO_URI, mongoDb: process.env.MONGO_DB ?? 'visahunter', dataDir: DATA_DIR })

const keyOf = (name) => name.trim().toLowerCase()
const NAME_RE = /^[\p{L}\p{N}_ .-]{3,16}$/u

async function hashPassword(password, salt) {
  return /** @type {Buffer} */ (await scrypt(password, salt, 32)).toString('hex')
}

async function newToken(user) {
  const token = randomBytes(24).toString('base64url')
  await store.createToken(token, user)
  return token
}

/** Pending Google sign-ups (Google account verified, player name not chosen yet). */
const tickets = new Map()
setInterval(() => {
  for (const [k, t] of tickets) if (t.until < Date.now()) tickets.delete(k)
}, 60_000).unref()

const bearer = (header) => /^Bearer (.+)$/.exec(header ?? '')?.[1] ?? null

/** Account key for a bearer token, or null. */
async function auth(header) {
  const token = bearer(header)
  return token ? store.tokenUser(token) : null
}

/** Behind Azure's ingress the socket address is the proxy: use the forwarded client address. */
const clientIp = (req) => (req.headers['x-forwarded-for']?.split(',')[0] ?? req.socket.remoteAddress ?? '').trim()

// ---------------------------------------------------------------------------------------
// HTTP: tiny JSON API + static files.
function send(res, status, body) {
  const text = body === undefined ? '' : JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(text)
}

function readBody(req, limit = 4096) {
  return new Promise((ok, fail) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        fail(new Error('too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => {
      try {
        ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch {
        fail(new Error('bad json'))
      }
    })
    req.on('error', fail)
  })
}

/**
 * Slow down guessing: per address and minute, 10 password attempts and 30 Google sign-ins
 * (Google tokens can't be guessed; the limit only stops floods). AUTH_RATE_LIMIT scales both (tests).
 */
const RATE = Number(process.env.AUTH_RATE_LIMIT ?? 1)
const attempts = new Map()
setInterval(() => attempts.clear(), 10 * 60_000).unref()
function limited(ip, kind = 'password') {
  const key = `${kind}:${ip}`
  const now = Date.now()
  const a = attempts.get(key) ?? { n: 0, at: now }
  if (now - a.at > 60_000) Object.assign(a, { n: 0, at: now })
  a.n++
  attempts.set(key, a)
  return a.n > (kind === 'google' ? 30 : 10) * RATE
}

const routes = {
  async 'POST /api/register'(req, res) {
    if (limited(clientIp(req))) return send(res, 429, { error: 'tooMany' })
    const { name, password } = await readBody(req)
    if (typeof name !== 'string' || !NAME_RE.test(name.trim())) return send(res, 400, { error: 'badName' })
    if (typeof password !== 'string' || password.length < 6 || password.length > 100) return send(res, 400, { error: 'badPassword' })
    const user = keyOf(name)
    const salt = randomBytes(16).toString('hex')
    const account = { name: name.trim(), salt, hash: await hashPassword(password, salt), created: Date.now() }
    if (!(await store.createUser(user, account))) return send(res, 409, { error: 'taken' })
    send(res, 200, { token: await newToken(user), name: account.name })
  },
  async 'POST /api/login'(req, res) {
    if (limited(clientIp(req))) return send(res, 429, { error: 'tooMany' })
    const { name, password } = await readBody(req)
    const account = typeof name === 'string' ? await store.getUser(keyOf(name)) : null
    if (!account || typeof password !== 'string') return send(res, 401, { error: 'wrong' })
    if (!account.hash || !account.salt) return send(res, 401, { error: 'useGoogle' })
    const hash = Buffer.from(await hashPassword(password, account.salt), 'hex')
    if (!timingSafeEqual(hash, Buffer.from(account.hash, 'hex'))) return send(res, 401, { error: 'wrong' })
    send(res, 200, { token: await newToken(keyOf(name)), name: account.name })
  },
  async 'POST /api/logout'(req, res) {
    const token = bearer(req.headers.authorization)
    if (token) await store.deleteToken(token)
    send(res, 200, {})
  },
  async 'GET /api/me'(req, res) {
    const user = await auth(req.headers.authorization)
    const account = user && (await store.getUser(user))
    if (!account) return send(res, 401, { error: 'auth' })
    const save = await store.getSave(user)
    send(res, 200, { name: account.name, savedAt: save?.savedAt ?? null, google: await store.googleOf(user), password: !!account.hash })
  },
  /** Public settings for the client (which sign-in methods exist). */
  async 'GET /api/config'(_req, res) {
    send(res, 200, { google: GOOGLE_CLIENT_ID })
  },
  /**
   * Sign in with Google. Linked → logged in. New Google account → a short-lived ticket; the
   * player then picks a player name (POST /api/google/register).
   */
  async 'POST /api/google'(req, res) {
    if (limited(clientIp(req), 'google')) return send(res, 429, { error: 'tooMany' })
    const { credential } = await readBody(req, 8192)
    const g = await verifyGoogleToken(credential)
    if (!g) return send(res, 401, { error: 'googleInvalid' })
    const user = await store.googleUser(g.sub)
    const account = user && (await store.getUser(user))
    if (account) return send(res, 200, { token: await newToken(user), name: account.name })
    const ticket = randomBytes(18).toString('base64url')
    tickets.set(ticket, { ...g, until: Date.now() + 10 * 60_000 })
    const suggested = (g.name ?? g.email?.split('@')[0] ?? '').replace(/[^\p{L}\p{N}_ .-]/gu, '').slice(0, 16)
    send(res, 200, { needName: true, ticket, suggested, email: g.email, greeting: g.name, picture: g.picture })
  },
  async 'POST /api/google/register'(req, res) {
    if (limited(clientIp(req), 'google')) return send(res, 429, { error: 'tooMany' })
    const { ticket, name } = await readBody(req)
    const t = typeof ticket === 'string' ? tickets.get(ticket) : undefined
    if (!t || t.until < Date.now()) return send(res, 401, { error: 'googleInvalid' })
    if (typeof name !== 'string' || !NAME_RE.test(name.trim())) return send(res, 400, { error: 'badName' })
    const user = keyOf(name)
    // Someone else may have linked this Google account meanwhile (two tabs).
    if (await store.googleUser(t.sub)) return send(res, 409, { error: 'googleTaken' })
    const account = { name: name.trim(), salt: null, hash: null, created: Date.now() }
    if (!(await store.createUser(user, account))) return send(res, 409, { error: 'taken' })
    await store.linkGoogle(t.sub, user, t.email)
    tickets.delete(ticket)
    send(res, 200, { token: await newToken(user), name: account.name })
  },
  /** Link Google to the signed-in account (then either way of signing in works). */
  async 'POST /api/google/link'(req, res) {
    const user = await auth(req.headers.authorization)
    if (!user) return send(res, 401, { error: 'auth' })
    const { credential } = await readBody(req, 8192)
    const g = await verifyGoogleToken(credential)
    if (!g) return send(res, 401, { error: 'googleInvalid' })
    const owner = await store.googleUser(g.sub)
    if (owner && owner !== user) return send(res, 409, { error: 'googleTaken' })
    if (!owner && (await store.googleOf(user)) !== null) return send(res, 409, { error: 'alreadyLinked' })
    if (!owner) await store.linkGoogle(g.sub, user, g.email)
    send(res, 200, { google: g.email ?? '' })
  },
  async 'GET /api/save'(req, res) {
    const user = await auth(req.headers.authorization)
    if (!user) return send(res, 401, { error: 'auth' })
    const saved = await store.getSave(user)
    send(res, 200, { save: saved?.save ?? null })
  },
  async 'PUT /api/save'(req, res) {
    const user = await auth(req.headers.authorization)
    if (!user) return send(res, 401, { error: 'auth' })
    const save = await readBody(req, MAX_SAVE)
    if (typeof save !== 'object' || save === null || typeof save.version !== 'number' || typeof save.savedAt !== 'number') {
      return send(res, 400, { error: 'badSave' })
    }
    await store.putSave(user, save, save.savedAt)
    send(res, 200, { savedAt: save.savedAt })
  },
  /** "Delete character" in Settings: the cloud copy goes too, so it can't come back on the next Play. */
  async 'DELETE /api/save'(req, res) {
    const user = await auth(req.headers.authorization)
    if (!user) return send(res, 401, { error: 'auth' })
    await store.deleteSave(user)
    send(res, 200, {})
  },
  async 'GET /api/health'(_req, res) {
    send(res, 200, { ok: true, store: store.kind.split(' ')[0], online: clients.size })
  },
  async 'GET /api/online'(_req, res) {
    const scenes = {}
    for (const c of clients.values()) if (c.scene) scenes[c.scene] = (scenes[c.scene] ?? 0) + 1
    send(res, 200, { total: clients.size, scenes })
  },
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' }

/**
 * Files of the built game. Bandwidth savers:
 * - hashed files in assets/ are cached by the browser for a year ("immutable");
 * - everything else gets an ETag: an unchanged file answers 304 with no body;
 * - .br / .gz copies made at build time (vite.config.ts) are sent to browsers that accept them.
 */
function serveStatic(req, res) {
  if (!existsSync(DIST)) return send(res, 404, { error: 'notFound' })
  let path
  try {
    path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  } catch {
    return send(res, 400, { error: 'badPath' })
  }
  let file = normalize(join(DIST, path))
  if (!file.startsWith(DIST + sep) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html')
  const hashed = file.startsWith(join(DIST, 'assets') + sep)
  const stat = statSync(file)
  const etag = `"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`
  const headers = {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    etag,
    vary: 'Accept-Encoding',
  }
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers)
    return res.end()
  }
  // Music: byte ranges (media players ask for them; Safari insists).
  const audio = /\.(ogg|mp3|m4a)$/.test(file)
  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''))
  if (range && audio && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1
    if (!(start <= end && start < stat.size)) {
      res.writeHead(416, { 'content-range': `bytes */${stat.size}` })
      return res.end()
    }
    res.writeHead(206, { ...headers, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${stat.size}`, 'content-length': end - start + 1 })
    if (req.method === 'HEAD') return res.end()
    return createReadStream(file, { start, end }).pipe(res)
  }
  if (audio) headers['accept-ranges'] = 'bytes'
  const accept = String(req.headers['accept-encoding'] ?? '')
  let body = file
  if (/\bbr\b/.test(accept) && existsSync(`${file}.br`)) {
    body = `${file}.br`
    headers['content-encoding'] = 'br'
  } else if (/\bgzip\b/.test(accept) && existsSync(`${file}.gz`)) {
    body = `${file}.gz`
    headers['content-encoding'] = 'gzip'
  }
  headers['content-length'] = statSync(body).size
  res.writeHead(200, headers)
  if (req.method === 'HEAD') return res.end()
  createReadStream(body).pipe(res)
}

const http = createServer(async (req, res) => {
  const route = routes[`${req.method} ${new URL(req.url, 'http://x').pathname}`]
  try {
    if (route) await route(req, res)
    else if (req.url.startsWith('/api/')) send(res, 404, { error: 'notFound' })
    else serveStatic(req, res)
  } catch (e) {
    const known = e.message === 'too large' || e.message === 'bad json'
    if (!known) console.error(e)
    if (!res.headersSent) send(res, e.message === 'too large' ? 413 : known ? 400 : 500, { error: known ? e.message : 'server' })
  }
})

// ---------------------------------------------------------------------------------------
// Multiplayer: one room per public scene (split into #2, #3… when full). The server
// relays snapshots between players in the same room; private scenes see nobody.
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 })
/** @type {Map<number, { id: number, user: string, name: string, ws: import('ws').WebSocket, scene: string | null, room: string | null, snap: object | null, lastSnap: number, lastEmote: number }>} */
const clients = new Map()
/** @type {Map<string, Set<number>>} */
const rooms = new Map()
let nextId = 1

/** The connected client of an account (one connection per account), if any. */
const clientOf = (user) => {
  for (const c of clients.values()) if (c.user === user) return c
  return null
}
const broadcastAll = (msg) => {
  const text = JSON.stringify(msg)
  for (const c of clients.values()) if (c.ws.readyState === 1) c.ws.send(text)
}
// Friends, private messages, world chat (server/social.mjs)
const social = createSocial({ store, auth, keyOf, readBody, send, clientOf, broadcastAll })
Object.assign(routes, social.routes)

http.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/ws')) return socket.destroy()
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws))
})

const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0)
const str = (v, max = 24) => (typeof v === 'string' ? v.slice(0, max) : undefined)

/** Keep only known, bounded fields: never relay arbitrary client data. */
function cleanSnap(s) {
  if (!s || typeof s !== 'object' || !ALL_SCENES.has(s.scene)) return null
  const m = s.motion ?? {}
  const o = s.outfit ?? {}
  const outfit = {}
  for (const k of ['skin', 'hair', 'hairStyle', 'shirt', 'shorts', 'shoe', 'bag', 'accessory', 'accent', 'top', 'bottom', 'neck', 'neckColor', 'eye', 'expression', 'shoeType', 'pattern', 'patternColor', 'apron', 'socks', 'hairTie']) {
    const v = o[k] === null ? null : str(o[k])
    if (v !== undefined) outfit[k] = v
  }
  if (typeof o.lashes === 'boolean') outfit.lashes = o.lashes
  return {
    scene: s.scene,
    x: num(s.x, -300, 300),
    z: num(s.z, -300, 300),
    yaw: num(s.yaw, -100, 100),
    motion: {
      speed: num(m.speed, 0, 2),
      sit: num(m.sit, 0, 1),
      seatY: m.seatY === undefined ? undefined : num(m.seatY, 0, 2),
      ride: str(m.ride, 12) ?? null,
      pedal: num(m.pedal, -1e6, 1e6),
      sip: num(m.sip, 0, 1),
      fan: num(m.fan, 0, 1),
      arms: num(m.arms, 0, 1),
      kick: num(m.kick, 0, 1),
      held: m.held === 'glass' || m.held === 'fan' ? m.held : null,
    },
    outfit,
  }
}

/** Old clients (a cached app from before 1.21) still get every snapshot on its own. */
function broadcastLegacy(room, msg, except) {
  const ids = rooms.get(room)
  if (!ids) return
  let text = null
  for (const id of ids) {
    const c = clients.get(id)
    if (!c || c.batch || id === except || c.ws.readyState !== 1) continue
    text ??= JSON.stringify(msg)
    c.ws.send(text)
  }
}

/**
 * Room tick (1.21): everyone who moved since the last tick goes out in ONE message per room,
 * serialised once and sent to every member — N players cost N sends per tick instead of N².
 * The outfit is only included when it changed (players who just joined got it in 'join').
 */
const ROOM_TICK_MS = 100
setInterval(() => {
  for (const [room, ids] of rooms) {
    const l = []
    for (const id of ids) {
      const c = clients.get(id)
      if (!c?.dirty || !c.snap) continue
      c.dirty = false
      if (c.outfitDirty) {
        c.outfitDirty = false
        l.push([id, c.snap])
      } else {
        const { outfit: _outfit, ...rest } = c.snap
        l.push([id, rest])
      }
    }
    if (!l.length) continue
    const text = JSON.stringify({ t: 'snaps', l })
    for (const id of ids) {
      const c = clients.get(id)
      if (c?.batch && c.ws.readyState === 1) c.ws.send(text)
    }
  }
}, ROOM_TICK_MS).unref()

function broadcast(room, msg, except) {
  const ids = rooms.get(room)
  if (!ids) return
  const text = JSON.stringify(msg)
  for (const id of ids) {
    const c = clients.get(id)
    if (c && id !== except && c.ws.readyState === 1) c.ws.send(text)
  }
}

function leaveRoom(c) {
  if (!c.room) return
  const ids = rooms.get(c.room)
  ids?.delete(c.id)
  broadcast(c.room, { t: 'leave', id: c.id })
  if (ids && ids.size === 0) rooms.delete(c.room)
  c.room = null
}

function joinRoom(c, scene) {
  if (!PUBLIC_SCENES.has(scene)) return
  let n = 1
  while ((rooms.get(n === 1 ? scene : `${scene}#${n}`)?.size ?? 0) >= ROOM_CAP) n++
  const room = n === 1 ? scene : `${scene}#${n}`
  if (!rooms.has(room)) rooms.set(room, new Set())
  const others = [...rooms.get(room)].map((id) => clients.get(id)).filter((o) => o?.snap)
  rooms.get(room).add(c.id)
  c.room = room
  // 'join' below carries the full snapshot (outfit included)
  c.dirty = false
  c.outfitDirty = false
  c.outfitKey = JSON.stringify(c.snap?.outfit ?? null)
  c.ws.send(JSON.stringify({ t: 'room', room, players: others.map((o) => ({ id: o.id, name: o.name, s: o.snap })) }))
  broadcast(room, { t: 'join', id: c.id, name: c.name, s: c.snap }, c.id)
}

wss.on('connection', (ws) => {
  /** @type {any} */
  let c = null
  let authing = false
  const timeout = setTimeout(() => ws.close(4001, 'auth'), 8000)
  ws.on('message', async (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    if (!c) {
      // Only the first message (auth) counts until we know who this is.
      if (authing) return
      authing = true
      const user = msg.t === 'auth' && typeof msg.token === 'string' ? await store.tokenUser(msg.token).catch(() => null) : null
      const account = user && (await store.getUser(user).catch(() => null))
      if (!account || ws.readyState !== 1) return ws.close(4001, 'auth')
      clearTimeout(timeout)
      // One connection per account: a new tab replaces the old one.
      for (const other of clients.values()) if (other.user === user) other.ws.close(4002, 'replaced')
      c = { id: nextId++, user, name: account.name, ws, scene: null, room: null, snap: null, lastSnap: 0, lastEmote: 0, batch: Array.isArray(msg.caps) && msg.caps.includes('batch'), dirty: false, outfitDirty: false, outfitKey: '' }
      clients.set(c.id, c)
      ws.send(JSON.stringify({ t: 'welcome', id: c.id, name: c.name, key: user }))
      void social.presence(user, true)
      return
    }
    const now = Date.now()
    if (msg.t === 'chat' || msg.t === 'dm') {
      await social.onMessage(c, msg).catch((e) => console.error('chat', e))
      return
    }
    if (msg.t === 'snap') {
      if (now - c.lastSnap < 60) return // ~15 Hz max
      c.lastSnap = now
      const snap = cleanSnap(msg.s)
      if (!snap) return
      c.snap = snap
      if (snap.scene !== c.scene) {
        leaveRoom(c)
        c.scene = snap.scene
        joinRoom(c, snap.scene)
      } else if (c.room) {
        const key = JSON.stringify(snap.outfit)
        if (key !== c.outfitKey) {
          c.outfitKey = key
          c.outfitDirty = true
        }
        c.dirty = true
        broadcastLegacy(c.room, { t: 'snap', id: c.id, s: snap }, c.id)
      }
    } else if (msg.t === 'emote' && EMOTES.has(msg.e) && c.room) {
      if (now - c.lastEmote < 1000) return
      c.lastEmote = now
      broadcast(c.room, { t: 'emote', id: c.id, e: msg.e }, c.id)
    } else if (msg.t === 'ping') {
      ws.send(JSON.stringify({ t: 'pong', at: msg.at, online: clients.size }))
    }
  })
  ws.on('close', () => {
    clearTimeout(timeout)
    if (!c) return
    leaveRoom(c)
    clients.delete(c.id)
    if (!clientOf(c.user)) void social.presence(c.user, false)
  })
})

// Keep idle connections alive through proxies, drop dead ones.
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate()
      continue
    }
    ws.isAlive = false
    ws.ping()
  }
}, 30_000).unref()
wss.on('connection', (ws) => {
  ws.isAlive = true
  ws.on('pong', () => (ws.isAlive = true))
})

const shutdown = async () => {
  for (const ws of wss.clients) ws.close(1012, 'restart')
  http.close()
  await store.close().catch(() => {})
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

http.listen(PORT, () => console.log(`Visa Hunter server on http://localhost:${PORT} (storage: ${store.kind})`))
