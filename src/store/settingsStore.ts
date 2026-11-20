import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QualityLevel } from '../data/config'

/** Only Vietnamese since 1.16 (the user removed English and German). */
export type Language = 'vi'
export type TimeSpeed = 'slow' | 'normal' | 'fast'

interface SettingsState {
  musicOn: boolean
  sfxOn: boolean
  quality: QualityLevel
  language: Language
  timeSpeed: TimeSpeed
  /** Step-by-step guide: the gold arrow + edge pointer, and the hint texts. */
  guideArrows: boolean
  guideHints: boolean
  /** Developer test mode: skip story steps, cheats (Settings → tap the version 5×, or ?test=1). */
  testMode: boolean
  /** Signed in: connect to the multiplayer server and see other players. */
  online: boolean
  /** 1.32 "đồ họa đẹp": sky dome, post effects (AO, bloom, grade), night glow — Việt Nam scenes only for now. */
  fancy: boolean
  toggleMusic: () => void
  toggleSfx: () => void
  setQuality: (quality: QualityLevel) => void
  setTimeSpeed: (timeSpeed: TimeSpeed) => void
  setGuideArrows: (on: boolean) => void
  setGuideHints: (on: boolean) => void
  setTestMode: (on: boolean) => void
  setOnline: (on: boolean) => void
  setFancy: (on: boolean) => void
}

/** Player preferences. Persisted to localStorage. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      musicOn: true,
      sfxOn: true,
      // 1.39: new players on phones / tablets start on the lighter setting (they can switch to high in Settings)
      quality: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 'low' : 'high',
      language: 'vi',
      timeSpeed: 'normal',
      guideArrows: true,
      guideHints: true,
      testMode: false,
      online: true,
      fancy: true,
      toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),
      toggleSfx: () => set((s) => ({ sfxOn: !s.sfxOn })),
      setQuality: (quality) => set({ quality }),
      setTimeSpeed: (timeSpeed) => set({ timeSpeed }),
      setGuideArrows: (guideArrows) => set({ guideArrows }),
      setGuideHints: (guideHints) => set({ guideHints }),
      setTestMode: (testMode) => set({ testMode }),
      setOnline: (online) => set({ online }),
      setFancy: (fancy) => set({ fancy }),
    }),
    {
      name: 'visa-hunter-settings',
      version: 2,
      // Older saves may still say 'en' / 'de'.
      migrate: (state) => ({ ...(state as object), language: 'vi' }) as never,
      partialize: ({ musicOn, sfxOn, quality, language, timeSpeed, guideArrows, guideHints, testMode, online, fancy }) => ({
        musicOn,
        sfxOn,
        quality,
        language,
        timeSpeed,
        guideArrows,
        guideHints,
        testMode,
        online,
        fancy,
      }),
    },
  ),
)
