/**
 * 1.39 Pickleball 1v1 — the match logic, shared by online matches and the bot (no React, no DOM).
 *
 * Court in metres, "canonical" coordinates shared by both players: x across (sidelines ±3.05), y along the court
 * (baselines ±6.705), h = height. The net is at y = 0; the host plays on y < 0, the guest on y > 0.
 *
 * Network model ("whoever the ball flies to judges it"): each client simulates the same ball. After a hit the
 * RECEIVER owns the ball — only the receiver's client may hit it back or decide the point (out, net, second bounce),
 * and tells the other with a message. So your own hits never wait for the network; the opponent sees them one
 * latency later (the receiving client fast-forwards the ball by the measured one-way delay).
 *
 * Rules (simplified singles): rally scoring to 11, win by 2 (at most 15). The rally winner serves next, from the
 * right half when their score is even, underhand and cross-court into the service box beyond the kitchen. The serve
 * and the return must bounce first (two-bounce rule), and nobody may volley inside the kitchen (non-volley zone,
 * 2.13 m from the net) — friendly version: the swing simply waits until the hit is legal instead of faulting.
 */

export type Role = 'host' | 'guest'
export type Shot = 'drive' | 'dink' | 'lob' | 'serve'
export type Why = 'out' | 'net' | 'double' | 'serveOut' | 'serveKitchen' | 'quit' | 'gone'
export type Phase = 'serve' | 'rally' | 'point' | 'over'

export const COURT = { halfW: 3.05, halfL: 6.705, kitchen: 2.13, net: 0.88, postW: 3.35 }
export const TARGET = 11
export const CAP = 15
const G = 7.6
const BOUNCE_V = 0.62
const BOUNCE_H = 0.8
export const REACH = 1.1
const REACH_H = 1.95
const PLAYER_SPEED = 4.7
const SERVE_AUTO_SEC = 8
const POINT_PAUSE = 1.9
const POS_EVERY = 1 / 15

export interface Ball {
  x: number
  y: number
  h: number
  vx: number
  vy: number
  vh: number
}

/** Messages between the two clients (relayed by the server as `pb.msg`). */
export type Msg =
  | { k: 'pos'; x: number; y: number; s: number }
  | { k: 'hit'; n: number; b: number[]; shot: Shot; q: number }
  | { k: 'point'; w: Role; why: Why; s: [number, number] }
  | { k: 'ping'; t: number }
  | { k: 'pong'; t: number }
  | { k: 'quit' }
  | { k: 'gone'; name?: string }

export interface Input {
  /** Stick in the player's own view: x right, y forward (toward the net), length ≤ 1. */
  x: number
  y: number
  /** A shot button pressed this frame. */
  shot: Exclude<Shot, 'serve'> | null
}

export interface EngineOptions {
  /** 0.4 (weak bot) … 1 (normal): scales shot quality and running speed. */
  skill?: number
  /** Move sideways toward the ball when the stick is idle (helps on phones). */
  assist?: boolean
  /** Fixed one-way delay (bot: 0). */
  latency?: number
}

export const side = (r: Role) => (r === 'host' ? -1 : 1)
/** Canonical → own view factor: the host sees the court as is, the guest turned round. */
export const flipOf = (r: Role) => (r === 'host' ? 1 : -1)
const other = (r: Role): Role => (r === 'host' ? 'guest' : 'host')
const sideOf = (y: number): Role => (y < 0 ? 'host' : 'guest')
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75

type BallEvent = { kind: 'bounce'; x: number; y: number } | { kind: 'net' }

