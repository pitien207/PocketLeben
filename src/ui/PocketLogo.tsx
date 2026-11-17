import { useId } from 'react'

/**
 * The game's logo (1.31, from the user's image): a round red rubber stamp — "POCKET LEBEN" along the top,
 * a plane and "2027" in the middle, "HÀ NỘI • DEUTSCHLAND" along the bottom, slightly turned, with
 * speckled ink. Pure SVG (title-safe, no images). The same drawing lives in index.html (splash),
 * public/favicon.svg (rings + plane only) and pwa/icon.svg (app icons) — keep them in sync.
 */

export const STAMP_RED = '#c8463a'
export const GAME_NAME = 'Pocket Leben'

/** The plane, nose to the right, centred on 0,0 (about 60 × 44), with a speed streak behind it. */
export const PLANE_PATH =
  'M30 0Q30-3.5 25-3.5H8L-5-22h-7l8 18.5h-15l-6-7.5h-4.5l3 11-3 11h4.5l6-7.5h15l-8 18.5h7L8 3.5h17Q30 3.5 30 0Z'

export function PocketStamp({ size = 160, color = STAMP_RED, className, title = GAME_NAME }: { size?: number | string; color?: string; className?: string; title?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const top = `pl-top-${id}`
  const bottom = `pl-bot-${id}`
  const ink = `pl-ink-${id}`
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} className={className} role="img" aria-label={title} data-testid="game-logo">
      <defs>
        <path id={top} d="M70 200a130 130 0 0 1 260 0" />
        <path id={bottom} d="M44 200a156 156 0 0 0 312 0" />
        {/* worn rubber: speckles where the ink did not take, slightly wobbly edges */}
        <filter id={ink} x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="11" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.6 0 0 0 2.12" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" result="speck" />
          <feTurbulence type="turbulence" baseFrequency="0.045" numOctaves="2" seed="4" result="w" />
          <feDisplacementMap in="speck" in2="w" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g transform="rotate(-6 200 200)" fill={color} stroke={color} filter={`url(#${ink})`}>
        <circle cx="200" cy="200" r="186" fill="none" strokeWidth="11" />
        <circle cx="200" cy="200" r="171" fill="none" strokeWidth="3.5" />
        <circle cx="200" cy="200" r="86" fill="none" strokeWidth="3.5" />
        <path d="M54 200h42M304 200h42" strokeWidth="4.5" strokeLinecap="round" />
        <text stroke="none" fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif" fontWeight="800" fontSize="50" letterSpacing="3.5">
          <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">
            POCKET LEBEN
          </textPath>
        </text>
        <text stroke="none" fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif" fontWeight="800" fontSize="27" letterSpacing="4">
          <textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle">
            HÀ NỘI • DEUTSCHLAND
          </textPath>
        </text>
        <g transform="translate(204 168) rotate(-8) scale(1.12)" stroke="none">
          <path d={PLANE_PATH} />
          <path d="M-58 5H-35" stroke={color} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <text x="200" y="250" stroke="none" textAnchor="middle" fontFamily="'Fraunces', 'Georgia', serif" fontWeight="800" fontSize="52" letterSpacing="1">
          2027
        </text>
      </g>
    </svg>
  )
}
