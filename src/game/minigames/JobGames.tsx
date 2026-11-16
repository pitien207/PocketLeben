import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CONFIG } from '../../data/config'
import { SENTENCES } from '../../data/vocab'
import { formatMoney } from '../../i18n/format'
import { useLocalize, type Localized } from '../../i18n/localized'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { playSfx } from '../systems/audio'
import { bumpFlag, flagNumber, getFlag, setFlag } from '../systems/conditions'
import { weekdayIndex } from '../systems/time'
import { AnswerButton, MinigameFrame, shuffle } from './common'

/**
 * Mini-games of the Vietnamese side jobs (story 2.1 §11.1): Circle K (change, shelves, microwave
 * in 90 seconds), Grab (a top-down map of the Old Quarter), tutoring (find the wrong step).
 */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })
const vnd = (n: number) => formatMoney(n, 'VND')
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

// ===================================================================================== Circle K

type KTask =
  | { kind: 'change'; price: number; paid: number; options: number[] }
  | { kind: 'shelf'; q: Localized; options: { text: Localized; ok: boolean }[] }
  | { kind: 'micro'; item: Localized; target: number }

const SHELF_ITEMS: { item: Localized; right: Localized; wrong: Localized[] }[] = [
  { item: L('Sữa chua', 'Yoghurt'), right: L('Tủ mát', 'Fridge'), wrong: [L('Kệ mì', 'Noodle shelf'), L('Kệ bánh kẹo', 'Snack shelf')] },
  { item: L('Mì ly', 'Cup noodles'), right: L('Kệ mì', 'Noodle shelf'), wrong: [L('Tủ đông', 'Freezer'), L('Quầy thu ngân', 'Till')] },
  { item: L('Kem que', 'Ice lolly'), right: L('Tủ đông', 'Freezer'), wrong: [L('Tủ mát', 'Fridge'), L('Kệ nước', 'Drinks shelf')] },
  { item: L('Nước suối', 'Bottled water'), right: L('Kệ nước', 'Drinks shelf'), wrong: [L('Kệ mì', 'Noodle shelf'), L('Tủ đông', 'Freezer')] },
  { item: L('Bánh quy', 'Biscuits'), right: L('Kệ bánh kẹo', 'Snack shelf'), wrong: [L('Tủ mát', 'Fridge'), L('Kệ nước', 'Drinks shelf')] },
]
const MICRO: { item: Localized; target: number }[] = [
  { item: L('Xúc xích', 'Sausage'), target: 30 },
  { item: L('Cơm nắm', 'Rice ball'), target: 40 },
  { item: L('Bánh bao', 'Steamed bun'), target: 50 },
  { item: L('Mì ly (đổ nước nóng)', 'Cup noodles (hot water)'), target: 20 },
]

function nextTask(rank: number): KTask {
  const r = Math.random()
  if (r < 0.45) {
    const price = (12 + Math.floor(Math.random() * (rank >= 1 ? 180 : 90))) * 1000 + (rank >= 2 && Math.random() < 0.5 ? 500 : 0)
    const paid = [100_000, 200_000, 500_000].find((p) => p > price) ?? 500_000
    const right = paid - price
    const wrong = shuffle([right + 10_000, right - 10_000, right + 1_000, right - 100_000, right + 100_000].filter((v) => v > 0 && v !== right)).slice(0, 3)
    return { kind: 'change', price, paid, options: shuffle([right, ...wrong]) }
  }
  if (r < 0.75) {
    if (Math.random() < 0.5) {
      const it = pick(SHELF_ITEMS)
      return {
        kind: 'shelf',
        q: L(`Xếp „${it.item.vi}" vào đâu?`, `Where does “${it.item.en}” go?`),
        options: shuffle([{ text: it.right, ok: true }, ...it.wrong.map((w) => ({ text: w, ok: false }))]),
      }
    }
    const d1 = 3 + Math.floor(Math.random() * 10)
    const d2 = d1 + 2 + Math.floor(Math.random() * 8)
    return {
      kind: 'shelf',
      q: L('Hai thùng sữa: hộp nào xếp lên trước kệ?', 'Two crates of milk: which goes to the front?'),
      options: shuffle([
        { text: L(`HSD ${String(d1).padStart(2, '0')}/11`, `Best before ${d1} Nov`), ok: true },
        { text: L(`HSD ${String(d2).padStart(2, '0')}/11`, `Best before ${d2} Nov`), ok: false },
      ]),
    }
  }
  const m = pick(MICRO)
  return { kind: 'micro', item: m.item, target: m.target }
}

