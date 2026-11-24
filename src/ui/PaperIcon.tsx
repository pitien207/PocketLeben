import type { ReactElement, SVGProps } from 'react'
import { ICON3D } from './Icon3d'
import type { PaperKind } from '../data/keyItems'

/**
 * Drawn icons for the important papers in the bag (no emoji: they render differently on
 * every phone). Same style as the HUD: flat colours with a dark brown outline.
 */

const O = '#4a3226'

/** 1.42: Fluent Emoji 3D pictures for the papers (MIT); the drawings below are the fallback. */
const THREE_D: Record<PaperKind, string> = {
  passport: 'closed-book', passportDe: 'closed-book', certificate: 'scroll', diploma: 'graduation-cap', folder: 'file-folder',
  visa: 'passport-control', ticket: 'ticket', document: 'page-facing-up', contract: 'memo', bankCard: 'credit-card',
  insuranceCard: 'card-index', studentId: 'identification-card', wgKey: 'key', flatKey: 'old-key', residence: 'page-with-curl',
}

export function PaperIcon({ kind, ...props }: { kind: PaperKind } & SVGProps<SVGSVGElement>) {
  const file = THREE_D[kind]
  const src = file ? ICON3D[file] : undefined
  if (src)
    return <img src={src} alt="" draggable={false} decoding="async" className={`pointer-events-none h-[1.15em] w-[1.15em] select-none drop-shadow-[0_1.5px_0_rgba(74,50,38,0.25)] ${props.className ?? ''}`} />
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" aria-hidden="true" {...props}>
      {SHAPES[kind]}
    </svg>
  )
}

const book = (cover: string, emblem: string) => (
  <>
    <rect x="7" y="4" width="18" height="24" rx="2.5" fill={cover} stroke={O} strokeWidth="1.8" />
    <rect x="9.5" y="6.5" width="13" height="19" rx="1.5" fill="none" stroke={emblem} strokeWidth="0.9" opacity="0.8" />
    <circle cx="16" cy="14" r="4" fill="none" stroke={emblem} strokeWidth="1.5" />
    <path d="M12 21h8" stroke={emblem} strokeWidth="1.5" strokeLinecap="round" />
  </>
)

const sheet = (accent: string, seal: string) => (
  <>
    <path d="M7 4h13l5 5v19H7z" fill="#fffaf0" stroke={O} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M20 4v5h5" fill="#efe2c4" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M10.5 12h11M10.5 15.5h11M10.5 19h6" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="21" cy="23" r="3.2" fill={seal} stroke={O} strokeWidth="1.3" />
  </>
)

const card = (base: string, stripe: string) => (
  <>
    <rect x="3.5" y="8" width="25" height="16" rx="2.5" fill={base} stroke={O} strokeWidth="1.8" />
    <rect x="3.5" y="12" width="25" height="3" fill={stripe} />
    <rect x="7" y="18" width="6" height="3.5" rx="0.8" fill="#f4c04e" stroke={O} strokeWidth="1" />
    <path d="M16 19.5h8" stroke={O} strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
  </>
)

const key = (bow: string) => (
  <>
    <circle cx="10" cy="16" r="6" fill={bow} stroke={O} strokeWidth="1.8" />
    <circle cx="10" cy="16" r="2.2" fill="#fffaf0" stroke={O} strokeWidth="1.2" />
    <path d="M16 16h12M23 16v4M27 16v3" fill="none" stroke={O} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M16 16h12M23 16v4M27 16v3" fill="none" stroke={bow} strokeWidth="1" strokeLinecap="round" />
  </>
)

const SHAPES: Record<PaperKind, ReactElement> = {
  passport: book('#8a2a2a', '#f4c04e'),
  passportDe: book('#7a1f2b', '#e8c27a'),
  certificate: sheet('#2c5aa0', '#c8322b'),
  diploma: (
    <>
      <rect x="4" y="9" width="24" height="14" rx="7" fill="#fffaf0" stroke={O} strokeWidth="1.8" />
      <path d="M8 9v14M24 9v14" stroke="#e8c27a" strokeWidth="2" />
      <path d="M13 23l-1.5 6 3-1.5 2 1.5V23" fill="#c8322b" stroke={O} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="16" cy="19.5" r="3.4" fill="#f4c04e" stroke={O} strokeWidth="1.3" />
    </>
  ),
  folder: (
    <>
      <path d="M3.5 9a2 2 0 0 1 2-2h7l2.5 2.5h11.5a2 2 0 0 1 2 2V25a2 2 0 0 1-2 2h-21a2 2 0 0 1-2-2z" fill="#e8b04a" stroke={O} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="8" y="12" width="16" height="10" rx="1" fill="#fffaf0" stroke={O} strokeWidth="1.2" />
      <path d="M10.5 15h11M10.5 18.5h7" stroke="#2c5aa0" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  visa: (
    <>
      <rect x="5" y="5" width="22" height="22" rx="2" fill="#fffaf0" stroke={O} strokeWidth="1.8" />
      <rect x="9" y="9" width="14" height="14" rx="1.5" fill="none" stroke="#3f7d5c" strokeWidth="1.8" transform="rotate(-8 16 16)" />
      <path d="M11.5 16.5l3 3 6-6.5" fill="none" stroke="#3f7d5c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-8 16 16)" />
    </>
  ),
  ticket: (
    <>
      <path d="M3.5 10h25v3.5a2.5 2.5 0 0 0 0 5V22h-25v-3.5a2.5 2.5 0 0 0 0-5z" fill="#bfe3ff" stroke={O} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M21 10v12" stroke={O} strokeWidth="1.2" strokeDasharray="1.6 1.6" />
      <path d="M8 15l3 1.5 5-4" fill="none" stroke="#2c5aa0" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  document: sheet('#5b4636', '#3f7d5c'),
  contract: sheet('#c8322b', '#2c5aa0'),
  bankCard: card('#2f8c7f', '#1f5f56'),
  insuranceCard: card('#ffffff', '#3fae72'),
  studentId: card('#244a7a', '#f4c04e'),
  wgKey: key('#c9ccd2'),
  flatKey: key('#f4c04e'),
  residence: (
    <>
      <circle cx="16" cy="13" r="8" fill="#f4c04e" stroke={O} strokeWidth="1.8" />
      <circle cx="16" cy="13" r="5" fill="#ffe6a6" stroke={O} strokeWidth="1.2" />
      <path d="M11 19.5 8.5 28l4-2 2.5 2.5 1-7M21 19.5l2.5 8.5-4-2-2.5 2.5-1-7" fill="#c8322b" stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
}
