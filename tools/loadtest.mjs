#!/usr/bin/env node
/**
 * Load test: N fake players ("bots") sign up, connect over WebSocket and walk around a scene like real
 * players (walk / stand / emote / world chat), while we measure what the server delivers.
 *
 *   node tools/loadtest.mjs --url http://localhost:8798 --bots 50 --seconds 60
 *
 * Options:
 *   --url       game server (default http://localhost:8787). Never point this at the live server without
 *               a reason: every bot creates an account.
 *   --bots      number of bots (default 50)
 *   --seconds   how long to run after everyone joined (default 60)
 *   --scene     vietnam | germany (default vietnam)
 *   --walk      share of the time a bot is walking, 0–1 (default 0.6; real players stand a lot)
 *   --rooms     spread bots over this many scenes instead of one crowd (default 1)
 *   --prefix    account name prefix (default "bot"); accounts are reused on the next run
 *   --stay      keep the bots online at the end (Ctrl+C to stop) — to watch them in the game
 *
 * The server must allow many sign-ups from one IP: start it with AUTH_RATE_LIMIT=20 (or higher).
 * Needs Node 22+ (built-in WebSocket and fetch).
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
    return acc
  }, []),
)
const URL_BASE = (args.url ?? 'http://localhost:8787').replace(/\/$/, '')
const BOTS = Number(args.bots ?? 50)
const SECONDS = Number(args.seconds ?? 60)
const SCENES = ['vietnam', 'germany', 'classroom', 'university']
const ROOMS = Math.max(1, Math.min(SCENES.length, Number(args.rooms ?? 1)))
const SCENE = args.scene ?? 'vietnam'
const WALK = Number(args.walk ?? 0.6)
const PREFIX = args.prefix ?? 'bot'
const STAY = args.stay === 'true'
const WS_URL = `${URL_BASE.replace(/^http/, 'ws')}/ws`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const COLORS = ['#a9d6ff', '#ffb3c7', '#b8e6c9', '#ffe08a', '#cdb8f0', '#ffc3a0', '#9fe0f0', '#f7a8c0']
const HAIR = ['bob', 'short', 'bun', 'long', 'ponytail', 'twin', 'curly', 'spiky']
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const EMOTES = ['wave', 'heart', 'laugh', 'wow', 'hello', 'thanks', 'yes']
const LINES = ['Xin chào mọi người!', 'Có ai đi học tiếng Đức không?', 'Hallo zusammen!', 'Hôm nay trời đẹp quá', 'Ai săn được Termin chưa?', 'Viel Glück!']

/** Account: log in if it exists (rerun), else register. */
async function account(name) {
  const body = JSON.stringify({ name, password: 'loadtest-123' })
  const post = (path) => fetch(`${URL_BASE}/api/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
  let r = await post('login')
  if (r.status === 401 || r.status === 404) r = await post('register')
  if (r.status === 429) throw new Error('rate limited — start the server with AUTH_RATE_LIMIT=20')
  if (!r.ok) throw new Error(`${name}: ${r.status} ${await r.text()}`)
  return (await r.json()).token
}

const stats = { rx: 0, rxBytes: 0, tx: 0, txBytes: 0, rtt: [], closed: 0, errors: 0, peakRoster: 0 }

class Bot {
  constructor(i) {
    this.i = i
    this.name = `${PREFIX}${String(i + 1).padStart(3, '0')}`
    this.scene = ROOMS > 1 ? SCENES[i % ROOMS] : SCENE
    // Around the spawn of the street (Hà Nội: sidewalk between the houses and the road)
    this.x = -8 + Math.random() * 16
    this.z = -3.5 + Math.random() * 5
    this.yaw = Math.random() * Math.PI * 2
    this.walking = false
    this.until = 0
    this.roster = new Set()
    this.outfit = { skin: '#f6d6bc', hair: '#2a2020', hairStyle: pick(HAIR), shirt: pick(COLORS), shorts: '#4f5d75', shoe: '#ffffff', bag: null, accessory: null }
  }

  async start() {
    this.token = await account(this.name)
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL)
      this.ws = ws
      ws.onopen = () => ws.send(JSON.stringify({ t: 'auth', token: this.token }))
      ws.onerror = () => {
        stats.errors++
        reject(new Error(`${this.name}: socket error`))
      }
      ws.onclose = () => {
        stats.closed++
        clearInterval(this.timer)
      }
      ws.onmessage = (ev) => {
        stats.rx++
        stats.rxBytes += ev.data.length
        let msg
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        if (msg.t === 'welcome') {
          this.timer = setInterval(() => this.tick(), 100)
          resolve()
        } else if (msg.t === 'pong' && msg.at) stats.rtt.push(Date.now() - msg.at)
        else if (msg.t === 'room') this.roster = new Set(msg.players.map((p) => p.id))
        else if (msg.t === 'join') this.roster.add(msg.id)
        else if (msg.t === 'leave') this.roster.delete(msg.id)
        stats.peakRoster = Math.max(stats.peakRoster, this.roster.size)
      }
    })
  }

  send(obj) {
    if (this.ws.readyState !== 1) return
    const text = JSON.stringify(obj)
    stats.tx++
    stats.txBytes += text.length
    this.ws.send(text)
  }

  /** 10 Hz like the real client: a snapshot while moving, a heartbeat every 2 s while standing. */
  tick() {
    const now = Date.now()
    if (now > this.until) {
      this.walking = Math.random() < WALK
      this.until = now + 2000 + Math.random() * 5000
      if (this.walking) this.yaw += (Math.random() - 0.5) * 2.5
    }
    if (this.walking) {
      const speed = 2.6 * 0.1
      this.x = Math.max(-28, Math.min(30, this.x + Math.sin(this.yaw) * speed))
      this.z = Math.max(-4.2, Math.min(2.8, this.z + Math.cos(this.yaw) * speed))
      if (this.z <= -4.2 || this.z >= 2.8) this.yaw = Math.PI - this.yaw
    } else if (now - (this.lastSnap ?? 0) < 2000) return
    this.lastSnap = now
    this.send({
      t: 'snap',
      s: { scene: this.scene, x: +this.x.toFixed(2), z: +this.z.toFixed(2), yaw: +this.yaw.toFixed(2), motion: { speed: this.walking ? 1 : 0 }, outfit: this.outfit },
    })
    // Now and then: an emote, a world-chat line, a latency ping
    if (Math.random() < 0.004) this.send({ t: 'emote', e: pick(EMOTES) })
    if (Math.random() < 0.0015) this.send({ t: 'chat', text: pick(LINES) })
    if (Math.random() < 0.03) this.send({ t: 'ping', at: now })
  }
}

const pct = (arr, p) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}
const kb = (b) => (b / 1024).toFixed(0)

console.log(`Load test: ${BOTS} bots → ${URL_BASE} (${ROOMS > 1 ? `${ROOMS} scenes` : SCENE}), walking ${Math.round(WALK * 100)}% of the time`)
const bots = Array.from({ length: BOTS }, (_, i) => new Bot(i))
const t0 = Date.now()
for (let i = 0; i < bots.length; i += 10) {
  await Promise.all(bots.slice(i, i + 10).map((b) => b.start().catch((e) => console.error('  ', e.message))))
}
const online = bots.filter((b) => b.ws?.readyState === 1).length
console.log(`${online}/${BOTS} bots online after ${((Date.now() - t0) / 1000).toFixed(1)} s\n`)

let last = { rx: stats.rx, rxBytes: stats.rxBytes, tx: stats.tx, at: Date.now() }
const report = (final = false) => {
  const now = Date.now()
  const dt = (now - last.at) / 1000
  const rtt = stats.rtt.splice(0)
  const line = [
    `server → bots ${Math.round((stats.rx - last.rx) / dt)} msg/s (${kb((stats.rxBytes - last.rxBytes) / dt)} KB/s)`,
    `bots → server ${Math.round((stats.tx - last.tx) / dt)} msg/s`,
    `latency p50 ${pct(rtt, 50)} ms · p95 ${pct(rtt, 95)} ms · max ${pct(rtt, 100)} ms`,
    `sees up to ${stats.peakRoster} others`,
    stats.closed ? `${stats.closed} disconnected` : '',
  ]
    .filter(Boolean)
    .join(' | ')
  console.log(`${final ? 'TOTAL ' : ''}${line}`)
  last = { rx: stats.rx, rxBytes: stats.rxBytes, tx: stats.tx, at: now }
}
const every = setInterval(report, 5000)
if (!STAY) {
  await sleep(SECONDS * 1000)
  clearInterval(every)
  report()
  for (const b of bots) b.ws?.close()
  await sleep(500)
  process.exit(0)
} else {
  console.log('Bots stay online — open the game and walk to the street. Ctrl+C to stop.')
}