const NIGHT_EVENTS: { text: Localized; choices: { text: Localized; good: boolean; flag?: string }[] }[] = [
  {
    text: L('2 giờ sáng: một nhóm sinh viên ôn thi vào mua 20 gói mì.', '2 a.m.: a group of students cramming buys 20 packs of noodles.'),
    choices: [{ text: L('Tính nhanh, chúc thi tốt!', 'Ring them up fast, wish them luck!'), good: true }],
  },
  {
    text: L('Có người say nằm ngủ trước cửa.', 'A drunk man is asleep at the door.'),
    choices: [
      { text: L('Gọi bảo vệ, mang cho chú chai nước', 'Call security, bring him water'), good: true },
      { text: L('Kệ chú ấy', 'Ignore him'), good: false },
    ],
  },
  {
    text: L('Mất điện! Tính tiền bằng giấy bút.', 'Power cut! You ring up with pen and paper.'),
    choices: [{ text: L('Bình tĩnh tính tay', 'Stay calm, count by hand'), good: true }],
  },
  {
    text: L('3 giờ sáng: Linh vào mua cà phê lon. „Tớ học bài cả đêm…"', '3 a.m.: Linh buys a canned coffee. “I’ve been studying all night…”'),
    choices: [{ text: L('Ngồi ôn từ vựng cùng Linh 10 phút', 'Revise vocabulary with Linh for 10 minutes'), good: true, flag: 'linh.nightTalk' }],
  },
]

