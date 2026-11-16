import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useT } from '../i18n'
import { getAccount, googleRegister, googleSignIn, serverConfig, signIn, type Account, type AuthError } from '../net/auth'
import { renderGoogleButton } from '../net/google'
import { useSettings } from '../store/settingsStore'

/** The signed-in account, kept in sync across the title screen and the settings. */
export function useAccount(): Account | null {
  const [account, setAccount] = useState(getAccount)
  useEffect(() => {
    const update = () => setAccount(getAccount())
    window.addEventListener('vh-account', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('vh-account', update)
      window.removeEventListener('storage', update)
    }
  }, [])
  return account
}

type ErrorKey =
  | 'account.errBadName'
  | 'account.errBadPassword'
  | 'account.errTaken'
  | 'account.errWrong'
  | 'account.errTooMany'
  | 'account.errOffline'
  | 'account.errUseGoogle'
  | 'account.errGoogle'
  | 'account.errGoogleTaken'
  | 'account.errAlreadyLinked'

export const AUTH_ERRORS: Record<AuthError, ErrorKey> = {
  badName: 'account.errBadName',
  badPassword: 'account.errBadPassword',
  taken: 'account.errTaken',
  wrong: 'account.errWrong',
  tooMany: 'account.errTooMany',
  offline: 'account.errOffline',
  useGoogle: 'account.errUseGoogle',
  googleInvalid: 'account.errGoogle',
  googleTaken: 'account.errGoogleTaken',
  alreadyLinked: 'account.errAlreadyLinked',
}

/** Chrome/Edge/Android: the browser's own password manager (Credential Management API). */
interface PasswordCredentialLike {
  id: string
  password?: string
}
type CredentialsWithPassword = CredentialsContainer & {
  get(options: { password: boolean; mediation: 'optional' | 'silent' }): Promise<PasswordCredentialLike | null>
}
const PasswordCredentialCtor = (window as unknown as { PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential }).PasswordCredential

function rememberPassword(name: string, password: string) {
  if (!PasswordCredentialCtor || !navigator.credentials) return
  navigator.credentials.store(new PasswordCredentialCtor({ id: name, password, name })).catch(() => {})
}

/** Official Google button; shows nothing when Google sign-in isn't configured or reachable. */
export function GoogleButton({ onCredential, text = 'continue_with' }: { onCredential: (credential: string) => void; text?: 'continue_with' | 'signin_with' }) {
  const ref = useRef<HTMLDivElement>(null)
  const language = useSettings((s) => s.language)
  const [clientId, setClientId] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const callback = useRef(onCredential)
  callback.current = onCredential
  useEffect(() => {
    let alive = true
    void serverConfig().then((c) => alive && setClientId(c.google))
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!clientId || !el) return
    const width = Math.min(360, Math.max(200, Math.floor(el.getBoundingClientRect().width)))
    void renderGoogleButton(el, clientId, (c) => callback.current(c), { text, width, locale: language }).then(setShown)
  }, [clientId, language, text])
  if (!clientId) return null
  return <div ref={ref} className={`flex min-h-[44px] justify-center ${shown ? '' : 'opacity-0'}`} data-testid="google-button" />
}

/** Small drawn icons for the benefit chips (no emoji in UI chrome). */
const BENEFITS = [
  {
    key: 'account.perkCloud',
    icon: <path d="M8 19h11a4 4 0 0 0 .6-8 6 6 0 0 0-11.4-1.6A4.8 4.8 0 0 0 8 19z" fill="#a9d6ff" stroke="#4a3226" strokeWidth="1.8" strokeLinejoin="round" />,
  },
  {
    key: 'account.perkFriends',
    icon: (
      <g stroke="#4a3226" strokeWidth="1.6">
        <circle cx="9" cy="9" r="3.4" fill="#ffc3a0" />
        <circle cx="16.5" cy="10" r="3" fill="#ffe08a" />
        <path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6zM13 20c.4-2.6 2-4.2 4-4.2s3.6 1.6 4 4.2z" fill="#8fd3c1" strokeLinejoin="round" />
      </g>
    ),
  },
  {
    key: 'account.perkDevices',
    icon: (
      <g stroke="#4a3226" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="3" y="6" width="12" height="9" rx="1.5" fill="#cdb8f0" />
        <rect x="14" y="8" width="7" height="12" rx="1.5" fill="#fff6e3" />
        <path d="M6 18h6" />
      </g>
    ),
  },
] as const

