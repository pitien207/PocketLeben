import type { SpotAction } from '../../components/ActionSpot'
import { SIGN_SANS, type Label } from './LabelSheet'
import type { ShapeItem } from './Shapes'

/**
 * 1.49 An MVV ticket machine (Fahrkartenautomat): blue hood with "Fahrkarten", a lit screen, buttons, coin slot and
 * ticket tray. Front = +z in local space; 0.76 × 1.8 × 0.46 m. Used on the U-Bahn platforms (scenes/UBahn) and at the
 * München bus stops (shared/BusStops.tsx). The spot runs `ticket.machine` → ui/TransitPanel.tsx TicketPanel.
 */
export const TICKET_MACHINE = { w: 0.76, h: 1.8, d: 0.46 }

const rot = (x: number, z: number, a: number): [number, number] => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)]

/** Shapes (+ the glowing screen for the glow mesh) of one machine at (x, z) turned by `rotY` (0 = facing +z). */
export function ticketMachineShapes(x: number, z: number, rotY: number): { s: ShapeItem[]; glow: ShapeItem[] } {
  const { w, h, d } = TICKET_MACHINE
  const s: ShapeItem[] = []
  const glow: ShapeItem[] = []
  const put = (lx: number, ly: number, lz: number) => {
    const [dx, dz] = rot(lx, lz, rotY)
    return [x + dx, ly, z + dz] as [number, number, number]
  }
  const r: [number, number, number] = [0, rotY, 0]
  s.push({ box: [w, h - 0.28, d], at: put(0, (h - 0.28) / 2, 0), rot: r, color: '#4a5768' })
  s.push({ box: [w - 0.08, h - 0.5, 0.03], at: put(0, (h - 0.28) / 2 + 0.05, d / 2 + 0.01), rot: r, color: '#dfe4ea' })
  // hood
  s.push({ box: [w + 0.06, 0.28, d + 0.08], at: put(0, h - 0.14, 0.02), rot: r, color: '#0065ae' })
  // screen frame + buttons + coin slot + ticket tray
  s.push({ box: [0.46, 0.34, 0.03], at: put(0, 1.22, d / 2 + 0.025), rot: r, color: '#20262e' })
  glow.push({ box: [0.4, 0.28, 0.02], at: put(0, 1.22, d / 2 + 0.04), rot: r, color: '#7fb7e8' })
  for (let i = 0; i < 4; i++) s.push({ box: [0.07, 0.05, 0.03], at: put(-0.15 + i * 0.1, 0.98, d / 2 + 0.03), rot: r, color: i === 3 ? '#2e9b57' : '#f2f2f2' })
  s.push({ box: [0.12, 0.03, 0.03], at: put(0.22, 0.86, d / 2 + 0.03), rot: r, color: '#1c1c1c' })
  s.push({ box: [0.3, 0.12, 0.06], at: put(0, 0.5, d / 2 + 0.03), rot: r, color: '#2a2f36' })
  s.push({ box: [w + 0.04, 0.06, d + 0.04], at: put(0, 0.03, 0), rot: r, color: '#3a4350' })
  return { s, glow }
}

function hoodDraw(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#0065ae'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${H * 0.62}px ${SIGN_SANS}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Fahrkarten', W / 2, H * 0.55)
}

function screenDraw(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#0d2a4a'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${H * 0.17}px ${SIGN_SANS}`
  ctx.fillText('MVV  Tickets', W * 0.07, H * 0.16)
  const rows: [string, string][] = [
    ['Einzelfahrt', '3,90 €'],
    ['Tageskarte', '9,70 €'],
    ['Wochenkarte', '21,90 €'],
    ['Monatskarte', '63,00 €'],
  ]
  ctx.font = `600 ${H * 0.13}px ${SIGN_SANS}`
  rows.forEach(([a, b], i) => {
    const y = H * (0.36 + i * 0.17)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(W * 0.05, y - H * 0.07, W * 0.9, H * 0.14)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.fillText(a, W * 0.08, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ffd166'
    ctx.fillText(b, W * 0.92, y)
  })
}

/** The hood text and the price list on the screen (both faces toward the front). */
export function ticketMachineLabels(x: number, z: number, rotY: number): Label[] {
  const { h, d } = TICKET_MACHINE
  const [hx, hz] = rot(0, d / 2 + 0.065, rotY)
  const [sx, sz] = rot(0, d / 2 + 0.052, rotY)
  return [
    { w: 0.74, h: 0.2, at: [x + hx, h - 0.14, z + hz], rotY, draw: hoodDraw },
    { w: 0.38, h: 0.26, at: [x + sx, 1.22, z + sz], rotY, draw: screenDraw },
  ]
}

/** Where to stand to use it, and its collider (half extents along x / z for any of the four turns used). */
export function ticketMachineZone(x: number, z: number, rotY: number) {
  const [fx, fz] = rot(0, 0.75, rotY)
  return { x: x + fx, z: z + fz, halfX: 0.5, halfZ: 0.4 }
}

export const TICKET_ACTIONS: SpotAction[] = [{ id: 'tickets', labelKey: 'action.tickets', icon: 'ticket', action: 'ticket.machine', primary: true }]