export function CircleKGame({ night, rank, onComplete }: { night: boolean; rank: number; onComplete: (correct: number, total: number, extra?: number) => void }) {
  const localize = useLocalize()
  const total = CONFIG.vnJobs.circleK.seconds
  const [left, setLeft] = useState(total)
  const [task, setTask] = useState<KTask>(() => nextTask(rank))
  const [score, setScore] = useState({ ok: 0, all: 0, deduct: 0 })
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const [event, setEvent] = useState(() => (night ? pick(NIGHT_EVENTS) : null))
  const [micro, setMicro] = useState(0)
  const done = useRef(false)
  const scoreRef = useRef(score)
  scoreRef.current = score

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    const s = scoreRef.current
    onComplete(s.ok, Math.max(1, s.all), s.deduct)
  }, [onComplete])

  useEffect(() => {
    if (event) return
    const id = window.setInterval(() => setLeft((l) => (l <= 0.1 ? 0 : l - 0.1)), 100)
    return () => window.clearInterval(id)
  }, [event])
  useEffect(() => {
    if (left <= 0) finish()
  }, [left, finish])

  // Microwave: the seconds run fast; stop near the target.
  useEffect(() => {
    if (task.kind !== 'micro' || event) return
    setMicro(0)
    const id = window.setInterval(() => setMicro((m) => (m >= 99 ? 0 : m + 1)), 110 - rank * 15)
    return () => window.clearInterval(id)
  }, [task, rank, event])

  const resolve = (ok: boolean, deduct = 0) => {
    playSfx(ok ? 'right' : 'wrong')
    setFlash(ok ? 'ok' : 'bad')
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), all: s.all + 1, deduct: s.deduct + deduct }))
    window.setTimeout(() => {
      setFlash(null)
      setTask(nextTask(rank))
    }, 450)
  }

  if (event) {
    return (
      <MinigameFrame title="Circle K · Ca đêm">
        <p className="mb-3 text-[15px] leading-snug font-extrabold">{localize(event.text)}</p>
        <div className="flex flex-col gap-2">
          {event.choices.map((c, i) => (
            <AnswerButton
              key={i}
              state="idle"
              onClick={() => {
                if (c.flag) {
                  setFlag(c.flag, true)
                  usePlayer.getState().addGermanXp(4)
                }
                usePlayer.getState().changeMood(c.good ? 3 : -2)
                setEvent(null)
              }}
            >
              {localize(c.text)}
            </AnswerButton>
          ))}
        </div>
      </MinigameFrame>
    )
  }

  const tol = rank >= 2 ? 2 : 3
  return (
    <MinigameFrame title={night ? 'Circle K · Ca đêm' : 'Circle K · Ca ngày'} timer={left / total}>
      <div className={`mb-2 flex justify-between text-[12px] font-black ${flash === 'ok' ? 'text-jade' : flash === 'bad' ? 'text-lacquer' : ''}`}>
        <span>✓ {score.ok}</span>
        <span>{Math.ceil(left)} s</span>
        {score.deduct > 0 && <span className="text-lacquer">−{vnd(score.deduct)}</span>}
      </div>
      {task.kind === 'change' && (
        <>
          <p className="mb-1 text-sm font-bold opacity-70">{localize(L('Tính tiền: thối lại bao nhiêu?', 'Till: how much change?'))}</p>
          <p className="mb-3 text-center font-display text-xl font-extrabold">
            {vnd(task.price)} · {localize(L('khách đưa', 'paid'))} {vnd(task.paid)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {task.options.map((o) => (
              <AnswerButton key={o} state="idle" onClick={() => resolve(o === task.paid - task.price, o === task.paid - task.price ? 0 : 20_000)}>
                {vnd(o)}
              </AnswerButton>
            ))}
          </div>
        </>
      )}
      {task.kind === 'shelf' && (
        <>
          <p className="mb-3 text-center text-[15px] font-extrabold">{localize(task.q)}</p>
          <div className="flex flex-col gap-2">
            {task.options.map((o, i) => (
              <AnswerButton key={i} state="idle" onClick={() => resolve(o.ok)}>
                {localize(o.text)}
              </AnswerButton>
            ))}
          </div>
        </>
      )}
      {task.kind === 'micro' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-[15px] font-extrabold">
            {localize(L('Hâm', 'Heat'))} {localize(task.item)}: <b>{task.target} s</b> (±{tol})
          </p>
          <div className="rounded-xl bg-ink px-6 py-2 font-mono text-4xl font-black text-[#7dffb0] tabular-nums">{String(micro).padStart(2, '0')}</div>
          <button type="button" data-testid="micro-stop" onClick={() => resolve(Math.abs(micro - task.target) <= tol)} className="w-full rounded-2xl btn-lacquer py-3 text-lg font-extrabold">
            STOP
          </button>
        </div>
      )}
    </MinigameFrame>
  )
}

// ========================================================================================= Grab

const N = 7
type Cell = { x: number; y: number }
const isRoad = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && (x % 2 === 0 || y % 2 === 0)
/** One-way rows/columns: row 2 only eastward, column 4 only southward. */
const ONE_WAY = { row: 2, rowDir: 1, col: 4, colDir: 1 }
const JAMS = new Set(['2,1', '3,4', '5,2', '0,5'])
const WALK_ROW = 6

function allowed(from: Cell, dx: number, dy: number) {
  const to = { x: from.x + dx, y: from.y + dy }
  if (!isRoad(to.x, to.y)) return false
  if (dy === 0 && from.y === ONE_WAY.row && to.y === ONE_WAY.row && dx !== ONE_WAY.rowDir) return false
  if (dx === 0 && from.x === ONE_WAY.col && to.x === ONE_WAY.col && dy !== ONE_WAY.colDir) return false
  return true
}
const cost = (c: Cell) => (JAMS.has(`${c.x},${c.y}`) ? 3 : 1)

