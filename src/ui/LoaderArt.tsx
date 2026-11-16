import { useMemo } from 'react'

/**
 * Loading-screen art (from the user's design): a Hà Nội rooftop at dusk — the player seen from
 * behind on the parapet, holding up the passport; a plane heading north-west to Germany, string
 * lights, washing on the line, a stainless water tank, the city fading into the sunset haze.
 * The skyline is generated with a seeded random, so it's the same every time.
 */

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
}

const quad = (p0: number, p1: number, p2: number, t: number) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2

function useScene() {
  return useMemo(() => {
    const rnd = seeded(20261116)
    const r = (a: number, b: number) => a + rnd() * (b - a)
    const stars = Array.from({ length: 40 }, () => ({ cx: r(0, 1000), cy: r(0, 330), r: r(0.6, 1.6), o: r(0.3, 0.9) }))
    const far: { x: number; y: number; w: number; h: number }[] = []
    for (let x = -20; x < 1020; ) {
      const w = r(28, 62)
      const h = r(90, 240)
      const y = 790 - h
      far.push({ x, y, w: w + 1, h })
      if (rnd() < 0.5) far.push({ x: x + w * 0.2, y: y - 10, w: w * 0.45, h: 10 })
      if (rnd() < 0.4) far.push({ x: x + w * 0.7, y: y - r(20, 40), w: 2, h: 40 })
      x += w
    }
    const mid: { x: number; y: number; w: number; h: number; c: string; rx?: number; o?: number }[] = []
    for (let x = -20; x < 1020; ) {
      const w = r(40, 80)
      const h = r(60, 170)
      const y = 870 - h
      mid.push({ x, y, w: w + 1, h, c: '#7d4565' })
      if (rnd() < 0.5) mid.push({ x: x - 2, y, w: w + 5, h: 6, c: '#6b3858' })
      for (let wy = y + 14; wy < 830; wy += 26)
        for (let wx = x + 8; wx < x + w - 14; wx += 18) if (rnd() < 0.35) mid.push({ x: wx, y: wy, w: 9, h: 12, c: '#ffd27a', rx: 1.5, o: r(0.55, 1) })
      x += w
    }
    const bulbs: { cx: number; cy: number; delay: number }[] = []
    for (const [x0, y0, x1, y1, x2, y2] of [
      [-10, 690, 160, 760, 340, 712],
      [640, 760, 820, 820, 1010, 740],
    ])
      for (let t = 0.06; t < 1; t += 0.09) bulbs.push({ cx: quad(x0, x1, x2, t), cy: quad(y0, y1, y2, t) + 6, delay: -r(0, 2.6) })
    const motes = Array.from({ length: 18 }, () => ({ size: r(2, 5), left: r(0, 100), top: r(40, 95), dx: r(-40, 40), dur: r(6, 12), delay: -r(0, 12) }))
    return { stars, far, mid, bulbs, motes }
  }, [])
}

const CSS = `
.ld-art { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
@media (orientation: portrait) { .ld-art { top: -11%; } }
.ld-mote { position: absolute; border-radius: 50%; pointer-events: none; background: #ffd9a0; filter: blur(1px); opacity: 0; animation: ld-mote linear infinite; }
@keyframes ld-mote { 0% { transform: translate(0, 0); opacity: 0; } 15% { opacity: .8; } 85% { opacity: .6; } 100% { transform: translate(var(--dx), -140px); opacity: 0; } }
.ld-plane { animation: ld-fly 16s linear infinite; }
@keyframes ld-fly { 0% { transform: translate(760px, 640px) scale(.9); opacity: 0; } 6% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translate(120px, 380px) scale(.55); opacity: 0; } }
.ld-bulb { animation: ld-twinkle 2.6s ease-in-out infinite; }
@keyframes ld-twinkle { 50% { opacity: .55; } }
.ld-shirt { transform-box: fill-box; transform-origin: 50% 0; animation: ld-sway 3.2s ease-in-out infinite; }
@keyframes ld-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
.ld-hand { transform-box: fill-box; transform-origin: 0% 100%; animation: ld-wave 3s ease-in-out infinite; }
@keyframes ld-wave { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-6deg); } }
@keyframes ld-shine { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) { .ld-plane, .ld-bulb, .ld-shirt, .ld-hand, .ld-mote { animation: none !important; } }
`

