import { setFullscreen } from '../fullscreen'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CONFIG, type QualityLevel } from '../data/config'
import { exportSave, importSave, resetSave, suspendSaving } from '../game/systems/save'
import { useT } from '../i18n'
import { useDialogue } from '../store/dialogueStore'
import { useSettings } from '../store/settingsStore'
import { useUI } from '../store/uiStore'
import { CloseIcon } from './icons'
import CreditsPanel from './CreditsPanel'
import { TestTools } from './TestTools'
import { pushToast } from '../store/toastStore'
import { AUTH_ERRORS, GoogleButton, LoginPanel, useAccount } from './LoginPanel'
import { api, fetchMe, getAccount, googleLink, pullCloudSave, pushCloudSave, signOut, type AuthError, type Me } from '../net/auth'
import { googleSignedOut } from '../net/google'
import { useNet } from '../store/netStore'
import { isSandbox } from '../sandbox'
import { Icon3d } from './Icon3d'
import { Segmented } from './kit/Tabs'
import { Toggle } from './kit/Toggle'

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5 [&+&]:border-t [&+&]:border-ink/8">
      <span className="min-w-0">
        <span className="block text-[14px] leading-tight font-extrabold">{label}</span>
        {hint && <span className="block text-[11px] leading-snug font-bold text-ink/55">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

/** 1.47: settings come in small titled cards (sound, guide, display, data). */
function Group({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="mb-3">
      <h3 className="mb-1 flex items-center gap-1.5 px-1 font-display text-[15px] font-extrabold text-lacquer">
        <Icon3d name={icon} className="h-5 w-5" />
        {title}
      </h3>
      <div className="ui-group">{children}</div>
    </section>
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
  // Going full screen also keeps the phone landscape (1.30); turning it off is remembered for Play.
  const toggle = () => setFullscreen(!document.fullscreenElement)
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
    <div className="border-t border-ink/8 px-3 pt-2.5 pb-3">
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
      {/* 1.43 the sandbox must never delete the real (cloud) character */}
      {!isSandbox() && <DeleteCharacter />}
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
    <div className="mt-3 rounded-xl border-2 border-lacquer/30 bg-lacquer/5 p-3" data-testid="delete-character">
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
    <section className="ui-group mb-3 p-3" data-testid="account-section">
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
        <div className="-mx-3 mt-1 -mb-1.5">
          <Row label={t('account.online')}>
            <Toggle checked={online} onChange={setOnline} label={t('account.online')} testId="toggle-online" />
          </Row>
        </div>
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
  const { musicOn, toggleMusic, sfxOn, toggleSfx, quality, setQuality, guideArrows, setGuideArrows, guideHints, setGuideHints, fancy, setFancy } = useSettings()
  const fullscreen = useFullscreen()
  const taps = useRef({ n: 0, at: 0 })
  const [credits, setCredits] = useState(false)

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

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 modal-scroll bg-ink/30 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="panel sheet-in relative w-full max-w-sm p-4 pt-7 text-ink short:max-w-md short:pb-3">
        <h2 id="settings-title" className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full ribbon py-1 pr-5 pl-4 text-lg whitespace-nowrap">
          <Icon3d name="gear" className="-my-1 -ml-1 h-6 w-6 drop-shadow-[0_1.5px_0_rgba(74,20,14,0.45)]" />
          {t('settings.title')}
        </h2>
        <button
          type="button"
          aria-label={t('settings.close')}
          onClick={() => setOpen(false)}
          className="btn-paper absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full text-lg"
        >
          <CloseIcon />
        </button>

        <div className="ui-scroll ui-fade-y -mx-1 max-h-[70dvh] overflow-y-auto px-1 py-1 short:max-h-[calc(100dvh-8.5rem)]">
          <TestTools />
          <AccountSection />
          <Group title={t('settings.secSound')} icon="bell">
            <Row label={t('settings.music')}>
              <Toggle checked={musicOn} onChange={(on) => on !== musicOn && toggleMusic()} label={t('settings.music')} testId="toggle-music" />
            </Row>
            <Row label={t('settings.sfx')}>
              <Toggle checked={sfxOn} onChange={(on) => on !== sfxOn && toggleSfx()} label={t('settings.sfx')} testId="toggle-sfx" />
            </Row>
          </Group>
          <Group title={t('settings.secGuide')} icon="compass">
            <Row label={t('settings.guideArrows')}>
              <Toggle checked={guideArrows} onChange={setGuideArrows} label={t('settings.guideArrows')} testId="toggle-arrows" />
            </Row>
            <Row label={t('settings.guideHints')}>
              <Toggle checked={guideHints} onChange={setGuideHints} label={t('settings.guideHints')} testId="toggle-hints" />
            </Row>
          </Group>
          <Group title={t('settings.secDisplay')} icon="sparkles">
            <Row label={t('settings.graphics')}>
              <Segmented<QualityLevel>
                value={quality}
                label={t('settings.graphics')}
                options={[
                  { value: 'high', label: t('settings.graphicsHigh'), testId: 'quality-high' },
                  { value: 'low', label: t('settings.graphicsLow'), testId: 'quality-low' },
                ]}
                onChange={setQuality}
              />
            </Row>
            <Row label={t('settings.fancy')}>
              <Toggle checked={fancy} onChange={setFancy} label={t('settings.fancy')} testId="toggle-fancy" />
            </Row>
            {fullscreen.supported && (
              <Row label={t('settings.fullscreen')}>
                <Toggle checked={fullscreen.active} onChange={(on) => on !== fullscreen.active && fullscreen.toggle()} label={t('settings.fullscreen')} />
              </Row>
            )}
          </Group>
          <Group title={t('settings.data')} icon="floppy-disk">
            <OfflineStatus />
            <SaveData />
          </Group>

          <button
            type="button"
            data-testid="credits-open"
            onClick={() => setCredits(true)}
            className="ui-group flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-extrabold active:translate-y-0.5"
          >
            {t('settings.credits')}
            <span aria-hidden="true" className="text-ink/50">›</span>
          </button>

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
            Pocket Leben · {t('settings.version', { version: CONFIG.version })}
          </p>
        </div>
      </div>
      {credits && <CreditsPanel onClose={() => setCredits(false)} />}
    </div>
  )
}