/** Cheapest cost from a to b (Dijkstra on the tiny grid). */
function bestCost(a: Cell, b: Cell, avoidWalk: boolean) {
  const dist = new Map<string, number>([[`${a.x},${a.y}`, 0]])
  const queue: [number, Cell][] = [[0, a]]
  while (queue.length) {
    queue.sort((p, q) => p[0] - q[0])
    const [d, c] = queue.shift()!
    if (c.x === b.x && c.y === b.y) return d
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!allowed(c, dx, dy)) continue
      const n = { x: c.x + dx, y: c.y + dy }
      if (avoidWalk && n.y === WALK_ROW && !(n.x === b.x && n.y === b.y)) continue
      const nd = d + cost(n)
      const k = `${n.x},${n.y}`
      if (nd < (dist.get(k) ?? Infinity)) {
        dist.set(k, nd)
        queue.push([nd, n])
      }
    }
  }
  return 99
}

function randomRoad(not: Cell[], avoidWalk: boolean): Cell {
  for (;;) {
    const c = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }
    if (!isRoad(c.x, c.y) || (avoidWalk && c.y === WALK_ROW)) continue
    if (not.some((o) => Math.abs(o.x - c.x) + Math.abs(o.y - c.y) < 3)) continue
    return c
  }
}

type Rider = 'normal' | 'jakob' | 'tourist' | 'khai' | 'xoi'
const QUIZ: { q: Localized; options: Localized[] }[] = [
  { q: L('„Phố Hàng Gai xưa bán gì vậy?"', '“What did Hàng Gai street sell in the old days?”'), options: [L('Đay gai, dây thừng', 'Hemp and rope'), L('Lụa tơ tằm', 'Silk'), L('Đồ đồng', 'Bronze')] },
  { q: L('„Hồ Gươm gắn với truyền thuyết gì?"', '“What legend is Hoàn Kiếm Lake known for?”'), options: [L('Vua Lê trả gươm cho Rùa Thần', 'King Lê returns the sword to the Golden Turtle'), L('Thánh Gióng bay về trời', 'Thánh Gióng flies to heaven'), L('Sơn Tinh – Thủy Tinh', 'Mountain and Water gods')] },
  { q: L('„Đình Hàng Gai thờ ai?"', '“Who is worshipped at the Hàng Gai đình?”'), options: [L('Thành hoàng làng', 'The village guardian spirit'), L('Phật Bà Quan Âm', 'Guanyin'), L('Vua Hùng', 'The Hùng kings')] },
  { q: L('„Cây cầu đỏ sang đền Ngọc Sơn tên gì?"', '“What is the red bridge to Ngọc Sơn temple called?”'), options: [L('Cầu Thê Húc', 'Thê Húc bridge'), L('Cầu Long Biên', 'Long Biên bridge'), L('Cầu Rồng', 'Dragon bridge')] },
  { q: L('„Năm 1989 ở Đức có chuyện gì lớn?"', '“What big event happened in Germany in 1989?”'), options: [L('Bức tường Berlin sụp đổ', 'The Berlin Wall fell'), L('Đức vô địch World Cup', 'Germany won the World Cup'), L('Đồng Euro ra đời', 'The euro was born')] },
]

