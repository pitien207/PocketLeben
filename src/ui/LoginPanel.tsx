import { useEffect, useState, type FormEvent } from 'react'
import { useT } from '../i18n'
import { getAccount, signIn, signOut, type Account, type AuthError } from '../net/auth'

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
      <button type="button" onClick={() => void signOut()} className="rounded-full bg-ink/10 px-3 py-1 text-xs font-black">
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

const ERRORS: Record<AuthError, 'account.errBadName' | 'account.errBadPassword' | 'account.errTaken' | 'account.errWrong' | 'account.errTooMany' | 'account.errOffline'> = {
  badName: 'account.errBadName',
  badPassword: 'account.errBadPassword',
  taken: 'account.errTaken',
  wrong: 'account.errWrong',
  tooMany: 'account.errTooMany',
  offline: 'account.errOffline',
}

/** Sign in / create an account. Optional: closing it means playing offline. */
export function LoginPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const result = await signIn(mode, name, password)
    setBusy(false)
    if (typeof result === 'string') setError(result)
    else onClose()
  }

  const input = 'w-full rounded-xl border-2 border-outline bg-white px-3 py-2.5 text-base font-bold outline-none focus:shadow-[0_0_0_3px_var(--color-gold)]'
  return (
    <div className="absolute inset-0 z-[60] grid place-items-center bg-ink/45 p-4" role="dialog" aria-modal="true" aria-label={t('account.title')} onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="panel w-full max-w-sm p-5" data-testid="login-panel">
        <div className="-mt-9 mb-3 flex justify-center">
          <span className="ribbon px-5 py-1 font-display text-lg font-extrabold">{t('account.title')}</span>
        </div>
        <p className="mb-3 text-center text-[13px] leading-snug font-bold text-ink/70">{t('account.why')}</p>
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
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" maxLength={16} data-testid="login-name" required />
        </label>
        <label className="mb-3 block text-xs font-black text-ink/70">
          {t('account.password')}
          <input
            className={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            data-testid="login-password"
            required
          />
        </label>
        {mode === 'register' && <p className="-mt-2 mb-3 text-[11px] font-bold text-ink/60">{t('account.rules')}</p>}
        {error && (
          <p className="mb-3 rounded-lg border-2 border-lacquer bg-lacquer/10 px-3 py-1.5 text-sm font-black text-lacquer" role="alert" data-testid="login-error">
            {t(ERRORS[error])}
          </p>
        )}
        <button type="submit" disabled={busy} data-testid="login-submit" className="w-full rounded-xl btn-lacquer py-2.5 font-display text-lg font-extrabold active:translate-y-0.5 disabled:opacity-60">
          {busy ? '…' : t(mode === 'login' ? 'account.login' : 'account.register')}
        </button>
        <button type="button" onClick={onClose} className="mt-2 w-full rounded-xl py-2 text-sm font-black text-ink/70">
          {t('account.offline')}
        </button>
      </form>
    </div>
  )
}
