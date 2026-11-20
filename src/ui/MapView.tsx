import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { SCENES } from '../game/scenes/registry'
import { SCENE_MAPS, type SceneMap } from '../game/scenes/maps'
import { localSnapshot } from '../game/systems/netState'
import { playerState, teleportPlayer } from '../game/systems/playerState'
import { travelTo } from '../game/systems/travel'
import { npcPositions } from '../game/systems/registry'
import { translate, useT } from '../i18n'
import { currentLanguage, localize, useLocalize } from '../i18n/localized'
import { remotes } from '../net/client'
import { useSocial } from '../net/social'
import { useDialogue } from '../store/dialogueStore'
import { useGuide } from '../store/guideStore'
import { useInteraction } from '../store/interactionStore'
import { useSettings } from '../store/settingsStore'
import { useUI } from '../store/uiStore'
import { useWorld } from '../store/worldStore'
import { CloseIcon } from './icons'

/**
 * The map (M key / 🗺️ button): a big live top-down view of the current scene — streets and
 * their names, buildings, every place you can use, people, other players (friends in green),
 * the guide's target (⭐) and you (arrow). Drag to move, pinch / wheel / +− to zoom.
 * Drawn on a canvas, outside React's render loop.
 */

interface View {
  zoom: number
  /** World point at the centre of the canvas (null = centre of the map). */
  cx: number | null
  cz: number | null
}

/** Indoor rooms: frame the room from its interactables and the player. */
function roomMap(): SceneMap {
  const xs = [playerState.position.x]
  const zs = [playerState.position.z]
  for (const d of Object.values(useInteraction.getState().items)) {
    xs.push(d.zone.x)
    zs.push(d.zone.z)
  }
  return {
    bounds: { minX: Math.min(...xs) - 2.5, maxX: Math.max(...xs) + 2.5, minZ: Math.min(...zs) - 2, maxZ: Math.max(...zs) + 2 },
    ground: '#f1dcb6',
    rects: [],
  }
}

function guideTarget(): { x: number; z: number } | null {
  const point = useGuide.getState().guide?.point
  if (!point) return null
  if (point.kind === 'at') return { x: point.at[0], z: point.at[2] }
  if (point.kind === 'npc') return npcPositions.get(point.id) ?? null
  const def = useInteraction.getState().items[point.id]
  return def ? { x: def.zone.x, z: def.zone.z } : null
}

interface Transform {
  scale: number
  cx: number
  cz: number
  w: number
  h: number
  bounds: SceneMap['bounds']
}
const transforms = new WeakMap<HTMLCanvasElement, Transform>()

function layout(canvas: HTMLCanvasElement, map: SceneMap, view: View): Transform {
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  const b = map.bounds
  // Landscape: the whole map fits. Portrait phones: fill the height (drag sideways to see the rest).
  const sx = w / (b.maxX - b.minX)
  const sz = h / (b.maxZ - b.minZ)
  const fit = (h > w ? Math.max(sx, Math.min(sz, sx * 2.4)) : Math.min(sx, sz)) * 0.96
  const scale = fit * view.zoom
  // Keep the view over the map.
  const halfW = w / 2 / scale
  const halfH = h / 2 / scale
  const midX = (b.minX + b.maxX) / 2
  const midZ = (b.minZ + b.maxZ) / 2
  const clampC = (c: number | null, mid: number, lo: number, hi: number, half: number) =>
    c === null || hi - lo <= half * 2 ? mid : Math.min(hi - half, Math.max(lo + half, c))
  const cx = clampC(view.cx, midX, b.minX, b.maxX, halfW)
  const cz = clampC(view.cz, midZ, b.minZ, b.maxZ, halfH)
  return { scale, cx, cz, w, h, bounds: b }
}

function labelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, halo = 'rgba(255,250,240,0.95)') {
  ctx.lineWidth = 3.5
  ctx.strokeStyle = halo
  ctx.fillStyle = color
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
}

