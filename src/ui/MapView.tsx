import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { SCENES } from '../game/scenes/registry'
import { MAP_ROAD, MAP_ROAD_LINE, SCENE_MAPS, type MapLabel, type MapRect, type SceneMap } from '../game/scenes/maps'
import { localSnapshot } from '../game/systems/netState'
import { playerState, teleportPlayer } from '../game/systems/playerState'
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
import { useWorld, type SceneId } from '../store/worldStore'
import { CloseIcon, PinIcon, StarIcon, TargetIcon } from './icons'
import { iconImage, placeIconName } from './placeIcons'
import { useTestMode } from '../game/systems/testMode'

/**
 * The map (M key / map button): a big live top-down view of the CITY you are in (1.43 user: only cities have a map —
 * rooms, the plane and the transit airport have none): streets and their names, buildings, places you can use,
 * your friends (no NPCs, no other players), the guide's target (star) and you (arrow). Drag to move, pinch / wheel /
 * +− to zoom. Names never overlap: they are placed by priority and skipped where there is no room.
 * Drawn on a canvas, outside React's render loop.
 */

/** This scene has a city map (only the streets of Hà Nội and München). */
export function hasCityMap(scene: SceneId): boolean {
  return !!SCENE_MAPS[scene]
}

interface View {
  zoom: number
  /** World point at the centre of the canvas (null = centre of the map). */
  cx: number | null
  cz: number | null
  /** 1.43 set the zoom on the next frame so that about this many metres fit across the shorter side. */
  span?: number
}

/** How many metres the map shows across the shorter side when it opens / when you tap ◎. */
const START_SPAN = 70

function guideTarget(): { x: number; z: number; id?: string } | null {
  const point = useGuide.getState().guide?.point
  if (!point) return null
  if (point.kind === 'at') return { x: point.at[0], z: point.at[2] }
  if (point.kind === 'npc') return npcPositions.get(point.id) ?? null
  const def = useInteraction.getState().items[point.id]
  return def ? { x: def.zone.x, z: def.zone.z, id: def.id } : null
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
  if (view.span && w > 0 && h > 0) {
    view.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(w, h) / view.span / fit))
    view.span = undefined
  }
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

const INK = '#4a3a33'
const FONT = "Nunito, 'Be Vietnam Pro', system-ui, sans-serif"

/** Screen boxes already taken by a name (or a marker that must stay visible). */
class Placer {
  private boxes: { x0: number; y0: number; x1: number; y1: number }[] = []
  private w: number
  private h: number
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
  }
  /** Take the box if it is on screen and free. */
  take(x0: number, y0: number, x1: number, y1: number, pad = 2): boolean {
    // whole names only: nothing cut by the frame
    if (x0 < 2 || y0 < 2 || x1 > this.w - 2 || y1 > this.h - 2) return false
    for (const b of this.boxes) if (x0 - pad < b.x1 && x1 + pad > b.x0 && y0 - pad < b.y1 && y1 + pad > b.y0) return false
    this.boxes.push({ x0, y0, x1, y1 })
    return true
  }
  /** A screen area covered by HTML (zoom buttons, legend): no names there. */
  block(x0: number, y0: number, x1: number, y1: number) {
    this.boxes.push({ x0, y0, x1, y1 })
  }
  reserve(x: number, y: number, r: number) {
    this.boxes.push({ x0: x - r, y0: y - r, x1: x + r, y1: y + r })
  }
}

function haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, halo: string, width = 3.5) {
  ctx.lineJoin = 'round'
  ctx.lineWidth = width
  ctx.strokeStyle = halo
  ctx.fillStyle = color
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
}

/** A rounded name tag (places, friends). */
function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tw: number, bg: string, fg: string) {
  const ph = 17
  const pw = tw + 12
  ctx.fillStyle = 'rgba(74,58,51,0.18)'
  ctx.beginPath()
  ctx.roundRect(x - pw / 2 + 1, y - ph / 2 + 2, pw, ph, 8.5)
  ctx.fill()
  ctx.fillStyle = bg
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 8.5)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = fg
  ctx.fillText(text, x, y + 0.5)
}

const short = (t: string, n = 24) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t)

