import { useRef } from 'react'
import { zoomCamera } from '../game/systems/cameraState'
import { useT } from '../i18n'
import { useDialogue } from '../store/dialogueStore'
import { useMinigame } from '../store/minigameStore'
import { useUI } from '../store/uiStore'
import { useIsTouch } from './useIsTouch'

/**
 * Phones: small + / − buttons on the right edge to zoom (pinching while holding the joystick is
 * awkward). Hold to keep zooming. Desktop uses the mouse wheel.
 */
export function CameraButtons() {
  const t = useT()
  const isTouch = useIsTouch()
  const busy = useUI((s) => s.panel !== null || s.transition !== null || s.sleeping || s.settingsOpen)
  const talking = useDialogue((s) => s.npcId !== null)
  const playing = useMinigame((s) => s.active !== null)
  const timer = useRef<number | undefined>(undefined)
  if (!isTouch || busy || talking || playing) return null

  const start = (factor: number) => {
    zoomCamera(factor)
    window.clearInterval(timer.current)
    timer.current = window.setInterval(() => zoomCamera(factor), 90)
  }
  const stop = () => window.clearInterval(timer.current)
  const btn = 'grid h-8 w-8 place-items-center text-xl font-black leading-none text-ink select-none active:bg-gold-light'

  return (
    <div
      className="pointer-events-auto absolute z-10 flex flex-col overflow-hidden rounded-full border-2 border-outline bg-cream/90 shadow-[0_2px_0_var(--color-outline)]"
      style={{ right: 'max(0.5rem, env(safe-area-inset-right))', bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 8.25rem)' }}
      data-testid="camera-buttons"
    >
      <button type="button" aria-label={t('camera.zoomIn')} className={btn} onPointerDown={() => start(0.94)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>
        +
      </button>
      <span className="mx-1.5 h-px bg-outline/25" />
      <button type="button" aria-label={t('camera.zoomOut')} className={btn} onPointerDown={() => start(1.065)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>
        −
      </button>
    </div>
  )
}
