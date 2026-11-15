import { useEffect, useMemo, useState } from 'react'
import { LANGUAGE_NAMES, useT } from '../i18n'
import { useSettings, type Language } from '../store/settingsStore'
import { HanoiScenery } from './HanoiScenery'
import { AccountChip, LoginPanel } from './LoginPanel'

/** Day number of the saved game, if there is one (read without loading the game code). */
function savedDay(): number | null {
  try {
    const raw = localStorage.getItem('visa-hunter-save')
    if (!raw) return null
    const day = (JSON.parse(raw) as { time?: { day?: unknown } }).time?.day
    return typeof day === 'number' ? day : null
  } catch {
    return null
  }
}

/** The sky above the title: drifting clouds and a little plane flying Hà Nội → Germany. */
function SkyJourney() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 top-0 h-[34%] w-full" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="animate-cloud" fill="#ffffff" opacity="0.85">
        <ellipse cx="60" cy="60" rx="34" ry="12" />
        <ellipse cx="80" cy="52" rx="20" ry="13" />
        <ellipse cx="300" cy="40" rx="28" ry="9" />
        <ellipse cx="316" cy="33" rx="16" ry="10" />
      </g>
      <path id="flight" d="M20 190 C 120 60, 260 40, 380 110" fill="none" stroke="#c8322b" strokeWidth="2.2" strokeDasharray="6 7" strokeLinecap="round" opacity="0.55" />
      <circle cx="20" cy="190" r="5" fill="#c8322b" />
      <g transform="translate(380 110)">
        <rect x="-9" y="-20" width="18" height="4" fill="#2a2330" />
        <rect x="-9" y="-16" width="18" height="4" fill="#d4473b" />
        <rect x="-9" y="-12" width="18" height="4" fill="#f4c04e" />
        <rect x="-10" y="-20" width="1.6" height="24" fill="#5b4636" />
      </g>
      <g>
        <path d="M-12 -3 L10 0 L-12 3 L-8 0 Z M-4 -1 L-8 -10 L-2 -10 L4 -1 Z M-4 1 L-8 10 L-2 10 L4 1 Z" fill="#ffffff" stroke="#4a3226" strokeWidth="1.6" strokeLinejoin="round" />
        <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
          <mpath href="#flight" />
        </animateMotion>
      </g>
    </svg>
  )
}

/**
 * Title screen (M9): shows instantly, unlocks audio with the first tap, and only then
 * loads the 3D game. `loading` = the game code is on its way.
 */
export function TitleScreen({ onPlay, loading = false }: { onPlay?: () => void; loading?: boolean }) {
  const t = useT()
  const language = useSettings((s) => s.language)
  const setLanguage = useSettings((s) => s.setLanguage)
  const day = useMemo(savedDay, [])
  const [loginOpen, setLoginOpen] = useState(false)

  // Desktop: Enter / Space starts the game.
  useEffect(() => {
    if (loading || !onPlay || loginOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        onPlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onPlay, loginOpen])

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-linear-to-b from-[#bfe3ff] via-[#ffe9cc] to-[#ffd9a8] text-ink">
      <HanoiScenery className="absolute inset-x-0 bottom-0 h-[42%] w-full" />
      <SkyJourney />

      <div className="relative -mt-[18vh] flex flex-col items-center">
        <span className="mb-1 rounded-md px-3 py-0.5 text-xs font-black tracking-widest plaque-hanoi">HÀ NỘI → DEUTSCHLAND</span>
        <h1 className="font-display text-6xl font-extrabold tracking-tight text-lacquer drop-shadow-[0_4px_0_#f4c04e]">Visa Hunter</h1>
        <p className="mt-1 px-6 text-center text-sm font-bold text-ink/75">{t('loading.subtitle')}</p>

        {loading ? (
          <>
            <div className="mt-8 flex gap-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-3 w-3 animate-bounce rounded-full bg-lacquer" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
            <p className="mt-2 font-bold text-ink/70">{t('loading.text')}</p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onPlay}
              className="mt-8 flex flex-col items-center rounded-full btn-lacquer px-12 py-3 font-display text-3xl font-extrabold active:translate-y-1 active:shadow-none"
            >
              ▶ {day ? t('title.continue') : t('title.play')}
              {day && <span className="font-sans text-xs font-black opacity-90">{t('hud.day', { day })}</span>}
            </button>
            <AccountChip onOpen={() => setLoginOpen(true)} />
            <div className="mt-4 flex gap-1 rounded-full bg-ink/10 p-1" role="group" aria-label={t('settings.language')}>
              {(Object.keys(LANGUAGE_NAMES) as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  aria-pressed={language === l}
                  className={`min-w-11 rounded-full px-3 py-1.5 text-sm font-extrabold ${language === l ? 'bg-[#a8322a] text-white shadow' : 'text-ink/80'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="absolute z-10 mx-6 rounded-full bg-paper/85 px-4 py-1 text-center text-xs font-bold text-ink/75" style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {t('title.hint')}
      </p>
      <span className="absolute top-2 right-3 z-10 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-black text-ink/60" style={{ top: 'max(0.5rem, env(safe-area-inset-top))' }}>
        v{__APP_VERSION__}
      </span>
      {loginOpen && <LoginPanel onClose={() => setLoginOpen(false)} />}
    </div>
  )
}