/** Move a ball forward by dt (small sub-steps), reporting bounces and a net hit. */
export function advance(b: Ball, dt: number, out?: BallEvent[]) {
  let left = dt
  while (left > 1e-6) {
    const s = Math.min(left, 1 / 240)
    left -= s
    const py = b.y
    const ph = b.h
    b.x += b.vx * s
    b.y += b.vy * s
    b.vh -= G * s
    b.h += b.vh * s
    // Through the plane of the net between the posts, too low → it stops in the net and drops on the hitter's side
    if (py !== 0 && Math.sign(py) !== Math.sign(b.y) && Math.abs(b.x) < COURT.postW) {
      const t = py / (py - b.y)
      const hc = ph + (b.h - ph) * t
      const netH = COURT.net + 0.03 * (Math.abs(b.x) / COURT.halfW)
      if (hc < netH) {
        b.y = Math.sign(py) * 0.06
        b.vy = -b.vy * 0.12
        b.vx *= 0.3
        out?.push({ kind: 'net' })
      }
    }
    if (b.h <= 0 && b.vh < 0) {
      b.h = 0
      if (b.vh > -0.6) {
        // rolling
        b.vh = 0
        b.vx *= 0.96
        b.vy *= 0.96
      } else {
        b.vh = -b.vh * BOUNCE_V
        b.vx *= BOUNCE_H
        b.vy *= BOUNCE_H
        out?.push({ kind: 'bounce', x: b.x, y: b.y })
      }
    }
  }
}

export interface Mover {
  x: number
  y: number
  vx: number
  vy: number
  /** Seconds since the last swing started (anim), large = idle. */
  swing: number
  /** Which way the paddle swings (+1 forehand on the right, −1 backhand), in canonical x. */
  hand: number
}

export interface Banner {
  text: string
  tone: 'info' | 'good' | 'bad'
  t: number
}

export class PickleEngine {
  readonly role: Role
  readonly opp: Role
  private send: (m: Msg) => void
  score: Record<Role, number> = { host: 0, guest: 0 }
  server: Role
  phase: Phase = 'serve'
  phaseT = 0
  ball: Ball = { x: 0, y: 0, h: 1, vx: 0, vy: 0, vh: 0 }
  /** Who may hit / judge the ball now (the receiver of the last hit); null before the serve. */
  owner: Role | null = null
  /** Index of the last shot in this rally (0 = the serve), −1 before the serve. */
  shotN = -1
  /** Bounces on the owner's side since the last hit. */
  bounces = 0
  judged = false
  me: Mover = { x: 0, y: 0, vx: 0, vy: 0, swing: 9, hand: 1 }
  them: Mover & { tx: number; ty: number } = { x: 0, y: 0, vx: 0, vy: 0, swing: 9, hand: 1, tx: 0, ty: 0 }
  banner: Banner | null = null
  winner: Role | null = null
  endWhy: Why | null = null
  lastPoint: { w: Role; why: Why } | null = null
  /** Short-lived things the view shows / plays: the view takes them with `events.splice(0)` (the bot clears its own). */
  events: { kind: 'hit' | 'bounce' | 'point' | 'net' | 'win' | 'lose' | 'nice'; x?: number; y?: number; mine?: boolean }[] = []
  /** Where the incoming ball will bounce (for the landing marker), or null. */
  landing: { x: number; y: number } | null = null
  /** Stats for the summary. */
  stats = { hits: 0, winners: 0, longest: 0 }
  latency: number
  private queued: { shot: Exclude<Shot, 'serve'>; t: number } | null = null
  private posT = 0
  private pingT = 0
  private swings = 0
  private skill: number
  private assist: boolean
  private fixedLatency: boolean
  private hint = ''

  constructor(role: Role, first: Role, send: (m: Msg) => void, opts: EngineOptions = {}) {
    this.role = role
    this.opp = other(role)
    this.send = send
    this.server = first
    this.skill = opts.skill ?? 1
    this.assist = opts.assist ?? false
    this.latency = opts.latency ?? 0.06
    this.fixedLatency = opts.latency !== undefined
    this.setupServe()
  }

  get sg() {
    return side(this.role)
  }

  /** x of the serve: the server's right half when their score is even. */
  private serveX() {
    const even = this.score[this.server] % 2 === 0
    return (even ? 1 : -1) * flipOf(this.server) * 1.6
  }

