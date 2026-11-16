import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CONFIG, type QualityLevel } from '../data/config'
import { exportSave, importSave, resetSave, suspendSaving } from '../game/systems/save'
import { useT } from '../i18n'
import { useDialogue } from '../store/dialogueStore'
import { useSettings, type TimeSpeed } from '../store/settingsStore'
import { useUI } from '../store/uiStore'
import { CloseIcon } from './icons'
import { TestTools } from './TestTools'
import { pushToast } from '../store/toastStore'
import { AUTH_ERRORS, GoogleButton, LoginPanel, useAccount } from './LoginPanel'
import { api, fetchMe, getAccount, googleLink, pullCloudSave, pushCloudSave, signOut, type AuthError, type Me } from '../net/auth'
import { googleSignedOut } from '../net/google'
import { useNet } from '../store/netStore'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="font-extrabold">{label}</span>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex rounded-full bg-ink/10 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-sm font-extrabold transition ${
            o.value === value ? 'bg-lacquer text-gold-light shadow' : 'text-ink/60'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function useFullscreen() {
  const supported = typeof document !== 'undefined' && document.fullscreenEnabled
  const [active, setActive] = useState(() => supported && !!document.fullscreenElement)
  useEffect(() => {
    if (!supported) return
    const onChange = () => setActive(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [supported])
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => {})
  }
  return { supported, active, toggle }
}

/** Export/import a save code and start over (plan §5.8). */
function SaveData() {
  const t = useT()
  const [mode, setMode] = useState<'none' | 'export' | 'import'>('none')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  const showExport = () => {
    setCode(exportSave())
    setMessage(null)
    setMode('export')
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // No clipboard API over plain http on phones: select the text for a manual copy.
      area.current?.select()
      document.execCommand?.('copy')
    }
    setMessage(t('settings.copied'))
  }
  const apply = () => {
    if (importSave(code)) {
      suspendSaving()
      window.location.reload()
    } else {
      setMessage(t('settings.importError'))
    }
  }

  return (
    <div className="mt-2 border-t-2 border-dashed border-ink/15 pt-3">
      <div className="mb-2 font-display text-base font-extrabold text-lacquer">{t('settings.data')}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={showExport} className="rounded-full btn-jade px-3 py-1.5 text-sm font-extrabold">
          {t('settings.export')}
        </button>
        <button
          type="button"
          onClick={() => {
            setCode('')
            setMessage(null)
            setMode('import')
          }}
          className="rounded-full btn-jade px-3 py-1.5 text-sm font-extrabold"
        >
          {t('settings.import')}
        </button>
      </div>
      {mode !== 'none' && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            ref={area}
            value={code}
            readOnly={mode === 'export'}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('settings.importHint')}
            rows={3}
            className="w-full resize-none rounded-xl border-2 border-[#f1dcb6] bg-white p-2 font-mono text-[11px] break-all text-ink"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={mode === 'export' ? copy : apply}
              className="rounded-full btn-lacquer px-4 py-1.5 text-sm font-extrabold"
            >
              {mode === 'export' ? t('settings.copy') : t('settings.importApply')}
            </button>
            {message && <span className="text-xs font-bold text-ink/70">{message}</span>}
          </div>
        </div>
      )}
      <DeleteCharacter />
    </div>
  )
}

/**
 * "Xoá nhân vật": wipes this device's save AND the cloud copy (otherwise the next Play would pull
 * it back), then reloads into "Chọn nhân vật". Two steps, no browser confirm() (unreliable in PWAs).
 */
function DeleteCharacter() {
  const t = useT()
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy'>('idle')
  const [error, setError] = useState(false)
  const wipe = async () => {
    setStep('busy')
    setError(false)
    if (getAccount()) {
      const ok = await api('DELETE', 'save').then(
        (r) => r.ok,
        () => false,
      )
      if (!ok) {
        setError(true)
        setStep('confirm')
        return
      }
    }
    // Don't let the autosave write the old state back while reloading.
    suspendSaving()
    resetSave()
    window.location.reload()
  }
  return (
    <div className="mt-3 rounded-2xl border-2 border-lacquer/30 bg-lacquer/5 p-3" data-testid="delete-character">
      <div className="font-display text-base font-extrabold text-lacquer">{t('settings.deleteTitle')}</div>
      <p className="mt-0.5 text-[12px] leading-snug font-bold text-ink/65">{t('settings.deleteText')}</p>
      {step === 'idle' ? (
        <button type="button" data-testid="delete-start" onClick={() => setStep('confirm')} className="mt-2 rounded-full border-2 border-lacquer px-3 py-1.5 text-sm font-extrabold text-lacquer active:translate-y-0.5">
          {t('settings.deleteButton')}
        </button>
      ) : (
        <div className="mt-2">
          <p className="text-[13px] font-black text-lacquer">{t('settings.deleteSure')}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button type="button" data-testid="delete-confirm" disabled={step === 'busy'} onClick={() => void wipe()} className="rounded-full btn-lacquer px-4 py-1.5 text-sm font-extrabold disabled:opacity-60">
              {step === 'busy' ? '…' : t('settings.deleteConfirm')}
            </button>
            <button type="button" onClick={() => setStep('idle')} className="rounded-full bg-ink/10 px-3 py-1.5 text-sm font-extrabold">
              {t('phone.cancel')}
            </button>
          </div>
          {error && <p className="mt-1.5 text-[12px] font-bold text-lacquer">{t('settings.deleteOffline')}</p>}
        </div>
      )}
    </div>
  )
}

