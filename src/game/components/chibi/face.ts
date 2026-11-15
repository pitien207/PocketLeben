import { CanvasTexture, Color, SRGBColorSpace, type Texture } from 'three'

/**
 * Painted anime face on the head sphere (ported from the user's chibi.js): gradient irises,
 * two highlights, a thick upper lid (+ lashes), soft blush, brows and a mouth per expression.
 * Sphere UVs: the face centre (+Z) is at u = 0.25, so it is drawn around x = W / 4.
 * Drawn in the original 1024×512 coordinates on a half-size canvas (phones: less memory).
 */

export type Expression = 'neutral' | 'happy' | 'happy-closed' | 'surprised' | 'sad'

export interface FaceSpec {
  skin: string
  eyes: string
  expression: Expression
  lashes: boolean
  blush: boolean
  browColor: string
}

const _c = new Color()
/** Change the lightness of a colour (HSL), like the original's shade(). */
export function lightness(hex: string, amt: number) {
  const hsl = { h: 0, s: 0, l: 0 }
  _c.set(hex).getHSL(hsl)
  _c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)))
  return `#${_c.getHexString()}`
}

const cache = new Map<string, Texture>()

export function faceTexture(f: FaceSpec, blink: boolean): Texture {
  const key = `${f.skin}|${f.eyes}|${f.expression}|${f.lashes}|${f.blush}|${f.browColor}|${blink}`
  let t = cache.get(key)
  if (t) return t
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.scale(0.5, 0.5)
  draw(ctx, f, blink)
  t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  cache.set(key, t)
  return t
}

function draw(ctx: CanvasRenderingContext2D, f: FaceSpec, blink: boolean) {
  const W = 1024
  const H = 512
  ctx.fillStyle = f.skin
  ctx.fillRect(0, 0, W, H)
  const cx = W / 4
  const ey = 272
  const dx = 76
  const line = '#3a2626'

  if (f.blush) {
    ctx.save()
    ctx.filter = 'blur(7px)'
    ctx.fillStyle = 'rgba(255,128,138,0.55)'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(cx + s * 122, ey + 46, 34, 17, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  for (const s of [-1, 1]) {
    const x = cx + s * dx
    if (blink || f.expression === 'happy-closed') {
      // closed eyes ^ ^
      ctx.strokeStyle = line
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(x, ey + 14, 26, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
    } else {
      const ry = f.expression === 'surprised' ? 44 : 41
      const g = ctx.createLinearGradient(x, ey - ry, x, ey + ry)
      g.addColorStop(0, '#1d1418')
      g.addColorStop(0.45, f.eyes)
      g.addColorStop(1, lightness(f.eyes, 0.45))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(x, ey, 29, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      // pupil
      ctx.fillStyle = 'rgba(20,12,16,0.85)'
      ctx.beginPath()
      ctx.ellipse(x, ey + 2, 13, 20, 0, 0, Math.PI * 2)
      ctx.fill()
      // highlights
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(x - 9, ey - 16, 11, 13, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + 11, ey + 16, 5.5, 0, Math.PI * 2)
      ctx.fill()
      // thick upper lid
      ctx.strokeStyle = line
      ctx.lineCap = 'round'
      ctx.lineWidth = f.lashes ? 10 : 7
      ctx.beginPath()
      ctx.ellipse(x, ey + 2, 33, ry + 3, 0, Math.PI * 1.13, Math.PI * 1.87)
      ctx.stroke()
      if (f.lashes) {
        ctx.lineWidth = 6
        ctx.beginPath()
        const ox = x + s * 30
        const oy = ey - 18
        ctx.moveTo(ox, oy)
        ctx.quadraticCurveTo(ox + s * 12, oy - 4, ox + s * 16, oy - 14)
        ctx.stroke()
      }
    }
    // brows
    ctx.strokeStyle = f.browColor
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    const by = ey - 66 - (f.expression === 'surprised' ? 8 : 0)
    ctx.moveTo(x - s * 18, by + 3)
    ctx.quadraticCurveTo(x + s * 4, by - 5, x + s * 22, by + 1)
    ctx.stroke()
  }

  // mouth
  const my = ey + 58
  ctx.strokeStyle = line
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  switch (f.expression) {
    case 'happy':
    case 'happy-closed':
      ctx.fillStyle = '#8a2e36'
      ctx.beginPath()
      ctx.moveTo(cx - 15, my - 4)
      ctx.quadraticCurveTo(cx, my + 24, cx + 15, my - 4)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#f08b93'
      ctx.beginPath()
      ctx.ellipse(cx, my + 8, 7, 4.5, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'surprised':
      ctx.fillStyle = '#8a2e36'
      ctx.beginPath()
      ctx.ellipse(cx, my + 4, 8, 11, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'sad':
      ctx.beginPath()
      ctx.arc(cx, my + 14, 12, Math.PI * 1.2, Math.PI * 1.8)
      ctx.stroke()
      break
    default: // neutral — a small "w"
      ctx.beginPath()
      ctx.moveTo(cx - 13, my)
      ctx.quadraticCurveTo(cx - 6.5, my + 9, cx, my + 1)
      ctx.quadraticCurveTo(cx + 6.5, my + 9, cx + 13, my)
      ctx.stroke()
  }
  void H
}
