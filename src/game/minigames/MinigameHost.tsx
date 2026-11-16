import { useState, type ReactNode } from 'react'
import { CONFIG } from '../../data/config'
import { LETTER_SETS } from '../../data/paperwork'
import { useT } from '../../i18n'
import { useLocalize } from '../../i18n/localized'
import { makeResult, useMinigame, type MinigameResult } from '../../store/minigameStore'
import { useWorld } from '../../store/worldStore'
import { playSfx } from '../systems/audio'
import { TERMIN_CANCELLED } from '../systems/termin'
import { MinigameThemeContext, ResultView, type MinigameTheme } from './common'
import { BubbleTeaGame } from './BubbleTea'
import { DerDieDas } from './DerDieDas'
import { B1_MODULE_NAMES, B1_MODULES, Exam } from './Exam'
import { CircleKGame, GrabGame, TutorGame } from './JobGames'
import { ListenGame } from './ListenGame'
import { ClauseHunt, LetterGame, PortalForm } from './Paperwork'
import { QaGame } from './QaGame'
import { SentenceBuilder } from './SentenceBuilder'
import { TerminHunt } from './TerminHunt'
import { VocabQuiz } from './VocabQuiz'

/** Shows the active mini-game, then its result screen; "Tiếp tục" reports back to the caller. */
export function MinigameHost() {
  const t = useT()
  const localize = useLocalize()
  const active = useMinigame((s) => s.active)
  const finish = useMinigame((s) => s.finish)
  const scene = useWorld((s) => s.scene)
  const [result, setResult] = useState<{ id: number; result: MinigameResult; title: string } | null>(null)

  if (!active) return null

  // The look follows the place: chalkboard in class, exam sheet, school notebook at home.
  const theme: MinigameTheme = active.kind === 'exam' ? 'exam' : scene === 'classroom' ? 'chalk' : scene === 'home' ? 'notebook' : 'paper'

  const complete = (title: string, passScore: number, skipResult = false) => (correct: number, total: number, extra?: number) => {
    const r = makeResult(correct, total, passScore)
    if (extra !== undefined) r.value = extra
    playSfx(r.passed ? 'success' : 'fail')
    if (skipResult) finish(r)
    else setResult({ id: active.id, result: r, title })
  }

  let game: ReactNode = null
  if (result && result.id === active.id) {
    game = <ResultView title={result.title} result={result.result} onContinue={() => finish(result.result)} />
  } else {
    switch (active.kind) {
      case 'vocab': {
        const title = t('mg.vocabTitle')
        game = <VocabQuiz key={active.id} level={active.level} count={active.count} title={title} onComplete={complete(title, 0.5)} />
        break
      }
      case 'derdiedas': {
        const title = t('mg.derdiedasTitle')
        game = <DerDieDas key={active.id} level={active.level} count={active.count} title={title} onComplete={complete(title, 0.5)} />
        break
      }
      case 'sentence': {
        const title = t('mg.sentenceTitle')
        game = <SentenceBuilder key={active.id} level={active.level} count={active.count} title={title} onComplete={complete(title, 0.5)} />
        break
      }
      case 'exam': {
        const title = t('mg.examTitle', { level: CONFIG.german.levels[active.level]?.name ?? '' })
        if (active.level === 2) {
          // B1: four modules, each passed on its own (value = bitmask of passed modules).
          const wanted = active.modules?.length ? active.modules : B1_MODULES
          const has = (mask: number, m: (typeof B1_MODULES)[number]) => ((mask >> B1_MODULES.indexOf(m)) & 1) === 1
          const onB1 = (correct: number, total: number, mask = 0) => {
            const r = makeResult(correct, total, 0)
            r.value = mask
            r.passed = wanted.every((m) => has(mask, m))
            playSfx(r.passed ? 'success' : 'fail')
            const modules = wanted.map((m) => `${B1_MODULE_NAMES[m]} ${has(mask, m) ? '✓' : '✗'}`).join(' · ')
            setResult({ id: active.id, result: r, title: `B1 · ${modules}` })
          }
          game = <Exam key={active.id} level={2} modules={active.modules} onComplete={onB1} />
        } else {
          game = <Exam key={active.id} level={active.level} onComplete={complete(title, CONFIG.german.examPassScore)} />
        }
        break
      }
      case 'termin':
        game = <TerminHunt key={active.id} title={t('mg.terminTitle')} onComplete={complete(t('mg.terminTitle'), 1, true)} />
        break
      case 'qa':
        game = <QaGame key={active.id} set={active.set} count={active.count} add={active.add} onComplete={complete('', active.passScore, true)} />
        break
      case 'letter': {
        const def = LETTER_SETS[active.set]
        game = <LetterGame key={active.id} set={active.set} onComplete={complete(localize(def.title), def.passScore)} />
        break
      }
      case 'form':
        game = (
          <PortalForm
            key={active.id}
            onClose={() => finish({ correct: 0, total: 0, score: 0, passed: false, perfect: false, value: TERMIN_CANCELLED })}
            onComplete={complete('Auslandsportal', 1, true)}
          />
        )
        break
      case 'clauses':
        game = <ClauseHunt key={active.id} doc={active.doc} onComplete={complete('', 0.99, true)} />
        break
      case 'circleK':
        game = <CircleKGame key={active.id} night={active.night} rank={active.rank} onComplete={complete('Circle K', 0.5)} />
        break
      case 'grab':
        game = <GrabGame key={active.id} rain={active.rain} rank={active.rank} onComplete={complete('Grab', 0, true)} />
        break
      case 'tutor':
        game = <TutorGame key={active.id} rank={active.rank} onComplete={complete(localize({ vi: 'Buổi kèm học', en: 'Tutoring', de: 'Nachhilfe' }), 0.5)} />
        break
      case 'bubbleTea':
        game = (
          <BubbleTeaGame
            key={active.id}
            rank={active.rank}
            strikes={active.strikes}
            onDone={(tea) => finish({ ...makeResult(tea.served, Math.max(1, tea.served + tea.failed), 0.5), tea })}
          />
        )
        break
      case 'listen':
        game = <ListenGame key={active.id} level={active.level} count={active.count} title="Hören" onComplete={complete('Hören', 0.6)} />
        break
    }
  }
  return <MinigameThemeContext.Provider value={theme}>{game}</MinigameThemeContext.Provider>
}
