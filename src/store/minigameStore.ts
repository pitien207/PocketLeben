import { create } from 'zustand'
import type { QaSetId } from '../data/interviews'
import type { ClauseDocId, LetterSetId } from '../data/paperwork'

export interface MinigameResult {
  correct: number
  total: number
  /** correct / total, 0–1. */
  score: number
  passed: boolean
  /** Perfect run with no mistakes. */
  perfect: boolean
  /** Extra outcome, e.g. how many days ahead the booked Termin is. */
  value?: number
}

/** What to play. German games draw from vocabulary up to `level` (0 = A1 words). */
export type MinigameSpec =
  | { kind: 'vocab'; level: number; count: number }
  | { kind: 'derdiedas'; level: number; count: number }
  | { kind: 'sentence'; level: number; count: number }
  /** Certificate exam; B1 runs as four modules — `modules` = only these (a retake). */
  | { kind: 'exam'; level: number; modules?: B1Module[] }
  | { kind: 'termin'; attempts: number }
  /** `add`: a set whose questions are always asked on top (e.g. "did you write this yourself?"). */
  | { kind: 'qa'; set: QaSetId; count: number; passScore: number; add?: QaSetId }
  /** Pick the right sentence for each part of a German letter (CV, email, Remonstration). */
  | { kind: 'letter'; set: LetterSetId }
  /** The 8-field Auslandsportal form. */
  | { kind: 'form' }
  /** Find the marked clauses in a document (contract reading, scam signs). */
  | { kind: 'clauses'; doc: ClauseDocId }
  | { kind: 'circleK'; night: boolean; rank: number }
  | { kind: 'grab'; rain: boolean; rank: number; rider?: string }
  | { kind: 'tutor'; rank: number }
  | { kind: 'listen'; level: number; count: number }

export type B1Module = 'lesen' | 'hoeren' | 'schreiben' | 'sprechen'

interface MinigameState {
  active: (MinigameSpec & { id: number }) | null
  onDone: ((result: MinigameResult) => void) | null
  start: (spec: MinigameSpec, onDone: (result: MinigameResult) => void) => void
  finish: (result: MinigameResult) => void
}

let nextId = 1

/** The mini-game on screen (plan §5.3 / §7 minigames/). Rendered by MinigameHost. */
export const useMinigame = create<MinigameState>()((set, get) => ({
  active: null,
  onDone: null,
  start: (spec, onDone) => set({ active: { ...spec, id: nextId++ }, onDone }),
  finish: (result) => {
    const done = get().onDone
    set({ active: null, onDone: null })
    done?.(result)
  },
}))

export function makeResult(correct: number, total: number, passScore = 0.7, mistakes = total - correct): MinigameResult {
  const score = total > 0 ? correct / total : 0
  return { correct, total, score, passed: score >= passScore, perfect: mistakes === 0 && total > 0 }
}
