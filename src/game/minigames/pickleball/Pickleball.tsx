import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { NPCS, type Outfit } from '../../../data/npcs'
import { remotes } from '../../../net/client'
import { endMatch, onMatchData, sendMatch, usePickle } from '../../../net/pickleball'
import { usePlayer } from '../../../store/playerStore'
import { playSfx } from '../../systems/audio'
import { burst } from '../juice'
import { usePickleSession } from './session'
import { PickleBot, PickleEngine, type Input, type Msg, type Role } from './engine'

/**
 * 1.39 Pickleball 1v1 (Sân pickleball Hàng Khay): the match is shown in 3D on the real court (PickleMatchView, same
 * chibis and look as the rest of the game); this is the layer on top — score, messages, a stick on the left, three
 * shot buttons on the right (Đánh / Bỏ nhỏ / Lốp; keys Space·J / K / L, move with WASD or the arrows).
 * mode 'online': the match from the lobby (net/pickleball.ts); 'bot': against the computer, level 0–2.
 */

export interface PickleOutcome {
  won: boolean
  mine: number
  theirs: number
  online: boolean
  /** The match ended because someone gave up / left. */
  forfeit: boolean
}

const BOT_NAMES = ['Anh Bảo (máy, dễ)', 'Anh Bảo (máy, vừa)', 'Anh Bảo (máy, khó)']

type Shot = Input['shot']

interface Setup {
  engine: PickleEngine
  /** The bot's engine + brain (bot mode). */
  bot: { engine: PickleEngine; brain: PickleBot } | null
  toMe: Msg[]
  toBot: Msg[]
  oppName: string
  them: Outfit
  online: boolean
}

function setup(mode: 'online' | 'bot', level: number): Setup | null {
  if (mode === 'online') {
    const m = usePickle.getState().match
    if (!m) return null
    const engine = new PickleEngine(m.role, m.first, (msg) => sendMatch(msg), { assist: true })
    const them = remotes.get(m.opp.id)?.outfit ?? NPCS.anhChayBo.outfit
    return { engine, bot: null, toMe: [], toBot: [], oppName: m.opp.name, them, online: true }
  }
  const toMe: Msg[] = []
  const toBot: Msg[] = []
  const first: Role = Math.random() < 0.5 ? 'host' : 'guest'
  const engine = new PickleEngine('host', first, (msg) => toBot.push(msg), { assist: true, latency: 0 })
  const botEngine = new PickleEngine('guest', first, (msg) => toMe.push(msg), { latency: 0, skill: [0.5, 0.78, 1][level] ?? 0.78 })
  return { engine, bot: { engine: botEngine, brain: new PickleBot(botEngine, level) }, toMe, toBot, oppName: BOT_NAMES[level] ?? BOT_NAMES[1], them: NPCS.anhChayBo.outfit, online: false }
}

interface Hud {
  mine: number
  theirs: number
  serving: 'me' | 'them'
  banner: { text: string; tone: string } | null
  over: boolean
  /** "Đẹp!" after a great shot. */
  nice: boolean
}

