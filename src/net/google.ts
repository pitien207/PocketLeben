/**
 * "Sign in with Google" button (Google Identity Services). The script is loaded only when a
 * login panel needs it; it gives us an ID token (credential) that the server verifies.
 */

interface GsiButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  width?: number
  locale?: string
  logo_alignment?: 'left' | 'center'
}

interface Gsi {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup'; auto_select?: boolean; use_fedcm_for_prompt?: boolean }): void
      renderButton(parent: HTMLElement, options: GsiButtonOptions): void
      disableAutoSelect(): void
    }
  }
}

const SRC = 'https://accounts.google.com/gsi/client'
let loading: Promise<Gsi> | null = null

function loadGsi(): Promise<Gsi> {
  const existing = (window as unknown as { google?: Gsi }).google
  if (existing?.accounts?.id) return Promise.resolve(existing)
  loading ??= new Promise<Gsi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.onload = () => {
      const g = (window as unknown as { google?: Gsi }).google
      if (g?.accounts?.id) resolve(g)
      else reject(new Error('gsi'))
    }
    script.onerror = () => {
      loading = null
      reject(new Error('gsi'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/** The latest callback wins (one button visible at a time: title screen or settings). */
let onCredential: ((credential: string) => void) | null = null
let initializedFor: string | null = null

/** Draw Google's official button into `parent`. Resolves false if Google can't be reached. */
export async function renderGoogleButton(parent: HTMLElement, clientId: string, callback: (credential: string) => void, options: GsiButtonOptions = {}): Promise<boolean> {
  try {
    const gsi = await loadGsi()
    onCredential = callback
    if (initializedFor !== clientId) {
      gsi.accounts.id.initialize({ client_id: clientId, callback: (r) => onCredential?.(r.credential), ux_mode: 'popup' })
      initializedFor = clientId
    }
    parent.replaceChildren()
    gsi.accounts.id.renderButton(parent, { theme: 'outline', size: 'large', shape: 'pill', logo_alignment: 'left', ...options })
    return true
  } catch {
    return false
  }
}

/** After signing out: don't silently pick the same Google account again. */
export function googleSignedOut() {
  ;(window as unknown as { google?: Gsi }).google?.accounts.id.disableAutoSelect()
}
