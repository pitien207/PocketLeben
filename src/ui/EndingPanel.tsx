import { ACHIEVEMENTS } from '../data/achievements'
import { EPILOGUE } from '../data/story'
import { check } from '../game/systems/conditions'
import { useLocalize } from '../i18n/localized'
import { CONFIG } from '../data/config'
import { useT } from '../i18n'
import { formatMoney } from '../i18n/format'
import { useFlags } from '../store/flagsStore'
import { usePlayer } from '../store/playerStore'
import { useTime } from '../store/timeStore'
import { useUI } from '../store/uiStore'

/**
 * The end of the story (permanent residence): a celebration card with the journey in
 * numbers, then free play — the side quests and "next dreams" stay open.
 */
export function EndingPanel() {
  const t = useT()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const flags = useFlags((s) => s.flags)
  const day = useTime((s) => s.day)
  const money = usePlayer((s) => s.money)
  const currency = usePlayer((s) => s.currency)
  const level = usePlayer((s) => s.german.level)
  const localize = useLocalize()
  if (panel?.type !== 'ending') return null

  const num = (k: string) => (typeof flags[k] === 'number' ? (flags[k] as number) : 0)
  const achievements = ACHIEVEMENTS.filter((a) => flags[`achv.got.${a.id}`]).length
  const stats: [string, string, string][] = [
    ['📅', t('ending.days'), String(day)],
    ['🇩🇪', t('ending.german'), CONFIG.german.levels[level - 1]?.name ?? '—'],
    ['🩺', t('ending.shifts'), String(num('stats.careShifts'))],
    ['🍾', t('ending.bottles'), String(num('stats.bottles'))],
    ['💶', t('ending.savings'), formatMoney(money, currency)],
    ['🏆', t('ending.achievements'), `${achievements}/${ACHIEVEMENTS.length}`],
  ]

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 modal-scroll bg-ink/50 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="ending-title" className="panel animate-pop relative w-full max-w-sm p-5 pt-8 text-center text-ink">
        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 text-5xl">🎉</div>
        <h2 id="ending-title" className="font-display text-2xl leading-tight font-extrabold text-lacquer">
          {t('ending.title')}
        </h2>
        <p className="mt-2 text-[14px] leading-snug font-bold text-ink/80">{t('ending.text')}</p>
        <ul className="mt-3 flex flex-col gap-1.5 text-left" data-testid="epilogue">
          {EPILOGUE.filter((e) => check(e.if)).map((e) => (
            <li key={localize(e.text)} className="rounded-xl bg-gold-light/70 px-3 py-1.5 text-[13px] leading-snug font-bold">
              {localize(e.text)}
            </li>
          ))}
        </ul>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-left">
          {stats.map(([icon, label, value]) => (
            <li key={label} className="rounded-2xl bg-white/80 px-2.5 py-2 shadow-[inset_0_0_0_2px_#f1dcb6]">
              <div className="text-[11px] font-black text-ink/55">
                {icon} {label}
              </div>
              <div className="font-display text-lg font-extrabold tabular-nums">{value}</div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] font-bold text-ink/60">{t('ending.next')}</p>
        <button
          type="button"
          onClick={closePanel}
          className="mt-4 w-full rounded-2xl btn-lacquer py-3 font-display text-lg font-extrabold active:translate-y-1 active:shadow-none"
        >
          {t('ending.continue')}
        </button>
      </div>
    </div>
  )
}
