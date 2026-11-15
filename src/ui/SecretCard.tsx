import { useEffect } from 'react'
import { getClothing } from '../data/clothes'
import { SECRETS, getSecret } from '../data/secrets'
import { secretFound } from '../game/systems/secrets'
import { wear } from '../game/systems/wardrobe'
import { useT } from '../i18n'
import { formatMoney } from '../i18n/format'
import { useLocalize } from '../i18n/localized'
import { SCENES } from '../game/scenes/registry'
import { useFlags } from '../store/flagsStore'
import { useUI } from '../store/uiStore'

/** "You found a secret!" card: the little story and what you got. */
export function SecretCard() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const flags = useFlags((s) => s.flags)
  const open = panel?.type === 'secret'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyE') {
        e.preventDefault()
        closePanel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePanel])

  if (panel?.type !== 'secret') return null
  const s = getSecret(panel.id)
  if (!s) return null
  const found = SECRETS.filter((x) => flags[`secret.${x.id}`]).length
  const r = s.reward
  const clothing = r.clothing ? getClothing(r.clothing) : null
  const currency = SCENES[s.scene].country === 'de' ? 'EUR' : 'VND'
  const chips: string[] = []
  if (r.money) chips.push(`+${formatMoney(r.money, currency)}`)
  if (r.mood) chips.push(`+${r.mood} ${t('hud.mood')}`)
  if (r.energy) chips.push(`+${r.energy} ${t('hud.energy')}`)
  if (r.german) chips.push(`+${r.german} XP Deutsch`)

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-ink/35 p-4 backdrop-blur-[2px]" onPointerDown={(e) => e.target === e.currentTarget && closePanel()}>
      <div role="dialog" aria-modal="true" data-testid="secret-card" className="panel animate-pop relative w-full max-w-xs p-5 pt-10 text-center text-ink">
        <span className="absolute -top-9 left-1/2 grid h-[4.5rem] w-[4.5rem] -translate-x-1/2 place-items-center rounded-full border-[3px] border-outline bg-gold-light text-[40px] shadow-[inset_0_3px_0_#fff,0_4px_0_var(--color-outline)]">
          {s.icon}
          <span className="animate-twinkle absolute -top-1 -right-1 text-lg">✨</span>
        </span>
        <p className="ribbon mx-auto mb-2 w-max px-4 py-0.5 text-sm">{t('secret.found')}</p>
        <h2 className="font-display text-xl leading-tight font-extrabold text-lacquer">{localize(s.name)}</h2>
        <p className="mt-2 text-[14px] leading-snug font-bold text-ink/85">{localize(s.story)}</p>
        {(chips.length > 0 || clothing) && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {chips.map((c) => (
              <span key={c} className="rounded-full border-2 border-outline bg-white px-2.5 py-0.5 text-[12px] font-black">
                {c}
              </span>
            ))}
            {clothing && (
              <span className="flex items-center gap-1 rounded-full border-2 border-outline bg-gold-light px-2.5 py-0.5 text-[12px] font-black">
                <span className="h-3 w-3 rounded-full border border-outline" style={{ background: clothing.swatch }} />
                {localize(clothing.name)}
              </span>
            )}
          </div>
        )}
        <p className="mt-3 text-[12px] font-black text-ink/55">{t('secret.progress', { found, total: SECRETS.length })}</p>
        <div className="mt-3 flex gap-2">
          {clothing && secretFound(s.id) && (
            <button
              type="button"
              onClick={() => {
                wear(clothing.id)
                closePanel()
              }}
              className="flex-1 rounded-2xl btn-jade py-2.5 font-display text-base font-extrabold active:translate-y-1 active:shadow-none"
            >
              {t('secret.wear')}
            </button>
          )}
          <button type="button" onClick={closePanel} data-testid="secret-close" className="flex-1 rounded-2xl btn-lacquer py-2.5 font-display text-base font-extrabold active:translate-y-1 active:shadow-none">
            {t('secret.ok')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Quest log tab: every secret, found ones with their story, missing ones with a hint. */
export function SecretList() {
  const t = useT()
  const localize = useLocalize()
  const flags = useFlags((s) => s.flags)
  const found = SECRETS.filter((x) => flags[`secret.${x.id}`]).length
  return (
    <div data-testid="secret-list">
      <div className="mb-3 flex items-center gap-2.5 rounded-2xl border-2 border-outline bg-gold-light p-2.5">
        <span className="text-3xl">🧭</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base leading-tight font-extrabold">{t('secret.progress', { found, total: SECRETS.length })}</span>
          <span className="block text-[12px] leading-snug font-bold text-ink/70">{t('secret.listHint')}</span>
          <span className="mt-1 block h-2 overflow-hidden rounded-full border-[1.5px] border-outline bg-white">
            <span className="block h-full bg-gold" style={{ width: `${(found / SECRETS.length) * 100}%` }} />
          </span>
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {SECRETS.map((s) => {
          const got = !!flags[`secret.${s.id}`]
          return (
            <li key={s.id} className={`flex gap-2 rounded-2xl border-2 p-2 ${got ? 'border-outline bg-white' : 'border-dashed border-ink/25 bg-white/50'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-2xl ${got ? 'bg-gold-light' : 'bg-ink/10 grayscale'}`}>{got ? s.icon : '?'}</span>
              <span className="min-w-0">
                <span className="block text-[13px] leading-tight font-black">{got ? localize(s.name) : '???'}</span>
                <span className="block text-[11px] leading-snug font-bold text-ink/65">
                  {localize(SCENES[s.scene].plaque.title)} · {got ? t('secret.done') : localize(s.hint)}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
