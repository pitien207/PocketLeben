import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { CREDIT_GROUPS, LICENSES, MIT_TEXT, type CreditEntry } from '../data/credits'
import { CloseIcon } from './icons'

/**
 * 1.47 "Ghi công & giấy phép": who made the models, pictures, sounds, fonts and libraries the game uses, under which
 * licence, and what we changed (CC BY / BY-SA ask for credit players can see; MIT asks for its notice). Opened from
 * Settings and from the title screen; nobody has to look at it. Data: src/data/credits.ts. Title-safe (no game stores).
 */
export default function CreditsPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [mit, setMit] = useState(false)

  // Esc closes this panel only (Settings underneath listens for Esc too) — capture phase, then stop it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      e.stopImmediatePropagation()
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[70] modal-scroll bg-ink/40 p-4 sx-safe"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      data-testid="credits-panel"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="credits-title" className="panel animate-pop relative w-full max-w-lg p-5 pt-7 text-ink short:max-w-2xl short:pb-3">
        <h2 id="credits-title" className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full ribbon px-5 py-1 text-lg whitespace-nowrap">
          {t('credits.title')}
        </h2>
        <button
          type="button"
          aria-label={t('settings.close')}
          onClick={onClose}
          data-testid="credits-close"
          className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-ink/10 text-lg"
        >
          <CloseIcon />
        </button>

        <div className="max-h-[70dvh] overflow-y-auto overscroll-contain pr-1 short:max-h-[calc(100dvh-7.5rem)]" style={{ touchAction: 'pan-y' }}>
          <p className="mb-3 text-sm font-semibold text-ink/70">{t('credits.intro')}</p>
          {CREDIT_GROUPS.map((g) => (
            <section key={g.title} className="mb-4">
              <h3 className="mb-1.5 font-display text-base font-extrabold text-lacquer">{g.title}</h3>
              <ul className="flex flex-col gap-2 short:grid short:grid-cols-2 short:gap-x-3">
                {g.entries.map((e) => (
                  <Entry key={e.what + e.by} e={e} />
                ))}
              </ul>
            </section>
          ))}
          <section className="mb-2">
            <button type="button" onClick={() => setMit((v) => !v)} className="rounded-full bg-ink/10 px-3 py-1 text-xs font-extrabold" data-testid="credits-mit">
              {mit ? '▾' : '▸'} {t('credits.mitText')}
            </button>
            {mit && <p className="mt-2 text-[11px] leading-snug whitespace-pre-line text-ink/70">{MIT_TEXT}</p>}
          </section>
          <p className="mt-3 text-center text-xs font-bold text-ink/50">{t('credits.thanks')}</p>
        </div>
      </div>
    </div>
  )
}

function Entry({ e }: { e: CreditEntry }) {
  const t = useT()
  const lic = LICENSES[e.license]
  return (
    <li className="rounded-xl border border-outline/15 bg-white/55 px-3 py-2 text-[13px] leading-snug">
      <p className="font-extrabold">{e.what}</p>
      <p className="text-ink/80">
        {e.source ? (
          <a href={e.source} target="_blank" rel="noopener noreferrer" className="underline decoration-ink/30 underline-offset-2">
            {e.by}
          </a>
        ) : (
          e.by
        )}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
        {lic.url ? (
          <a href={lic.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-jade/15 px-2 py-px font-extrabold text-jade-dark">
            {lic.name}
          </a>
        ) : (
          <span className="rounded-full bg-ink/10 px-2 py-px font-extrabold">{t('credits.own')}</span>
        )}
        {e.copyright && <span className="text-ink/60">{e.copyright}</span>}
      </p>
      {e.changes && (
        <p className="mt-0.5 text-[12px] text-ink/60">
          {t('credits.changes')}: {e.changes}
        </p>
      )}
    </li>
  )
}
