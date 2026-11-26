import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Tabs as RTabs } from 'radix-ui'

/**
 * 1.47 UI kit: ONE tab bar for every panel (bag, clothes shop, journal, vehicles, login…).
 * Radix Tabs gives the roles + arrow-key navigation; the lacquer thumb slides to the picked tab.
 * Only the bar — callers render their own content for `value`.
 */
export interface TabItem<T extends string> {
  id: T
  label: ReactNode
  testId?: string
  /** Small red count (unread, new…); 0 / undefined = none. */
  badge?: number
}

/** Measures the active child so a thumb can slide under it (shared by Tabs and Segmented). */
export function useThumb(active: string, deps: unknown[] = []) {
  const track = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ x: number; w: number } | null>(null)
  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    const measure = () => {
      const btn = el.querySelector<HTMLElement>(`[data-thumb-id="${CSS.escape(active)}"]`)
      if (btn) setBox({ x: btn.offsetLeft, w: btn.offsetWidth })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [active, ...deps])
  return { track, box }
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  scroll = false,
  size = 'md',
  className = '',
}: {
  value: T
  onChange: (id: T) => void
  items: TabItem<T>[]
  label?: string
  /** Many tabs: keep their natural width and scroll sideways instead of squeezing them. */
  scroll?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const { track, box } = useThumb(value, [items.length])
  const text = size === 'sm' ? 'text-[12px] px-2.5 py-1' : 'text-[13px] px-3 py-1.5'
  return (
    <RTabs.Root value={value} onValueChange={(v) => onChange(v as T)} activationMode="manual">
      <RTabs.List
        ref={track}
        aria-label={label}
        className={`tab-track ${scroll ? 'ui-scroll overflow-x-auto' : ''} ${className}`}
        style={scroll ? { touchAction: 'pan-x' } : undefined}
      >
        {box && <span aria-hidden="true" className="tab-thumb" style={{ width: box.w, transform: `translateX(${box.x}px)` }} />}
        {items.map((it) => {
          const on = it.id === value
          return (
            <RTabs.Trigger
              key={it.id}
              value={it.id}
              data-thumb-id={it.id}
              data-testid={it.testId}
              // Radix selects on mouse-down; a plain click (scripts, some screen readers) must work too.
              onClick={() => onChange(it.id)}
              className={`relative z-[1] rounded-full font-black whitespace-nowrap transition-colors duration-200 ${text} ${scroll ? 'shrink-0' : 'min-w-0 flex-1 truncate'} ${
                on ? 'text-gold-light [text-shadow:0_1.5px_0_rgba(74,20,14,0.55)]' : 'text-ink/60 hover:text-ink'
              }`}
            >
              {it.label}
              {!!it.badge && (
                <span className="absolute -top-1 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full border-[1.5px] border-white bg-lacquer px-1 text-[9px] leading-none text-white">
                  {it.badge > 9 ? '9+' : it.badge}
                </span>
              )}
            </RTabs.Trigger>
          )
        })}
      </RTabs.List>
    </RTabs.Root>
  )
}

/** A small choice between a few values (on/off, slow/normal/fast…) — the same sliding thumb, as radio buttons. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  tone = 'lacquer',
  label,
}: {
  value: T
  options: { value: T; label: ReactNode; testId?: string }[]
  onChange: (value: T) => void
  tone?: 'lacquer' | 'jade'
  label?: string
}) {
  const { track, box } = useThumb(value, [options.length])
  return (
    <div ref={track} role="radiogroup" aria-label={label} className="tab-track shrink-0">
      {box && <span aria-hidden="true" className="tab-thumb" data-tone={tone} style={{ width: box.w, transform: `translateX(${box.x}px)` }} />}
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-pressed={on}
            data-thumb-id={o.value}
            data-testid={o.testId}
            onClick={() => onChange(o.value)}
            className={`relative z-[1] rounded-full px-3 py-1 text-[13px] font-black whitespace-nowrap transition-colors duration-200 ${
              on ? 'text-white [text-shadow:0_1.5px_0_rgba(40,20,14,0.45)]' : 'text-ink/60 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
