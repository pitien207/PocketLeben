import type { SVGProps } from 'react'
import type { IconProps as PhProps } from '@phosphor-icons/react'
import { GearSix as PhGearSix } from '@phosphor-icons/react/dist/csr/GearSix'
import { MusicNotes as PhMusicNotes } from '@phosphor-icons/react/dist/csr/MusicNotes'
import { SpeakerSimpleSlash as PhSpeakerSimpleSlash } from '@phosphor-icons/react/dist/csr/SpeakerSimpleSlash'
import { X as PhX } from '@phosphor-icons/react/dist/csr/X'
import { Backpack as PhBackpack } from '@phosphor-icons/react/dist/csr/Backpack'
import { PersonSimpleRun as PhPersonSimpleRun } from '@phosphor-icons/react/dist/csr/PersonSimpleRun'
import { FastForward as PhFastForward } from '@phosphor-icons/react/dist/csr/FastForward'
import { Crosshair as PhCrosshair } from '@phosphor-icons/react/dist/csr/Crosshair'
import { Check as PhCheck } from '@phosphor-icons/react/dist/csr/Check'
import { Scroll as PhScroll } from '@phosphor-icons/react/dist/csr/Scroll'
import { Star as PhStar } from '@phosphor-icons/react/dist/csr/Star'
import { LockSimple as PhLockSimple } from '@phosphor-icons/react/dist/csr/LockSimple'
import { Trash as PhTrash } from '@phosphor-icons/react/dist/csr/Trash'
import { ArrowCounterClockwise as PhArrowCounterClockwise } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise'

/**
 * Small UI icons. 1.42 (user: "làm đẹp hơn tất cả các icon, tìm thư viện mở"): the plain line icons are now
 * Phosphor Icons (MIT, phosphoricons.com; deep imports so only the used ones are bundled) in filled / bold weights;
 * the coloured game icons (coin, map, sun, moon, pin…) stay hand-drawn.
 */

type IconProps = SVGProps<SVGSVGElement>

export function GearIcon(props: IconProps) {
  return <PhGearSix weight="fill" aria-hidden="true" {...(props as PhProps)} />
}

export function MusicIcon(props: IconProps) {
  return <PhMusicNotes weight="fill" aria-hidden="true" {...(props as PhProps)} />
}

export function MusicOffIcon(props: IconProps) {
  return <PhSpeakerSimpleSlash weight="fill" aria-hidden="true" {...(props as PhProps)} />
}

export function CloseIcon(props: IconProps) {
  return <PhX weight="bold" aria-hidden="true" {...(props as PhProps)} />
}

/** Old Vietnamese copper coin (đồng xu) with a square hole. */
export function CoinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" fill="#f4c04e" stroke="#b9822a" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="#ffe6a6" strokeWidth="1.4" />
      <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="0.6" fill="#fff6e3" stroke="#b9822a" strokeWidth="1.6" />
    </svg>
  )
}

export function BoltIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path
        d="M13.5 2 4.5 13.5h6.5L9.5 22l10-12.5h-6.5L13.5 2Z"
        fill="#f4c04e"
        stroke="#b9822a"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Mood face: smiles, flat or sad depending on the value (0–100). */
export function MoodIcon({ value, ...props }: IconProps & { value: number }) {
  const mouth = value >= 60 ? 'M8 13.5c1.2 2 6.8 2 8 0' : value >= 35 ? 'M8.5 14.5h7' : 'M8 15.5c1.2-2 6.8-2 8 0'
  const fill = value >= 60 ? '#ffb3c7' : value >= 35 ? '#ffe08a' : '#b8d0f0'
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" fill={fill} stroke="#5b4636" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.3" fill="#5b4636" />
      <circle cx="15" cy="10" r="1.3" fill="#5b4636" />
      <path d={mouth} fill="none" stroke="#5b4636" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function BagIcon(props: IconProps) {
  return <PhBackpack weight="fill" aria-hidden="true" {...(props as PhProps)} />
}

export function RainIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path d="M7 15.5a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 8.2a3.7 3.7 0 0 1 .4 7.3z" fill="#eef3fb" stroke="#9fb0c8" strokeWidth="1.4" strokeLinejoin="round" />
      <g stroke="#7fb2ff" strokeWidth="1.8" strokeLinecap="round">
        <path d="M8.5 18l-.8 2.4M12.5 18l-.8 2.4M16.5 18l-.8 2.4" />
      </g>
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <g stroke="#f4c04e" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </g>
      <circle cx="12" cy="12" r="5" fill="#ffe08a" stroke="#f4c04e" strokeWidth="1.6" />
    </svg>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path d="M16 18A8 8 0 0 1 9.5 4.5 8.5 8.5 0 1 0 19.5 14.5 8 8 0 0 1 16 18z" fill="#ffe08a" stroke="#b9822a" strokeWidth="1.4" />
    </svg>
  )
}

// --- Game UI icons (chunky filled shapes with a dark outline, matching the HUD) -------------
const O = '#4a3226'

/** Folded paper map with a red route and pin. */
export function MapIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path d="M3 6.5 8.5 4l7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20z" fill="#bfe3c8" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 4v13.5M15.5 6.5V20" stroke={O} strokeWidth="1.3" />
      <path d="M5.5 15c2-1 3-3.5 5-3.5s2.5 2 5 1.5" fill="none" stroke="#c8322b" strokeWidth="1.5" strokeDasharray="1.6 1.6" strokeLinecap="round" />
      <path d="M17.5 7.5a2 2 0 0 1 2 2c0 1.5-2 3.5-2 3.5s-2-2-2-3.5a2 2 0 0 1 2-2z" fill="#c8322b" stroke={O} strokeWidth="1.1" />
    </svg>
  )
}

export function RunIcon(props: IconProps) {
  return <PhPersonSimpleRun weight="fill" aria-hidden="true" {...(props as PhProps)} />
}

export function SkipIcon(props: IconProps) {
  return <PhFastForward weight="fill" aria-hidden="true" {...(props as PhProps)} />
}

export function UndoIcon(props: IconProps) {
  return <PhArrowCounterClockwise weight="bold" aria-hidden="true" {...(props as PhProps)} />
}

export function TargetIcon(props: IconProps) {
  return <PhCrosshair weight="bold" aria-hidden="true" {...(props as PhProps)} />
}

export function CheckIcon(props: IconProps) {
  return <PhCheck weight="bold" aria-hidden="true" {...(props as PhProps)} />
}

export function ScrollIcon(props: IconProps) {
  return <PhScroll weight="duotone" aria-hidden="true" {...(props as PhProps)} />
}

export function StarIcon(props: IconProps) {
  return <PhStar weight="fill" aria-hidden="true" {...(props as PhProps)} />
}

export function LockIcon(props: IconProps) {
  return <PhLockSimple weight="fill" aria-hidden="true" {...(props as PhProps)} />
}

export function TrashIcon(props: IconProps) {
  return <PhTrash weight="fill" aria-hidden="true" {...(props as PhProps)} />
}

export function PinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path d="M12 2.5a6.5 6.5 0 0 1 6.5 6.5c0 4.7-6.5 12.5-6.5 12.5S5.5 13.7 5.5 9A6.5 6.5 0 0 1 12 2.5z" fill="#c8322b" stroke={O} strokeWidth="1.6" />
      <circle cx="12" cy="9" r="2.4" fill="#ffffff" />
    </svg>
  )
}
