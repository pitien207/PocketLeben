import { useEffect, useState } from 'react'
import { enterFullscreen, fullscreenSupported } from '../fullscreen'
import { useT } from '../i18n'
import { useDialogue } from '../store/dialogueStore'
import { useMinigame } from '../store/minigameStore'
import { useUI } from '../store/uiStore'
import { useMedia } from './useMedia'
import { useIsTouch } from './useIsTouch'

const KEY = 'visa-hunter-rotate-hint'
const PORTRAIT_PHONE = '(orientation: portrait) and (max-width: 599px)'

function seen() {
  try {
    return localStorage.getItem(KEY) === 'off'
  } catch {
    return false
  }
}
function remember() {
  try {
    localStorage.setItem(KEY, 'off')
  } catch {
    /* private mode */
  }
}

/** A phone turning on its side. */
function RotateArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0" aria-hidden="true">
      <g className="origin-center animate-[rotate-phone_2.4s_ease-in-out_infinite]" style={{ transformBox: 'fill-box' }}>
        <rect x="20" y="8" width="24" height="44" rx="5" fill="#fff6e3" stroke="#4a3226" strokeWidth="3" />
        <rect x="24" y="14" width="16" height="30" rx="2" fill="#bfe3ff" />
        <circle cx="32" cy="48" r="1.8" fill="#4a3226" />
      </g>
      <path d="M10 40a22 22 0 0 1 6-24" fill="none" stroke="#c8322b" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 12l4 4-5 2" fill="none" stroke="#c8322b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Landscape is how the game is meant to be played (1.30): a phone held upright gets one friendly
 * card asking to turn it. It goes away by itself once the phone is turned; "Để sau" hides it for good.
 */
export function RotateHint() {
  const t = useT()
  const isTouch = useIsTouch()
  const portrait = useMedia(PORTRAIT_PHONE)
  const ready = useUI((s) => s.sceneReady)
  const busy = useUI((s) => s.panel !== null || s.transition !== null || s.settingsOpen)
  const talking = useDialogue((s) => s.npcId !== null)
  const playing = useMinigame((s) => s.active !== null)
  const [hidden, setHidden] = useState(seen)

  // Played on its side once → never nag again.
  useEffect(() => {
    if (isTouch && !portrait && ready && !hidden) {
      remember()
      setHidden(true)
    }
  }, [isTouch, portrait, ready, hidden])

  if (!isTouch || !portrait || !ready || hidden || busy || talking || playing) return null
  const close = () => {
    remember()
    setHidden(true)
  }
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[38%] z-[35] flex justify-center px-4" data-testid="rotate-hint">
      <div role="dialog" aria-label={t('rotate.title')} className="panel animate-pop pointer-events-auto flex w-full max-w-xs items-center gap-3 p-3.5 text-ink">
        <RotateArt />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] leading-tight font-extrabold text-lacquer">{t('rotate.title')}</p>
          <p className="mt-0.5 text-[12.5px] leading-snug font-bold">{t('rotate.text')}</p>
          <div className="mt-2 flex gap-2">
            {fullscreenSupported() && (
              <button type="button" onClick={enterFullscreen} className="rounded-xl btn-jade px-3 py-1 text-[13px] font-black active:translate-y-0.5">
                {t('rotate.go')}
              </button>
            )}
            <button type="button" onClick={close} data-testid="rotate-later" className="rounded-xl bg-ink/10 px-3 py-1 text-[13px] font-black active:translate-y-0.5">
              {t('rotate.later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
