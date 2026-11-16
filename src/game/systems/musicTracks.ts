import dayUrl from '../../assets/audio/music/di-duc-ngay-nang.ogg?url'
import nightUrl from '../../assets/audio/music/di-duc-dem-mua.ogg?url'

/**
 * The background music files (from the user): "Đi Đức — ngày nắng" by day, "Đi Đức — đêm mưa" at night.
 * Hashed by Vite (a new file = a new URL), not precached: the service worker keeps a copy the first
 * time each one plays. Tiny module on purpose: the title screen imports it too.
 */
export const MUSIC = { day: dayUrl, night: nightUrl } as const
export type MusicTrack = keyof typeof MUSIC

/** Day in the game = 6:00–18:30 (same as the HUD sun / moon). */
export function trackForTime(minutes: number): MusicTrack {
  const hour = (((minutes % 1440) + 1440) % 1440) / 60
  return hour >= 6 && hour < 18.5 ? 'day' : 'night'
}

/** Can this browser play Ogg Vorbis? (Otherwise the game keeps its built-in synth tunes.) */
export function canPlayMusicFiles() {
  try {
    return new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== ''
  } catch {
    return false
  }
}
