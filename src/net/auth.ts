/**
 * Account + cloud save (server/index.mjs). Tiny on purpose: the title screen imports it,
 * so it must not pull in the game. Everything still works offline without an account.
 */

const AUTH_KEY = 'visa-hunter-auth'
const SAVE_KEY = 'visa-hunter-save'
/** Same origin by default (the dev server proxies /api and /ws); VITE_SERVER_URL points elsewhere. */
export const SERVER_URL: string = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? ''

export interface Account {
  token: string
  name: string
}

export type AuthError = 'badName' | 'badPassword' | 'taken' | 'wrong' | 'tooMany' | 'offline'

export function getAccount(): Account | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    const a = raw ? (JSON.parse(raw) as Partial<Account>) : null
    return a && typeof a.token === 'string' && typeof a.name === 'string' ? { token: a.token, name: a.name } : null
  } catch {
    return null
  }
}

function setAccount(a: Account | null) {
  try {
    if (a) localStorage.setItem(AUTH_KEY, JSON.stringify(a))
    else localStorage.removeItem(AUTH_KEY)
  } catch {
    // storage blocked: the account lasts for this session only
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

/** Log in or create an account. Returns the account, or an error code. */
export async function signIn(mode: 'login' | 'register', name: string, password: string): Promise<Account | AuthError> {
  try {
    const r = await api<{ token?: string; name?: string; error?: AuthError }>('POST', mode, { name, password }, undefined)
    if (!r.ok || !r.data.token || !r.data.name) return r.data.error ?? 'offline'
    const account = { token: r.data.token, name: r.data.name }
    setAccount(account)
    return account
  } catch {
    return 'offline'
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
