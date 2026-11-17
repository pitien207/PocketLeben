import { useEffect } from 'react'
import { toast, Toaster } from 'sonner'
import { CONFIG } from '../data/config'
import { useT } from '../i18n'
import { useMinigame } from '../store/minigameStore'
import { useToasts, type Toast } from '../store/toastStore'
import { Icon3d } from './Icon3d'
import { SHORT_QUERY, useMedia } from './useMedia'

/**
 * Notifications (1.26, user: the old bubbles in the middle of the screen looked cheap and covered
 * dialogs). Shown with Sonner (MIT) as compact cards at the top edge: a 3D icon by kind, a small
 * title, the text, a coloured edge; they stack, swipe or tap away. While a mini-game is on screen
 * they wait and appear when it closes. The store API (pushToast / say) is unchanged.
 */

interface Look {
  icon: string
  title?: string
  body: string
  accent: string
  long?: boolean
}

function look(t: Toast, text: string): Look {
  const v = t.vars ?? {}
  switch (t.key) {
    case 'toast.stepDone':
      return { icon: 'check-mark-button', title: 'Hoàn thành bước', body: String(v.step ?? text), accent: '#2f9e64' }
    case 'toast.questDone':
      return { icon: 'trophy', title: 'Hoàn thành nhiệm vụ', body: String(v.quest ?? text), accent: '#d98a1f', long: true }
    case 'toast.achievement':
      return { icon: 'sports-medal', title: 'Thành tựu mới', body: String(v.name ?? text), accent: '#d6336c', long: true }
    case 'toast.boughtClothes':
      return { icon: 'shopping-bags', body: text, accent: '#4f86d9' }
  }
  const money = /[+−-]\s?[\d.,]+\s?(₫|đ|€)/.test(text)
  if (t.tone === 'bad') return { icon: 'warning', body: text, accent: '#d4202a' }
  if (money) return { icon: 'money-bag', body: text, accent: '#d98a1f' }
  if (t.tone === 'good') return { icon: 'sparkles', body: text, accent: '#2f9e64' }
  return { icon: 'speech-balloon', body: text, accent: '#6b7a99' }
}

function GameToast({ id, l }: { id: string | number; l: Look }) {
  return (
    <button
      type="button"
      onClick={() => toast.dismiss(id)}
      data-testid="game-toast"
      className="relative flex w-[min(92vw,380px)] items-center short:w-[min(44vw,340px)] short:py-1.5 gap-2.5 overflow-hidden rounded-2xl border-2 border-outline bg-[#fffaf0] py-2 pr-3 pl-3.5 text-left text-ink shadow-[0_4px_0_var(--color-outline),0_12px_28px_rgba(74,50,38,0.28)]"
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: l.accent }} />
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${l.accent}1f` }}>
        <Icon3d name={l.icon} className="h-9 w-9" />
      </span>
      <span className="min-w-0 flex-1">
        {l.title && (
          <span className="block text-[11px] leading-tight font-black tracking-wide uppercase" style={{ color: l.accent }}>
            {l.title}
          </span>
        )}
        <span className="line-clamp-3 block text-[14px] leading-snug font-extrabold">{l.body}</span>
      </span>
    </button>
  )
}

export function Toasts() {
  const t = useT()

  useEffect(() => {
    const pending: Toast[] = []
    const show = (item: Toast) => {
      const l = look(item, t(item.key, item.vars))
      toast.custom((id) => <GameToast id={id} l={l} />, { duration: CONFIG.ui.toastMs * (l.long ? 1.6 : 1.15) })
    }
    const unToasts = useToasts.subscribe((s, prev) => {
      const seen = new Set(prev.toasts.map((x) => x.id))
      for (const item of s.toasts) {
        if (seen.has(item.id)) continue
        if (useMinigame.getState().active) pending.push(item)
        else show(item)
      }
    })
    // A mini-game is full screen: keep its news until it closes, then show them one by one.
    const unGame = useMinigame.subscribe((s, prev) => {
      if (!s.active && prev.active) pending.splice(0).forEach((item, i) => window.setTimeout(() => show(item), 350 + i * 450))
    })
    return () => {
      unToasts()
      unGame()
    }
  }, [t])

  // A phone on its side (1.30): the top line holds the clock, money and tools and the bottom the
  // conversation, so notices drop into the free gap on the left, under the objective, over the joystick.
  const short = useMedia(SHORT_QUERY)
  if (short) {
    const side = { top: '6.6rem', left: 'max(0.75rem, env(safe-area-inset-left))' }
    return <Toaster key="short" position="top-left" visibleToasts={2} gap={6} offset={side} mobileOffset={side} toastOptions={{ unstyled: true }} />
  }
  return <Toaster key="tall" position="top-center" visibleToasts={3} gap={8} offset={10} mobileOffset={{ top: 8 }} toastOptions={{ unstyled: true }} />
}
