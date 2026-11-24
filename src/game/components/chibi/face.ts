import { CanvasTexture, Color, SRGBColorSpace, type Texture } from 'three'
import type { EyeShape, FaceMark } from '../../../data/npcs'

/**
 * Painted anime face on the head sphere (ported from the user's chibi.js): gradient irises,
 * two highlights, a thick upper lid (+ lashes), soft blush, brows and a mouth per expression.
 * Sphere UVs: the face centre (+Z) is at u = 0.25, so it is drawn around x = W / 4.
 * Drawn in the original 1024×512 coordinates on a half-size canvas (phones: less memory).
 * 1.42 (user: "làm thêm nhiều … mặt"): eye shapes (round, sparkle, sleepy, cat, dot, smile) and face marks
 * (freckles, a beauty mark, a plaster, rosy blush lines, a star sticker) — Outfit.eyeShape / Outfit.faceMark.
 */

export type Expression = 'neutral' | 'happy' | 'happy-closed' | 'surprised' | 'sad'
export type { EyeShape, FaceMark } from '../../../data/npcs'

export interface FaceSpec {
  skin: string
  eyes: string
  expression: Expression
  lashes: boolean
  blush: boolean
  browColor: string
  /** 1.42 */
  eyeShape?: EyeShape
  mark?: FaceMark
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
  const key = `${f.skin}|${f.eyes}|${f.expression}|${f.lashes}|${f.blush}|${f.browColor}|${f.eyeShape ?? ''}|${f.mark ?? ''}|${blink}`
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

/** A four-point twinkle (filled with the current fillStyle). */
function star4(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * 0.3 : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
}

/** 1.42 a mark on the cheeks. */
function drawMark(ctx: CanvasRenderingContext2D, mark: FaceMark, cx: number, ey: number) {
  if (!mark) return
  ctx.save()
  switch (mark) {
    case 'freckles':
      ctx.fillStyle = 'rgba(150,90,60,0.7)'
      for (const s of [-1, 1])
        for (const [ox, oy] of [[96, 34], [114, 26], [128, 40], [108, 48], [140, 30], [122, 56]]) {
          ctx.beginPath()
          ctx.arc(cx + s * ox, ey + oy, 3.6, 0, Math.PI * 2)
          ctx.fill()
        }
      break
    case 'mole':
      ctx.fillStyle = '#4a2e26'
      ctx.beginPath()
      ctx.arc(cx + 58, ey + 70, 4.5, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'bandaid':
      ctx.translate(cx - 122, ey + 44)
      ctx.rotate(-0.45)
      ctx.fillStyle = '#f2c79a'
      ctx.beginPath()
      ctx.roundRect(-34, -11, 68, 22, 11)
      ctx.fill()
      ctx.fillStyle = '#e8a87c'
      ctx.fillRect(-11, -11, 22, 22)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      for (const [px, py] of [[-5, -4], [4, -4], [-5, 5], [4, 5]]) ctx.fillRect(px, py, 2.5, 2.5)
      break
    case 'rosy':
      ctx.filter = 'blur(5px)'
      ctx.fillStyle = 'rgba(255,110,130,0.7)'
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(cx + s * 118, ey + 44, 40, 20, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.filter = 'none'
      ctx.strokeStyle = 'rgba(220,70,90,0.8)'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const x = cx + s * (100 + i * 14)
          ctx.beginPath()
          ctx.moveTo(x + 6, ey + 34)
          ctx.lineTo(x - 6, ey + 52)
          ctx.stroke()
        }
      break
    case 'star':
      ctx.fillStyle = '#ffd23f'
      ctx.strokeStyle = '#e8a32a'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2
        const rr = i % 2 ? 9 : 22
        ctx.lineTo(cx + 132 + Math.cos(a) * rr, ey + 36 + Math.sin(a) * rr)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
  }
  ctx.restore()
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

  drawMark(ctx, f.mark ?? null, cx, ey)
  const shape = f.eyeShape ?? 'round'

  for (const s of [-1, 1]) {
    const x = cx + s * dx
    if (blink || f.expression === 'happy-closed' || shape === 'smile') {
      // closed eyes ^ ^
      ctx.strokeStyle = line
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(x, ey + 14, 26, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
    } else if (shape === 'dot') {
      // simple shiny bead eyes
      ctx.fillStyle = '#1d1418'
      ctx.beginPath()
      ctx.ellipse(x, ey + 4, 16, f.expression === 'surprised' ? 26 : 23, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x - 5, ey - 6, 5.5, 0, Math.PI * 2)
      ctx.fill()
      if (f.lashes) {
        ctx.strokeStyle = line
        ctx.lineWidth = 5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x + s * 14, ey - 14)
        ctx.lineTo(x + s * 26, ey - 24)
        ctx.stroke()
      }
    } else {
      const ry = (f.expression === 'surprised' ? 44 : 41) + (shape === 'sparkle' ? 4 : 0)
      const g = ctx.createLinearGradient(x, ey - ry, x, ey + ry)
      g.addColorStop(0, '#1d1418')
      g.addColorStop(0.45, f.eyes)
      g.addColorStop(1, lightness(f.eyes, 0.45))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(x, ey, shape === 'sparkle' ? 32 : 29, ry, shape === 'cat' ? s * 0.12 : 0, 0, Math.PI * 2)
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
      if (shape === 'sparkle') {
        // a four-point star and a sprinkle of dots
        star4(ctx, x + 10, ey - 18, 12)
        for (const [ox, oy, r] of [[-14, 18, 3.5], [16, -2, 2.5], [-2, 26, 2]] as const) {
          ctx.beginPath()
          ctx.arc(x + ox, ey + oy, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (shape === 'sleepy') {
        // the upper half under a heavy lid
        ctx.fillStyle = f.skin
        ctx.beginPath()
        ctx.ellipse(x, ey - 36, 40, 30, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      // thick upper lid
      ctx.strokeStyle = line
      ctx.lineCap = 'round'
      ctx.lineWidth = f.lashes ? 10 : 7
      ctx.beginPath()
      if (shape === 'sleepy') {
        ctx.moveTo(x - 32, ey + 2)
        ctx.quadraticCurveTo(x, ey - 12, x + 32, ey + 2)
      } else if (shape === 'cat') {
        // the lid rises to a flick at the outer corner
        ctx.moveTo(x - s * 30, ey - 8)
        ctx.quadraticCurveTo(x - s * 4, ey - ry - 8, x + s * 30, ey - 30)
        ctx.lineTo(x + s * 44, ey - 40)
      } else ctx.ellipse(x, ey + 2, shape === 'sparkle' ? 36 : 33, ry + 3, 0, Math.PI * 1.13, Math.PI * 1.87)
      ctx.stroke()
      if (f.lashes && shape !== 'cat') {
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
