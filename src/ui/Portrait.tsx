import { useMemo } from 'react'
import { Color } from 'three'
import type { HairStyle, Outfit } from '../data/npcs'

/** A tiny face drawn from the same outfit data as the 3D chibi, for dialogue boxes and the wardrobe. */
let gradientId = 0

export function Portrait({ outfit, size = 64 }: { outfit: Outfit; size?: number }) {
  const { skin, hair, hairStyle, accessory, shirt } = outfit
  const eye = outfit.eye ?? '#5a3424'
  const expression = outfit.expression ?? 'neutral'
  const closed = expression === 'happy-closed'
  const id = useMemo(() => `pe${++gradientId}`, [])
  const accent = outfit.accent
  const dark = shadeHex(hair, -0.18)
  const tie = outfit.hairTie ?? accent ?? '#e2574c'
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#fff6e3" />
      {/* Hair behind the head */}
      <HairBack style={hairStyle} hair={hair} dark={dark} tie={tie} />
      <path d="M12 64c2-12 10-17 20-17s18 5 20 17z" fill={shirt} />
      {outfit.top === 'hoodie' && <path d="M20 50c3-4 7-5 12-5s9 1 12 5c-3 3-7 4-12 4s-9-1-12-4z" fill={shirt} stroke="#4a3226" strokeOpacity="0.25" />}
      {outfit.top === 'jacket' && <path d="M28 48l4 16 4-16c-1-1-3-1-4-1s-3 0-4 1z" fill="#fbfaf5" />}
      {outfit.top === 'aoDai' && <rect x="27" y="45" width="10" height="5" rx="2" fill={shirt} stroke="#4a3226" strokeOpacity="0.3" />}
      {outfit.neck === 'scarf' && <rect x="20" y="46" width="24" height="6" rx="3" fill={outfit.neckColor ?? '#d4473b'} />}
      {outfit.neck === 'tie' && <path d="M30 48h4l1 3-3 11-3-11z" fill={outfit.neckColor ?? '#2c5aa0'} />}
      <circle cx="32" cy="31" r="18" fill={skin} />
      <HairFront style={hairStyle} hair={hair} dark={dark} />
      {hairStyle === 'braid' && <Braid hair={hair} dark={dark} tie={tie} />}
      {/* Anime eyes like the 3D face: gradient iris, pupil, two highlights, a thick lid */}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1418" />
          <stop offset="0.45" stopColor={eye} />
          <stop offset="1" stopColor={eye} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {closed ? (
        <path d="M22.5 33q3-3.4 6 0M35.5 33q3-3.4 6 0" fill="none" stroke="#3a2626" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <g>
          {[25.5, 38.5].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="32.5" rx="2.9" ry="3.7" fill={`url(#${id})`} />
              <ellipse cx={x} cy="32.7" rx="1.3" ry="1.9" fill="rgba(20,12,16,0.85)" />
              <ellipse cx={x - 0.9} cy="31" rx="1.05" ry="1.25" fill="#ffffff" />
              <circle cx={x + 1.1} cy="34" r="0.5" fill="#ffffff" />
            </g>
          ))}
          <path d="M22.3 30.2q3.2-2.6 6.4 0M35.3 30.2q3.2-2.6 6.4 0" fill="none" stroke="#3a2626" strokeWidth={outfit.lashes ? 1.4 : 1} strokeLinecap="round" />
          {outfit.lashes && <path d="M22.5 30.4l-1.4-1M41.5 30.4l1.4-1" stroke="#3a2626" strokeWidth="1" strokeLinecap="round" />}
        </g>
      )}
      <ellipse cx="20.8" cy="37" rx="3" ry="1.6" fill="#ff808a" opacity="0.45" />
      <ellipse cx="43.2" cy="37" rx="3" ry="1.6" fill="#ff808a" opacity="0.45" />
      {expression === 'happy' || closed ? (
        <path d="M30.4 38.4q1.6 2.6 3.2 0z" fill="#8a2e36" />
      ) : expression === 'surprised' ? (
        <ellipse cx="32" cy="39.2" rx="1" ry="1.3" fill="#8a2e36" />
      ) : expression === 'sad' ? (
        <path d="M30.6 40.2q1.4-1.4 2.8 0" fill="none" stroke="#3a2626" strokeWidth="0.9" strokeLinecap="round" />
      ) : (
        <path d="M30.4 38.6q0.8 1 1.6 0.1q0.8 0.9 1.6-0.1" fill="none" stroke="#3a2626" strokeWidth="0.8" strokeLinecap="round" />
      )}
      {accessory === 'glasses' && (
        <g fill="none" stroke="#4a3b4a" strokeWidth="1.6">
          <circle cx="25.5" cy="32" r="4.6" />
          <circle cx="38.5" cy="32" r="4.6" />
          <path d="M30 32h4" />
        </g>
      )}
      {accessory === 'sunglasses' && (
        <g fill="#2a2330">
          <rect x="20" y="29" width="11" height="7" rx="3" />
          <rect x="33" y="29" width="11" height="7" rx="3" />
          <rect x="30" y="31" width="4" height="1.6" />
        </g>
      )}
      {accessory === 'nonLa' && <path d="M4 22L32 3l28 19c-8 3-48 3-56 0z" fill="#f2d79c" stroke="#d9b878" strokeWidth="1.2" />}
      {accessory === 'beanie' && (
        <g>
          <path d="M13 27c0-11 8-17 19-17s19 6 19 17z" fill={accent ?? '#d4473b'} />
          <rect x="12" y="24" width="40" height="5" rx="2.5" fill="#fff6e3" />
          <circle cx="32" cy="9" r="4" fill="#fff6e3" />
        </g>
      )}
      {accessory === 'tyrolean' && (
        <g>
          <ellipse cx="32" cy="15" rx="21" ry="3.5" fill={outfit.accent ?? '#4c5a46'} />
          <path d="M23 15c0-7 4-10 9-10s9 3 9 10z" fill={outfit.accent ?? '#4c5a46'} />
          <rect x="23" y="12" width="18" height="2.6" fill="#2f3a2c" />
          <path d="M39 12l6-8" stroke="#e9e3d6" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}
      {accessory === 'helmet' && <path d="M12 26c0-11 9-17 20-17s20 6 20 17z" fill={accent ?? '#ff9b8f'} stroke="#5b4636" strokeWidth="1" />}
      {accessory === 'cap' && (
        <g fill={accent ?? '#4f86d9'}>
          <path d="M13 25c0-10 8-16 19-16s19 6 19 16z" />
          <path d="M22 25h28c3 0 6 1 7 3H22z" opacity="0.8" />
        </g>
      )}
      {accessory === 'beret' && <ellipse cx="34" cy="14" rx="18" ry="6" fill={accent ?? '#c8322b'} />}
      {accessory === 'bow' && (
        <g fill={accent ?? '#ff6f91'}>
          <path d="M40 12l9-5v12zM40 12l-8-6v12z" />
          <circle cx="40" cy="12" r="2.5" />
        </g>
      )}
      {accessory === 'flowerCrown' && (
        <g>
          <path d="M14 22q18-8 36 0" fill="none" stroke="#6fae5a" strokeWidth="2" />
          {['#ff9fb2', '#ffe08a', '#ffffff', '#cdb8f0', '#ff9b8f'].map((c, i) => (
            <circle key={c} cx={17 + i * 7.5} cy={i === 2 ? 15.5 : i === 1 || i === 3 ? 17 : 20} r="3" fill={c} stroke="#4a3226" strokeWidth="0.5" />
          ))}
        </g>
      )}
      {accessory === 'catEars' && (
        <g fill={accent ?? '#3d3540'}>
          <path d="M15 19l2-12 9 7z" />
          <path d="M49 19l-2-12-9 7z" />
        </g>
      )}
      {accessory === 'headphones' && (
        <g>
          <path d="M12 30a20 20 0 0 1 40 0" fill="none" stroke="#3a3a44" strokeWidth="3" />
          <rect x="9" y="27" width="7" height="11" rx="3" fill={accent ?? '#ff9b8f'} />
          <rect x="48" y="27" width="7" height="11" rx="3" fill={accent ?? '#ff9b8f'} />
        </g>
      )}
    </svg>
  )
}

