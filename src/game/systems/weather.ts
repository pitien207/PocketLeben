import { CONFIG } from '../../data/config'

export type Country = 'vn' | 'de'

/**
 * 1.20: the weather changes during the day. Every block of a few hours has its own kind, decided
 * by the day and the block (the same on every device, and a reload doesn't change it).
 */
export type WeatherKind = 'clear' | 'cloudy' | 'breeze' | 'drizzle' | 'rain' | 'fog'

export const WEATHER_LABELS: Record<WeatherKind, { icon: string; vi: string }> = {
  clear: { icon: '☀️', vi: 'Trời đẹp' },
  cloudy: { icon: '☁️', vi: 'Nhiều mây' },
  breeze: { icon: '🍃', vi: 'Gió nhẹ' },
  drizzle: { icon: '🌦️', vi: 'Mưa phùn' },
  rain: { icon: '🌧️', vi: 'Mưa' },
  fog: { icon: '🌫️', vi: 'Sương mù' },
}

/** Smoothed weather values (0–1), written by <Lighting /> every frame and read by effects. */
export const weatherState = {
  /** Rain on screen (0 indoors). */
  rain: 0,
  /** Rain outside, also while indoors (for the muffled sound). */
  rainOutside: 0,
  /** Falling petals in Vietnam. */
  petals: 0,
  /** Overcast sky and mist (0 indoors). */
  cloud: 0,
  fog: 0,
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const W = CONFIG.weather
const KINDS: WeatherKind[] = ['clear', 'cloudy', 'breeze', 'drizzle', 'rain', 'fog']

/** The weather of the block that contains this moment. */
export function weatherAt(day: number, minutes: number, country: Country): WeatherKind {
  const m = ((minutes % 1440) + 1440) % 1440
  const block = Math.floor(m / W.blockMinutes)
  const weights = W.kinds[country]
  const total = KINDS.reduce((sum, k) => sum + weights[k], 0)
  let roll = hash(day * 31 + block * 7 + (country === 'de' ? 3 : 1)) * total
  let kind: WeatherKind = 'clear'
  for (const k of KINDS) {
    roll -= weights[k]
    if (roll <= 0) {
      kind = k
      break
    }
  }
  // Mist belongs to the early morning; later it is just a grey sky.
  if (kind === 'fog' && m / 60 >= W.fogUntilHour) kind = 'cloudy'
  return kind
}

/** What comes after the current block (for the clock panel). */
export function weatherNext(day: number, minutes: number, country: Country): WeatherKind {
  const next = (Math.floor(minutes / W.blockMinutes) + 1) * W.blockMinutes
  return next >= 1440 ? weatherAt(day + 1, next - 1440, country) : weatherAt(day, next, country)
}

export function isRaining(day: number, minutes: number, country: Country) {
  const k = weatherAt(day, minutes, country)
  return k === 'drizzle' || k === 'rain'
}

/** How hard it rains, 0–1: a drizzle is fine and light. */
export function rainStrength(kind: WeatherKind) {
  return kind === 'rain' ? W.rainStrength : kind === 'drizzle' ? W.drizzleStrength : 0
}

/** Petals in Vietnam on dry days: a few when it is calm, many in a breeze. */
export function petalAmount(minutes: number, country: Country, kind: WeatherKind) {
  const h = minutes / 60
  const [from, to] = W.petalHours
  if (country !== 'vn' || h < from || h >= to) return 0
  return kind === 'breeze' ? 1 : kind === 'clear' ? 0.35 : 0
}
