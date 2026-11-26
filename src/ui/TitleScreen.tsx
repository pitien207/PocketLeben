import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { signOut } from '../net/auth'
import { useSettings } from '../store/settingsStore'
import { createTitleAudio } from '../title/titleAudio'
import { googleSignedOut } from '../net/google'
import { LoginPanel, useAccount } from './LoginPanel'
import { PocketStamp, GAME_NAME } from './PocketLogo'
import { chunk } from '../updates'

/** 1.47: credits & licences, loaded only when opened (the title screen stays tiny). */
const CreditsPanel = lazy(() => chunk(import('./CreditsPanel')))

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

// Automated tests (dev + webdriver) skip the 3D desk to stay fast; title.mjs fakes a real browser.
const SKIP_3D = import.meta.env.DEV && navigator.webdriver

/** One ambience for the title, kept across the quick title → loading-title remount. */
const audio = createTitleAudio(0.8)
let audioStopTimer: number | undefined

const HAND = "'Patrick Hand', 'Comic Sans MS', cursive"
const VN = "'Be Vietnam Pro', 'Nunito', system-ui, sans-serif"


/** The visa application form with the round red Pocket Leben stamp — doubles as the game's logo. */
function VisaForm({ name }: { name: string | null }) {
  return (
    <div
      aria-label={`${GAME_NAME} — Hà Nội → Deutschland`}
      role="img"
      className="relative origin-top -rotate-2 bg-[#fbf4e4] px-5 pt-[18px] pb-5 text-[#2b2a33] shadow-[0_18px_40px_rgba(90,60,30,0.28),0_2px_0_rgba(0,0,0,0.06)] portrait:scale-[0.82] [@media(max-height:520px)]:-mb-[4.5rem] [@media(max-height:520px)]:origin-top-left [@media(max-height:520px)]:scale-[0.6]"
      style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 27px, rgba(60,70,110,.12) 27px 28px)', fontFamily: VN }}
    >
      {/* tape */}
      <span className="absolute -top-3 left-1/2 h-[26px] w-[92px] -translate-x-1/2 rotate-3 bg-[rgba(246,226,160,0.85)] shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
      <div className="flex justify-between gap-3 border-b-[1.5px] border-[#2b2a33] pb-2 text-[10.5px] leading-[1.35] font-semibold tracking-[0.06em] text-[#5b5a68] uppercase">
        <span>
          <b className="font-extrabold text-[#2b2a33]">Antrag</b> auf Erteilung eines nationalen Visums
        </span>
        <span>Nr. 0001</span>
      </div>
      {[
        ['Name', name ?? 'Nguyễn Văn ...'],
        ['Zweck', 'Ausbildung · Pflege'],
        ['Deutsch', 'A1 → B1 ?'],
      ].map(([label, value]) => (
        <div key={label} className="mt-[9px] grid grid-cols-[92px_1fr] items-end text-[10.5px] font-medium tracking-[0.05em] text-[#6a6977] uppercase">
          {label}
          <span className="truncate border-b border-dotted border-[#8a8898] pb-0.5 pl-1 text-[22px] leading-none tracking-normal text-[#1f3f8f] normal-case" style={{ fontFamily: HAND }}>
            {value}
          </span>
        </div>
      ))}
      {/* The logo: the round Pocket Leben stamp pressed onto the form (1.31). */}
      <PocketStamp size={140} className="absolute -right-5 -bottom-[42px] -rotate-6 mix-blend-multiply" />
    </div>
  )
}

function MenuButton({ n, primary, onClick, children, hint, testId }: { n: string; primary?: boolean; onClick: () => void; children: ReactNode; hint?: string; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`group flex cursor-pointer items-baseline gap-3.5 py-2 text-left transition hover:translate-x-1.5 hover:text-lacquer focus-visible:translate-x-1.5 focus-visible:text-lacquer focus-visible:outline-none portrait:justify-center portrait:text-center ${
        primary ? 'pb-3 text-[34px] leading-[1.1] font-extrabold text-[#3a2418] portrait:text-[32px] [@media(max-height:520px)]:pb-1 [@media(max-height:520px)]:text-[26px]' : 'text-[21px] leading-[1.1] font-semibold text-[#4a3226] [@media(max-height:520px)]:py-1 [@media(max-height:520px)]:text-[17px]'
      }`}
      style={{ fontFamily: VN }}
    >
      <small className="w-[22px] text-[11px] font-medium tracking-[0.14em] text-[#4a3226]/45 portrait:hidden">{n}</small>
      <span className={`shrink-0 whitespace-nowrap ${primary ? 'drop-shadow-[0_2px_0_rgba(244,192,78,0.9)]' : ''}`}>{children}</span>
      {hint && <em className="min-w-0 text-[13px] font-medium text-[#4a3226]/55 not-italic transition group-hover:opacity-100 portrait:hidden sm:-translate-x-1.5 sm:opacity-0 sm:group-hover:translate-x-0">{hint}</em>}
    </button>
  )
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      <g className="transition" opacity={on ? 1 : 0.25}>
        <path d="M16.5 8.5a5 5 0 0 1 0 7" />
        <path d="M19 6a8.5 8.5 0 0 1 0 12" />
      </g>
    </svg>
  )
}