// --- Hair (same cuts as the 3D chibi: bangs that end in points, locks that taper, real ties) ---

function shadeHex(hex: string, dl: number) {
  const c = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return '#' + c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + dl))).getHexString()
}

const f = (n: number) => n.toFixed(1)

/** Zigzag edge from (x0, y) to (x1, y): `n` pointed clumps reaching `depth` below. */
function points(x0: number, x1: number, y: number, n: number, depth: number, curve = 0) {
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n
    const b = x0 + ((x1 - x0) * (i + 1)) / n
    const m = (a + b) / 2
    const lift = (x: number) => curve * (((x - (x0 + x1) / 2) / ((x1 - x0) / 2)) ** 2)
    d += `Q${f(a + (m - a) * 0.6)} ${f(y + lift(m) + depth * 0.3)} ${f(m)} ${f(y + lift(m) + depth)}Q${f(m + (b - m) * 0.4)} ${f(y + lift(m) + depth * 0.3)} ${f(b)} ${f(y + lift(b))}`
  }
  return d
}

/** A lock of hair: a tapering band along a quadratic curve, with clumps at the tip. */
function lock(sx: number, sy: number, cx: number, cy: number, ex: number, ey: number, w0: number, w1: number) {
  const n = 6
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex
    const y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey
    const dx = 2 * (1 - t) * (cx - sx) + 2 * t * (ex - cx)
    const dy = 2 * (1 - t) * (cy - sy) + 2 * t * (ey - cy)
    const l = Math.hypot(dx, dy) || 1
    const w = (w0 + (w1 - w0) * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5)) * (1 - t ** 3) * 0.5
    left.push(`${f(x - (dy / l) * w)} ${f(y + (dx / l) * w)}`)
    right.unshift(`${f(x + (dy / l) * w)} ${f(y - (dx / l) * w)}`)
  }
  return `M${left[0]}L${left.slice(1).join('L')}L${right.join('L')}Z`
}

