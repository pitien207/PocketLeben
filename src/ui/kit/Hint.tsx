import type { ReactElement, ReactNode } from 'react'
import { Tooltip } from 'radix-ui'
import { useMedia } from '../useMedia'

const HOVER_QUERY = '(hover: hover) and (pointer: fine)'

/**
 * 1.47 UI kit: a small dark tooltip for mouse users (Radix Tooltip). On touch screens it renders the
 * child alone — no long-press bubbles over the game. `keys` shows a keyboard shortcut ("M", "Esc").
 */
export function Hint({ label, keys, side = 'bottom', children }: { label: ReactNode; keys?: string; side?: 'top' | 'bottom' | 'left' | 'right'; children: ReactElement }) {
  const mouse = useMedia(HOVER_QUERY)
  if (!mouse) return children
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={6} collisionPadding={8} className="ui-tip">
          {label}
          {keys && <kbd>{keys}</kbd>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

/** One provider for the whole game UI (shared open delay: moving along the rail shows the next tip at once). */
export function HintProvider({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={400}>
      {children}
    </Tooltip.Provider>
  )
}
