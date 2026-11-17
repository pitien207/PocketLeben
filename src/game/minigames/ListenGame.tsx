import { useEffect, useMemo, useState } from 'react'
import { SENTENCES } from '../../data/vocab'
import { useSettings } from '../../store/settingsStore'
import { playSfx } from '../systems/audio'
import { AnswerButton, MinigameFrame, sample, shuffle } from './common'

const FEEDBACK_MS = 900

/** Speak German with the browser's voice (de-DE). False when the browser has no speech. */
export function speakGerman(text: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'de-DE'
    u.rate = 0.9
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('de'))
    if (voice) u.voice = voice
    window.speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}

/** Hören: listen to a German sentence, pick what it means. Without speech the sentence is shown. */
export function ListenGame({ level, count, title, onComplete }: { level: number; count: number; title: string; onComplete: (correct: number, total: number) => void }) {
  const language = useSettings((s) => s.language)
  const questions = useMemo(() => {
    const pool = SENTENCES.filter((s) => s.level <= level)
    return sample(pool, count, (s) => s.de).map((s) => ({ s, options: shuffle([s, ...sample(pool.filter((o) => o.de !== s.de), 3, (o) => o.de)]) }))
  }, [level, count])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [canSpeak, setCanSpeak] = useState(true)
  const current = questions[index]

  useEffect(() => {
    if (current) setCanSpeak(speakGerman(current.s.de))
  }, [current])

  if (!current) return null
  const meaning = (s: (typeof SENTENCES)[number]) => (language === 'vi' ? s.meaning.vi : s.meaning.en)

  const answer = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    const right = current.options[i].de === current.s.de
    playSfx(right ? 'right' : 'wrong')
    const total = correct + (right ? 1 : 0)
    setCorrect(total)
    window.setTimeout(() => {
      if (index + 1 >= questions.length) onComplete(total, questions.length)
      else {
        setIndex(index + 1)
        setPicked(null)
      }
    }, FEEDBACK_MS)
  }

  return (
    <MinigameFrame title={title} step={index} total={questions.length}>
      <div className="mb-3 flex flex-col items-center gap-2 text-center">
        <button type="button" data-testid="listen-again" onClick={() => setCanSpeak(speakGerman(current.s.de))} className="rounded-full btn-lacquer px-5 py-2 text-lg font-extrabold">
          🔊 {language === 'vi' ? 'Nghe' : language === 'de' ? 'Anhören' : 'Listen'}
        </button>
        {(!canSpeak || picked !== null) && <p className="font-display text-xl font-extrabold">{current.s.de}</p>}
      </div>
      <div className="flex flex-col gap-2 short:grid short:grid-cols-2">
        {current.options.map((o, i) => (
          <AnswerButton key={o.de} state={picked === null ? 'idle' : o.de === current.s.de ? 'right' : picked === i ? 'wrong' : 'dim'} disabled={picked !== null} onClick={() => answer(i)}>
            {meaning(o)}
          </AnswerButton>
        ))}
      </div>
    </MinigameFrame>
  )
}