function HairBack({ style, hair, dark, tie }: { style: HairStyle; hair: string; dark: string; tie: string }) {
  switch (style) {
    case 'long':
      return <path d={`M13 28C12 40 12 50 14 57${points(14, 50, 57, 6, 3.5)}C52 50 52 40 51 28z`} fill={hair} />
    case 'bob':
      return <path d={`M13 30C12 36 13 41 15 44${points(15, 49, 44, 5, 2)}C51 41 52 36 51 30z`} fill={hair} />
    case 'twin':
      return (
        <g>
          <path d={lock(15, 22, 4, 30, 9, 52, 9, 10)} fill={hair} />
          <path d={lock(49, 22, 60, 30, 55, 52, 9, 10)} fill={hair} />
          <path d="M9 30q2-2 4 1" fill="none" stroke={dark} strokeWidth="0.8" />
          <path d="M55 30q-2-2-4 1" fill="none" stroke={dark} strokeWidth="0.8" />
          <circle cx="15.5" cy="22.5" r="2.6" fill={tie} />
          <circle cx="48.5" cy="22.5" r="2.6" fill={tie} />
        </g>
      )
    case 'ponytail':
      return (
        <g>
          <path d={lock(45, 14, 60, 16, 54, 48, 9, 12)} fill={hair} />
          <path d="M51 22q4 8 3 18M48 21q5 10 3 20" fill="none" stroke={dark} strokeWidth="0.8" strokeLinecap="round" />
          <circle cx="45.5" cy="14.5" r="3" fill={tie} />
        </g>
      )
    case 'bun':
    case 'elderBun':
      return (
        <g>
          <circle cx="32" cy="10" r="7.5" fill={hair} />
          <path d="M28 10a4 4 0 1 1 4 4a2.5 2.5 0 1 1 1.5-3.5" fill="none" stroke={dark} strokeWidth="0.9" strokeLinecap="round" />
          {style === 'elderBun' ? <path d="M23 8l18 5" stroke="#8a5a3a" strokeWidth="1.4" strokeLinecap="round" /> : <path d="M26 15.5q6 3 12 0" fill="none" stroke={tie} strokeWidth="2.2" strokeLinecap="round" />}
        </g>
      )
    case 'twinBuns':
      return (
        <g>
          {[19, 45].map((x) => (
            <g key={x}>
              <circle cx={x} cy="12" r="6" fill={hair} />
              <path d={`M${x - 3} 12a3 3 0 1 1 3 3a2 2 0 1 1 1.2-2.6`} fill="none" stroke={dark} strokeWidth="0.8" strokeLinecap="round" />
            </g>
          ))}
        </g>
      )
    default:
      return null
  }
}