  private setupServe() {
    this.phase = 'serve'
    this.phaseT = 0
    this.owner = null
    this.shotN = -1
    this.bounces = 0
    this.judged = false
    this.queued = null
    this.landing = null
    const sx = this.serveX()
    const ss = side(this.server)
    const meServe = this.server === this.role
    const mx = meServe ? sx : -sx
    const my = meServe ? ss * (COURT.halfL + 0.35) : this.sg * (COURT.halfL - 0.2)
    Object.assign(this.me, { x: mx, y: my, vx: 0, vy: 0 })
    const tx = meServe ? -sx : sx
    const ty = meServe ? -ss * (COURT.halfL - 0.2) : ss * (COURT.halfL + 0.35)
    Object.assign(this.them, { x: tx, y: ty, tx, ty, vx: 0, vy: 0 })
    this.placeServeBall()
    this.say(meServe ? 'Bạn giao bóng — bấm ĐÁNH' : 'Đối thủ giao bóng…', 'info', 2.2)
  }

  private placeServeBall() {
    const p = this.server === this.role ? this.me : this.them
    Object.assign(this.ball, { x: p.x + 0.35 * flipOf(this.server), y: p.y - side(this.server) * 0.25, h: 0.75, vx: 0, vy: 0, vh: 0 })
  }

  private say(text: string, tone: Banner['tone'] = 'info', t = 1.6) {
    this.banner = { text, tone, t }
  }

  /** One frame. */
  step(dtRaw: number, input: Input) {
    const dt = Math.min(dtRaw, 0.05)
    this.phaseT += dt
    if (this.banner) {
      this.banner.t -= dt
      if (this.banner.t <= 0) this.banner = null
    }
    this.me.swing += dt
    this.them.swing += dt

    if (input.shot) {
      this.aimX = input.x
      this.queued = { shot: input.shot, t: 0 }
      this.me.swing = 0
      this.swings++
    }
    if (this.queued) {
      this.queued.t += dt
      if (this.queued.t > 0.38) this.queued = null
    }

    this.moveMe(dt, input)
    // the opponent eases toward the last reported position
    const k = Math.min(1, dt * 14)
    this.them.x += (this.them.tx - this.them.x) * k
    this.them.y += (this.them.ty - this.them.y) * k

    if (this.phase === 'serve') {
      if (this.server === this.role) {
        this.placeServeBall()
        if (this.phaseT > 0.5 && (this.queued || this.phaseT > SERVE_AUTO_SEC)) {
          this.queued = null
          this.me.swing = 0
          this.hit('serve', 0.9)
        }
      } else this.placeServeBall()
    } else {
      const ev: BallEvent[] = []
      advance(this.ball, dt, ev)
      this.handleEvents(ev)
      if (this.phase === 'rally') {
        this.tryHit()
        // safety net: a ball that stopped bouncing (or a rally that hangs) on my side is a point for the hitter
        if (this.owner === this.role && !this.judged && (this.phaseT > 6 || (this.ball.h === 0 && this.ball.vh === 0 && this.ball.y * this.sg > 0))) this.award(this.opp, 'double')
      }
    }

    if (this.phase === 'point' && this.phaseT > POINT_PAUSE) {
      if (this.winner) {
        this.phase = 'over'
        this.phaseT = 0
      } else this.setupServe()
    }

    // landing marker for a ball coming to me
    this.landing = null
    if (this.phase === 'rally' && this.owner === this.role && this.bounces === 0 && this.ball.vh !== 0) {
      const b = { ...this.ball }
      const ev: BallEvent[] = []
      for (let i = 0; i < 60 && !ev.length; i++) advance(b, 1 / 30, ev)
      const first = ev[0]
      if (first?.kind === 'bounce') this.landing = { x: first.x, y: first.y }
    }

    // network: my position ~15×/s, a ping every 2 s
    this.posT += dt
    if (this.posT >= POS_EVERY) {
      this.posT = 0
      this.send({ k: 'pos', x: round2(this.me.x), y: round2(this.me.y), s: this.swings })
    }
    this.pingT += dt
    if (!this.fixedLatency && this.pingT > 2) {
      this.pingT = 0
      this.send({ k: 'ping', t: performance.now() })
    }
  }

