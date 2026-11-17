import { useEffect, useMemo, useState } from 'react'
import { useLocalize, type Localized } from '../../i18n/localized'
import { playSfx } from '../systems/audio'
import { AnswerButton, MinigameFrame, shuffle } from './common'

/**
 * Mini-game of tutoring Bin (story 2.1 §11.1): find the wrong step. Circle K and Grab have their
 * own full-screen games since 1.21 (CircleK.tsx, GrabRun.tsx).
 */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })

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
