import { useMemo, useState } from 'react'
import { CLAUSE_DOCS, LETTER_SETS, PASSPORT_DATA, PORTAL_FIELDS, type ClauseDocId, type LetterSetId } from '../../data/paperwork'
import { useLocalize } from '../../i18n/localized'
import { playSfx } from '../systems/audio'
import { getFlag } from '../systems/conditions'
import { AnswerButton, MinigameFrame, shuffle } from './common'

/**
 * Paperwork mini-games (story 2.1): a German letter built part by part, the Auslandsportal form,
 * and a document in which you tap the important clauses.
 */

const REACT_MS = 1100

/** Pick the right sentence for each part; the letter grows below. */
export function LetterGame({ set, onComplete }: { set: LetterSetId; onComplete: (correct: number, total: number) => void }) {
  const localize = useLocalize()
  const def = LETTER_SETS[set]
  const parts = useMemo(() => def.parts.map((p) => ({ ...p, options: shuffle([...p.options]) })), [def])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [written, setWritten] = useState<{ de: string; ok: boolean }[]>([])
  const part = parts[index]
  if (!part) return null

  const choose = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    const opt = part.options[i]
    playSfx(opt.ok ? 'right' : 'wrong')
    const next = [...written, { de: opt.de, ok: !!opt.ok }]
    window.setTimeout(() => {
      setWritten(next)
      setPicked(null)
      if (index + 1 >= parts.length) onComplete(next.filter((w) => w.ok).length, parts.length)
      else setIndex(index + 1)
    }, REACT_MS)
  }

  return (
    <MinigameFrame title={localize(def.title)} step={index} total={parts.length}>
      <p className="mb-2 text-[12px] leading-snug font-bold opacity-70">{localize(def.intro)}</p>
      {written.length > 0 && (
        <div className="mb-2 rounded-xl bg-white/70 px-3 py-2 font-[Patrick_Hand,cursive] text-[15px] leading-snug shadow-[inset_0_0_0_2px_#f1dcb6]">
          {written.map((w, i) => (
            <p key={i} className={w.ok ? '' : 'text-lacquer line-through decoration-2'}>
              {w.de}
            </p>
          ))}
        </div>
      )}
      <p className="mb-2 text-sm font-black">{localize(part.prompt)}</p>
      <div className="flex flex-col gap-2 short:grid short:grid-cols-2">
        {part.options.map((o, i) => (
          <AnswerButton key={i} state={picked === null ? 'idle' : picked === i ? (o.ok ? 'right' : 'wrong') : o.ok ? 'right' : 'dim'} disabled={picked !== null} onClick={() => choose(i)}>
            {o.de}
            {picked === i && !o.ok && o.why && <span className="mt-0.5 block text-[12px] font-bold opacity-90">{localize(o.why)}</span>}
          </AnswerButton>
        ))}
      </div>
    </MinigameFrame>
  )
}

