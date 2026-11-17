import confetti from 'canvas-confetti'

/**
 * Game feel for the job mini-games (1.24): confetti bursts (canvas-confetti, ISC licence) and small
 * floating reactions. Everything respects "reduce motion".
 */

const COLORS = ['#ff8fab', '#ffd23f', '#6fcf97', '#7fb8e8', '#ffffff', '#f39a2b']
const GOLD = ['#ffd23f', '#f4c04e', '#fff3c4', '#e8a33a']

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function originOf(from: Element | null | undefined) {
  if (!from) return { x: 0.5, y: 0.45 }
  const r = from.getBoundingClientRect()
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
}

/** A little celebration from an element: 'small' (a good order), 'coins' (a tip / right change), 'big' (end of a great shift). */
export function burst(from: Element | null | undefined, kind: 'small' | 'coins' | 'big' = 'small') {
  if (reduced()) return
  const origin = originOf(from)
  const base = { origin, zIndex: 70, disableForReducedMotion: true }
  if (kind === 'big') {
    void confetti({ ...base, particleCount: 110, spread: 100, startVelocity: 40, ticks: 220, colors: COLORS })
    window.setTimeout(() => {
      void confetti({ ...base, origin: { x: 0.1, y: 0.7 }, angle: 60, particleCount: 50, spread: 60, startVelocity: 45, colors: COLORS })
      void confetti({ ...base, origin: { x: 0.9, y: 0.7 }, angle: 120, particleCount: 50, spread: 60, startVelocity: 45, colors: COLORS })
    }, 260)
    return
  }
  if (kind === 'coins') {
    void confetti({ ...base, particleCount: 16, spread: 50, startVelocity: 20, gravity: 1.3, ticks: 70, scalar: 0.9, shapes: ['circle'], colors: GOLD })
    return
  }
  void confetti({ ...base, particleCount: 26, spread: 60, startVelocity: 22, ticks: 80, scalar: 0.8, colors: COLORS })
}

/** An emoji / short text that floats up and fades (re-mount with a new `key` to play again). */
export function Reaction({ text, className = '' }: { text: string; className?: string }) {
  return <span className={`animate-float-up pointer-events-none absolute z-10 text-2xl font-black drop-shadow-[0_2px_0_rgba(74,50,38,0.35)] ${className}`}>{text}</span>
}