function HairFront({ style, hair, dark }: { style: HairStyle; hair: string; dark: string }) {
  if (style === 'curly') {
    const bumps = [[14, 30], [15, 23], [19, 17], [25, 13], [32, 12], [39, 13], [45, 17], [49, 23], [50, 30]]
    return (
      <g fill={hair}>
        <path d="M14 31C13 18 21 11 32 11S51 18 50 31c-3-4-6-6-9-6-3 2-6 2-9 1-3 1-6 1-9-1-3 0-6 2-9 6z" />
        {bumps.map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5" />)}
        <path d="M14 30q-2 6 1 11q2-2 1-6M50 30q2 6-1 11q-2-2-1-6" />
      </g>
    )
  }
  if (style === 'buzz') return <path d="M14 29C14 18 22 12 32 12s18 6 18 17c-4-4-10-6-18-6s-14 2-18 6z" fill={hair} />
  const short = style === 'short' || style === 'spiky'
  const elder = style === 'elderBun'
  // dome, then the cut line back from the right temple: side lock, bangs with points, left side lock
  const sideLow = short ? 34 : 41
  const fringeY = elder ? 19 : short ? 23 : 24
  const fringe = elder ? 'L42 19Q32 15 22 19' : `L46 ${fringeY}${points(46, 18, fringeY, short ? 4 : 5, short ? 4.5 : 5.5, -2)}`
  const d = `M13.5 34C12 19 21 11 32 11S52 19 50.5 34Q50 ${sideLow + 2} 48 ${sideLow}Q47.5 ${sideLow - 6} 47 29${fringe}L17 29Q16.5 ${sideLow - 6} 16 ${sideLow}Q14 ${sideLow + 2} 13.5 34z`
  return (
    <g>
      <path d={d} fill={hair} />
      {style === 'spiky' && <path d="M15 22l1-11 6 6 3-10 5 8 4-9 3 9 6-6 0 10 6-3-4 8z" fill={hair} />}
      {style === 'short' && <path d="M33 11q1-5 5-6q-3 3-2 6z" fill={hair} />}
      {/* strand lines and a soft shine */}
      <path d={elder ? 'M24 17q-4 6-6 13M32 15v-2M40 17q4 6 6 13' : 'M22 15q-3 4-4 9M42 15q3 4 4 9'} fill="none" stroke={dark} strokeWidth="0.7" strokeLinecap="round" />
      {!elder && <path d="M20.5 19.5q3.5-4.5 9-5.5M34.5 14q3 0.3 5.5 1.6" fill="none" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="1.3" strokeLinecap="round" />}
    </g>
  )
}

/** Side braid over the shoulder, in front of the shirt: plaits crossing left and right. */
function Braid({ hair, dark, tie }: { hair: string; dark: string; tie: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => {
        const k = i % 2 ? -1 : 1
        return <ellipse key={i} cx={f(46.5 + k * 1.3)} cy={f(37.5 + i * 4.6)} rx="3.6" ry="2.5" transform={`rotate(${k * 32} ${f(46.5 + k * 1.3)} ${f(37.5 + i * 4.6)})`} fill={hair} stroke={dark} strokeWidth="0.6" />
      })}
      <path d="M47 60.5l-2.4 3.5M47 60.5v4M47 60.5l2.4 3.5" stroke={hair} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="47" cy="60.3" r="1.9" fill={tie} />
    </g>
  )
}