function Benefits() {
  const t = useT()
  return (
    <ul className="mb-3 grid grid-cols-3 gap-1.5">
      {BENEFITS.map((b) => (
        <li key={b.key} className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-outline/20 bg-white/70 px-1 py-1.5 text-center">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            {b.icon}
          </svg>
          <span className="text-[11px] leading-tight font-black text-ink/80">{t(b.key)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Round avatar: the Google photo, or the first letter. */
function Avatar({ picture, name }: { picture: string | null; name: string }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className="relative mx-auto mb-2 grid h-20 w-20 place-items-center overflow-hidden rounded-full border-[3px] border-outline bg-gold-light font-display text-4xl font-extrabold text-lacquer shadow-[0_4px_0_var(--color-outline)]">
      {picture && !broken ? (
        <img src={picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        (name.trim()[0] ?? '?').toUpperCase()
      )}
    </span>
  )
}

/**
 * Sign in / create an account. With Google set up, Google is the main (one-tap) way and the
 * name + password form folds away behind a link. Closing the panel means playing offline.
 */
export function LoginPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [hasGoogle, setHasGoogle] = useState<boolean | null>(null)
  /** Name + password form unfolded (always when Google isn't available). */
  const [showForm, setShowForm] = useState(false)
  /** First Google sign-in: choose a player name. */
  const [pick, setPick] = useState<{ ticket: string; email: string | null; greeting: string | null; picture: string | null } | null>(null)

  useEffect(() => {
    void serverConfig().then((c) => setHasGoogle(!!c.google))
    // Fill in a password the browser remembered (no typing on the next visit).
    const creds = navigator.credentials as CredentialsWithPassword | undefined
    if (PasswordCredentialCtor && creds) {
      creds
        .get({ password: true, mediation: 'optional' })
        .then((c) => {
          if (c?.id && c.password) {
            setName(c.id)
            setPassword(c.password)
            setShowForm(true)
          }
        })
        .catch(() => {})
    }
  }, [])

  const finish = (result: Account | AuthError) => {
    setBusy(false)
    if (typeof result === 'string') setError(result)
    else onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    if (pick) return finish(await googleRegister(pick.ticket, name))
    const result = await signIn(mode, name, password)
    if (typeof result !== 'string') rememberPassword(name, password)
    finish(result)
  }

  const onGoogle = async (credential: string) => {
    setBusy(true)
    setError(null)
    const result = await googleSignIn(credential)
    if (typeof result === 'object' && 'needName' in result) {
      setBusy(false)
      setPick({ ticket: result.ticket, email: result.email, greeting: result.greeting, picture: result.picture })
      setName(result.suggested)
      return
    }
    finish(result)
  }

  const formOpen = showForm || hasGoogle === false
  const input = 'w-full rounded-xl border-2 border-outline bg-white px-3 py-2.5 text-base font-bold outline-none focus:shadow-[0_0_0_3px_var(--color-gold)]'
  const errorBox = error && (
    <p className="mb-3 rounded-lg border-2 border-lacquer bg-lacquer/10 px-3 py-1.5 text-sm font-black text-lacquer" role="alert" data-testid="login-error">
      {t(AUTH_ERRORS[error])}
    </p>
  )
  return (
    <div className="absolute inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/45 p-4" role="dialog" aria-modal="true" aria-label={t('account.title')} onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="panel animate-pop my-6 w-full max-w-sm p-5" data-testid="login-panel">
        <div className="-mt-9 mb-3 flex justify-center">
          <span className="ribbon px-5 py-1 font-display text-lg font-extrabold">{t(pick ? 'account.pickName' : 'account.title')}</span>
        </div>

        {pick ? (
          <>
            <Avatar picture={pick.picture} name={pick.greeting ?? name} />
            <p className="text-center font-display text-xl font-extrabold text-ink">{t('account.hello', { name: pick.greeting ?? '' }).replace(' !', '!')}</p>
            {pick.email && (
              <p className="mx-auto mt-1 mb-3 flex w-max max-w-full items-center gap-1.5 rounded-full border-2 border-outline/20 bg-white/80 px-2.5 py-0.5 text-[12px] font-black text-ink/70">
                <GoogleMark /> <span className="truncate">{pick.email}</span>
              </p>
            )}
            <label className="mb-1 block text-xs font-black text-ink/70">
              {t('account.pickNameLabel')}
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={16} data-testid="login-name" autoFocus required />
            </label>
            <p className="mb-3 text-[11px] font-bold text-ink/60">{t('account.nameRule')}</p>
            {errorBox}
            <button type="submit" disabled={busy} data-testid="login-submit" className="w-full rounded-xl btn-lacquer py-2.5 font-display text-lg font-extrabold active:translate-y-0.5 disabled:opacity-60">
              {busy ? '…' : t('account.start')}
            </button>
            <button type="button" onClick={() => setPick(null)} className="mt-2 w-full rounded-xl py-2 text-sm font-black text-ink/70">
              {t('account.back')}
            </button>
          </>
        ) : (
          <>
            <Benefits />
            {hasGoogle && (
              <div className="mb-1 rounded-2xl border-2 border-outline bg-white p-3 shadow-[inset_0_-3px_0_#f1dcb6,0_3px_0_var(--color-outline)]">
                <GoogleButton onCredential={(c) => void onGoogle(c)} />
                <p className="mt-1.5 text-center text-[11px] font-black text-jade">{t('account.googleOneTap')}</p>
              </div>
            )}
            {!formOpen && errorBox}
            {hasGoogle && !formOpen && (
              <button type="button" onClick={() => setShowForm(true)} data-testid="show-password-form" className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-black text-ink/75 underline decoration-ink/30 underline-offset-4">
                <KeyIcon /> {t('account.usePassword')}
              </button>
            )}
            {formOpen && (
              <>
                {hasGoogle && (
                  <div className="my-3 flex items-center gap-2 text-[11px] font-black text-ink/50">
                    <span className="h-0.5 flex-1 rounded bg-ink/15" />
                    {t('account.or')}
                    <span className="h-0.5 flex-1 rounded bg-ink/15" />
                  </div>
                )}
                <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border-2 border-outline bg-ink/10 p-1" role="tablist">
                  {(['login', 'register'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => setMode(m)}
                      className={`rounded-lg py-1.5 text-sm font-black ${mode === m ? 'bg-paper shadow-[0_2px_0_var(--color-outline)]' : 'text-ink/70'}`}
                    >
                      {t(m === 'login' ? 'account.login' : 'account.register')}
                    </button>
                  ))}
                </div>
                <label className="mb-2 block text-xs font-black text-ink/70">
                  {t('account.name')}
                  <input className={input} name="username" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" maxLength={16} data-testid="login-name" required />
                </label>
                <label className="mb-3 block text-xs font-black text-ink/70">
                  {t('account.password')}
                  <input
                    className={input}
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    data-testid="login-password"
                    required
                  />
                </label>
                {mode === 'register' && <p className="-mt-2 mb-3 text-[11px] font-bold text-ink/60">{t('account.rules')}</p>}
                {errorBox}
                <button type="submit" disabled={busy} data-testid="login-submit" className="w-full rounded-xl btn-lacquer py-2.5 font-display text-lg font-extrabold active:translate-y-0.5 disabled:opacity-60">
                  {busy ? '…' : t(mode === 'login' ? 'account.login' : 'account.register')}
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="mt-2 w-full rounded-xl py-2 text-sm font-black text-ink/60">
              {t('account.offline')}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="14" height="14" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="12" r="4.2" fill="#f4c04e" stroke="#4a3226" strokeWidth="1.8" />
      <path d="M12 12h9M18 12v3M21 12v2" fill="none" stroke="#4a3226" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