/** A colour a bit darker (k < 1) for rims and outlines. */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1, 7), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`
}

function draw(canvas: HTMLCanvasElement, view: View, time: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const scene = useWorld.getState().scene
  const map = SCENE_MAPS[scene]
  if (!map) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
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
  const clipX = (x: number) => Math.min(X(b.maxX), Math.max(X(b.minX), x))
  const clipZ = (z: number) => Math.min(Z(b.maxZ), Math.max(Z(b.minZ), z))

  // Paper outside the city, the city ground with soft corners
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#d6c8ab'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = map.ground
  ctx.beginPath()
  ctx.roundRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale, 10)
  ctx.fill()
  // Faint 10 m grid: helps judge distances.
  ctx.strokeStyle = 'rgba(74,58,51,0.045)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = Math.ceil(b.minX / 10) * 10; x <= b.maxX; x += 10) {
    ctx.moveTo(X(x), Z(b.minZ))
    ctx.lineTo(X(x), Z(b.maxZ))
  }
  for (let z = Math.ceil(b.minZ / 10) * 10; z <= b.maxZ; z += 10) {
    ctx.moveTo(X(b.minX), Z(z))
    ctx.lineTo(X(b.maxX), Z(z))
  }
  ctx.stroke()

  const box = (r: MapRect) => {
    const x0 = clipX(X(r.x0))
    const x1 = clipX(X(r.x1))
    const z0 = clipZ(Z(r.z0))
    const z1 = clipZ(Z(r.z1))
    return x1 - x0 < 0.5 || z1 - z0 < 0.5 ? null : { x0, z0, x1, z1 }
  }
  // 1) parks and water: soft blobs with a darker rim
  for (const r of map.rects) {
    if (!r.soft) continue
    const q = box(r)
    if (!q) continue
    ctx.fillStyle = r.color
    ctx.strokeStyle = shade(r.color, 0.82)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0, Math.min(18, (q.z1 - q.z0) / 2, (q.x1 - q.x0) / 2))
    ctx.fill()
    ctx.stroke()
  }
  for (const c of map.circles ?? []) {
    ctx.fillStyle = c.color
    ctx.strokeStyle = shade(c.color, 0.82)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(X(c.x), Z(c.z), c.r * scale, 0, Math.PI * 2)
    ctx.fill()
    if (c.r * scale > 6) ctx.stroke()
  }
  // 2) roads (with white kerbs) and their dashed centre lines
  for (const r of map.rects) {
    if (r.color !== MAP_ROAD) continue
    const q = box(r)
    if (!q) continue
    ctx.fillStyle = '#a9b0bd'
    ctx.fillRect(q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0)
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0)
  }
  ctx.strokeStyle = '#fffaf0'
  ctx.lineWidth = Math.max(1, 0.18 * scale)
  ctx.setLineDash([Math.max(4, 1.6 * scale), Math.max(4, 1.4 * scale)])
  for (const r of map.rects) {
    if (r.color !== MAP_ROAD_LINE) continue
    const q = box(r)
    if (!q) continue
    ctx.beginPath()
    if (q.x1 - q.x0 >= q.z1 - q.z0) {
      ctx.moveTo(q.x0, (q.z0 + q.z1) / 2)
      ctx.lineTo(q.x1, (q.z0 + q.z1) / 2)
    } else {
      ctx.moveTo((q.x0 + q.x1) / 2, q.z0)
      ctx.lineTo((q.x0 + q.x1) / 2, q.z1)
    }
    ctx.stroke()
  }
  ctx.setLineDash([])
  // 3) buildings: a soft drop shadow, the block, a darker outline
  for (const r of map.rects) {
    if (r.soft || r.color === MAP_ROAD || r.color === MAP_ROAD_LINE) continue
    const q = box(r)
    if (!q) continue
    const rad = Math.min(3, (q.x1 - q.x0) / 3, (q.z1 - q.z0) / 3)
    ctx.fillStyle = 'rgba(74,58,51,0.16)'
    ctx.beginPath()
    ctx.roundRect(q.x0 + 1.5, q.z0 + 2.5, q.x1 - q.x0, q.z1 - q.z0, rad)
    ctx.fill()
    ctx.fillStyle = r.color
    ctx.strokeStyle = shade(r.color, 0.7)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0, rad)
    ctx.fill()
    ctx.stroke()
  }

  const placer = new Placer(w, h)
  placer.block(w - 58, 0, w, 160)
  placer.block(0, h - 36, Math.min(w, 290), h)
  placer.block(w - 110, h - 40, w, h)
  const px = X(playerState.position.x)
  const pz = Z(playerState.position.z)
  const target = guideTarget()
  // You and the goal always stay readable: no name may cover them.
  placer.reserve(px, pz, 13)
  if (target) placer.reserve(X(target.x), Z(target.z), 11)

  // 4) places you can use: small pins (no NPCs — user 1.43)
  const items = Object.values(useInteraction.getState().items).filter((d) => !d.id.startsWith('resident:') && !d.id.startsWith('npc:'))
  const pins: { x: number; z: number; name: string; goal: boolean }[] = []
  for (const d of items) {
    const x = X(d.zone.x)
    const z = Z(d.zone.z)
    if (x < -20 || x > w + 20 || z < -20 || z > h + 20) continue
    const name = d.nameKey ? translate(lang, d.nameKey) : d.name ? localize(d.name, lang) : ''
    pins.push({ x, z, name, goal: !!target?.id && target.id === d.id })
    // 1.46: a round badge with the Fluent 3D picture of what the place is (placeIcons.ts); small dots while far out
    const img = scale >= 1.4 ? iconImage(placeIconName(d, name)) : null
    const r = img ? Math.min(12, 7 + scale * 0.9) : 4.6
    ctx.fillStyle = 'rgba(74,58,51,0.25)'
    ctx.beginPath()
    ctx.arc(x, z + 1.6, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fffaf0'
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(x, z, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (img) {
      const k = r * 1.5
      ctx.drawImage(img, x - k / 2, z - k / 2, k, k)
    } else {
      ctx.fillStyle = '#f4b73e'
      ctx.beginPath()
      ctx.arc(x, z, 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 5) friends only (user 1.43: no strangers on the map)
  const friendKeys = new Set(useSocial.getState().friends.map((f) => f.key))
  const friends = [...remotes.values()].filter((r) => friendKeys.has(r.name.trim().toLowerCase()))
  for (const r of friends) {
    const x = X(r.x)
    const z = Z(r.z)
    ctx.fillStyle = '#3fae72'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, z, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    placer.reserve(x, z, 6)
  }

  // 6) the guide's target: a pulsing star; 7) you: an arrow pointing where you face
  if (target) star(ctx, X(target.x), Z(target.z), 10 * (1 + Math.sin(time / 180) * 0.18))
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

  // 8) names, most important first; whatever has no room is left out (never two names on top of each other)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const rank = (l: MapLabel) => (l.kind === 'street' ? 0 : l.kind === 'water' ? 1 : l.minZoom ? 3 : 2)
  const sorted = [...(map.labels ?? [])].sort((a, c) => rank(a) - rank(c))
  const shown = new Set<string>()
  const tag = (name: string, x: number, y: number, bg: string, fg: string): boolean => {
    const text = short(name)
    const tw = ctx.measureText(text).width
    if (!placer.take(x - tw / 2 - 6, y - 9, x + tw / 2 + 6, y + 9)) return false
    pill(ctx, text, x, y, tw, bg, fg)
    return true
  }
  // the goal's name first
  const goalPin = pins.find((p) => p.goal)
  ctx.font = `900 11px ${FONT}`
  if (goalPin?.name && tag(goalPin.name, goalPin.x, goalPin.z - 19, '#ffd84d', INK)) shown.add(goalPin.name.toLowerCase())
  for (const l of sorted) {
    if (l.minZoom && view.zoom < l.minZoom) continue
    const text = localize(l.text, lang)
    const fontSize = l.kind === 'area' ? 11.5 : 13
    ctx.font = `${l.kind === 'water' ? 'italic ' : ''}900 ${fontSize}px ${FONT}`
    const shownText = l.kind === 'area' ? text : text.toUpperCase()
    const tw = ctx.measureText(shownText).width + (l.kind === 'street' ? shownText.length * 0.8 : 0)
    const x = X(l.x)
    const y = Z(l.z)
    const hw = (l.vertical ? fontSize : tw) / 2 + 2
    const hh = (l.vertical ? tw : fontSize) / 2 + 2
    if (!placer.take(x - hw, y - hh, x + hw, y + hh)) continue
    shown.add(text.toLowerCase())
    ctx.save()
    ctx.translate(x, y)
    if (l.vertical) ctx.rotate(-Math.PI / 2)
    if (l.kind === 'street') {
      ctx.letterSpacing = '0.8px'
      haloText(ctx, shownText, 0, 0, '#ffffff', 'rgba(74,58,51,0.7)', 3.2)
    } else if (l.kind === 'water') haloText(ctx, shownText, 0, 0, '#245f7c', 'rgba(235,248,250,0.85)')
    else haloText(ctx, shownText, 0, 0, '#7a4a2a', 'rgba(255,250,240,0.92)')
    ctx.restore()
  }
  // place names as tags above their pins, once the map is close enough (each name once)
  ctx.font = `800 11px ${FONT}`
  if (scale >= 2.5) {
    for (const p of pins) {
      if (!p.name || p.goal) continue
      const key = p.name.toLowerCase()
      if (shown.has(key)) continue
      if (tag(p.name, p.x, p.z - 20, '#fff8ea', INK)) shown.add(key)
    }
  }
  for (const r of friends) tag(r.name, X(r.x), Z(r.z) - 14, '#d9f2e3', '#2b7a50')

  // 9) scale bar (bottom right)
  const metres = [5, 10, 20, 50, 100].find((m) => m * scale >= 50) ?? 100
  const len = metres * scale
  const bx = w - 14 - len
  const by = h - 14
  ctx.fillStyle = 'rgba(255,248,234,0.9)'
  ctx.beginPath()
  ctx.roundRect(bx - 8, by - 18, len + 16, 26, 8)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(bx, by - 4)
  ctx.lineTo(bx, by)
  ctx.lineTo(bx + len, by)
  ctx.lineTo(bx + len, by - 4)
  ctx.stroke()
  ctx.font = `900 10px ${FONT}`
  ctx.fillStyle = INK
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`${metres} m`, bx + len / 2, by - 6)
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
      const map = SCENE_MAPS[useWorld.getState().scene]
      if (!map) return
      const tr = layout(el, map, v)
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
  const items = useInteraction((s) => s.items)
  const places = Object.values(items).filter((d) => !d.id.startsWith('resident:'))
  const btn = 'rounded-lg border-2 border-outline bg-cream px-2 py-1 text-[11px] font-black text-ink active:translate-y-0.5'
  // 1.43 folded by default (it hid most of the map on a phone); scene travel moved to the test tools
  return (
    <details className="rounded-2xl border-2 border-dashed border-gold bg-gold-light/50 px-2 py-1" data-testid="teleport">
      <summary className="cursor-pointer text-[11px] font-black text-lacquer">{t('map.teleportHint')}</summary>
      <div className="mt-1 flex max-h-[22dvh] flex-wrap gap-1 ui-scroll overflow-y-auto pb-1">
        {places.map((d) => (
          <button key={d.id} type="button" className={btn} onClick={() => teleportPlayer(d.zone.x, d.zone.z + Math.min(d.zone.halfZ, 1) * 0.6)}>
            {d.nameKey ? translate(lang, d.nameKey) : d.name ? localize(d.name) : d.id}
          </button>
        ))}
      </div>
    </details>
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
      if (!hasCityMap(useWorld.getState().scene)) return
      ui.openPanel({ type: 'map' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** The big map: fills the screen, live, with names, friends and your goal (cities only). */
export function MapPanel() {
  useMapKey()
  const t = useT()
  const localize = useLocalize()
  const open = useUI((s) => s.panel?.type === 'map')
  const closePanel = useUI((s) => s.closePanel)
  const scene = useWorld((s) => s.scene)
  const guide = useGuide((s) => s.guide)
  const testMode = useTestMode()
  const view = useRef<View>({ zoom: 1, cx: null, cz: null })
  const [, setTick] = useState(0)
  const cityMap = hasCityMap(scene)

  // Walked (or travelled) out of the city with the map open: close it.
  useEffect(() => {
    if (open && !cityMap) closePanel()
  }, [open, cityMap, closePanel])

  // Each time it opens: centred on you, about START_SPAN metres across (the same in a big and a small city).
  useEffect(() => {
    if (!open) return
    view.current = { zoom: 1, cx: playerState.position.x, cz: playerState.position.z, span: START_SPAN }
    setTick((n) => n + 1)
    const onKey = (e: KeyboardEvent) => e.code === 'Escape' && closePanel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePanel])

  if (!open || !cityMap) return null
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
          <p className="flex min-w-0 items-center gap-1 text-[13px] font-black text-ink/70">
            <PinIcon className="shrink-0" />
            <span className="truncate">{localize(SCENES[scene].name)}</span>
          </p>
          <span className="ml-auto hidden rounded-md border-2 border-outline/40 px-1.5 text-[11px] font-black text-ink/50 sm:inline">M</span>
        </div>
        <button
          type="button"
          aria-label={t('settings.close')}
          onClick={closePanel}
          className="btn-paper absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full text-lg"
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
                view.current.span = START_SPAN
              }}
            >
              ◎
            </MapButton>
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-x-2.5 gap-y-1 rounded-xl bg-paper/90 px-2.5 py-1 text-[11px] font-black text-ink/75">
            <span>
              <span className="text-lacquer">▲</span> {t('map.you')}
            </span>
            <span className="inline-flex items-center gap-1">
              <StarIcon className="text-[#e0b400]" /> {t('map.goal')}
            </span>
            <span>
              <span className="text-gold">●</span> {t('map.place')}
            </span>
            <span>
              <span className="text-[#3fae72]">●</span> {t('map.friend')}
            </span>
          </div>
        </div>

        {guide && (
          <div className="rounded-2xl bg-white/80 px-3 py-2 text-[13px] font-bold shadow-[inset_0_0_0_2px_#f1dcb6] short:py-1 short:text-[12px]">
            <div className="flex items-center gap-1.5 font-black">
              <TargetIcon className="shrink-0 text-lacquer" />
              <span>{localize(guide.stepText)}</span>
            </div>
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
