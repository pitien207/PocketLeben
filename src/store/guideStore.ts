import { create } from 'zustand'
import type { GuideUi } from '../data/guides'
import type { Localized } from '../i18n/localized'
import type { SceneId } from './worldStore'

/** Something to point at in the current scene. */
export type GuidePointRef = { kind: 'npc'; id: string } | { kind: 'spot'; id: string } | { kind: 'at'; at: [number, number, number] }

/** The step-by-step guide for the current objective (computed by game/systems/guide.ts). */
export interface ActiveGuide {
  stepId: string
  stepText: Localized
  hint: Localized
  /** Why the step can't be done right now, and how to fix it. */
  blocked: Localized | null
  /** What to walk to in this scene (null = nothing here). */
  point: GuidePointRef | null
  /** A HUD button to press instead (passport, clock…). */
  ui: GuideUi | null
  /** The target is in another scene: where it is, and the next door on the way. */
  destination: SceneId | null
  via: Localized | null
  chapter: number
  done: number
  total: number
}

/** First-time tour steps (game/systems/guide.ts drives it, ui/Onboarding.tsx shows it). */
export type TourStep = 'move' | 'camera' | 'interact' | 'bag' | 'clock' | 'done'

interface GuideState {
  guide: ActiveGuide | null
  tour: TourStep | null
  setGuide: (guide: ActiveGuide | null) => void
  setTour: (tour: TourStep | null) => void
}

export const useGuide = create<GuideState>()((set) => ({
  guide: null,
  tour: null,
  setGuide: (guide) => set({ guide }),
  setTour: (tour) => set({ tour }),
}))