function draw(canvas: HTMLCanvasElement, view: View, time: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const scene = useWorld.getState().scene
  const map = SCENE_MAPS[scene] ?? roomMap()
  const tr = layout(canvas, map, view)
  const { w, h, scale } = tr
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  transforms.set(canvas, tr)
  const b = map.bounds
  const X = (x: number) => w / 2 + (x - tr.cx) * scale
  const Z = (z: number) => h / 2 + (z - tr.cz) * scale
  const lang = currentLanguage()
  const close = view.zoom >= 1.7

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#d9cbb0'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = map.ground
  ctx.fillRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale)
  // Faint 5 m grid: helps judge distances.
  ctx.strokeStyle = 'rgba(74,58,51,0.06)'
  ctx.lineWidth = 1
  for (let x = Math.ceil(b.minX / 5) * 5; x <= b.maxX; x += 5) {
    ctx.beginPath()
    ctx.moveTo(X(x), Z(b.minZ))
    ctx.lineTo(X(x), Z(b.maxZ))
    ctx.stroke()
  }
  for (let z = Math.ceil(b.minZ / 5) * 5; z <= b.maxZ; z += 5) {
    ctx.beginPath()
    ctx.moveTo(X(b.minX), Z(z))
    ctx.lineTo(X(b.maxX), Z(z))
    ctx.stroke()
  }
  for (const r of map.rects) {
    const x0 = Math.max(X(r.x0), X(b.minX))
    const x1 = Math.min(X(r.x1), X(b.maxX))
    const z0 = Math.max(Z(r.z0), Z(b.minZ))
    const z1 = Math.min(Z(r.z1), Z(b.maxZ))
    if (x1 <= x0 || z1 <= z0) continue
    ctx.fillStyle = r.color
    ctx.beginPath()
    ctx.roundRect(x0, z0, x1 - x0, z1 - z0, r.soft ? Math.min(14, (z1 - z0) / 2) : 2)
    ctx.fill()
    if (!r.soft && r.color !== '#9aa3b2' && r.color !== '#f6f1e7') {
      ctx.strokeStyle = 'rgba(74,58,51,0.35)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
  for (const c of map.circles ?? []) {
    ctx.fillStyle = c.color
    ctx.beginPath()
    ctx.arc(X(c.x), Z(c.z), c.r * scale, 0, Math.PI * 2)
    ctx.fill()
  }

  // Street / water / area names
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const l of map.labels ?? []) {
    const size = l.kind === 'street' ? 14 : 13
    ctx.font = `${l.kind === 'water' ? 'italic ' : ''}900 ${size}px Nunito, system-ui, sans-serif`
    const color = l.kind === 'water' ? '#2f6f8f' : l.kind === 'street' ? '#ffffff' : '#7a4a2a'
    const halo = l.kind === 'street' ? 'rgba(74,58,51,0.55)' : 'rgba(255,250,240,0.9)'
    labelText(ctx, localize(l.text, lang).toUpperCase(), X(l.x), Z(l.z), color, halo)
  }

  // Places you can use, and people
  const items = Object.values(useInteraction.getState().items)
  ctx.font = '800 12px Nunito, system-ui, sans-serif'
  ctx.textBaseline = 'alphabetic'
  for (const d of items) {
    if (d.id.startsWith('resident:')) continue
    const isNpc = d.id.startsWith('npc:')
    const x = X(d.zone.x)
    const z = Z(d.zone.z)
    if (x < -20 || x > w + 20 || z < -20 || z > h + 20) continue
    ctx.fillStyle = isNpc ? '#ff7f9f' : '#f4c04e'
    ctx.strokeStyle = '#4a3a33'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(x, z, isNpc ? 3.6 : 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (isNpc && !close) continue
    const name = d.nameKey ? translate(lang, d.nameKey) : d.name ? localize(d.name, lang) : ''
    if (name) labelText(ctx, name, x, z - 8, isNpc ? '#b0395a' : '#4a3a33')
  }

  // Other players in this place (friends in green)
  const friends = new Set(useSocial.getState().friends.map((f) => f.key))
  for (const r of remotes.values()) {
    const x = X(r.x)
    const z = Z(r.z)
    const friend = friends.has(r.name.trim().toLowerCase())
    ctx.fillStyle = friend ? '#3fae72' : '#4f8fe8'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, z, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    labelText(ctx, r.name, x, z - 9, friend ? '#2b7a50' : '#2f5fa8')
  }

  // The guide's target: a pulsing star
  const target = guideTarget()
  if (target) {
    const pulse = 1 + Math.sin(time / 180) * 0.18
    star(ctx, X(target.x), Z(target.z), 10 * pulse)
  }

  // You: an arrow pointing where you face, with a soft halo
  const px = X(playerState.position.x)
  const pz = Z(playerState.position.z)
  ctx.fillStyle = 'rgba(200,50,43,0.18)'
  ctx.beginPath()
  ctx.arc(px, pz, 16 + Math.sin(time / 300) * 2, 0, Math.PI * 2)
  ctx.fill()
  const size = 10
  ctx.save()
  ctx.translate(px, pz)
  ctx.rotate(-localSnapshot.yaw + Math.PI)
  ctx.fillStyle = '#c8322b'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(size * 0.75, size * 0.8)
  ctx.lineTo(0, size * 0.35)
  ctx.lineTo(-size * 0.75, size * 0.8)
  ctx.closePath()
  ctx.stroke()
  ctx.fill()
  ctx.restore()
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#ffd84d'
  ctx.strokeStyle = '#c8322b'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

const ZOOM_MIN = 1
const ZOOM_MAX = 6

/** The live map canvas with drag-to-pan and pinch / wheel zoom. Tap = `onPick` (test mode teleport). */
function MapCanvas({ view, onPick }: { view: RefObject<View>; onPick?: (x: number, z: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0
    let last = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 50 || !ref.current) return
      last = t
      draw(ref.current, view.current, t)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [view])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const pointers = new Map<number, { x: number; y: number }>()
    let moved = 0
    let pinch = 0
    const toWorld = (sx: number, sy: number) => {
      const tr = transforms.get(el)
      if (!tr) return null
      return { x: tr.cx + (sx - tr.w / 2) / tr.scale, z: tr.cz + (sy - tr.h / 2) / tr.scale, tr }
    }
    /** Zoom by `f` keeping the world point under (sx, sy) where it is. */
    const zoomAt = (f: number, sx: number, sy: number) => {
      const before = toWorld(sx, sy)
      if (!before) return
      const v = view.current
      v.cx = before.tr.cx
      v.cz = before.tr.cz
      v.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * f))
      const tr = layout(el, SCENE_MAPS[useWorld.getState().scene] ?? roomMap(), v)
      const after = { x: tr.cx + (sx - tr.w / 2) / tr.scale, z: tr.cz + (sy - tr.h / 2) / tr.scale }
      v.cx = tr.cx + (before.x - after.x)
      v.cz = tr.cz + (before.z - after.z)
    }
    const local = (e: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const spread = () => {
      const [p, q] = [...pointers.values()]
      return Math.hypot(p.x - q.x, p.y - q.y)
    }
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, local(e))
      el.setPointerCapture(e.pointerId)
      moved = 0
      if (pointers.size === 2) pinch = spread()
    }
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const q = local(e)
      const dx = q.x - p.x
      const dy = q.y - p.y
      p.x = q.x
      p.y = q.y
      moved += Math.abs(dx) + Math.abs(dy)
      if (pointers.size === 2) {
        const d = spread()
        const [a, c] = [...pointers.values()]
        if (pinch > 0 && d > 0) zoomAt(d / pinch, (a.x + c.x) / 2, (a.y + c.y) / 2)
        pinch = d
        return
      }
      const tr = transforms.get(el)
      if (!tr) return
      const v = view.current
      v.cx = tr.cx - dx / tr.scale
      v.cz = tr.cz - dy / tr.scale
    }
    const onUp = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      pointers.delete(e.pointerId)
      pinch = 0
      if (p && pointers.size === 0 && moved < 6 && onPick) {
        const wpt = toWorld(p.x, p.y)
        if (wpt) onPick(wpt.x, wpt.z)
      }
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const q = local(e)
      zoomAt(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.004), q.x, q.y)
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [view, onPick])

  return <canvas ref={ref} data-testid="map-canvas" className="block h-full w-full cursor-grab touch-none active:cursor-grabbing" />
}