/** Settings dialog. Esc toggles it on desktop (plan §4) unless something else is open. */
/** Google linked to this account (sign in either way), or a button to link it. */
function GoogleLinkRow() {
  const t = useT()
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<AuthError | null>(null)
  useEffect(() => {
    void fetchMe().then(setMe)
  }, [])
  if (!me) return null
  if (me.google !== null) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[12px] font-black text-ink/70" data-testid="google-linked">
        <GoogleG /> {t('account.googleLinked', { email: me.google || 'Google' })}
      </p>
    )
  }
  return (
    <div className="mt-2">
      <p className="mb-1.5 text-[12px] leading-snug font-bold text-ink/60">{t('account.linkGoogleHint')}</p>
      <GoogleButton
        text="signin_with"
        onCredential={(c) =>
          void googleLink(c).then((r) => {
            if (typeof r === 'string') setError(r)
            else setMe({ ...me, google: r.google })
          })
        }
      />
      {error && <p className="mt-1 text-[12px] font-black text-lacquer">{t(AUTH_ERRORS[error])}</p>}
    </div>
  )
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="1.1em" height="1.1em" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** How much of the game is stored on this device (plays offline, no re-downloading). */
function OfflineStatus() {
  const t = useT()
  const [info, setInfo] = useState<{ mb: number; ready: boolean } | null>(null)
  useEffect(() => {
    if (!('caches' in window)) return
    void (async () => {
      const keys = await caches.keys()
      const ready = keys.some((k) => k.startsWith('visa-hunter-') && k !== 'visa-hunter-runtime')
      const est = await navigator.storage?.estimate?.().catch(() => undefined)
      setInfo({ mb: (est?.usage ?? 0) / 1_048_576, ready })
    })()
  }, [])
  if (!info) return null
  return (
    <Row label={t('settings.offline')}>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${info.ready ? 'bg-jade text-white' : 'bg-ink/10 text-ink/70'}`} data-testid="offline-status">
        {info.ready ? t('settings.offlineReady', { mb: info.mb.toFixed(1) }) : t('settings.offlineNot')}
      </span>
    </Row>
  )
}

/** Account: sign in for multiplayer + cloud save, the online switch, sign out. */
function AccountSection() {
  const t = useT()
  const account = useAccount()
  const online = useSettings((s) => s.online)
  const setOnline = useSettings((s) => s.setOnline)
  const status = useNet((s) => s.status)
  const [loginOpen, setLoginOpen] = useState(false)
  const afterLogin = async () => {
    setLoginOpen(false)
    // The account already has newer progress (another device): load it.
    if ((await pullCloudSave()) === 'cloud') {
      suspendSaving()
      window.location.reload()
    } else void pushCloudSave()
  }
  return (
    <section className="mb-3 rounded-2xl border-2 border-outline bg-white/70 p-3" data-testid="account-section">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-xs font-black text-ink/60">{t('account.title')}</span>
          <span className="flex items-center gap-1.5 truncate font-display text-base font-extrabold">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status === 'online' ? 'bg-[#3fae72]' : 'bg-ink/30'}`} />
            {account ? account.name : t('account.guest')}
          </span>
        </span>
        {account ? (
          <button type="button" onClick={() => void pushCloudSave().then(signOut).then(googleSignedOut)} className="shrink-0 rounded-full bg-ink/10 px-3 py-1.5 text-sm font-black">
            {t('account.signOut')}
          </button>
        ) : (
          <button type="button" onClick={() => setLoginOpen(true)} data-testid="settings-login" className="shrink-0 rounded-full btn-jade px-4 py-1.5 text-sm font-black">
            {t('account.login')}
          </button>
        )}
      </div>
      {account && <GoogleLinkRow />}
      {account ? (
        <Row label={t('account.online')}>
          <Segmented
            value={online ? 'on' : 'off'}
            options={[
              { value: 'on', label: t('settings.on') },
              { value: 'off', label: t('settings.off') },
            ]}
            onChange={(v) => setOnline(v === 'on')}
          />
        </Row>
      ) : (
        <p className="mt-1 text-[12px] leading-snug font-bold text-ink/60">{t('account.why')}</p>
      )}
      {loginOpen && <LoginPanel onClose={() => void afterLogin()} />}
    </section>
  )
}