export function GrabGame({ rain, rank, onComplete }: { rain: boolean; rank: number; onComplete: (correct: number, total: number, extra?: number) => void }) {
  const localize = useLocalize()
  const G = CONFIG.vnJobs.grab
  const weekend = weekdayIndex(useTime.getState().day) >= 5
  const early = useTime.getState().minutes < 8 * 60
  const rides = 4 + rank
  const [pos, setPos] = useState<Cell>({ x: 0, y: 0 })
  const [ride, setRide] = useState(0)
  const [leg, setLeg] = useState<'pickup' | 'drop'>('pickup')
  const [plan, setPlan] = useState(() => newRide({ x: 0, y: 0 }))
  const [moves, setMoves] = useState(0)
  const [earned, setEarned] = useState(0)
  const [stars, setStars] = useState<number[]>([])
  const [card, setCard] = useState<'intro' | 'drive' | 'talk'>('intro')
  const [talk, setTalk] = useState<{ q: Localized; options: { t: Localized; ok: boolean }[]; done?: boolean } | null>(null)
  const [note, setNote] = useState<string | null>(null)

  function newRide(from: Cell) {
    const p = randomRoad([from], weekend)
    const d = randomRoad([from, p], weekend)
    const roll = Math.random()
    let rider: Rider = 'normal'
    if (early && !getFlag('grab.xoiDay')) rider = 'xoi'
    else if (roll < 0.2 && flagNumber('grab.jakob') < 5) rider = 'jakob'
    else if (roll < 0.4) rider = 'tourist'
    else if (roll < 0.5 && !getFlag('khai.overheard')) rider = 'khai'
    return { p, d, rider, best: bestCost(from, p, weekend) + bestCost(p, d, weekend) }
  }

  const riderLine: Record<Rider, Localized> = {
    normal: L('Khách: „Em ơi cho chị ra phố Hàng Bông nhé."', 'Rider: “To Hàng Bông street, please.”'),
    jakob: L('Herr Jakob (Tây Hồ): „Chào em! Hôm nay mình nói tiếng Đức hay tiếng Việt?"', 'Herr Jakob (Tây Hồ): “Hello! German or Vietnamese today?”'),
    tourist: L('Khách Tây: „Can you tell me about the Old Quarter on the way?"', 'Tourist: “Can you tell me about the Old Quarter on the way?”'),
    khai: L('Anh Khải ngồi sau, gọi điện liên tục: „Bao đậu visa, không cần B1 đâu chị…"', 'Khải on the back seat, on the phone non-stop: “Visa guaranteed, no B1 needed…”'),
    xoi: L('Bà bán xôi đi chợ Đồng Xuân lúc sáng sớm.', 'The sticky-rice seller off to Đồng Xuân market at dawn.'),
  }

  const move = (dx: number, dy: number) => {
    if (card !== 'drive' || !allowed(pos, dx, dy)) {
      if (card === 'drive') playSfx('wrong')
      return
    }
    const n = { x: pos.x + dx, y: pos.y + dy }
    setPos(n)
    setMoves((m) => m + cost(n))
    if (weekend && n.y === WALK_ROW && !getFlag(`grab.fined.${ride}`)) {
      setFlag(`grab.fined.${ride}`, true)
      setEarned((e) => e - G.fine)
      setNote(localize(L('Rẽ vào phố đi bộ cuối tuần: phạt {f}!', 'Into the weekend walking street: {f} fine!')).replace('{f}', vnd(G.fine)))
      playSfx('fail')
    }
    const target = leg === 'pickup' ? plan.p : plan.d
    if (n.x === target.x && n.y === target.y) {
      if (leg === 'pickup') {
        playSfx('honk')
        setLeg('drop')
      } else arrive(moves + cost(n))
    }
  }

  const arrive = (used: number) => {
    const extra = used - plan.best
    const s = extra <= 1 ? 5 : extra <= 3 ? 4 : extra <= 6 ? 3 : 2
    const fare = Math.round(((G.min + (G.max - G.min) * (s / 5)) / rides) * (rain ? 1 + G.rainBonus : 1))
    const tip = s === 5 ? 10_000 + Math.floor(Math.random() * 3) * 5_000 : 0
    playSfx('coin')
    setStars((list) => [...list, s])
    if (plan.rider === 'xoi') {
      setGrabXoi()
      setEarned((e) => e + tip)
    } else setEarned((e) => e + fare + tip)
    // Special riders talk after the ride.
    if (plan.rider === 'jakob') {
      const n = flagNumber('grab.jakob') + 1
      setFlag('grab.jakob', n)
      const sentence = pick(SENTENCES.filter((x) => x.level <= 2))
      const others = shuffle(SENTENCES.filter((x) => x.de !== sentence.de)).slice(0, 2)
      setTalk({
        q: n >= 5 ? L(`Herr Jakob: „Khi nào sang Lindenberg, nhớ đến tiệm bánh của em gái tôi nhé!" — rồi ông hỏi: „${sentence.de}" nghĩa là gì?`, `Herr Jakob: “When you come to Lindenberg, visit my sister’s bakery!” — then: what does “${sentence.de}” mean?`) : L(`Herr Jakob sửa tiếng Đức cho em: „${sentence.de}" nghĩa là gì?`, `Herr Jakob corrects your German: what does “${sentence.de}” mean?`),
        options: shuffle([{ t: sentence.meaning, ok: true }, ...others.map((o) => ({ t: o.meaning, ok: false }))]),
      })
      if (n >= 5) setFlag('jakob.bakery', true)
      setCard('talk')
      return
    }
    if (plan.rider === 'tourist') {
      const qz = pick(QUIZ)
      setTalk({ q: qz.q, options: shuffle(qz.options.map((o, i) => ({ t: o, ok: i === 0 }))) })
      setCard('talk')
      return
    }
    if (plan.rider === 'khai') {
      setFlag('khai.overheard', true)
      setNote(localize(L('Bạn nghe lén được: Hoàng Kim hứa „không cần B1"… Phải báo cho Linh!', 'You overheard it: Hoàng Kim promises “no B1 needed”… You must warn Linh!')))
    }
    nextRide()
  }

  const setGrabXoi = () => {
    setFlag('grab.xoiDay', useTime.getState().day)
    usePlayer.getState().restoreEnergy(15)
    setNote(localize(L('Bà bán xôi trả bằng một gói xôi nóng (+15 năng lượng).', 'The seller pays with a warm pack of sticky rice (+15 energy).')))
  }

  const nextRide = () => {
    if (ride + 1 >= rides) {
      window.setTimeout(() => {
        const total = stars.length + 1
        onComplete(total, total, Math.max(0, earnedRef.current))
      }, 600)
      return
    }
    setRide((r) => r + 1)
    setLeg('pickup')
    setMoves(0)
    setPlan(newRide(posRef.current))
    setCard('intro')
  }

  const earnedRef = useRef(earned)
  earnedRef.current = earned
  const posRef = useRef(pos)
  posRef.current = pos

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] }
      const d = m[e.code]
      if (d) {
        e.preventDefault()
        move(d[0], d[1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const target = leg === 'pickup' ? plan.p : plan.d
  const cells = useMemo(() => Array.from({ length: N * N }, (_, i) => ({ x: i % N, y: Math.floor(i / N) })), [])

  return (
    <MinigameFrame title={`Grab · ${ride + 1}/${rides}${rain ? ' · 🌧' : ''}`}>
      <div className="mb-2 flex justify-between text-[12px] font-black">
        <span>{vnd(Math.max(0, earned))}</span>
        <span>{'★'.repeat(stars[stars.length - 1] ?? 0)}</span>
      </div>
      {card === 'intro' && (
        <div className="mb-2 flex flex-col gap-2">
          <p className="text-[15px] leading-snug font-extrabold">{localize(riderLine[plan.rider])}</p>
          <button type="button" data-testid="grab-accept" onClick={() => setCard('drive')} className="w-full rounded-2xl btn-jade py-2.5 font-extrabold">
            {localize(L('Nhận cuốc', 'Accept ride', 'Fahrt annehmen'))}
          </button>
        </div>
      )}
      {card === 'talk' && talk && (
        <div className="mb-2 flex flex-col gap-2">
          <p className="text-[14px] leading-snug font-extrabold">{localize(talk.q)}</p>
          {talk.options.map((o, i) => (
            <AnswerButton
              key={i}
              state="idle"
              onClick={() => {
                playSfx(o.ok ? 'right' : 'wrong')
                if (o.ok) {
                  if (plan.rider === 'tourist') setEarned((e) => e + 50_000 + Math.floor(Math.random() * 6) * 10_000)
                  else usePlayer.getState().addGermanXp(3)
                  bumpFlag('grab.talksOk')
                }
                setTalk(null)
                nextRide()
              }}
            >
              {localize(o.t)}
            </AnswerButton>
          ))}
        </div>
      )}
      {note && <p className="mb-2 rounded-lg bg-gold/25 px-2 py-1 text-[12px] font-bold">{note}</p>}
      <div className="mx-auto grid w-full max-w-[300px] grid-cols-7 gap-[2px] rounded-xl bg-[#c9bfae] p-[2px]" style={{ aspectRatio: '1' }}>
        {cells.map((c) => {
          const road = isRoad(c.x, c.y)
          const here = c.x === pos.x && c.y === pos.y
          const isTarget = c.x === target.x && c.y === target.y
          const walk = weekend && c.y === WALK_ROW
          const jam = JAMS.has(`${c.x},${c.y}`)
          const arrow = road && c.y === ONE_WAY.row && c.x % 2 === 1 ? '→' : road && c.x === ONE_WAY.col && c.y % 2 === 1 ? '↓' : ''
          return (
            <div
              key={`${c.x},${c.y}`}
              className={`relative grid place-items-center rounded-[3px] text-[15px] leading-none ${road ? (walk ? 'bg-[#ffd1dc]' : 'bg-[#6f7480]') : 'bg-[#f2c46d]'}`}
            >
              {jam && road && <span className="absolute inset-0 rounded-[3px] bg-[#d4473b]/45" />}
              {arrow && <span className="absolute text-[11px] font-black text-white/80">{arrow}</span>}
              {isTarget && <span className="relative">{leg === 'pickup' ? '🙋' : '🏁'}</span>}
              {here && <span className="relative">🛵</span>}
            </div>
          )
        })}
      </div>
      <p className="mt-1 text-center text-[11px] font-bold opacity-70">
        {localize(L('Đỏ = tắc đường · → ↓ = phố một chiều', 'Red = traffic jam · → ↓ = one-way'))}
        {weekend ? localize(L(' · Hồng = phố đi bộ (phạt!)', ' · Pink = walking street (fine!)')) : ''}
      </p>
      <div className="mx-auto mt-2 grid w-40 grid-cols-3 gap-1">
        <span />
        <PadButton label="↑" onClick={() => move(0, -1)} />
        <span />
        <PadButton label="←" onClick={() => move(-1, 0)} />
        <PadButton label="↓" onClick={() => move(0, 1)} />
        <PadButton label="→" onClick={() => move(1, 0)} />
      </div>
    </MinigameFrame>
  )
}

function PadButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" data-testid={`pad-${label}`} onClick={onClick} className="h-12 rounded-xl btn-lacquer text-xl font-black active:translate-y-0.5">
      {label}
    </button>
  )
}