/** The 3D desk by the window (lazy: shares the three.js download with the game). */
function DeskBackdrop() {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (SKIP_3D) return
    let unmount: (() => void) | undefined
    let cancelled = false
    import('../title/deskScene')
      .then((m) => {
        if (cancelled || !host.current) return
        unmount = m.mountDeskScene(
          host.current,
          (bike) => audio.bikePass(bike),
          (w) => audio.setFan(w),
        )
        requestAnimationFrame(() => setReady(true))
      })
      .catch(() => {
        // No WebGL / offline chunk: the plain morning sky stays.
      })
    return () => {
      cancelled = true
      unmount?.()
    }
  }, [])
  return (
    <>
      <div ref={host} className={`absolute inset-0 transition-opacity duration-[1200ms] ${ready ? 'opacity-100' : 'opacity-0'}`} />
    </>
  )
}

/**
 * Title screen: a sunny morning at the desk in Hà Nội (3D, from the user's start-menu design),
 * the visa form as the logo, a text menu. Shows instantly; `loading` = the game is on its way.
 */
export function TitleScreen({ onPlay, onSandbox, loading = false }: { onPlay?: () => void; onSandbox?: () => void; loading?: boolean }) {
  const t = useT()
  const musicOn = useSettings((s) => s.musicOn)
  const toggleMusic = useSettings((s) => s.toggleMusic)
  const account = useAccount()
  const day = useMemo(savedDay, [])
  /** Login panel open on this tab (the start menu is only "Đăng nhập" / "Đăng ký"). */
  const [login, setLogin] = useState<'login' | 'register' | null>(null)
  const loginOpen = login !== null
  const [audioStarted, setAudioStarted] = useState(audio.started)
  const [credits, setCredits] = useState(false)

  // Ambience: starts with the first tap / key (browsers need a gesture), follows the music setting.
  useEffect(() => {
    window.clearTimeout(audioStopTimer)
    const first = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.('[data-sound]')) return
      if (!useSettings.getState().musicOn || audio.started) return
      audio.start()
      setAudioStarted(true)
    }
    window.addEventListener('pointerdown', first)
    window.addEventListener('keydown', first)
    return () => {
      window.removeEventListener('pointerdown', first)
      window.removeEventListener('keydown', first)
      audioStopTimer = window.setTimeout(() => audio.stop(), 800)
    }
  }, [])
  useEffect(() => audio.setMuted(!musicOn), [musicOn])

  const toggleSound = () => {
    if (!audio.started) {
      audio.start()
      setAudioStarted(true)
      if (!musicOn) toggleMusic()
      return
    }
    toggleMusic()
  }
  const soundOn = audioStarted && musicOn

  // Desktop: Enter / Space starts the game.
  useEffect(() => {
    if (loading || !onPlay || loginOpen || !account) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Enter' || e.code === 'Space') && !(e.target as HTMLElement | null)?.closest?.('button')) {
        e.preventDefault()
        onPlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onPlay, loginOpen, account])

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-linear-to-b from-[#bfe3ff] via-[#ffe9cc] to-[#ffd9a8] text-ink">
      <DeskBackdrop />
      {/* Light wash behind the menu so the text reads on the sunny scene. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,247,232,0.88)_0%,rgba(255,247,232,0.45)_30%,transparent_48%)] portrait:bg-[linear-gradient(0deg,rgba(255,247,232,0.92)_0%,rgba(255,247,232,0.5)_30%,transparent_45%),linear-gradient(180deg,rgba(255,247,232,0.55)_0%,transparent_22%)]" />

      <div className="absolute inset-y-0 left-[clamp(28px,5vw,80px)] flex w-[min(360px,86vw)] flex-col justify-center gap-11 [@media(max-height:520px)]:gap-4 portrait:inset-x-0 portrait:mx-auto portrait:w-[min(340px,86vw)] portrait:justify-between portrait:pt-[max(7vh,env(safe-area-inset-top))] portrait:pb-[max(6vh,calc(env(safe-area-inset-bottom)+2.5rem))]">
        {/* 1.31 (user): the game's name, big and clear, above the form with its stamp. */}
        <div className="flex flex-col gap-4 portrait:items-center [@media(max-height:520px)]:gap-2">
          <h1
            className="m-0 font-display text-[clamp(42px,5vw,64px)] leading-[0.95] font-extrabold tracking-[0.5px] text-[#3a2418] portrait:text-center portrait:text-[44px] [@media(max-height:520px)]:text-[34px]"
            style={{ textShadow: '0 3px 0 rgba(244,192,78,0.95), 0 10px 22px rgba(90,60,30,0.18)' }}
            data-testid="title-name"
          >
            Pocket <span className="text-lacquer">Leben</span>
          </h1>
          <VisaForm name={account?.name ?? null} />
        </div>

        {loading ? (
          <div className="flex flex-col items-start gap-2 portrait:items-center" style={{ fontFamily: VN }}>
            <div className="flex gap-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-3 w-3 animate-bounce rounded-full bg-lacquer" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
            <p className="text-lg font-bold text-[#4a3226]/80">{t('loading.text')}</p>
          </div>
        ) : (
          <nav className="flex flex-col gap-0.5 portrait:items-center" aria-label="Menu">
            {account ? (
              <>
                {/* A login is remembered: play as that account, sign out, or make a new one. */}
                <MenuButton n="01" primary onClick={() => onPlay?.()} hint={day ? `${account.name} · ${t('hud.day', { day })}` : account.name} testId="title-play">
                  {t('account.login')}
                </MenuButton>
                <MenuButton n="02" onClick={() => void signOut().then(googleSignedOut)} hint={account.name} testId="title-signout">
                  {t('account.signOut')}
                </MenuButton>
                <MenuButton
                  n="03"
                  onClick={() => {
                    void signOut().then(googleSignedOut)
                    setLogin('register')
                  }}
                  hint={t('title.registerHint')}
                  testId="title-register"
                >
                  {t('title.register')}
                </MenuButton>
                {onSandbox && (
                  <MenuButton n="04" onClick={onSandbox} hint={t('title.sandboxHint')} testId="title-sandbox">
                    {t('title.sandbox')}
                  </MenuButton>
                )}
              </>
            ) : (
              <>
                <MenuButton n="01" primary onClick={() => setLogin('login')} hint={day ? t('hud.day', { day }) : t('title.onlineHint')} testId="login-open">
                  {t('account.login')}
                </MenuButton>
                <MenuButton n="02" onClick={() => setLogin('register')} hint={t('title.registerHint')} testId="title-register">
                  {t('title.register')}
                </MenuButton>
                {onSandbox && (
                  <MenuButton n="03" onClick={onSandbox} hint={t('title.sandboxHint')} testId="title-sandbox">
                    {t('title.sandbox')}
                  </MenuButton>
                )}
              </>
            )}
          </nav>
        )}
      </div>

      <button
        type="button"
        data-sound
        onClick={toggleSound}
        aria-label={t('title.soundToggle')}
        className={`absolute right-5 flex items-center gap-2 rounded-full border border-[#4a3226]/15 bg-white/70 py-2 pr-3.5 pl-2.5 text-[13px] font-semibold text-[#4a3226]/85 backdrop-blur-md transition hover:border-lacquer/40 hover:text-lacquer ${soundOn ? '' : 'animate-sound-hint'}`}
        style={{ top: 'max(18px, env(safe-area-inset-top))', fontFamily: VN }}
      >
        <SpeakerIcon on={soundOn} />
        <span>{!audioStarted ? t('title.soundStart') : musicOn ? t('title.soundOn') : t('title.soundMuted')}</span>
      </button>

      <div
        className="absolute right-[22px] rounded-full bg-white/55 px-3 py-1 text-right text-[12px] backdrop-blur-sm portrait:bg-transparent portrait:backdrop-blur-none font-medium tracking-[0.08em] text-[#4a3226]/65 portrait:inset-x-0 portrait:text-center portrait:text-[11px]"
        style={{ bottom: 'max(14px, env(safe-area-inset-bottom))', fontFamily: VN }}
      >
        Hà Nội · <b className="font-bold text-lacquer">07:45</b> · {t('title.weather')}
        <span className="ml-2 opacity-60">v{__APP_VERSION__}</span>
        <button type="button" data-testid="title-credits" onClick={() => setCredits(true)} className="ml-2 font-semibold text-[#4a3226]/80 underline decoration-[#4a3226]/30 underline-offset-2 hover:text-lacquer">
          {t('title.credits')}
        </button>
      </div>
      {credits && (
        <Suspense fallback={null}>
          <CreditsPanel onClose={() => setCredits(false)} />
        </Suspense>
      )}
      {login && (
        <LoginPanel
          key={login}
          initialMode={login}
          onClose={() => setLogin(null)}
          onOffline={() => {
            setLogin(null)
            onPlay?.()
          }}
          onSuccess={() => {
            setLogin(null)
            onPlay?.()
          }}
        />
      )}
    </div>
  )
}
