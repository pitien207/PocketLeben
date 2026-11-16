import { useState } from 'react'
import { CONFIG } from '../../data/config'
import { useT } from '../../i18n'
import type { B1Module } from '../../store/minigameStore'
import { DerDieDas } from './DerDieDas'
import { ListenGame } from './ListenGame'
import { QaGame } from './QaGame'
import { SentenceBuilder } from './SentenceBuilder'
import { VocabQuiz } from './VocabQuiz'

export const B1_MODULES: B1Module[] = ['lesen', 'hoeren', 'schreiben', 'sprechen']
export const B1_MODULE_NAMES: Record<B1Module, string> = { lesen: 'Lesen', hoeren: 'Hören', schreiben: 'Schreiben', sprechen: 'Sprechen' }
/** Each B1 module is passed on its own with this share of points. */
export const B1_MODULE_PASS = 0.6

/**
 * The certificate exam (the "boss" mini-game). A1/A2: vocabulary, articles, sentences.
 * B1 (story 2.1): four modules like the Goethe exam — Lesen, Hören, Schreiben, Sprechen; each is
 * passed on its own and a failed one can be retaken alone. `extra` = bitmask of passed modules.
 */
export function Exam({ level, modules, onComplete }: { level: number; modules?: B1Module[]; onComplete: (correct: number, total: number, extra?: number) => void }) {
  const t = useT()
  const name = CONFIG.german.levels[level]?.name ?? '?'
  const b1 = level === 2
  const phases = b1 ? (modules?.length ? modules : B1_MODULES) : null
  const count = phases ? phases.length : 3
  const [phase, setPhase] = useState(0)
  const [score, setScore] = useState({ correct: 0, total: 0, mask: 0 })

  const next = (correct: number, total: number) => {
    let mask = score.mask
    if (phases && total > 0 && correct / total >= B1_MODULE_PASS) mask |= 1 << B1_MODULES.indexOf(phases[phase])
    const sum = { correct: score.correct + correct, total: score.total + total, mask }
    setScore(sum)
    if (phase >= count - 1) onComplete(sum.correct, sum.total, phases ? mask : undefined)
    else setPhase(phase + 1)
  }

  const label = phases ? B1_MODULE_NAMES[phases[phase]] : t('mg.phase', { n: phase + 1, total: 3 })
  const title = `${t('mg.examTitle', { level: name })} · ${label}`
  if (phases) {
    const m = phases[phase]
    if (m === 'lesen') return <VocabQuiz key="l" level={level} count={6} title={title} onComplete={next} />
    if (m === 'hoeren') return <ListenGame key="h" level={level} count={5} title={title} onComplete={next} />
    if (m === 'schreiben') return <SentenceBuilder key="s" level={level} count={3} title={title} onComplete={next} />
    return <QaGame key="q" set="b1Sprechen" count={4} onComplete={next} />
  }
  if (phase === 0) return <VocabQuiz key="v" level={level} count={6} title={title} onComplete={next} />
  if (phase === 1) return <DerDieDas key="d" level={level} count={6} title={title} onComplete={next} />
  return <SentenceBuilder key="s" level={level} count={level >= 1 ? 3 : 2} title={title} onComplete={next} />
}

export const EXAM_PASS = CONFIG.german.examPassScore
