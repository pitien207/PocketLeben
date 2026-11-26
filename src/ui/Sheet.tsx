import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { CloseIcon } from './icons'
import { Icon3d } from './Icon3d'

/**
 * Paper bottom-sheet / dialog with a red ribbon title. Esc, ✕ or tapping outside closes it.
 * 1.47: springs in, slides out when closed from inside, and on touch screens the grab handle can be
 * swiped down to close it (like a phone sheet). `icon` = a Fluent 3D picture in the ribbon.
 */
export function Sheet({ title, onClose, children, icon }: { title: string; onClose: () => void; children: ReactNode; icon?: string }) {
  const t = useT()
  const [closing, setClosing] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<{ y: number; t: number; id: number } | null>(null)
  const done = useRef(false)

  const close = useCallback(() => {
    if (done.current) return
    setClosing(true)
  }, [])
  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    onClose()
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])
  // Safety net: if the out-animation never ends (hidden tab, reduced motion), close anyway.
  useEffect(() => {
    if (!closing) return
    const id = window.setTimeout(finish, 260)
    return () => window.clearTimeout(id)
  }, [closing, finish])

  const onHandleDown = (e: React.PointerEvent) => {
    start.current = { y: e.clientY, t: performance.now(), id: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onHandleMove = (e: React.PointerEvent) => {
    if (!start.current || start.current.id !== e.pointerId) return
    const dy = e.clientY - start.current.y
    setDrag(dy > 0 ? dy : dy / 6)
  }
  const onHandleUp = (e: React.PointerEvent) => {
    const s = start.current
    start.current = null
    if (!s || s.id !== e.pointerId) return
    const dy = e.clientY - s.y
    const speed = dy / Math.max(1, performance.now() - s.t)
    if (dy > 110 || (dy > 30 && speed > 0.6)) close()
    else setDrag(0)
  }

  const dragging = start.current !== null
  return (
    <div
      className={`pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-ink/30 p-3 sm:items-center short:pt-6 ${closing ? 'opacity-0 transition-opacity duration-150' : 'scrim-in'}`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-sheet
        className={`panel relative w-full max-w-md p-4 pt-7 text-ink short:max-w-lg short:pb-3 ${closing ? 'sheet-out' : 'sheet-in'}`}
        style={{ translate: drag ? `0 ${drag}px` : undefined, transition: dragging ? 'none' : 'translate 0.25s cubic-bezier(0.22, 1, 0.36, 1)' }}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) finish()
        }}
      >
        {/* Grab zone (touch) round the ribbon: swipe the sheet down to close it */}
        <div
          aria-hidden="true"
          data-testid="sheet-handle"
          className="absolute inset-x-12 -top-5 z-[2] h-10 touch-none [@media(pointer:fine)]:hidden"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
        </div>
        <h2 className="pointer-events-none absolute -top-4 left-1/2 flex max-w-[calc(100%-5.5rem)] -translate-x-1/2 items-center gap-1.5 rounded-full ribbon py-1 pr-5 pl-4 text-lg whitespace-nowrap">
          {icon && <Icon3d name={icon} className="-my-1 -ml-1 h-6 w-6 shrink-0 drop-shadow-[0_1.5px_0_rgba(74,20,14,0.45)]" />}
          <span className="truncate">{title}</span>
        </h2>
        <button
          type="button"
          aria-label={t('settings.close')}
          onClick={close}
          className="btn-paper absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full text-lg"
        >
          <CloseIcon />
        </button>
        <div className="ui-scroll ui-fade-y -mx-1 max-h-[60dvh] overflow-y-auto px-1 py-1 short:max-h-[calc(100dvh-6.5rem)]">
          {children}
        </div>
      </div>
    </div>
  )
}