// ====================================================================================== Tutoring

interface MathProblem {
  task: string
  lines: string[]
  wrong: number
  /** First = the right fix. */
  fixes: string[]
}

const PROBLEMS: MathProblem[] = [
  { task: '1/2 + 1/3', lines: ['= 3/6 + 2/6', '= 5/12'], wrong: 1, fixes: ['= 5/6', '= 5/3', '= 6/5'] },
  { task: '2/3 × 3/4', lines: ['= (2·3)/(3·4)', '= 6/12', '= 1/3'], wrong: 2, fixes: ['= 1/2', '= 2/3', '= 6/7'] },
  { task: '3/4 − 1/8', lines: ['= 6/8 − 1/8', '= 5/0'], wrong: 1, fixes: ['= 5/8', '= 5/16', '= 2/4'] },
  { task: '5/6 : 5/3', lines: ['= 5/6 × 5/3', '= 25/18'], wrong: 0, fixes: ['= 5/6 × 3/5', '= 6/5 × 5/3', '= 5/6 − 5/3'] },
  { task: 'Rút gọn 12/18', lines: ['= (12:6)/(18:6)', '= 2/4'], wrong: 1, fixes: ['= 2/3', '= 3/2', '= 1/2'] },
  { task: '1 + 2/5', lines: ['= 1/5 + 2/5', '= 3/5'], wrong: 0, fixes: ['= 5/5 + 2/5', '= 1/1 + 2/5 = 3/6', '= 2/5 + 1/5'] },
  { task: '2/5 + 1/5', lines: ['= 3/10'], wrong: 0, fixes: ['= 3/5', '= 2/25', '= 3/25'] },
  { task: '(−1/2) × 4', lines: ['= −4/2', '= 2'], wrong: 1, fixes: ['= −2', '= −1/8', '= 8'] },
]

