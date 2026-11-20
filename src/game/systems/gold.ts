import { CONFIG } from '../../data/config'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { useUI } from '../../store/uiStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { flagNumber, registerTests, setFlag } from './conditions'
import { openDialogue } from './dialogue'
import { say, vnd } from './say'

/**
 * 1.34 Tiệm Vàng Kim Thành on Hàng Khay (data/cityPlaces.ts `goldShop`, chú Năng): buy and sell gold by chỉ and
 * cây. The price depends only on the game day (same for every player), so nothing about it needs saving.
 * Holdings: flag `gold.chi` (chỉ owned) and `gold.paid` (đồng paid for them, for the profit/loss line).
 */

export const CHI_PER_CAY = 10
/** Grams in one chỉ (for the explanation only). */
export const GRAMS_PER_CHI = 3.75

export interface GoldQuote {
  day: number
  /** The shop sells to you (bán ra), đồng per chỉ. */
  sell: number
  /** The shop buys from you (mua vào), đồng per chỉ. */
  buy: number
}

/** A fixed pseudo-random number in [0, 1) for an integer. */
function hash01(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
/** Roughly normal (σ ≈ 1), from the day. */
function dayNoise(day: number) {
  const s = CONFIG.gold.seed * 7919 + day * 3
  return (hash01(s) + hash01(s + 1) + hash01(s + 2) - 1.5) * 2
}

/** Deviation from the trend per day (index = day), filled lazily: x(d) = revert · x(d−1) + vol · noise(d). */
const walk: number[] = [0]
function deviation(day: number) {
  const g = CONFIG.gold
  for (let d = walk.length; d <= day; d++) walk[d] = g.revert * walk[d - 1] + g.volatility * dayNoise(d)
  return walk[day]
}

export function goldQuote(day = useTime.getState().day): GoldQuote {
  const g = CONFIG.gold
  const d = Math.max(1, Math.floor(day))
  const raw = g.sellPerChi * Math.exp(g.trendPerDay * (d - 1) + deviation(d))
  const sell = Math.round(raw / g.step) * g.step
  const buy = Math.round((raw * (1 - g.spread)) / g.step) * g.step
  return { day: d, sell, buy }
}

/** The last `n` days' quotes, oldest first (days before day 1 are left out). */
export function goldHistory(n = 14, day = useTime.getState().day): GoldQuote[] {
  const out: GoldQuote[] = []
  for (let d = Math.max(1, day - n + 1); d <= day; d++) out.push(goldQuote(d))
  return out
}

/** Change of the sell price since yesterday (fraction), 0 on day 1. */
export function goldChange(day = useTime.getState().day) {
  if (day <= 1) return 0
  const a = goldQuote(day - 1).sell
  return (goldQuote(day).sell - a) / a
}

export const goldHeld = () => flagNumber('gold.chi')
export const goldPaid = () => flagNumber('gold.paid')

/** "1 cây 3 chỉ", "5 chỉ", "2 cây". */
export function formatChi(chi: number) {
  const cay = Math.floor(chi / CHI_PER_CAY)
  const rest = chi % CHI_PER_CAY
  if (!cay) return `${rest} chỉ`
  return rest ? `${cay} cây ${rest} chỉ` : `${cay} cây`
}

export function goldShopOpen() {
  const h = useTime.getState().minutes / 60
  const [from, to] = CONFIG.gold.hours
  return h >= from && h < to
}

/** Why you can't trade right now, or null. */
function blocked(): string | null {
  if (!goldShopOpen()) return `Tiệm vàng đóng cửa rồi (mở ${CONFIG.gold.hours[0]}h–${CONFIG.gold.hours[1]}h).`
  if (usePlayer.getState().currency !== 'VND') return 'Tiệm vàng chỉ nhận tiền đồng.'
  return null
}

/** Most chỉ you can afford today. */
export function maxAffordable() {
  const p = usePlayer.getState()
  if (p.currency !== 'VND') return 0
  return Math.floor(p.money / goldQuote().sell)
}

export function buyGold(chi: number): boolean {
  const n = Math.floor(chi)
  const why = blocked()
  if (why || n <= 0) {
    if (why) say({ vi: why, en: why }, 'bad')
    return false
  }
  const cost = goldQuote().sell * n
  const player = usePlayer.getState()
  if (player.money < cost) {
    playSfx('wrong')
    say({ vi: `Chưa đủ tiền: ${formatChi(n)} vàng giá ${vnd(cost)}.`, en: 'Not enough money.' }, 'bad')
    return false
  }
  player.addMoney(-cost)
  setFlag('gold.chi', goldHeld() + n)
  setFlag('gold.paid', goldPaid() + cost)
  setFlag('gold.lastDay', useTime.getState().day)
  playSfx('till')
  say({ vi: `Đã mua ${formatChi(n)} vàng 9999 — ${vnd(cost)}. Chú Năng gói vào túi nhung đỏ cho bạn.`, en: `Bought ${n} chỉ of gold.` }, 'good')
  return true
}

export function sellGold(chi: number): boolean {
  const held = goldHeld()
  const n = Math.min(Math.floor(chi), held)
  const why = blocked()
  if (why || n <= 0) {
    if (why) say({ vi: why, en: why }, 'bad')
    return false
  }
  const got = goldQuote().buy * n
  // The cost of what is sold leaves the books in proportion, so the profit line stays right.
  const paid = goldPaid()
  const costOut = held > 0 ? Math.round((paid * n) / held) : 0
  usePlayer.getState().addMoney(got)
  setFlag('gold.chi', held - n)
  setFlag('gold.paid', Math.max(0, paid - costOut))
  setFlag('gold.lastDay', useTime.getState().day)
  playSfx('coin')
  const gain = got - costOut
  const tail = gain > 0 ? ` Lãi ${vnd(gain)}!` : gain < 0 ? ` Lỗ ${vnd(-gain)}.` : ''
  say({ vi: `Đã bán ${formatChi(n)} vàng, nhận ${vnd(got)}.${tail}`, en: `Sold ${n} chỉ of gold.` }, gain >= 0 ? 'good' : 'info')
  return true
}

registerActions({
  /** The shop door (city place, arg = place id): chú Năng greets you. */
  'gold.open': () => {
    openDialogue('chuNang')
    return true
  },
  /** From chú Năng's dialogue: the buy / sell sheet. */
  'gold.trade': (arg) => {
    useUI.getState().openPanel({ type: 'gold', mode: arg === 'sell' ? 'sell' : 'buy' })
    return true
  },
})

registerTests({
  'gold.shopOpen': goldShopOpen,
  'gold.has': () => goldHeld() > 0,
})
