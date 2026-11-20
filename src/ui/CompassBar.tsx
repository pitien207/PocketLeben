import { Icon3d } from './Icon3d'

/**
 * 1.36 compass (user: the round arrow looked cheap): a strip at the top centre like open-world games — the
 * directions (B = north, Đ = east, N = south, T = west) slide as the camera turns, and the objective is a 3D pin with
 * its distance; at the edge of the strip when it is to the side or behind. GuideSystem (game/components) moves the
 * strip and the pin every frame by writing to the DOM directly (no React renders).
 */

/** Pixels per degree on the strip. */
export const COMPASS_PX = 2.2
const LABELS: Record<number, string> = { 0: 'B', 45: 'ĐB', 90: 'Đ', 135: 'ĐN', 180: 'N', 225: 'TN', 270: 'T', 315: 'TB' }

export function CompassBar() {
  const ticks: number[] = []
  for (let d = -360; d <= 720; d += 15) ticks.push(d)
  return (
    <div
      id="compass-bar"
      aria-hidden="true"
      className="pointer-events-none absolute top-[max(0.45rem,env(safe-area-inset-top))] left-1/2 z-[16] h-[2.1rem] w-[min(44vw,26rem)] -translate-x-1/2 short:top-1 short:w-[min(36vw,20rem)]"
    >
      <div className="absolute inset-0 overflow-hidden rounded-full border-[1.5px] border-[#4a3226]/70 bg-[linear-gradient(180deg,rgba(255,249,236,0.96),rgba(246,232,206,0.96))] shadow-[inset_0_1px_0_#fff,0_2px_0_rgba(74,50,38,0.45),0_6px_14px_rgba(60,40,30,0.18)] [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)]">
        <div id="compass-strip" className="absolute top-0 left-0 h-full" style={{ willChange: 'transform' }}>
          {ticks.map((d) => {
            const n = ((d % 360) + 360) % 360
            const label = LABELS[n]
            return (
              <span key={d} className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center justify-center" style={{ left: (d + 360) * COMPASS_PX }}>
                {label ? (
                  <span className={`font-display leading-none font-extrabold ${n % 90 === 0 ? 'text-[14px]' : 'text-[10px] text-ink/55'} ${n === 0 ? 'text-[#c8322b]' : 'text-ink'}`}>{label}</span>
                ) : (
                  <span className="h-2 w-[1.5px] rounded-full bg-ink/30" />
                )}
              </span>
            )
          })}
        </div>
      </div>
      {/* the centre notch */}
      <span className="absolute -bottom-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[6px] border-x-transparent border-b-[#c8322b]" />
      {/* the objective */}
      <div id="compass-mark" className="absolute top-0 left-0 flex h-full flex-col items-center opacity-0 transition-opacity duration-300" style={{ willChange: 'transform' }}>
        <span className="relative -mt-1 grid h-7 w-7 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#ffd76a]/50" />
          <Icon3d name="round-pushpin" className="relative h-6 w-6 drop-shadow-[0_2px_1px_rgba(74,50,38,0.4)]" />
        </span>
        <span className="mt-0.5 rounded-full bg-[#4a3226] px-1.5 py-px text-[10px] leading-none font-black text-[#fff3c4] tabular-nums shadow-[0_1px_0_rgba(0,0,0,0.25)]" />
      </div>
    </div>
  )
}