  private moveMe(dt: number, input: Input) {
    const m = this.me
    const f = flipOf(this.role)
    // the server stands still behind the baseline until the serve; the receiver may shuffle along the baseline
    if (this.phase === 'serve' && this.server === this.role) return
    let ix = input.x * f
    let iy = input.y * f
    const idle = Math.hypot(input.x, input.y) < 0.1
    if (idle && this.assist && this.phase === 'rally' && this.owner === this.role) {
      const target = this.predictContact()
      if (target) {
        const dx = target.x - m.x
        ix = clamp(dx * 1.6, -0.7, 0.7)
        iy = 0
      }
    }
    const speed = PLAYER_SPEED * (0.75 + 0.25 * this.skill)
    const k = Math.min(1, dt * 12)
    m.vx += (ix * speed - m.vx) * k
    m.vy += (iy * speed - m.vy) * k
    m.x += m.vx * dt
    m.y += m.vy * dt
    m.x = clamp(m.x, -COURT.halfW - 1.6, COURT.halfW + 1.6)
    const near = this.phase === 'serve' ? COURT.halfL - 0.6 : 0.35
    const depth = clamp(m.y * this.sg, near, COURT.halfL + 2.2)
    m.y = depth * this.sg
    if (Math.abs(m.vx) > 0.4) m.hand = Math.sign(this.ball.x - m.x) || m.hand
  }

  /** Where I could meet the incoming ball: the first legal point on my side at a comfortable height. */
  predictContact(): { x: number; y: number; t: number; h: number } | null {
    if (this.owner !== this.role) return null
    const b = { ...this.ball }
    let bounces = this.bounces
    const mustBounce = this.shotN <= 1
    for (let i = 0; i < 120; i++) {
      const ev: BallEvent[] = []
      advance(b, 1 / 40, ev)
      for (const e of ev) if (e.kind === 'bounce') bounces++
      if (ev.some((e) => e.kind === 'net') || bounces >= 2) return null
      const mine = b.y * this.sg > 0.3
      const legal = bounces > 0 || (!mustBounce && Math.abs(b.y) > COURT.kitchen + 0.2)
      const goingDown = b.vh < 0 || bounces > 0
      if (mine && legal && b.h < 1.25 && b.h > 0.12 && goingDown) return { x: b.x, y: b.y, t: i / 40, h: b.h }
    }
    return null
  }

  private handleEvents(ev: BallEvent[]) {
    for (const e of ev) {
      if (e.kind === 'net') {
        this.events.push({ kind: 'net' })
        if (this.owner === this.role && !this.judged && this.phase === 'rally') this.award(this.role, 'net')
        continue
      }
      this.events.push({ kind: 'bounce', x: e.x, y: e.y })
      if (this.phase !== 'rally' || this.judged || this.owner !== this.role) continue
      const on = sideOf(e.y)
      if (on !== this.owner) continue // (bounced back on the hitter's side after the net — judged there)
      this.bounces++
      if (this.bounces === 1) {
        const inX = Math.abs(e.x) <= COURT.halfW + 0.04
        const inY = Math.abs(e.y) <= COURT.halfL + 0.04
        if (this.shotN === 0) {
          // the serve: into the diagonal service box, past the kitchen line
          const box = Math.sign(e.x) === -Math.sign(this.serveX()) || Math.abs(e.x) < 0.04
          if (Math.abs(e.y) < COURT.kitchen - 0.02) this.award(this.role, 'serveKitchen')
          else if (!inX || !inY || !box) this.award(this.role, 'serveOut')
        } else if (!inX || !inY) this.award(this.role, 'out')
      } else if (this.bounces >= 2) this.award(this.opp, 'double')
    }
  }