export function SettingsPanel() {
  const t = useT()
  const open = useUI((s) => s.settingsOpen)
  const setOpen = useUI((s) => s.setSettingsOpen)
  const { musicOn, toggleMusic, sfxOn, toggleSfx, quality, setQuality,  timeSpeed, setTimeSpeed, guideArrows, setGuideArrows, guideHints, setGuideHints } = useSettings()
  const fullscreen = useFullscreen()
  const taps = useRef({ n: 0, at: 0 })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      const ui = useUI.getState()
      // Esc closes conversations / shop / bag first (they handle it themselves).
      if (!ui.settingsOpen && (ui.panel || useDialogue.getState().npcId)) return
      setOpen(!ui.settingsOpen)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  if (!open) return null

  const onOff = [
    { value: 'on', label: t('settings.on') },
    { value: 'off', label: t('settings.off') },
  ] as const

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-ink/30 p-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="panel animate-pop relative w-full max-w-sm p-5 pt-7 text-ink">
        <h2 id="settings-title" className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full ribbon px-5 py-1 text-lg whitespace-nowrap">
          {t('settings.title')}
        </h2>
        <button
          type="button"
          aria-label={t('settings.close')}
          onClick={() => setOpen(false)}
          className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-ink/10 text-lg"
        >
          <CloseIcon />
        </button>

        <div className="max-h-[70dvh] overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }}>
          <TestTools />
          <AccountSection />
          <OfflineStatus />
          <Row label={t('settings.music')}>
            <Segmented
              value={musicOn ? 'on' : 'off'}
              options={[...onOff]}
              onChange={(v) => {
                if ((v === 'on') !== musicOn) toggleMusic()
              }}
            />
          </Row>
          <Row label={t('settings.sfx')}>
            <Segmented
              value={sfxOn ? 'on' : 'off'}
              options={[...onOff]}
              onChange={(v) => {
                if ((v === 'on') !== sfxOn) toggleSfx()
              }}
            />
          </Row>
          <Row label={t('settings.guideArrows')}>
            <Segmented value={guideArrows ? 'on' : 'off'} options={[...onOff]} onChange={(v) => setGuideArrows(v === 'on')} />
          </Row>
          <Row label={t('settings.guideHints')}>
            <Segmented value={guideHints ? 'on' : 'off'} options={[...onOff]} onChange={(v) => setGuideHints(v === 'on')} />
          </Row>
          <Row label={t('clock.speed')}>
            <Segmented<TimeSpeed>
              value={timeSpeed}
              options={[
                { value: 'slow', label: t('clock.speed.slow') },
                { value: 'normal', label: t('clock.speed.normal') },
                { value: 'fast', label: t('clock.speed.fast') },
              ]}
              onChange={setTimeSpeed}
            />
          </Row>
          <Row label={t('settings.graphics')}>
            <Segmented<QualityLevel>
              value={quality}
              options={[
                { value: 'high', label: t('settings.graphicsHigh') },
                { value: 'low', label: t('settings.graphicsLow') },
              ]}
              onChange={setQuality}
            />
          </Row>
          {fullscreen.supported && (
            <Row label={t('settings.fullscreen')}>
              <Segmented
                value={fullscreen.active ? 'on' : 'off'}
                options={[...onOff]}
                onChange={(v) => {
                  if ((v === 'on') !== fullscreen.active) fullscreen.toggle()
                }}
              />
            </Row>
          )}

          <SaveData />

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-2xl btn-lacquer py-3 font-display text-lg font-extrabold active:translate-y-1 active:shadow-none"
          >
            {t('settings.close')}
          </button>
          <p
            className="mt-3 cursor-default text-center text-xs font-bold text-ink/50 select-none"
            onClick={() => {
              // Tap the version 5 times quickly: toggle test mode (developer tools).
              const now = Date.now()
              taps.current = { n: now - taps.current.at < 700 ? taps.current.n + 1 : 1, at: now }
              if (taps.current.n < 5) return
              taps.current.n = 0
              const on = !useSettings.getState().testMode
              useSettings.getState().setTestMode(on)
              pushToast(on ? 'toast.testOn' : 'toast.testOff', 'info')
            }}
          >
            Visa Hunter · {t('settings.version', { version: CONFIG.version })}
          </p>
        </div>
      </div>
    </div>
  )
}
