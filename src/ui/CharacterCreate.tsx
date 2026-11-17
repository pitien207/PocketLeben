import { useState } from 'react'
import { PLAYER_OUTFITS, type Gender } from '../data/npcs'
import { saveGame } from '../game/systems/save'
import { useT } from '../i18n'
import { usePlayer } from '../store/playerStore'
import { useUI } from '../store/uiStore'
import { Portrait } from './Portrait'

/**
 * New game: "Chọn nhân vật" — male or female (only the look changes; clothes, hair and the
 * story stay open to everyone). Opened by boot.tsx when there is no save yet; no way around it.
 */
export function CharacterCreate() {
  const t = useT()
  const open = useUI((s) => s.panel?.type === 'create')
  const closePanel = useUI((s) => s.closePanel)
  const [pick, setPick] = useState<Gender | null>(null)
  if (!open) return null

  const start = () => {
    if (!pick) return
    usePlayer.setState({ gender: pick, outfit: PLAYER_OUTFITS[pick] })
    closePanel()
    saveGame()
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 modal-scroll bg-linear-to-b from-[#bfe3ff]/95 via-[#ffe9cc]/95 to-[#ffd9a8]/95 p-4" data-testid="create">
      <div role="dialog" aria-modal="true" aria-label={t('create.title')} className="panel animate-pop relative w-full max-w-md p-5 pt-8 text-center text-ink">
        <h2 className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full ribbon px-6 py-1 text-xl whitespace-nowrap">{t('create.title')}</h2>
        <p className="text-[15px] font-bold text-ink/75">{t('create.question')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(['female', 'male'] as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              data-testid={`create-${g}`}
              aria-pressed={pick === g}
              onClick={() => setPick(g)}
              className={`flex flex-col items-center gap-1 rounded-3xl border-[3px] px-2 pt-3 pb-2.5 transition active:translate-y-0.5 ${
                pick === g ? 'border-lacquer bg-white shadow-[0_4px_0_var(--color-lacquer)]' : 'border-outline/30 bg-cream/70 shadow-[0_3px_0_rgba(74,50,38,0.25)]'
              }`}
            >
              <span className={`rounded-full p-1 ${pick === g ? 'bg-gold-light' : 'bg-white/60'}`}>
                <Portrait outfit={PLAYER_OUTFITS[g]} size={112} />
              </span>
              <span className="font-display text-2xl font-extrabold">{t(g === 'female' ? 'create.female' : 'create.male')}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] font-bold text-ink/55">{t('create.note')}</p>
        <button
          type="button"
          data-testid="create-start"
          disabled={!pick}
          onClick={start}
          className="mt-4 w-full rounded-full btn-lacquer px-6 py-3 font-display text-2xl font-extrabold active:translate-y-1 active:shadow-none disabled:opacity-50"
        >
          {t('create.start')}
        </button>
      </div>
    </div>
  )
}