  private tryHit() {
    if (this.owner !== this.role || this.judged || !this.queued) return
    const b = this.ball
    if (b.y * this.sg < 0.05) return
    const d = Math.hypot(b.x - this.me.x, b.y - this.me.y)
    if (d > REACH || b.h > REACH_H) return
    // friendly rules: wait for a legal moment instead of a fault
    if (this.shotN <= 1 && this.bounces === 0) {
      this.hintOnce('Chờ bóng nảy đã! (luật 2 lần nảy)')
      return
    }
    if (this.bounces === 0 && Math.abs(this.me.y) < COURT.kitchen) {
      this.hintOnce('Trong vùng bếp không được đánh bóng chưa nảy!')
      return
    }
    const q = clamp(1 - 0.7 * (d / REACH) - (b.h > 1.5 ? 0.12 : 0) - (Math.hypot(this.me.vx, this.me.vy) > 4 ? 0.1 : 0), 0.08, 1) * (0.55 + 0.45 * this.skill)
    this.hit(this.queued.shot, q)
    this.queued = null
  }

  private hintOnce(text: string) {
    if (this.hint === text && this.banner) return
    this.hint = text
    this.say(text, 'info', 1.2)
  }

  /** My hit: pick where the ball goes, send it, the opponent now owns the ball. */
  private hit(shot: Shot, quality: number, aimX = this.aimX) {
    const b = this.ball
    const so = side(this.opp)
    let T: number
    let depth: number
    let tx: number
    if (shot === 'serve') {
      T = 1.45
      depth = 4.3 + Math.random() * 1.4
      tx = -this.serveX() * (0.55 + Math.random() * 0.45)
    } else {
      if (shot === 'dink') {
        T = 1.25
        depth = 0.9 + Math.random() * 0.9
      } else if (shot === 'lob') {
        T = 2.0
        depth = 5.2 + Math.random() * 1.1
      } else {
        T = b.h > 1.4 ? 0.72 : 0.95
        depth = 4.0 + Math.random() * 2.0
      }
      const f = flipOf(this.role)
      if (Math.abs(aimX) > 0.25) tx = aimX * f * 2.5
      else {
        // away from the opponent
        const away = this.them.x === 0 ? (Math.random() < 0.5 ? -1 : 1) : -Math.sign(this.them.x)
        tx = away * (1.0 + Math.random() * 1.4)
      }
    }
    // mistakes grow with a poor contact; even a perfect one is not a machine (aiming at the lines is a risk)
    const err = Math.min(1, 1 - quality + (shot === 'serve' ? 0.04 : 0.17))
    tx += gauss() * err * 1.6
    depth += gauss() * err * (shot === 'dink' ? 1.0 : 1.5)
    const ty = so * Math.max(0.3, depth)
    const intoNet = shot !== 'serve' && Math.random() < Math.max(0, 0.4 - quality) * 1.1 + (shot === 'dink' ? 0.05 : 0.025)
    let vx = 0
    let vy = 0
    let vh = 0
    for (let i = 0; i < 14; i++) {
      vx = (tx - b.x) / T
      vy = (ty - b.y) / T
      vh = (0.5 * G * T * T - b.h) / T
      if (intoNet) {
        vh *= 0.55
        break
      }
      const tc = -b.y / vy
      const hc = b.h + vh * tc - 0.5 * G * tc * tc
      if (hc > COURT.net + 0.12) break
      T += 0.08
    }
    Object.assign(b, { vx, vy, vh })
    this.shotN++
    this.owner = this.opp
    this.bounces = 0
    this.judged = false
    this.phase = 'rally'
    this.phaseT = 0
    this.me.swing = 0
    this.me.hand = Math.sign(b.x - this.me.x) * flipOf(this.role) >= 0 ? 1 : -1
    this.stats.hits++
    this.events.push({ kind: 'hit', mine: true, x: b.x, y: b.y })
    if (quality > 0.86 && shot !== 'serve') this.events.push({ kind: 'nice' })
    this.send({ k: 'hit', n: this.shotN, b: [b.x, b.y, b.h, vx, vy, vh].map(round3), shot, q: round2(quality) })
  }

