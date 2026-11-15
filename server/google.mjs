// "Sign in with Google": verify the ID token (a JWT) that Google Identity Services gives the
// browser. No library: fetch Google's public keys (JWKS), check the RS256 signature and the
// claims (issuer, audience = our OAuth client ID, expiry). Configure with GOOGLE_CLIENT_ID.
import { createPublicKey, verify } from 'node:crypto'

const JWKS_URL = process.env.GOOGLE_JWKS_URL ?? 'https://www.googleapis.com/oauth2/v3/certs'
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

/** OAuth client ID (public, not a secret). Without it the Google button is hidden. */
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null

let cache = { keys: [], at: 0 }
async function keys(force = false) {
  if (force || !cache.keys.length || Date.now() - cache.at > 3_600_000) {
    const res = await fetch(JWKS_URL)
    if (!res.ok) throw new Error(`jwks ${res.status}`)
    cache = { keys: (await res.json()).keys ?? [], at: Date.now() }
  }
  return cache.keys
}

const part = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'))

/**
 * @returns {Promise<{ sub: string, email: string | null, name: string | null } | null>}
 *   the Google account, or null if the token is not valid for this app.
 */
export async function verifyGoogleToken(credential) {
  if (!GOOGLE_CLIENT_ID || typeof credential !== 'string' || credential.length > 4096) return null
  const [h, p, sig] = credential.split('.')
  if (!h || !p || !sig) return null
  let header, claims
  try {
    header = part(h)
    claims = part(p)
  } catch {
    return null
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null
  let jwk = (await keys()).find((k) => k.kid === header.kid)
  // Google rotates keys: refresh once if the key id is unknown.
  if (!jwk) jwk = (await keys(true)).find((k) => k.kid === header.kid)
  if (!jwk) return null
  const ok = verify('RSA-SHA256', Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(sig, 'base64url'))
  if (!ok) return null
  const now = Date.now() / 1000
  if (!ISSUERS.has(claims.iss) || claims.aud !== GOOGLE_CLIENT_ID || typeof claims.exp !== 'number' || claims.exp < now - 60) return null
  if (typeof claims.sub !== 'string' || !claims.sub) return null
  return {
    sub: claims.sub,
    email: typeof claims.email === 'string' && claims.email_verified !== false ? claims.email : null,
    name: typeof claims.given_name === 'string' ? claims.given_name : typeof claims.name === 'string' ? claims.name : null,
  }
}
