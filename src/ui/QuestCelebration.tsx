import { useEffect, useState } from 'react'
import { AnimatePresence, domAnimation, LazyMotion, m } from 'motion/react'
import { burst } from '../game/minigames/juice'
import { playSfx } from '../game/systems/audio'
import { useMinigame } from '../store/minigameStore'
import { Icon3d } from './Icon3d'

/**
 * 1.36 (user: finishing a quest deserved more than a small card): a celebration in the middle of the screen —
 * turning golden rays, the 3D trophy (or medal) springing in, a ribbon "Hoàn thành nhiệm vụ" with the quest's name,
 * confetti (canvas-confetti). Animated with Motion. Never blocks input (pointer-events none); one at a time,
 * waiting while a mini-game is open. Fed by ui/Toasts.tsx (`celebrate`).
 */

export interface Celebration {
  icon: string
  title: string
  name: string
  color: string
}

const queue: Celebration[] = []
let wake: (() => void) | null = null

/** Show a celebration (queued). */
export function celebrate(c: Celebration) {
  queue.push(c)
  wake?.()
}

const SHOW_MS = 3000

export function QuestCelebration() {
  const [now, setNow] = useState<Celebration | null>(null)
  const busy = useMinigame((s) => s.active !== null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    wake = () => setTick((n) => n + 1)
    return () => {
      wake = null
    }
  }, [])
  // Take the next one when free…
  useEffect(() => {
    if (now || busy || !queue.length) return
    setNow(queue.shift()!)
  }, [now, busy, tick])
  // …and run it: sound, confetti, then away (its own effect, so taking it does not cancel the timers).
  useEffect(() => {
    if (!now) return
    playSfx('success')
    const fire = window.setTimeout(() => burst(document.getElementById('celebration-core'), 'big'), 180)
    const done = window.setTimeout(() => setNow(null), SHOW_MS)
    return () => {
      window.clearTimeout(fire)
      window.clearTimeout(done)
    }
  }, [now])

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {now && (
          <m.div
            key={now.name + now.title}
            className="pointer-events-none absolute inset-0 z-[45] grid place-items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            data-testid="quest-celebration"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(40,24,16,0.45),rgba(40,24,16,0)_60%)]" />
            <div id="celebration-core" className="relative flex flex-col items-center">
              {/* golden rays */}
              <m.div
                className="absolute top-1/2 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-[62%] rounded-full opacity-80 [mask-image:radial-gradient(circle,#000_25%,transparent_68%)] short:h-[18rem] short:w-[18rem]"
                style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,215,106,0.75) 0deg 9deg, rgba(255,215,106,0) 9deg 22.5deg)' }}
                initial={{ rotate: 0, scale: 0.4 }}
                animate={{ rotate: 90, scale: 1 }}
                transition={{ rotate: { duration: SHOW_MS / 1000, ease: 'linear' }, scale: { type: 'spring', stiffness: 160, damping: 16 } }}
              />
              <m.div initial={{ scale: 0, rotate: -25, y: 30 }} animate={{ scale: 1, rotate: 0, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 13, delay: 0.05 }} className="relative">
                <Icon3d name={now.icon} className="h-32 w-32 drop-shadow-[0_10px_8px_rgba(60,30,10,0.45)] short:h-24 short:w-24" />
              </m.div>
              <m.div
                initial={{ scaleX: 0.2, opacity: 0, y: 14 }}
                animate={{ scaleX: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.18 }}
                className="relative -mt-2 flex flex-col items-center"
              >
                <span className="relative px-10 py-1.5 font-display text-[22px] leading-none font-extrabold tracking-wide text-[#fff6d8] uppercase drop-shadow-[0_2px_0_rgba(0,0,0,0.3)] short:text-[18px]" style={{ background: `linear-gradient(180deg, ${now.color}, #8e1d17)`, clipPath: 'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)' }}>
                  {now.title}
                </span>
                <m.span initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-2 max-w-[80vw] rounded-full border-2 border-[#4a3226] bg-[#fffaf0] px-4 py-1 text-center text-[16px] font-black text-ink shadow-[0_3px_0_#4a3226]">
                  {now.name}
                </m.span>
              </m.div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  )
}