  /** Stick x at the moment of the last input (aim). */
  aimX = 0

  /** The owner decides a point. */
  private award(w: Role, why: Why) {
    if (this.judged) return
    this.judged = true
    const s = { ...this.score, [w]: this.score[w] + 1 }
    const msg: Msg = { k: 'point', w, why, s: [s.host, s.guest] }
    this.send(msg)
    this.applyPoint(msg)
  }

  private applyPoint(m: Extract<Msg, { k: 'point' }>) {
    this.judged = true
    this.score = { host: m.s[0], guest: m.s[1] }
    this.lastPoint = { w: m.w, why: m.why }
    this.server = m.w
    this.phase = 'point'
    this.phaseT = 0
    this.queued = null
    this.landing = null
    this.stats.longest = Math.max(this.stats.longest, this.shotN + 1)
    this.shotN = -1
    const mine = m.w === this.role
    if (mine && m.why === 'double') this.stats.winners++
    this.events.push({ kind: 'point', mine })
    this.say(`${mine ? 'Điểm cho bạn!' : 'Điểm cho đối thủ'} — ${WHY_TEXT[m.why](mine)}`, mine ? 'good' : 'bad', POINT_PAUSE)
    const a = this.score[this.role]
    const o = this.score[this.opp]
    if ((Math.max(a, o) >= TARGET && Math.abs(a - o) >= 2) || Math.max(a, o) >= CAP) {
      this.winner = a > o ? this.role : this.opp
      this.endWhy = m.why
      this.events.push({ kind: this.winner === this.role ? 'win' : 'lose' })
    }
  }

  /** A message from the other client. */
  receive(m: Msg) {
    switch (m.k) {
      case 'pos': {
        this.them.tx = m.x
        this.them.ty = m.y
        if (m.s !== this.themSwings) {
          this.themSwings = m.s
          this.them.swing = 0
        }
        break
      }
      case 'hit': {
        // (a new serve may arrive while this side still shows the last point: applyPoint reset shotN to −1)
        if (this.phase === 'over' || this.winner || m.n !== this.shotN + 1) return
        const [x, y, h, vx, vy, vh] = m.b
        Object.assign(this.ball, { x, y, h, vx, vy, vh })
        this.shotN = m.n
        this.owner = this.role
        this.bounces = 0
        this.judged = false
        this.phase = 'rally'
        this.phaseT = 0
        this.them.swing = 0
        this.them.hand = Math.sign(x - this.them.x) * flipOf(this.opp) >= 0 ? 1 : -1
        this.events.push({ kind: 'hit', mine: false, x, y })
        // catch up with the time the message travelled (judging any bounce in between)
        const ev: BallEvent[] = []
        advance(this.ball, Math.min(0.25, this.latency), ev)
        this.handleEvents(ev)
        break
      }
      case 'point':
        if (this.phase === 'over') return
        this.applyPoint(m)
        break
      case 'ping':
        this.send({ k: 'pong', t: m.t })
        break
      case 'pong': {
        const oneWay = Math.max(0, (performance.now() - m.t) / 2000)
        this.latency = this.latency * 0.7 + Math.min(0.3, oneWay) * 0.3
        break
      }
      case 'quit':
      case 'gone':
        if (this.phase === 'over' || this.winner) return
        this.winner = this.role
        this.endWhy = m.k === 'quit' ? 'quit' : 'gone'
        this.phase = 'over'
        this.phaseT = 0
        this.events.push({ kind: 'win' })
        break
    }
  }
  private themSwings = 0