export function TutorGame({ rank, onComplete }: { rank: number; onComplete: (correct: number, total: number) => void }) {
  const localize = useLocalize()
  const problems = useMemo(() => shuffle(PROBLEMS).slice(0, 4).map((p) => ({ ...p, fixes: shuffle(p.fixes.map((f, i) => ({ f, ok: i === 0 }))) })), [])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'find' | 'fix' | 'show'>('find')
  const [points, setPoints] = useState(0)
  const [patience, setPatience] = useState(1)
  const [tapped, setTapped] = useState<number | null>(null)
  const p = problems[index]
  const seconds = 22 - rank * 4

  useEffect(() => {
    if (phase === 'show') return
    const start = performance.now()
    const id = window.setInterval(() => {
      const f = 1 - (performance.now() - start) / (seconds * 1000)
      setPatience(Math.max(0, f))
      if (f <= 0) {
        window.clearInterval(id)
        advance(0)
      }
    }, 100)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase])

  const advance = (gained: number) => {
    const total = points + gained
    setPoints(total)
    setPhase('show')
    window.setTimeout(() => {
      if (index + 1 >= problems.length) onComplete(total, problems.length * 2)
      else {
        setIndex(index + 1)
        setPhase('find')
        setTapped(null)
      }
    }, 900)
  }

  if (!p) return null
  return (
    <MinigameFrame title={localize(L('Kèm học Toán', 'Maths tutoring', 'Mathe-Nachhilfe'))} step={index} total={problems.length} timer={phase === 'show' ? undefined : patience}>
      <p className="mb-1 text-[12px] font-bold opacity-70">
        {phase === 'find' ? localize(L('Bước nào sai? Bấm vào dòng đó.', 'Which step is wrong? Tap it.')) : localize(L('Giải thích: sửa lại thế nào?', 'Explain: what should it be?'))}
        {' · '}
        {localize(L('Hiểu bài', 'Understood'))} {points}/{problems.length * 2}
      </p>
      <div className="mb-3 rounded-xl bg-white/80 p-3 font-[Patrick_Hand,cursive] text-[19px] leading-snug shadow-[inset_0_0_0_2px_#f1dcb6]">
        <p className="font-bold">{p.task}</p>
        {p.lines.map((line, i) => (
          <button
            key={i}
            type="button"
            data-testid={`step-${i}`}
            disabled={phase !== 'find'}
            onClick={() => {
              setTapped(i)
              const ok = i === p.wrong
              playSfx(ok ? 'right' : 'wrong')
              if (ok) setPhase('fix')
              else advance(0)
            }}
            className={`block w-full rounded-lg px-1 text-left ${tapped === i ? (i === p.wrong ? 'bg-gold/40' : 'bg-lacquer/20') : ''}`}
          >
            {line}
          </button>
        ))}
      </div>
      {phase === 'fix' && (
        <div className="flex flex-col gap-2">
          {p.fixes.map((f, i) => (
            <AnswerButton
              key={i}
              state="idle"
              onClick={() => {
                playSfx(f.ok ? 'right' : 'wrong')
                advance(f.ok ? 2 : 1)
              }}
            >
              {f.f}
            </AnswerButton>
          ))}
        </div>
      )}
    </MinigameFrame>
  )
}