/** Test mode: teleport to any place in this scene, or travel to any scene. */
function TeleportList() {
  const t = useT()
  const localize = useLocalize()
  const lang = useSettings((s) => s.language)
  const scene = useWorld((s) => s.scene)
  const items = useInteraction((s) => s.items)
  const places = Object.values(items).filter((d) => !d.id.startsWith('resident:'))
  const btn = 'rounded-lg border-2 border-outline bg-cream px-2 py-1 text-[11px] font-black text-ink active:translate-y-0.5'
  return (
    <div className="max-h-[28dvh] overflow-y-auto rounded-2xl border-2 border-dashed border-gold bg-gold-light/50 p-2" data-testid="teleport">
      <p className="mb-1 text-[11px] font-black text-lacquer">{t('map.teleportHint')}</p>
      <div className="mb-2 flex flex-wrap gap-1">
        {places.map((d) => (
          <button key={d.id} type="button" className={btn} onClick={() => teleportPlayer(d.zone.x, d.zone.z + Math.min(d.zone.halfZ, 1) * 0.6)}>
            {d.nameKey ? translate(lang, d.nameKey) : d.name ? localize(d.name) : d.id}
          </button>
        ))}
      </div>
      <p className="mb-1 text-[11px] font-black text-lacquer">{t('map.travel')}</p>
      <div className="flex flex-wrap gap-1">
        {Object.values(SCENES)
          .filter((s) => s.id !== scene)
          .map((s) => (
            <button
              key={s.id}
              type="button"
              className={btn}
              onClick={() => {
                useUI.getState().closePanel()
                travelTo(s.id, 'default', { minutes: 0 })
              }}
            >
              {localize(s.name)}
            </button>
          ))}
      </div>
    </div>
  )
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full border-2 border-outline bg-cream text-lg font-black text-ink shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none"
    >
      {children}
    </button>
  )
}

