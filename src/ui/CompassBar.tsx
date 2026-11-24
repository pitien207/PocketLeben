import { Icon3d } from './Icon3d'

/**
 * 1.36 compass (user: the round arrow looked cheap): a strip at the top centre like open-world games — the
 * directions (B = north, Đ = east, N = south, T = west) slide as the camera turns, and the objective is a 3D pin with
 * its distance; at the edge of the strip when it is to the side or behind. GuideSystem (game/components) moves the
 * strip and the pin every frame by writing to the DOM directly (no React renders).
 *
 * 1.42 restyle (user: "làm đẹp hơn phần la bàn"): a lacquered jade plate with a gold rim like the clock pill, fine
 * 5° ticks, a red north badge, gold intercardinals, a gold needle in the middle and a 3D compass medallion at the left.
 * Keep the ids and the mark's last child (the distance label): GuideSystem writes to them.
 */

/** Pixels per degree on the strip. */
export const COMPASS_PX = 2.2
const LABELS: Record<number, string> = { 0: 'B', 45: 'ĐB', 90: 'Đ', 135: 'ĐN', 180: 'N', 225: 'TN', 270: 'T', 315: 'TB' }

function Tick({ d }: { d: number }) {
  const n = ((d % 360) + 360) % 360
  const label = LABELS[n]
  const style = { left: (d + 360) * COMPASS_PX }
  if (label) {
    if (n === 0)
      return (
        <span className="absolute top-1/2 grid h-[1.15rem] min-w-[1.15rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[5px] border border-[#ffd76a] bg-linear-to-b from-[#e0483d] to-[#a8261f] px-0.5 font-display text-[12px] leading-none font-black text-[#fff3c4] shadow-[0_1px_0_rgba(0,0,0,0.35)]" style={style}>
          {label}
        </span>
      )
    const cardinal = n % 90 === 0
    return (
      <span
        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-display leading-none font-black ${cardinal ? 'text-[14px] text-[#fff6dc]' : 'text-[9.5px] tracking-tight text-[#f4c96a]'} [text-shadow:0_1px_0_rgba(0,0,0,0.35)]`}
        style={style}
      >
        {label}
      </span>
    )
  }
  const mid = n % 15 === 0
  return (
    <span
      className={`absolute -translate-x-1/2 rounded-full ${mid ? 'top-[30%] h-[40%] w-[1.5px] bg-[#fff3c4]/60' : 'top-[38%] h-[24%] w-px bg-[#fff3c4]/30'}`}
      style={style}
    />
  )
}

export function CompassBar() {
  const ticks: number[] = []
  for (let d = -360; d <= 720; d += 5) ticks.push(d)
  return (
    <div
      id="compass-bar"
      aria-hidden="true"
      className="pointer-events-none absolute top-[max(0.45rem,env(safe-area-inset-top))] left-1/2 z-[16] h-[2.15rem] w-[min(44vw,26rem)] -translate-x-1/2 short:top-1 short:h-[1.95rem] short:w-[min(36vw,20rem)]"
    >
      {/* the plate: jade lacquer, a gold rim inside the brown outline */}
      <div className="absolute inset-0 rounded-full bg-linear-to-b from-[#3c8466] via-[#2a674e] to-[#1d4c3a] shadow-[0_0_0_1.5px_#4a3226,inset_0_0_0_1.5px_#e9b949,inset_0_2px_0_2px_rgba(255,255,255,0.18),0_3px_0_1px_rgba(74,50,38,0.55),0_8px_16px_rgba(30,20,10,0.25)]" />
      <div className="absolute inset-[3px] overflow-hidden rounded-full [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
        <div id="compass-strip" className="absolute top-0 left-0 h-full" style={{ willChange: 'transform' }}>
          {ticks.map((d) => (
            <Tick key={d} d={d} />
          ))}
        </div>
      </div>
      {/* the needle: a gold line with a pointer above and below */}
      <span className="absolute top-[4px] bottom-[4px] left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-[#ffd76a]/85 shadow-[0_0_6px_rgba(255,215,106,0.8)]" />
      <span className="absolute -top-[3px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-[#ffd76a] drop-shadow-[0_1px_0_#4a3226]" />
      <span className="absolute -bottom-[3px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[6px] border-x-transparent border-b-[#ffd76a] drop-shadow-[0_-1px_0_#4a3226]" />
      {/* the medallion */}
      <span className="absolute top-1/2 -left-3 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border-[1.5px] border-[#4a3226] bg-radial from-[#fff8e6] to-[#f1d9a6] shadow-[inset_0_0_0_1.5px_#e9b949,0_2px_0_rgba(74,50,38,0.5)] short:h-7 short:w-7">
        <Icon3d name="compass" className="h-[22px] w-[22px] short:h-5 short:w-5" />
      </span>
      {/* the objective (GuideSystem moves it; its last child is the distance) */}
      <div id="compass-mark" className="absolute top-0 left-0 flex h-full w-7 flex-col items-center opacity-0 transition-opacity duration-300" style={{ willChange: 'transform' }}>
        <span className="relative -mt-1.5 grid h-7 w-7 place-items-center">
          <span className="absolute inset-0.5 animate-ping rounded-full bg-[#ffd76a]/60" />
          <Icon3d name="round-pushpin" className="relative h-6 w-6 drop-shadow-[0_2px_1px_rgba(0,0,0,0.45)]" />
        </span>
        <span className="mt-0.5 rounded-full border border-[#4a3226] bg-linear-to-b from-[#ffe48a] to-[#f2b632] px-1.5 py-px text-[10px] leading-none font-black whitespace-nowrap text-[#4a3226] tabular-nums shadow-[0_1.5px_0_rgba(74,50,38,0.55)]" />
      </div>
    </div>
  )
}