/** Auslandsportal: copy the passport into 8 fields. Mistakes are not shown — VFS finds them. */
export function PortalForm({ onComplete, onClose }: { onComplete: (correct: number, total: number) => void; onClose: () => void }) {
  const localize = useLocalize()
  const path = getFlag('visa.path') === 'studium' ? 'studium' : 'ausbildung'
  const fields = useMemo(
    () =>
      PORTAL_FIELDS.map((f) => {
        const list = Array.isArray(f.options) ? f.options : f.options[path]
        return { ...f, right: list[0], options: shuffle([...list]) }
      }),
    [path],
  )
  const [values, setValues] = useState<(string | null)[]>(() => fields.map(() => null))
  const filled = values.every((v) => v !== null)

  return (
    <MinigameFrame title="Auslandsportal · Visumantrag" onClose={onClose}>
      <div className="mb-2 rounded-xl bg-[#7a1f2b] p-2.5 text-[12px] leading-tight font-bold text-[#f6e3b4] shadow-[0_3px_0_#4a1019]">
        <p className="mb-1 text-[10px] tracking-widest uppercase opacity-80">Hộ chiếu · Passport · Việt Nam</p>
        <p>
          Họ / Surname: <b>{PASSPORT_DATA.surname}</b>
        </p>
        <p>
          Chữ đệm và tên / Given names: <b>{PASSPORT_DATA.given}</b>
        </p>
        <p>
          Ngày sinh / Date of birth: <b>{PASSPORT_DATA.birth}</b> · Số / No.: <b>{PASSPORT_DATA.number}</b>
        </p>
      </div>
      <div className="flex flex-col gap-2 short:grid short:grid-cols-2">
        {fields.map((f, i) => (
          <label key={f.label} className="block">
            <span className="text-[12px] font-black">
              {f.label} <span className="font-bold opacity-60">· {localize(f.hint)}</span>
            </span>
            <select
              data-testid={`portal-${i}`}
              value={values[i] ?? ''}
              onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.value : v)))}
              className="mt-0.5 w-full rounded-xl border-2 border-outline bg-white px-2 py-1.5 text-[14px] font-bold text-ink"
            >
              <option value="" disabled>
                —
              </option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="button"
        data-testid="portal-send"
        disabled={!filled}
        onClick={() => {
          playSfx('stamp')
          onComplete(fields.filter((f, i) => values[i] === f.right).length, fields.length)
        }}
        className={`mt-3 w-full rounded-2xl py-2.5 font-extrabold ${filled ? 'btn-jade' : 'bg-ink/15 text-ink/50'}`}
      >
        Antrag absenden · Gửi đơn
      </button>
    </MinigameFrame>
  )
}

/** Tap the lines that matter. Wrong taps cost a mistake; too many ends the game. */
export function ClauseHunt({ doc, onComplete }: { doc: ClauseDocId; onComplete: (correct: number, total: number) => void }) {
  const localize = useLocalize()
  const def = CLAUSE_DOCS[doc]
  const lines = def.lines as { text: { vi: string; en: string }; mark?: { vi: string; en: string } }[]
  const need = lines.filter((l) => l.mark).length
  const [found, setFound] = useState<number[]>([])
  const [wrong, setWrong] = useState<number[]>([])
  const over = found.length >= need || wrong.length > def.mistakes

  const tap = (i: number) => {
    if (over || found.includes(i) || wrong.includes(i)) return
    if (lines[i].mark) {
      playSfx('right')
      const f = [...found, i]
      setFound(f)
      if (f.length >= need) window.setTimeout(() => onComplete(f.length, need), 1400)
    } else {
      playSfx('wrong')
      const w = [...wrong, i]
      setWrong(w)
      if (w.length > def.mistakes) window.setTimeout(() => onComplete(found.length, need), 1400)
    }
  }

  return (
    <MinigameFrame title={localize(def.title)}>
      <p className="mb-1 text-sm font-black">{localize(def.task)}</p>
      <p className="mb-2 text-[12px] font-bold opacity-70">
        {found.length}/{need} · ✕ {wrong.length}/{def.mistakes + 1}
      </p>
      <div className="flex flex-col gap-1.5 rounded-xl bg-white/80 p-2 shadow-[inset_0_0_0_2px_#f1dcb6]">
        {lines.map((l, i) => (
          <button
            key={i}
            type="button"
            data-testid={`clause-${i}`}
            onClick={() => tap(i)}
            className={`rounded-lg px-2 py-1.5 text-left text-[13px] leading-snug font-bold transition ${
              found.includes(i) ? 'bg-jade/20 ring-2 ring-jade' : wrong.includes(i) ? 'bg-lacquer/15 line-through opacity-60' : 'active:bg-gold/30'
            }`}
          >
            <span className="mr-1 opacity-50">§{i + 1}</span>
            {localize(l.text)}
            {found.includes(i) && l.mark && <span className="mt-0.5 block text-[12px] font-black text-jade">✓ {localize(l.mark)}</span>}
          </button>
        ))}
      </div>
    </MinigameFrame>
  )
}
