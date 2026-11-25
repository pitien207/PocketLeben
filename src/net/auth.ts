/**
 * Account + cloud save (server/index.mjs). Tiny on purpose: the title screen imports it,
 * so it must not pull in the game. Everything still works offline without an account.
 */

const AUTH_KEY = 'visa-hunter-auth'
import { isSandbox } from '../sandbox'

const SAVE_KEY = 'visa-hunter-save'
/** Same origin by default (the dev server proxies /api and /ws); VITE_SERVER_URL points elsewhere. */
export const SERVER_URL: string = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? ''

export interface Account {
  token: string
  name: string
}

export type AuthError = 'badName' | 'badPassword' | 'taken' | 'wrong' | 'tooMany' | 'offline' | 'useGoogle' | 'googleInvalid' | 'googleTaken' | 'alreadyLinked'

/**
 * Where the login token lives: localStorage, so the game signs you in by itself next time (the
 * server renews the token whenever it is used; valid 1 year after the last visit). sessionStorage
 * (remember = false) is only read for tokens from older builds.
 */
function readAccount(storage: Storage): Account | null {
  try {
    const raw = storage.getItem(AUTH_KEY)
    const a = raw ? (JSON.parse(raw) as Partial<Account>) : null
    return a && typeof a.token === 'string' && typeof a.name === 'string' ? { token: a.token, name: a.name } : null
  } catch {
    return null
  }
}

export function getAccount(): Account | null {
  return readAccount(localStorage) ?? readAccount(sessionStorage)
}

function setAccount(a: Account | null, remember = true) {
  try {
    localStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(AUTH_KEY)
    if (a) (remember ? localStorage : sessionStorage).setItem(AUTH_KEY, JSON.stringify(a))
  } catch {
    // storage blocked: the account lasts for this page only
  }
  window.dispatchEvent(new Event('vh-account'))
}

export async function api<T>(method: string, path: string, body?: unknown, token = getAccount()?.token): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${SERVER_URL}/api/${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T
  return { ok: res.ok, status: res.status, data }
}

type TokenReply = { token?: string; name?: string; error?: AuthError }

function accepted(r: { ok: boolean; data: TokenReply }, remember: boolean): Account | AuthError {
  if (!r.ok || !r.data.token || !r.data.name) return r.data.error ?? 'offline'
  const account = { token: r.data.token, name: r.data.name }
  setAccount(account, remember)
  return account
}

/** Log in or create an account. Returns the account, or an error code. */
export async function signIn(mode: 'login' | 'register', name: string, password: string, remember = true): Promise<Account | AuthError> {
  try {
    return accepted(await api<TokenReply>('POST', mode, { name, password }, undefined), remember)
  } catch {
    return 'offline'
  }
}

// --- Google ------------------------------------------------------------------------------

let config: Promise<{ google: string | null }> | null = null
/** Server settings: the Google OAuth client ID (null = Google sign-in not set up). */
export function serverConfig() {
  config ??= api<{ google?: string | null }>('GET', 'config', undefined, undefined)
    .then((r) => ({ google: r.ok ? (r.data.google ?? null) : null }))
    .catch(() => {
      config = null
      return { google: null }
    })
  return config
}

export type GoogleResult = Account | AuthError | { needName: true; ticket: string; suggested: string; email: string | null; greeting: string | null; picture: string | null }

/** Google's ID token → logged in, or (first time) a ticket to choose a player name. */
export async function googleSignIn(credential: string, remember = true): Promise<GoogleResult> {
  try {
    const r = await api<TokenReply & { needName?: boolean; ticket?: string; suggested?: string; email?: string | null; greeting?: string | null; picture?: string | null }>('POST', 'google', { credential }, undefined)
    if (r.ok && r.data.needName && r.data.ticket) {
      const d = r.data
      return { needName: true, ticket: d.ticket!, suggested: d.suggested ?? '', email: d.email ?? null, greeting: d.greeting ?? null, picture: d.picture ?? null }
    }
    return accepted(r, remember)
  } catch {
    return 'offline'
  }
}

export async function googleRegister(ticket: string, name: string, remember = true): Promise<Account | AuthError> {
  try {
    return accepted(await api<TokenReply>('POST', 'google/register', { ticket, name }, undefined), remember)
  } catch {
    return 'offline'
  }
}

/** Link a Google account to the signed-in account. Returns the Google e-mail or an error. */
export async function googleLink(credential: string): Promise<{ google: string } | AuthError> {
  try {
    const r = await api<{ google?: string; error?: AuthError }>('POST', 'google/link', { credential })
    return r.ok && typeof r.data.google === 'string' ? { google: r.data.google } : (r.data.error ?? 'offline')
  } catch {
    return 'offline'
  }
}

export interface Me {
  name: string
  google: string | null
  password: boolean
}
export async function fetchMe(): Promise<Me | null> {
  try {
    const r = await api<Me>('GET', 'me')
    return r.ok ? r.data : null
  } catch {
    return null
  }
}

export async function signOut() {
  const a = getAccount()
  setAccount(null)
  if (a) await api('POST', 'logout', undefined, a.token).catch(() => {})
}

const savedAtOf = (raw: string | null) => {
  try {
    const t = raw ? (JSON.parse(raw) as { savedAt?: unknown }).savedAt : null
    return typeof t === 'number' ? t : 0
  } catch {
    return 0
  }
}

/**
 * Before the game loads: if the cloud save is newer than this device's, use it
 * (play on the phone, continue on the laptop). Never blocks for long.
 */
export async function pullCloudSave(): Promise<'cloud' | 'local' | 'none'> {
  if (isSandbox()) return 'none'
  const a = getAccount()
  if (!a) return 'none'
  try {
    const timeout = new Promise<null>((ok) => setTimeout(() => ok(null), 4000))
    const r = await Promise.race([api<{ save?: { savedAt?: number } | null }>('GET', 'save'), timeout])
    if (!r) return 'local'
    if (r.status === 401) {
      setAccount(null)
      return 'none'
    }
    const cloud = r.data.save
    if (cloud && typeof cloud.savedAt === 'number' && cloud.savedAt > savedAtOf(localStorage.getItem(SAVE_KEY))) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(cloud))
      return 'cloud'
    }
    return 'local'
  } catch {
    return 'local'
  }
}

let lastPushed = 0
/** Upload the local save if it changed since the last upload. `keepalive` survives page close. */
export async function pushCloudSave(keepalive = false): Promise<boolean> {
  // 1.43 the sandbox (Chơi thử) never touches the cloud save
  if (isSandbox()) return false
  const a = getAccount()
  const raw = localStorage.getItem(SAVE_KEY)
  const at = savedAtOf(raw)
  if (!a || !raw || at <= lastPushed) return false
  try {
    const res = await fetch(`${SERVER_URL}/api/save`, {
      method: 'PUT',
      keepalive: keepalive && raw.length < 60_000,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${a.token}` },
      body: raw,
    })
    if (res.ok) lastPushed = at
    return res.ok
  } catch {
    return false
  }
}