export function LoaderArt() {
  const { stars, far, mid, bulbs, motes } = useScene()
  return (
    <>
      <style>{CSS}</style>
      <svg className="ld-art" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="ld-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2f2a5c" />
            <stop offset=".38" stopColor="#7a4a7e" />
            <stop offset=".58" stopColor="#e2816e" />
            <stop offset=".72" stopColor="#ffbf86" />
            <stop offset=".8" stopColor="#ffd9a3" />
          </linearGradient>
          <radialGradient id="ld-sun">
            <stop offset="0" stopColor="#fff3cf" />
            <stop offset=".18" stopColor="#ffe2a3" stopOpacity=".95" />
            <stop offset=".45" stopColor="#ffb877" stopOpacity=".35" />
            <stop offset="1" stopColor="#ff9a6a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ld-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffcf98" stopOpacity="0" />
            <stop offset="1" stopColor="#ffcf98" stopOpacity=".75" />
          </linearGradient>
          <linearGradient id="ld-tank" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbe6d6" />
            <stop offset=".35" stopColor="#d9c3cf" />
            <stop offset=".7" stopColor="#8d7397" />
            <stop offset="1" stopColor="#5b4467" />
          </linearGradient>
          <linearGradient id="ld-trail" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id="ld-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        <rect width="1000" height="1000" fill="url(#ld-sky)" />
        <g fill="#fff">
          {stars.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} opacity={s.o} />
          ))}
        </g>
        <circle cx="560" cy="650" r="300" fill="url(#ld-sun)" />
        <circle cx="560" cy="650" r="52" fill="#fff1c9" />

        {/* The plane heads north-west — toward Germany */}
        <g className="ld-plane">
          <rect x="22" y="-1.5" width="220" height="3" rx="1.5" fill="url(#ld-trail)" transform="rotate(22)" />
          <path d="M-14 0 C-6 -3 10 -3 20 0 C10 3 -6 3 -14 0z M2 -1 L-6 -12 L-1 -12 L9 -1z M2 1 L-6 12 L-1 12 L9 1z M15 -1 l4 -6 h3 l-2 6z" fill="#3f2a4f" transform="rotate(22)" />
        </g>

        <g fill="#c97a80">
          {far.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.h === 10 ? 4 : 0} />
          ))}
        </g>
        <rect x="0" y="600" width="1000" height="200" fill="url(#ld-haze)" />
        <g>
          {mid.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.rx} fill={b.c} opacity={b.o} />
          ))}
        </g>

        {/* Rooftop, against the light: string lights, antenna, washing line */}
        <path d="M-10 690 Q 160 760 340 712" stroke="#2c1a33" strokeWidth="2" fill="none" />
        <path d="M640 760 Q 820 820 1010 740" stroke="#2c1a33" strokeWidth="2" fill="none" />
        <g>
          {bulbs.map((b, i) => (
            <g key={i} className="ld-bulb" style={{ animationDelay: `${b.delay}s` }}>
              <circle cx={b.cx} cy={b.cy} r="9" fill="#ffcf6e" filter="url(#ld-glow)" opacity=".9" />
              <circle cx={b.cx} cy={b.cy} r="3.2" fill="#fff3c4" />
            </g>
          ))}
        </g>
        <g stroke="#2c1a33" strokeWidth="5" strokeLinecap="round">
          <path d="M330 860 V650" />
          <path d="M300 670 h60 M306 690 h48 M296 710 h68 M310 730 h40" strokeWidth="3.5" />
        </g>
        <path d="M90 780 Q 210 815 330 778" stroke="#2c1a33" strokeWidth="2" fill="none" />
        <g fill="#4a2e4f">
          <path className="ld-shirt" d="M138 793 h38 l10 12 -8 6 -4 -4 v30 h-34 v-30 l-4 4 -8 -6z" />
          <path className="ld-shirt" style={{ animationDelay: '-1s' }} d="M206 801 h26 v46 h-11 l-2 -26 -2 26 h-11z" fill="#3e2745" />
          <path className="ld-shirt" style={{ animationDelay: '-2s' }} d="M252 798 h30 l8 10 -6 5 -3 -3 v24 h-28 v-24 l-3 3 -6 -5z" fill="#55344f" />
        </g>
        <rect x="-10" y="860" width="1020" height="150" fill="#2f1d36" />
        <rect x="-10" y="842" width="1020" height="34" fill="#45294a" />
        <rect x="-10" y="842" width="1020" height="4" fill="#f2a27c" opacity=".75" />
        <g>
          <path d="M560 842 l4 -26 h28 l4 26z" fill="#5e3448" />
          <path d="M578 818 c-16 -20 -26 -40 -10 -52 c4 18 10 30 10 52z M578 818 c12 -22 30 -34 40 -30 c-12 10 -24 22 -40 30z M578 818 c-2 -26 4 -48 18 -58 c-2 20 -8 40 -18 58z" fill="#3b2a3f" />
          <path d="M880 842 l3 -20 h24 l3 20z" fill="#5e3448" />
          <path d="M895 822 c-10 -14 -16 -30 -4 -40 c2 14 6 26 4 40z M895 822 c10 -16 22 -24 30 -20 c-8 8 -18 16 -30 20z" fill="#3b2a3f" />
        </g>
        {/* Stainless water tank on its stand */}
        <g>
          <rect x="668" y="840" width="10" height="70" fill="#2c1a33" />
          <rect x="770" y="840" width="10" height="70" fill="#2c1a33" />
          <rect x="650" y="842" width="148" height="8" fill="#2c1a33" />
          <rect x="640" y="764" width="168" height="80" rx="40" fill="url(#ld-tank)" />
          <path d="M690 766 v76 M758 766 v76" stroke="#6e5680" strokeWidth="3" opacity=".6" />
          <rect x="690" y="752" width="30" height="14" rx="4" fill="#cdb5c3" />
          <path d="M652 790 q20 -18 60 -20" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".55" fill="none" />
        </g>
        {/* You, from behind, on the parapet — holding the passport up to the sky */}
        <g>
          <rect x="508" y="806" width="40" height="40" rx="12" fill="#c98a3c" />
          <rect x="514" y="822" width="28" height="14" rx="5" fill="#a86d2a" />
          <path d="M508 812 q20 -6 40 0" stroke="#f2b77c" strokeWidth="2.5" fill="none" opacity=".8" />
          <path d="M422 846 c-4 -40 4 -64 46 -66 c42 2 50 26 46 66z" fill="#b8423d" />
          <path d="M440 790 q28 22 56 0 q-4 18 -28 22 q-24 -4 -28 -22z" fill="#9a3333" />
          <path d="M512 842 c2 -30 -2 -48 -18 -58" stroke="#ffb98a" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".8" />
          <g className="ld-hand">
            <path d="M498 796 Q 530 770 538 724" stroke="#b8423d" strokeWidth="18" strokeLinecap="round" fill="none" />
            <circle cx="539" cy="716" r="10" fill="#f2c4a2" />
            <g transform="rotate(12 548 690)">
              <rect x="530" y="666" width="34" height="46" rx="4" fill="#2d5a47" />
              <circle cx="547" cy="684" r="7" fill="none" stroke="#e8c26a" strokeWidth="2" />
              <rect x="537" y="697" width="20" height="3" rx="1.5" fill="#e8c26a" />
              <rect x="562" y="667" width="2.5" height="44" fill="#ffd9a3" opacity=".8" />
            </g>
          </g>
          <circle cx="468" cy="742" r="40" fill="#2a1d30" />
          <path d="M440 716 q10 -26 34 -24 q-14 6 -12 20 q-10 -8 -22 4z" fill="#3b2a44" />
          <path d="M500 718 a40 40 0 0 1 6 46" stroke="#ffb98a" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".85" />
          <ellipse cx="506" cy="752" rx="6" ry="9" fill="#f2c4a2" />
        </g>
      </svg>
      {motes.map((m, i) => (
        <span
          key={i}
          className="ld-mote"
          style={{ width: m.size, height: m.size, left: `${m.left}%`, top: `${m.top}%`, ['--dx' as string]: `${m.dx}px`, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }}
        />
      ))}
      {/* Darker towards the bottom for the text, plus a soft vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(30,20,50,.35) 0%, transparent 28%, transparent 62%, rgba(25,15,35,.75) 100%), radial-gradient(ellipse at 50% 60%, transparent 55%, rgba(20,10,30,.45) 100%)',
        }}
      />
    </>
  )
}

/** "VISA HUNTER" with the red "ĐI ĐỨC" ribbon, as in the design. */
export function LoaderLogo() {
  return (
    <div className="pointer-events-none absolute left-1/2 z-[2] -translate-x-1/2 text-center whitespace-nowrap" style={{ top: 'max(7vh, 32px)' }}>
      <h2
        className="m-0 font-display leading-[0.9] font-extrabold tracking-[1px] text-[#fff4dc]"
        style={{
          fontSize: 'clamp(46px, 11vw, 96px)',
          WebkitTextStroke: 'clamp(5px, 1.1vw, 9px) #3a1f3d',
          paintOrder: 'stroke fill',
          textShadow: '0 3px 0 #3a1f3d, 0 6px 0 #3a1f3d, 0 9px 0 #3a1f3d, 0 16px 24px rgba(20,8,30,.55)',
        }}
      >
        VISA <span className="text-[#ffc65c]">HUNTER</span>
      </h2>
      <div
        className="mt-[clamp(8px,1.6vw,14px)] inline-block -rotate-2 rounded-md bg-[#d8443c] px-[18px] pt-0.5 font-display font-extrabold tracking-[4px] text-white"
        style={{ fontSize: 'clamp(16px, 3.4vw, 24px)', boxShadow: '0 4px 0 #8f2622, 0 10px 18px rgba(20,8,30,.4)' }}
      >
        ĐI ĐỨC
      </div>
    </div>
  )
}
