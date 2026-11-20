import { create } from 'zustand'
import { useSettings } from '../../store/settingsStore'
import { useWorld } from '../../store/worldStore'
import { SCENES } from '../scenes/registry'

/**
 * 1.32 "đồ họa đẹp" (setting `fancy`): sky dome, post effects, lit windows, glowing lamps.
 * Only in the Vietnam scenes for now (the user wants to see Hà Nội first); Germany is unchanged.
 */
export const fxState = {
  /** 0 = day, 1 = full night (lamps on). Written by Lighting every frame. */
  night: 0,
}

/** Shared uniforms for scene materials (see `shared/materials.ts`). */
export const fxUniforms = {
  /** How much lit windows glow (0 outside the fancy mode or by day). */
  uNight: { value: 0 },
}

export function fancyOn(): boolean {
  return useSettings.getState().fancy && SCENES[useWorld.getState().scene].country === 'vn'
}

/** React: true while the fancy look applies to the current scene. */
export function useFancy(): boolean {
  const on = useSettings((s) => s.fancy)
  const scene = useWorld((s) => s.scene)
  return on && SCENES[scene].country === 'vn'
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Night amount for an hour of the day: lamps come on at dusk (17:50–19:30), off at dawn (4:50–6:10). */
export function nightAt(hour: number): number {
  const h = ((hour % 24) + 24) % 24
  if (h < 12) return 1 - smooth(4.8, 6.2, h)
  return smooth(17.8, 19.5, h)
}

/**
 * 1.39 (lag): set once when the device cannot hold its frame rate (Game.tsx PerformanceMonitor): the post effects drop
 * ambient occlusion, tilt-shift and MSAA for the rest of the session, as on "low" quality.
 */
export const useFxAuto = create<{ lite: boolean }>()(() => ({ lite: false }))