/** M opens / closes the map (not while typing, talking or in another panel). */
function useMapKey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const ui = useUI.getState()
      if (ui.panel?.type === 'map') {
        ui.closePanel()
        return
      }
      if (ui.panel || ui.settingsOpen || ui.transition || ui.sleeping || useDialogue.getState().npcId) return
      ui.openPanel({ type: 'map' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** The big map: fills the screen, live, with names, people and your goal. */
export function MapPanel() {
  useMapKey()
  const t = useT()
  const localize = useLocalize()
  const open = useUI((s) => s.panel?.type === 'map')
  const closePanel = useUI((s) => s.closePanel)
  const scene = useWorld((s) => s.scene)
  const guide = useGuide((s) => s.guide)
  const testMode = useSettings((s) => s.testMode)
  const view = useRef<View>({ zoom: 1, cx: null, cz: null })
  const [, setTick] = useState(0)

  // Each time it opens: start a bit zoomed in, centred on you.
  useEffect(() => {
    if (!open) return
    const outdoor = !!SCENE_MAPS[useWorld.getState().scene]
    // Portrait already fills the height at zoom 1.
    const start = window.innerHeight > window.innerWidth ? 1 : 1.6
    view.current = outdoor ? { zoom: start, cx: playerState.position.x, cz: playerState.position.z } : { zoom: 1, cx: null, cz: null }
    setTick((n) => n + 1)
    const onKey = (e: KeyboardEvent) => e.code === 'Escape' && closePanel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePanel])

  if (!open) return null
  const zoomBy = (f: number) => {
    const v = view.current
    v.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * f))
  }
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-ink/40 p-2 sm:p-4"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      onPointerDown={(e) => e.target === e.currentTarget && closePanel()}
    >
      <div role="dialog" aria-modal="true" aria-label={t('map.title')} data-testid="map" className="panel animate-sheet relative flex h-full w-full max-w-6xl flex-col gap-2 p-2.5 text-ink sm:p-3">
        <div className="flex items-center gap-2 pr-11">
          <h2 className="rounded-full ribbon px-4 py-0.5 text-lg whitespace-nowrap">{t('map.title')}</h2>
          <p className="truncate text-[13px] font-black text-ink/70">📍 {localize(SCENES[scene].name)}</p>
          <span className="ml-auto hidden rounded-md border-2 border-outline/40 px-1.5 text-[11px] font-black text-ink/50 sm:inline">M</span>
        </div>
        <button
          type="button"
          aria-label={t('settings.close')}
          onClick={closePanel}
          className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full border-2 border-outline bg-cream text-lg shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5"
        >
          <CloseIcon />
        </button>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border-[2.5px] border-outline">
          <MapCanvas view={view} onPick={testMode ? (x, z) => teleportPlayer(x, z) : undefined} />
          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            <MapButton label={t('map.zoomIn')} onClick={() => zoomBy(1.4)}>
              +
            </MapButton>
            <MapButton label={t('map.zoomOut')} onClick={() => zoomBy(1 / 1.4)}>
              −
            </MapButton>
            <MapButton
              label={t('map.centerMe')}
              onClick={() => {
                view.current.cx = playerState.position.x
                view.current.cz = playerState.position.z
                view.current.zoom = Math.max(view.current.zoom, 1.6)
              }}
            >
              ◎
            </MapButton>
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-x-2.5 gap-y-1 rounded-xl bg-paper/90 px-2.5 py-1 text-[11px] font-black text-ink/75">
            <span>
              <span className="text-lacquer">▲</span> {t('map.you')}
            </span>
            <span>⭐ {t('map.goal')}</span>
            <span>
              <span className="text-gold">●</span> {t('map.place')}
            </span>
            <span>
              <span className="text-rose">●</span> {t('map.person')}
            </span>
            <span>
              <span className="text-[#4f8fe8]">●</span> {t('map.player')}
            </span>
            <span>
              <span className="text-[#3fae72]">●</span> {t('map.friend')}
            </span>
          </div>
        </div>

        {guide && (
          <div className="rounded-2xl bg-white/80 px-3 py-2 text-[13px] font-bold shadow-[inset_0_0_0_2px_#f1dcb6]">
            <div className="font-black">🎯 {localize(guide.stepText)}</div>
            {guide.destination && guide.destination !== scene && (
              <div className="mt-0.5 text-ink/70">
                {t('map.goalIn', { place: localize(SCENES[guide.destination].name) })}
                {guide.via ? ` → ${localize(guide.via)}` : ''}
              </div>
            )}
          </div>
        )}
        {testMode && <TeleportList />}
      </div>
    </div>
  )
}
