import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useT } from '../i18n'
import { getAccount, googleRegister, googleSignIn, serverConfig, signIn, signOut, type Account, type AuthError } from '../net/auth'
import { googleSignedOut, renderGoogleButton } from '../net/google'
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

/** Account chip under the Play button: who you are, or a button to sign in. */
export function AccountChip({ onOpen }: { onOpen: () => void }) {
  const t = useT()
  const account = useAccount()
  if (!account) {
    return (
      <button type="button" onClick={onOpen} data-testid="login-open" className="mt-4 flex items-center gap-2 rounded-full btn-jade px-5 py-2 text-sm font-black active:translate-y-0.5">
        <UserIcon /> {t('account.signInOnline')}
      </button>
    )
  }
  return (
    <div className="mt-4 flex items-center gap-2 rounded-full border-2 border-outline bg-paper py-1 pr-1 pl-3 text-sm font-black shadow-[0_3px_0_var(--color-outline)]" data-testid="account-chip">
      <span className="h-2.5 w-2.5 rounded-full bg-[#3fae72] shadow-[0_0_0_2px_#fff]" />
      <span className="max-w-[10rem] truncate">{account.name}</span>
      <button type="button" onClick={() => void signOut().then(googleSignedOut)} className="rounded-full bg-ink/10 px-3 py-1 text-xs font-black">
        {t('account.signOut')}
      </button>
    </div>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" aria-hidden="true">
      <circle cx="12" cy="8" r="4.2" fill="currentColor" />
      <path d="M3.5 21c.8-4.4 4.2-7 8.5-7s7.7 2.6 8.5 7z" fill="currentColor" />
    </svg>
  )
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

/** Sign in / create an account (name + password, or Google). Closing it means playing offline. */
export function LoginPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [hasGoogle, setHasGoogle] = useState(false)
  /** First Google sign-in: choose a player name. */
  const [pick, setPick] = useState<{ ticket: string; email: string | null } | null>(null)

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
      setPick({ ticket: result.ticket, email: result.email })
      setName(result.suggested)
      return
    }
    finish(result)
  }

  const input = 'w-full rounded-xl border-2 border-outline bg-white px-3 py-2.5 text-base font-bold outline-none focus:shadow-[0_0_0_3px_var(--color-gold)]'
  return (
    <div className="absolute inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/45 p-4" role="dialog" aria-modal="true" aria-label={t('account.title')} onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="panel my-6 w-full max-w-sm p-5" data-testid="login-panel">
        <div className="-mt-9 mb-3 flex justify-center">
          <span className="ribbon px-5 py-1 font-display text-lg font-extrabold">{t(pick ? 'account.pickName' : 'account.title')}</span>
        </div>
        {pick ? (
          <>
            <p className="mb-3 text-center text-[13px] leading-snug font-bold text-ink/70">{t('account.pickNameHint', { email: pick.email ?? 'Google' })}</p>
            <label className="mb-1 block text-xs font-black text-ink/70">
              {t('account.name')}
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={16} data-testid="login-name" autoFocus required />
            </label>
            <p className="mb-3 text-[11px] font-bold text-ink/60">{t('account.rules')}</p>
          </>
        ) : (
          <>
            <p className="mb-3 text-center text-[13px] leading-snug font-bold text-ink/70">{t('account.why')}</p>
            {hasGoogle && (
              <>
                <GoogleButton onCredential={(c) => void onGoogle(c)} />
                <div className="my-3 flex items-center gap-2 text-[11px] font-black text-ink/50">
                  <span className="h-0.5 flex-1 rounded bg-ink/15" />
                  {t('account.or')}
                  <span className="h-0.5 flex-1 rounded bg-ink/15" />
                </div>
              </>
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
          </>
        )}
        {error && (
          <p className="mb-3 rounded-lg border-2 border-lacquer bg-lacquer/10 px-3 py-1.5 text-sm font-black text-lacquer" role="alert" data-testid="login-error">
            {t(AUTH_ERRORS[error])}
          </p>
        )}
        <button type="submit" disabled={busy} data-testid="login-submit" className="w-full rounded-xl btn-lacquer py-2.5 font-display text-lg font-extrabold active:translate-y-0.5 disabled:opacity-60">
          {busy ? '…' : t(pick ? 'account.register' : mode === 'login' ? 'account.login' : 'account.register')}
        </button>
        <button
          type="button"
          onClick={pick ? () => setPick(null) : onClose}
          className="mt-2 w-full rounded-xl py-2 text-sm font-black text-ink/70"
        >
          {t(pick ? 'account.back' : 'account.offline')}
        </button>
      </form>
    </div>
  )
}
