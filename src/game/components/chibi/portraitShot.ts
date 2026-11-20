import { useEffect, useState } from 'react'
import { DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import type { Outfit } from '../../../data/npcs'
import { buildChibiRig } from '../ChibiModel'
import { HEAD_R, HEAD_Y } from './rig'

/**
 * Portraits as photos of the real chibi (1.25): the user found the drawn 2D faces too blocky. One
 * small offscreen renderer takes a head-and-shoulders picture of the 3D character with the game's
 * light, once per outfit (cached as a PNG data URL); pictures are taken one at a time in idle time.
 * Without WebGL the drawn portrait stays (ui/Portrait.tsx).
 */

const SIZE = 224
const cache = new Map<string, string>()
const waiting = new Map<string, ((url: string | null) => void)[]>()
const queue: { key: string; outfit: Outfit; frame: ShotFrame }[] = []
let renderer: WebGLRenderer | null | undefined
let busy = false

function getRenderer() {
  if (renderer !== undefined) return renderer
  try {
    const r = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' })
    r.setPixelRatio(1)
    r.setSize(SIZE, SIZE, false)
    r.setClearColor(0x000000, 0)
    renderer = r
  } catch {
    renderer = null
  }
  return renderer
}

/** 'face' = head and shoulders (dialogue), 'body' = the whole character (shop try-on, 1.34). */
export type ShotFrame = 'face' | 'body'
export const portraitKey = (o: Outfit, frame: ShotFrame = 'face') => (frame === 'face' ? '' : frame + '|') + JSON.stringify(o)

function shoot(o: Outfit, frame: ShotFrame): string | null {
  const r = getRenderer()
  if (!r) return null
  const rig = buildChibiRig(o)
  const scene = new Scene()
  scene.add(new HemisphereLight('#fff6ea', '#d6c8ff', 2.1))
  const sun = new DirectionalLight('#fff4e6', 2.4)
  sun.position.set(1.4, 2.6, 3)
  scene.add(sun)
  scene.add(rig.group)
  // Head and shoulders, seen a little from the side and above.
  const cy = frame === 'body' ? 0.74 : HEAD_Y - HEAD_R * 0.3
  const cam = new PerspectiveCamera(22, 1, 0.1, 30)
  if (frame === 'body') cam.position.set(1.0, cy + 0.45, 4.9)
  else cam.position.set(0.75, cy + 0.32, 3.3)
  cam.lookAt(0, cy, 0)
  r.render(scene, cam)
  const url = r.domElement.toDataURL('image/png')
  scene.remove(rig.group)
  rig.dispose()
  return url
}

function pump() {
  if (busy || !queue.length) return
  busy = true
  const run = () => {
    const job = queue.shift()!
    let url: string | null = null
    try {
      url = shoot(job.outfit, job.frame)
    } catch (e) {
      console.warn('portrait', e)
    }
    if (url) cache.set(job.key, url)
    for (const done of waiting.get(job.key) ?? []) done(url)
    waiting.delete(job.key)
    busy = false
    if (queue.length) window.setTimeout(pump, 16)
  }
  const idle = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  if (idle) idle.call(window, run, { timeout: 250 })
  else setTimeout(run, 1)
}

/** A photo of this outfit's chibi (from the cache, or taken soon). */
export function requestPortrait(o: Outfit, frame: ShotFrame = 'face'): Promise<string | null> {
  const key = portraitKey(o, frame)
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve) => {
    const list = waiting.get(key)
    if (list) list.push(resolve)
    else {
      waiting.set(key, [resolve])
      queue.push({ key, outfit: o, frame })
      pump()
    }
  })
}

/** React: the photo URL once it exists (null until then, or when there is no WebGL). */
export function usePortraitShot(o: Outfit, frame: ShotFrame = 'face'): string | null {
  const key = portraitKey(o, frame)
  const [state, setState] = useState<{ key: string; url: string | null }>(() => ({ key, url: cache.get(key) ?? null }))
  useEffect(() => {
    let alive = true
    const hit = cache.get(key)
    if (hit) {
      setState({ key, url: hit })
      return
    }
    void requestPortrait(o, frame).then((url) => alive && setState({ key, url }))
    return () => {
      alive = false
    }
    // The key describes the outfit by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state.key === key ? state.url : (cache.get(key) ?? null)
}
