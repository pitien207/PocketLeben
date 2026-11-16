import { useEffect, useState } from 'react'
import { CONFIG } from '../data/config'
import { useT } from '../i18n'
import { useUI } from '../store/uiStore'
import { useGuide } from '../store/guideStore'
import { useIsTouch } from './useIsTouch'

/** A short "how to move" bubble shown after loading. */
export function ControlsHint() {
  const t = useT()
  const isTouch = useIsTouch()
  const ready = useUI((s) => s.sceneReady)
  const [visible, setVisible] = useState(true)
  const touring = useGuide((s) => s.tour !== null)

  useEffect(() => {
    if (!ready) return
    const id = window.setTimeout(() => setVisible(false), CONFIG.ui.hintDurationMs)
    return () => window.clearTimeout(id)
  }, [ready])

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center pr-14 pl-6 transition-opacity duration-700 ${
        ready && visible && !touring ? 'opacity-100' : 'opacity-0'
      }`}
      // Above the joystick, clear of the HUD and the quest tracker.
      style={{ bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 8.75rem)' }}
    >
      <p className="max-w-xs rounded-xl bg-ink/70 px-3 py-1.5 text-center text-[11.5px] leading-snug font-bold text-cream sm:max-w-md sm:text-[13px]">
        {t(isTouch ? 'hint.touch' : 'hint.desktop')}
      </p>
    </div>
  )
}
