import { useEffect } from 'react'
import { CHAPTER_NAMES } from '../data/quests'
import { CHAPTER_INTROS } from '../data/story'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useUI } from '../store/uiStore'

/**
 * A new chapter begins: a storybook page with the chapter name, a short narration and a
 * proverb. It doesn't block the game (only the card itself takes taps).
 */
export function ChapterCard() {
  const t = useT()
  const localize = useLocalize()
  const chapter = useUI((s) => s.chapterCard)
  const close = () => useUI.getState().setChapterCard(null)

  useEffect(() => {
    if (chapter === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chapter])

  if (chapter === null) return null
  const intro = CHAPTER_INTROS[chapter]
  if (!intro) return null
  const [label, name] = localize(CHAPTER_NAMES[chapter]).split(' · ')
  return (
    <div className="absolute inset-0 z-40 modal-scroll bg-ink/40 p-4" data-testid="chapter-card">
      <div role="dialog" aria-modal="true" className="pointer-events-auto panel animate-pop relative w-full max-w-sm overflow-hidden p-0 text-ink">
        <div className="relative grid h-28 place-items-center bg-linear-to-b from-[#ffd9a8] via-[#ffe9cc] to-paper text-[64px]">
          <span className="drop-shadow-[0_4px_0_rgba(74,50,38,0.25)]">{intro.icon}</span>
          <span className="absolute top-3 left-1/2 -translate-x-1/2 ribbon px-4 py-0.5 text-sm whitespace-nowrap">{label}</span>
        </div>
        <div className="px-5 pt-2 pb-5 text-center">
          <h2 className="font-display text-2xl leading-tight font-extrabold text-lacquer">{name ?? label}</h2>
          <p className="mt-3 text-left text-[14px] leading-relaxed font-bold text-ink/85">{localize(intro.text)}</p>
          {intro.quote && <p className="mt-3 rounded-xl border-2 border-dashed border-outline/40 bg-white/60 px-3 py-2 font-display text-[14px] font-extrabold text-jade italic">{localize(intro.quote)}</p>}
          <button type="button" onClick={close} data-testid="chapter-go" className="mt-4 w-full rounded-2xl btn-lacquer py-2.5 font-display text-lg font-extrabold active:translate-y-1 active:shadow-none">
            {t('story.go')}
          </button>
        </div>
      </div>
    </div>
  )
}