  /** I give up: the opponent wins. */
  quit() {
    if (this.phase === 'over') return
    this.send({ k: 'quit' })
    this.winner = this.opp
    this.endWhy = 'quit'
    this.phase = 'over'
    this.phaseT = 0
  }
}

const WHY_TEXT: Record<Why, (mine: boolean) => string> = {
  out: (mine) => (mine ? 'đối thủ đánh ra ngoài' : 'bóng ra ngoài'),
  net: (mine) => (mine ? 'đối thủ đánh vào lưới' : 'bóng vào lưới'),
  double: (mine) => (mine ? 'đối thủ không đỡ kịp' : 'bạn không đỡ kịp'),
  serveOut: (mine) => (mine ? 'giao bóng hỏng' : 'giao bóng ra ngoài ô'),
  serveKitchen: (mine) => (mine ? 'giao bóng rơi vào vùng bếp' : 'giao bóng rơi vào vùng bếp'),
  quit: () => 'bỏ cuộc',
  gone: () => 'đối thủ đã rời trận',
}

const round2 = (v: number) => Math.round(v * 100) / 100
const round3 = (v: number) => Math.round(v * 1000) / 1000

/**
 * The computer opponent: drives a second engine (as the guest) with stick + buttons like a person would.
 * `level` 0 easy · 1 normal · 2 hard.
 */
export class PickleBot {
  private reaction = 0
  private plan: { x: number; y: number } | null = null
  private ballN = -2
  private misread = 0
  constructor(
    private e: PickleEngine,
    private level: number,
  ) {}

  input(dt: number): Input {
    const e = this.e
    const m = e.me
    const f = flipOf(e.role)
    const speedK = [0.55, 0.78, 1][this.level] ?? 0.78
    let gx = 0
    let gy = (COURT.halfL - 1.0) * e.sg
    let shot: Input['shot'] = null
    if (e.phase === 'serve' && e.server === e.role) {
      return { x: 0, y: 0, shot: e.phaseT > 1.1 ? 'drive' : null }
    }
    if (e.phase === 'rally' && e.owner === e.role) {
      this.reaction -= dt
      if (this.reaction <= 0) {
        this.reaction = [0.32, 0.2, 0.1][this.level] ?? 0.2
        const c = e.predictContact()
        // a new ball: sometimes the bot reads it wrong and runs to the wrong spot
        if (e.shotN !== this.ballN) {
          this.ballN = e.shotN
          this.misread = Math.random() < ([0.3, 0.16, 0.08][this.level] ?? 0.16) ? (Math.random() < 0.5 ? -1 : 1) * (1.3 + Math.random()) : 0
        }
        this.plan = c ? { x: c.x + this.misread + (Math.random() - 0.5) * (0.6 - this.level * 0.2), y: c.y + e.sg * 0.35 } : null
      }
      if (this.plan) {
        gx = this.plan.x
        gy = this.plan.y
      }
      const b = e.ball
      const d = Math.hypot(b.x - m.x, b.y - m.y)
      if (d < REACH * 0.85 && b.h < 1.7 && b.y * e.sg > 0) {
        const r = Math.random()
        const oppDeep = Math.abs(e.them.y) > 4
        shot = oppDeep && r < 0.35 ? 'dink' : !oppDeep && r < 0.22 ? 'lob' : 'drive'
        e.aimX = (Math.random() - 0.5) * 1.6
      }
    } else if (e.phase === 'rally') {
      // recover to the middle, a step behind the kitchen when the rally goes on
      gx = e.ball.x * 0.3
      gy = (e.shotN >= 2 ? 3.4 : COURT.halfL - 0.6) * e.sg
    }
    const dx = gx - m.x
    const dy = gy - m.y
    const len = Math.hypot(dx, dy)
    const k = len < 0.12 ? 0 : Math.min(1, len / 0.6) * speedK
    // own view: canonical × flip
    return { x: len ? (dx / len) * k * f : 0, y: len ? (dy / len) * k * f : 0, shot }
  }
}
