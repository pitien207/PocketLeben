import { useEffect, useRef } from 'react'
import { SCENES } from '../game/scenes/registry'
import { SCENE_MAPS, type SceneMap } from '../game/scenes/maps'
import { localSnapshot } from '../game/systems/netState'
import { playerState, teleportPlayer } from '../game/systems/playerState'
import { travelTo } from '../game/systems/travel'
import { useSettings } from '../store/settingsStore'
import { npcPositions } from '../game/systems/registry'
import { translate, useT } from '../i18n'
import { currentLanguage, localize, useLocalize } from '../i18n/localized'
import { useGuide } from '../store/guideStore'
import { useInteraction } from '../store/interactionStore'
import { useUI } from '../store/uiStore'
import { useWorld } from '../store/worldStore'
import { Sheet } from './Sheet'

/**
 * The map: a live top-down view of the current scene — streets, buildings, every place you
 * can interact with, the guide's target (⭐) and you (arrow). Small in the corner on wide
 * screens, full-size from the 🗺️ button. Drawn on a canvas, outside React's render loop.
 */

interface Bounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
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

const transforms = new WeakMap<HTMLCanvasElement, { minX: number; minZ: number; scale: number; ox: number; oz: number }>()

function draw(canvas: HTMLCanvasElement, labels: boolean, time: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const scene = useWorld.getState().scene
  const map = SCENE_MAPS[scene] ?? roomMap()
  const b: Bounds = map.bounds
  const scale = Math.min(w / (b.maxX - b.minX), h / (b.maxZ - b.minZ))
  const ox = (w - (b.maxX - b.minX) * scale) / 2
  const oz = (h - (b.maxZ - b.minZ) * scale) / 2
  // Remember the transform so a tap can be turned back into world coordinates.
  transforms.set(canvas, { minX: b.minX, minZ: b.minZ, scale, ox, oz })
  const X = (x: number) => ox + (x - b.minX) * scale
  const Z = (z: number) => oz + (z - b.minZ) * scale

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = map.ground
  ctx.fillRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale)
  for (const r of map.rects) {
    const x0 = Math.max(X(r.x0), X(b.minX))
    const x1 = Math.min(X(r.x1), X(b.maxX))
    const z0 = Math.max(Z(r.z0), Z(b.minZ))
    const z1 = Math.min(Z(r.z1), Z(b.maxZ))
    if (x1 <= x0 || z1 <= z0) continue
    ctx.fillStyle = r.color
    ctx.beginPath()
    ctx.roundRect(x0, z0, x1 - x0, z1 - z0, r.soft ? Math.min(8, (z1 - z0) / 2) : 1.5)
    ctx.fill()
  }
  for (const c of map.circles ?? []) {
    ctx.fillStyle = c.color
    ctx.beginPath()
    ctx.arc(X(c.x), Z(c.z), c.r * scale, 0, Math.PI * 2)
    ctx.fill()
  }

  // Places you can interact with (doors, counters, people)
  const lang = currentLanguage()
  const items = Object.values(useInteraction.getState().items)
  const fontPx = labels ? 11 : 0
  if (labels) ctx.font = `800 ${fontPx}px Nunito, system-ui, sans-serif`
  for (const d of items) {
    const isNpc = d.id.startsWith('npc:')
    const isResident = d.id.startsWith('resident:')
    if (isResident) continue
    const x = X(d.zone.x)
    const z = Z(d.zone.z)
    ctx.fillStyle = isNpc ? '#ff7f9f' : '#f4c04e'
    ctx.strokeStyle = '#4a3a33'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(x, z, isNpc ? 2.6 : 3.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (labels && !isNpc) {
      const name = d.nameKey ? translate(lang, d.nameKey) : d.name ? localize(d.name, lang) : ''
      if (!name) continue
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,250,240,0.95)'
      ctx.fillStyle = '#4a3a33'
      ctx.textAlign = 'center'
      ctx.strokeText(name, x, z - 6)
      ctx.fillText(name, x, z - 6)
    }
  }

  // The guide's target: a pulsing star
  const target = guideTarget()
  if (target) {
    const pulse = 1 + Math.sin(time / 180) * 0.18
    star(ctx, X(target.x), Z(target.z), (labels ? 9 : 6) * pulse)
  }

  // You: an arrow pointing where you face
  const px = X(playerState.position.x)
  const pz = Z(playerState.position.z)
  const yaw = localSnapshot.yaw
  const size = labels ? 9 : 6.5
  ctx.save()
  ctx.translate(px, pz)
  ctx.rotate(-yaw + Math.PI)
  ctx.fillStyle = '#c8322b'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
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
  ctx.lineWidth = 1.6
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

/** A canvas that redraws ~12 times a second. */
function MapCanvas({ labels, className, onPick }: { labels: boolean; className: string; onPick?: (x: number, z: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0
    let last = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 80 || !ref.current) return
      last = t
      draw(ref.current, labels, t)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [labels])
  return (
    <canvas
      ref={ref}
      className={className}
      onClick={(e) => {
        const tr = ref.current && transforms.get(ref.current)
        if (!onPick || !tr) return
        const rect = e.currentTarget.getBoundingClientRect()
        onPick(tr.minX + (e.clientX - rect.left - tr.ox) / tr.scale, tr.minZ + (e.clientY - rect.top - tr.oz) / tr.scale)
      }}
    />
  )
}

/** Corner minimap (wide screens only); tap to open the big map. */
export function MiniMap() {
  const t = useT()
  const openPanel = useUI((s) => s.openPanel)
  const scene = useWorld((s) => s.scene)
  if (!SCENE_MAPS[scene]) return null
  return (
    <button
      type="button"
      aria-label={t('map.title')}
      onClick={() => openPanel({ type: 'map' })}
      className="hud-chip pointer-events-auto hidden overflow-hidden p-1 sm:block"
      data-testid="minimap"
    >
      <MapCanvas labels={false} className="block h-[92px] w-[150px] rounded-xl" />
    </button>
  )
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
    <div className="mt-2 rounded-2xl border-2 border-dashed border-gold bg-gold-light/50 p-2" data-testid="teleport">
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

/** The big map sheet: live map with labels + where the current goal is. */
export function MapPanel() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const scene = useWorld((s) => s.scene)
  const guide = useGuide((s) => s.guide)
  const testMode = useSettings((s) => s.testMode)
  if (panel?.type !== 'map') return null
  return (
    <Sheet title={t('map.title')} onClose={closePanel}>
      <p className="mb-2 text-center text-[13px] font-black text-ink/70">📍 {localize(SCENES[scene].name)}</p>
      <MapCanvas
        labels
        onPick={testMode ? (x, z) => teleportPlayer(x, z) : undefined}
        className={`block aspect-[16/10] w-full rounded-2xl border-[2.5px] border-outline ${testMode ? 'cursor-crosshair' : ''}`}
      />
      {testMode && <TeleportList />}
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-black text-ink/70">
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
      </div>
      {guide && (
        <div className="mt-3 rounded-2xl bg-white/80 p-2.5 text-[13px] font-bold shadow-[inset_0_0_0_2px_#f1dcb6]">
          <div className="font-black">🎯 {localize(guide.stepText)}</div>
          {guide.destination && guide.destination !== scene && (
            <div className="mt-1 text-ink/70">
              {t('map.goalIn', { place: localize(SCENES[guide.destination].name) })}
              {guide.via ? ` → ${localize(guide.via)}` : ''}
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
