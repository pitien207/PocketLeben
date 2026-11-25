/**
 * 1.43 The first flight to Germany (pure data, no stores): Hà Nội → München (transit, Passkontrolle) → Frankfurt.
 * Everything a player has to read — the seat on the boarding pass, the connecting flight, the departures board,
 * the gate screens — comes from ONE seed (flag `fly.seed`), so the board, the pass and the gates always agree.
 * Airlines are made up (Sông Hồng Air "SH", Rheinflug "RF").
 */

export type SeatLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export const SEAT_LETTERS: SeatLetter[] = ['A', 'B', 'C', 'D', 'E', 'F']
/** Economy rows drawn in the cabin (scenes/Plane). */
export const ROW_FIRST = 20
export const ROW_LAST = 33

/** Seats other passengers sit in (drawn as people; never the player's). */
export const TAKEN_SEATS = ['20A', '20B', '21E', '22C', '23F', '24D', '25B', '26A', '27C', '28E', '29F', '30B', '31D', '32C', '33E']

/** The six gates of the transit pier (scenes/Transit): G on the left pier, H on the right. */
export const GATES = ['G10', 'G12', 'G14', 'H27', 'H29', 'H31'] as const
export type GateId = (typeof GATES)[number]

/** Times in minutes after midnight (the game's clock). */
export const LEG1 = { flight: 'SH 701', from: 'HAN', fromCity: 'Hà Nội', to: 'MUC', toCity: 'München', gate: '7', boarding: 23 * 60 + 15, dep: 23 * 60 + 45, arr: 6 * 60 + 5 }
export const LEG2_TIMES = { boarding: 9 * 60 + 10, dep: 9 * 60 + 40, arr: 10 * 60 + 45 }

export interface BoardRow {
  time: number
  flight: string
  dest: string
  gate: GateId
  /** The player's connecting flight. */
  mine?: boolean
  /** The other Frankfurt flight (an earlier one, another number). */
  decoy?: boolean
  /** Minutes late (shown as a new time). */
  delay?: number
}

export interface FlightPlan {
  seed: number
  seat: string
  row: number
  letter: SeatLetter
  leg2: { flight: string; to: 'FRA'; toCity: 'Frankfurt'; gate: GateId; seat: string; boarding: number; dep: number; arr: number }
  /** Departures board of the transit airport, sorted by time. */
  rows: BoardRow[]
}

/** Small seeded random numbers (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: readonly T[], r: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const OTHER_CITIES = ['Berlin', 'Hamburg', 'Wien', 'Düsseldorf', 'Paris', 'Köln/Bonn', 'Zürich', 'Amsterdam', 'Rom', 'Leipzig', 'Hannover', 'Kopenhagen']

export function flightPlan(seed: number): FlightPlan {
  const r = rng(seed)
  // The seat: a row in the middle of the cabin, a free letter.
  let row = 0
  let letter: SeatLetter = 'A'
  for (let i = 0; i < 50; i++) {
    row = 22 + Math.floor(r() * 10)
    letter = SEAT_LETTERS[Math.floor(r() * 6)]
    if (!TAKEN_SEATS.includes(`${row}${letter}`)) break
  }
  const gates = shuffle(GATES, r)
  const [gMine, gDecoy, g3, g4, g5, g6] = gates
  // Flight numbers: mine, an earlier Frankfurt flight close to it, and one with two digits swapped.
  const n = 2030 + Math.floor(r() * 60)
  const mine = n % 10 === Math.floor(n / 10) % 10 ? n + 1 : n
  const decoy = mine - 2 - Math.floor(r() * 5)
  const s = String(mine)
  const swapped = Number(s.slice(0, 2) + s[3] + s[2])
  const cities = shuffle(OTHER_CITIES, r)
  const num = () => `RF ${1100 + Math.floor(r() * 880)}`
  const rows: BoardRow[] = [
    { time: 6 * 60 + 20, flight: `RF ${decoy}`, dest: 'Frankfurt', gate: gDecoy, decoy: true },
    { time: 6 * 60 + 45, flight: num(), dest: cities[0], gate: g3 },
    { time: 7 * 60 + 30, flight: `RF ${swapped}`, dest: cities[1], gate: g4 },
    { time: 8 * 60 + 10, flight: num(), dest: cities[2], gate: gDecoy },
    { time: 8 * 60 + 55, flight: num(), dest: cities[3], gate: g5, delay: 25 },
    { time: LEG2_TIMES.dep, flight: `RF ${mine}`, dest: 'Frankfurt', gate: gMine, mine: true },
    { time: 10 * 60 + 15, flight: num(), dest: cities[4], gate: g6 },
    { time: 10 * 60 + 50, flight: num(), dest: cities[5], gate: g3 },
    { time: 11 * 60 + 25, flight: num(), dest: cities[6], gate: g4 },
  ]
  const seat2 = `${8 + Math.floor(r() * 14)}${SEAT_LETTERS[Math.floor(r() * 6)]}`
  return {
    seed,
    seat: `${row}${letter}`,
    row,
    letter,
    leg2: { flight: `RF ${mine}`, to: 'FRA', toCity: 'Frankfurt', gate: gMine, seat: seat2, ...LEG2_TIMES },
    rows,
  }
}

export type BoardStatus = 'departed' | 'boarding' | 'lastCall' | 'open' | 'delayed' | 'onTime'

/** What the board says about a flight at game minute `now` (the player's flight never leaves without them). */
export function rowStatus(row: BoardRow, now: number): BoardStatus {
  const t = row.time + (row.delay ?? 0)
  if (row.mine) return now >= t ? 'lastCall' : now >= t - 30 ? 'boarding' : 'open'
  if (now >= t) return 'departed'
  if (now >= t - 30) return 'boarding'
  if (row.delay) return 'delayed'
  return now >= t - 90 ? 'open' : 'onTime'
}

/** Remarks column: German / English, like a real board, plus the Vietnamese meaning for the legend. */
export const STATUS_TEXT: Record<BoardStatus, { de: string; en: string; vi: string; color: string }> = {
  departed: { de: 'Gestartet', en: 'Departed', vi: 'đã cất cánh', color: '#8a93a6' },
  boarding: { de: 'Boarding', en: 'Boarding', vi: 'đang lên máy bay', color: '#7ee08a' },
  lastCall: { de: 'Letzter Aufruf', en: 'Final call', vi: 'gọi lần cuối', color: '#ff8a7a' },
  open: { de: 'Gate offen', en: 'Gate open', vi: 'cổng đã mở', color: '#ffd166' },
  delayed: { de: 'Verspätet', en: 'Delayed', vi: 'bị trễ', color: '#ff9b5e' },
  onTime: { de: 'Planmäßig', en: 'On time', vi: 'đúng giờ', color: '#cfd6e4' },
}

/** The next flight a gate's own screen shows (departed ones drop off). */
export function gateFlight(plan: FlightPlan, gate: GateId, now: number): BoardRow | null {
  return plan.rows.filter((r) => r.gate === gate && rowStatus(r, now) !== 'departed').sort((a, b) => a.time - b.time)[0] ?? null
}

export const hhmm = (m: number) => {
  const t = ((Math.round(m) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