export function PickleballGame({ mode, level, onDone }: { mode: 'online' | 'bot'; level: number; onDone: (r: PickleOutcome) => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [game, setGame] = useState(() => setup(mode, level))
  const [hud, setHud] = useState<Hud>({ mine: 0, theirs: 0, serving: 'me', banner: null, over: false, nice: false })
  const [confirmQuit, setConfirmQuit] = useState(false)
  const stick = useRef({ x: 0, y: 0 })
  const keys = useRef(new Set<string>())
  const pendingShot = useRef<Shot>(null)
  const myOutfit = usePlayer((s) => s.outfit)

  // online: messages from the opponent
  useEffect(() => {
    if (!game?.online) return
    return onMatchData((d) => game.engine.receive(d as Msg))
  }, [game])

  // the 3D view on the court follows this match
  useEffect(() => {
    if (!game) return
    const themId = game.online ? (usePickle.getState().match?.opp.id ?? null) : null
    usePickleSession.setState({ session: { engine: game.engine, me: myOutfit, them: game.them, themName: game.oppName, themId } })
    return () => usePickleSession.setState({ session: null })
  }, [game, myOutfit])

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return
      keys.current.add(e.code)
      if (e.code === 'Space' || e.code === 'KeyJ') pendingShot.current = 'drive'
      else if (e.code === 'KeyK') pendingShot.current = 'dink'
      else if (e.code === 'KeyL') pendingShot.current = 'lob'
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault()
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // the frame loop: messages → engines → sounds → HUD (React only when something shown changed); the 3D view reads
  // the engine in its own frame loop
  useEffect(() => {
    if (!game) return
    let raf = 0
    let last = performance.now()
    let hudKey = ''
    let reported = false
    let niceUntil = 0
    const { engine, bot } = game
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // real time, in steps of at most 50 ms (a slow phone does not play in slow motion; ≤ 0.25 s caught up per frame)
      let left = Math.min(0.25, (now - last) / 1000)
      last = now
      // deliver the bot's / my messages (bot mode: in memory)
      if (bot) {
        for (const m of game.toMe.splice(0)) engine.receive(m)
        for (const m of game.toBot.splice(0)) bot.engine.receive(m)
      }
      // input
      const k = keys.current
      let ix = stick.current.x + (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0)
      let iy = stick.current.y + (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0) - (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0)
      const len = Math.hypot(ix, iy)
      if (len > 1) {
        ix /= len
        iy /= len
      }
      let shot = pendingShot.current
      pendingShot.current = null
      while (left > 1e-4) {
        const dt = Math.min(0.05, left)
        left -= dt
        engine.step(dt, { x: ix, y: iy, shot })
        shot = null
        if (bot) {
          bot.engine.step(dt, bot.brain.input(dt))
          bot.engine.events.length = 0
          for (const m of game.toMe.splice(0)) engine.receive(m)
          for (const m of game.toBot.splice(0)) bot.engine.receive(m)
        }
      }
      // sounds + effects
      for (const ev of engine.events.splice(0)) {
        if (ev.kind === 'hit') playSfx('pock')
        else if (ev.kind === 'bounce') playSfx('bounce')
        else if (ev.kind === 'nice') niceUntil = now + 700
        else if (ev.kind === 'point') playSfx(ev.mine ? 'right' : 'wrong')
        else if (ev.kind === 'win') {
          playSfx('success')
          if (root.current) burst(root.current, 'big')
        } else if (ev.kind === 'lose') playSfx('fail')
      }
      // the end: tell the server once (back to the room)
      if (engine.phase === 'over' && !reported) {
        reported = true
        if (game.online) endMatch()
      }
      const mine = engine.score[engine.role]
      const theirs = engine.score[engine.opp]
      const serving = engine.server === engine.role ? 'me' : 'them'
      const banner = engine.banner ? { text: engine.banner.text, tone: engine.banner.tone } : null
      const over = engine.phase === 'over'
      const nice = now < niceUntil
      const hk = `${mine}|${theirs}|${serving}|${banner?.text ?? ''}|${over}|${nice}`
      if (hk !== hudKey) {
        hudKey = hk
        setHud({ mine, theirs, serving, banner, over, nice })
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [game])

  if (!game) {
    return (
      <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-[#2f5a3c] text-white">
        <button type="button" className="btn-jade rounded-2xl px-5 py-2 font-black" onClick={() => onDone({ won: false, mine: 0, theirs: 0, online: true, forfeit: true })}>
          Trận đấu không còn nữa — quay lại
        </button>
      </div>
    )
  }

  const e = game.engine
  const result = (): PickleOutcome => ({ won: e.winner === e.role, mine: e.score[e.role], theirs: e.score[e.opp], online: game.online, forfeit: e.endWhy === 'quit' || e.endWhy === 'gone' })
  const shotBtn = (shot: NonNullable<Shot>, label: string, cls: string) => (
    <button
      type="button"
      data-testid={`pb-${shot}`}
      onPointerDown={(ev) => {
        ev.preventDefault()
        pendingShot.current = shot
      }}
      className={`grid place-items-center rounded-full border-[3px] border-outline font-black text-white shadow-[0_4px_0_var(--color-outline)] select-none active:translate-y-1 active:shadow-none ${cls}`}
    >
      {label}
    </button>
  )

  return (
    <div ref={root} data-testid="pickleball" className="sx-safe pointer-events-none absolute inset-0 z-40 touch-none overflow-hidden select-none [&>*]:pointer-events-auto">
      {hud.nice && !hud.over && (
        <div className="animate-plop absolute top-[30%] left-1/2 -translate-x-1/2 font-display text-3xl font-black text-[#ffd34d] [text-shadow:0_3px_0_#4a3226,0_0_6px_#4a3226]">Đẹp!</div>
      )}

      {/* score */}
      <div className="absolute top-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl whitespace-nowrap max-sm:top-12 border-2 border-outline bg-[#1f3b2c]/90 px-3 py-1 text-white shadow-[0_3px_0_var(--color-outline)]" data-testid="pb-score">
        <span className="shrink-0 text-[13px] font-extrabold">{hud.serving === 'me' ? '● ' : ''}Bạn</span>
        <span className="shrink-0 font-display text-2xl leading-none font-black tabular-nums text-[#ffe08a]">
          {hud.mine} – {hud.theirs}
        </span>
        <span className="max-w-[9rem] truncate text-[13px] font-extrabold max-sm:max-w-[8rem]">
          {game.oppName}
          {hud.serving === 'them' ? ' ●' : ''}
        </span>
      </div>

      {hud.banner && !hud.over && (
        <div
          data-testid="pb-banner"
          className={`absolute top-12 left-1/2 max-w-[92%] -translate-x-1/2 truncate rounded-2xl border-2 border-outline px-3 py-1 text-center text-[13px] font-black whitespace-nowrap shadow-[0_3px_0_var(--color-outline)] max-sm:top-[5.5rem] ${hud.banner.tone === 'good' ? 'bg-[#3fbf6f] text-white' : hud.banner.tone === 'bad' ? 'bg-[#ff6f61] text-white' : 'bg-cream text-ink'}`}
        >
          {hud.banner.text}
        </div>
      )}

      {/* quit */}
      {!hud.over && (
        <button
          type="button"
          data-testid="pb-quit"
          onClick={() => setConfirmQuit(true)}
          className="absolute top-2 left-2 rounded-full border-2 border-outline bg-cream px-3 py-1 text-[13px] font-black text-ink shadow-[0_2px_0_var(--color-outline)]"
        >
          ✕ Bỏ cuộc
        </button>
      )}

      {/* stick */}
      {!hud.over && <Stick out={stick} />}

      {/* shots */}
      {!hud.over && (
        <div className="absolute right-3 bottom-3 grid grid-cols-2 items-end gap-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {shotBtn('dink', 'Bỏ nhỏ', 'h-14 w-14 bg-[#4c90d2] text-[12px]')}
          {shotBtn('lob', 'Lốp', 'h-14 w-14 bg-[#9b6fd1] text-[13px]')}
          <div className="col-span-2 flex justify-end">{shotBtn('drive', 'ĐÁNH', 'h-20 w-20 bg-[#e8553e] text-lg')}</div>
        </div>
      )}

      {confirmQuit && !hud.over && (
        <div className="absolute inset-0 grid place-items-center bg-ink/40">
          <div className="panel w-[min(20rem,90%)] p-4 text-center text-ink">
            <p className="font-black">Bỏ cuộc trận này?</p>
            <p className="mt-1 text-sm text-ink/70">Đối thủ sẽ được tính thắng.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border-2 border-outline bg-cream py-2 font-black" onClick={() => setConfirmQuit(false)}>
                Chơi tiếp
              </button>
              <button
                type="button"
                data-testid="pb-quit-yes"
                className="btn-lacquer flex-1 rounded-xl py-2 font-black"
                onClick={() => {
                  setConfirmQuit(false)
                  e.quit()
                }}
              >
                Bỏ cuộc
              </button>
            </div>
          </div>
        </div>
      )}

      {hud.over && (
        <div className="modal-scroll absolute inset-0 grid place-items-center bg-ink/45 p-3" data-testid="pb-over">
          <div className="panel w-[min(24rem,100%)] p-4 text-center text-ink">
            <p className="font-display text-3xl font-black">{e.winner === e.role ? 'Bạn thắng!' : 'Thua rồi…'}</p>
            <p className="mt-1 font-display text-4xl font-black tabular-nums text-[#b3261e]">
              {hud.mine} – {hud.theirs}
            </p>
            <p className="mt-1 text-sm text-ink/75">
              {e.endWhy === 'quit' ? (e.winner === e.role ? `${game.oppName} đã bỏ cuộc.` : 'Bạn đã bỏ cuộc.') : e.endWhy === 'gone' ? `${game.oppName} đã rời trận.` : `Gặp ${game.oppName}`}
            </p>
            <p className="mt-1 text-xs text-ink/60">
              Số cú đánh: {e.stats.hits} · Pha dài nhất: {e.stats.longest} cú
            </p>
            <div className="mt-3 flex gap-2">
              {!game.online && (
                <button
                  type="button"
                  data-testid="pb-again"
                  className="btn-jade flex-1 rounded-xl py-2 font-black"
                  onClick={() => {
                    setHud({ mine: 0, theirs: 0, serving: 'me', banner: null, over: false, nice: false })
                    setGame(setup(mode, level))
                  }}
                >
                  Chơi lại
                </button>
              )}
              <button type="button" data-testid="pb-done" className="btn-lacquer flex-1 rounded-xl py-2 font-black" onClick={() => onDone(result())}>
                {game.online ? 'Về phòng chờ' : 'Xong'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** A thumb stick for the left hand (writes −1…1 into `out`; y up = forward). */
function Stick({ out }: { out: { current: { x: number; y: number } } }) {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const id = useRef<number | null>(null)
  const R = 44
  const move = (ev: ReactPointerEvent) => {
    const el = base.current
    if (!el || id.current !== ev.pointerId) return
    const r = el.getBoundingClientRect()
    let dx = ev.clientX - (r.left + r.width / 2)
    let dy = ev.clientY - (r.top + r.height / 2)
    const l = Math.hypot(dx, dy)
    if (l > R) {
      dx = (dx / l) * R
      dy = (dy / l) * R
    }
    setKnob({ x: dx, y: dy })
    const dead = 0.12
    const nx = dx / R
    const ny = -dy / R
    out.current = Math.hypot(nx, ny) < dead ? { x: 0, y: 0 } : { x: nx, y: ny }
  }
  const end = () => {
    id.current = null
    setKnob({ x: 0, y: 0 })
    out.current = { x: 0, y: 0 }
  }
  return (
    <div
      ref={base}
      data-testid="pb-stick"
      className="absolute bottom-4 left-4 h-32 w-32 touch-none rounded-full border-[3px] border-white/50 bg-black/15"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      onPointerDown={(ev) => {
        id.current = ev.pointerId
        ;(ev.target as HTMLElement).setPointerCapture?.(ev.pointerId)
        move(ev)
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute top-1/2 left-1/2 h-14 w-14 rounded-full border-[3px] border-outline bg-cream shadow-[0_3px_0_var(--color-outline)]"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  )
}
