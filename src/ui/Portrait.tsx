import { useMemo } from 'react'
import type { Outfit } from '../data/npcs'

/** A tiny face drawn from the same outfit data as the 3D chibi, for dialogue boxes and the wardrobe. */
let gradientId = 0

export function Portrait({ outfit, size = 64 }: { outfit: Outfit; size?: number }) {
  const { skin, hair, hairStyle, accessory, shirt } = outfit
  const eye = outfit.eye ?? '#5a3424'
  const expression = outfit.expression ?? 'neutral'
  const closed = expression === 'happy-closed'
  const id = useMemo(() => `pe${++gradientId}`, [])
  const accent = outfit.accent
  const capPath =
    hairStyle === 'short' || hairStyle === 'buzz' || hairStyle === 'spiky'
      ? 'M14 28c0-11 8-17 18-17s18 6 18 17c-4-5-10-7-18-7s-14 2-18 7z'
      : 'M13 33c-1-13 7-21 19-21s20 8 19 21c-2-6-6-10-10-11-4 3-13 4-20 2-4 2-7 5-8 9z'
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#fff6e3" />
      {/* Hair behind the head */}
      {hairStyle === 'long' && <path d="M13 30c0 14 1 24 5 28h28c4-4 5-14 5-28z" fill={hair} />}
      {hairStyle === 'ponytail' && <path d="M44 20c9 2 12 12 9 24-2-6-5-9-9-10z" fill={hair} />}
      {hairStyle === 'twin' && (
        <g fill={hair}>
          <ellipse cx="11" cy="38" rx="5" ry="11" />
          <ellipse cx="53" cy="38" rx="5" ry="11" />
        </g>
      )}
      <path d="M12 64c2-12 10-17 20-17s18 5 20 17z" fill={shirt} />
      {outfit.top === 'hoodie' && <path d="M20 50c3-4 7-5 12-5s9 1 12 5c-3 3-7 4-12 4s-9-1-12-4z" fill={shirt} stroke="#4a3226" strokeOpacity="0.25" />}
      {outfit.top === 'jacket' && <path d="M28 48l4 16 4-16c-1-1-3-1-4-1s-3 0-4 1z" fill="#fbfaf5" />}
      {outfit.top === 'aoDai' && <rect x="27" y="45" width="10" height="5" rx="2" fill={shirt} stroke="#4a3226" strokeOpacity="0.3" />}
      {outfit.neck === 'scarf' && <rect x="20" y="46" width="24" height="6" rx="3" fill={outfit.neckColor ?? '#d4473b'} />}
      {outfit.neck === 'tie' && <path d="M30 48h4l1 3-3 11-3-11z" fill={outfit.neckColor ?? '#2c5aa0'} />}
      {(hairStyle === 'bun' || hairStyle === 'elderBun') && <circle cx="32" cy="9" r="7" fill={hair} />}
      {hairStyle === 'twinBuns' && (
        <g fill={hair}>
          <circle cx="20" cy="12" r="6" />
          <circle cx="44" cy="12" r="6" />
        </g>
      )}
      {hairStyle === 'braid' && (
        <g fill={hair}>
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={47 + i * 0.5} cy={38 + i * 5} r="3.6" />
          ))}
        </g>
      )}
      <circle cx="32" cy="31" r="18" fill={skin} />
      {hairStyle === 'curly' ? (
        <g fill={hair}>
          {[14, 19, 25, 32, 39, 45, 50].map((x, i) => (
            <circle key={x} cx={x} cy={i === 0 || i === 6 ? 28 : i === 1 || i === 5 ? 19 : 14} r="6.5" />
          ))}
        </g>
      ) : (
        <path d={capPath} fill={hair} />
      )}
      {hairStyle === 'spiky' && <path d="M17 18l2-9 5 6 4-9 4 8 5-7 2 9 6-4-2 9z" fill={hair} />}
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
