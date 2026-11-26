import { ICON3D } from '../../../ui/Icon3d'
import { iconForText } from '../../../ui/placeIcons'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

/** Procedural canvas textures: no image downloads, crisp on any DPR. */

function newCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas not supported')
  return { canvas, ctx }
}

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Square paving tiles with soft grout lines, meant to be repeated. */
export function makeTileTexture(base: string, grout: string, repeatX: number, repeatY: number) {
  const size = 128
  const { canvas, ctx } = newCanvas(size, size)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = grout
  ctx.lineWidth = 6
  ctx.strokeRect(0, 0, size, size)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(size / 2, 0)
  ctx.lineTo(size / 2, size)
  ctx.moveTo(0, size / 2)
  ctx.lineTo(size, size / 2)
  ctx.stroke()
  const texture = toTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  return texture
}

/** Vertical stripes (used for the café awning). */
export function makeStripeTexture(colors: string[], stripes: number) {
  const { canvas, ctx } = newCanvas(stripes * 16, 16)
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = colors[i % colors.length]
    ctx.fillRect(i * 16, 0, 16, 16)
  }
  return toTexture(canvas)
}

export interface SignOptions {
  title: string
  subtitle?: string
  background: string
  border: string
  color: string
  accent: string
  /** Width/height ratio of the board (default 4). */
  aspect?: number
  /** 1.46: Fluent 3D picture at the left end (name in src/assets/icons3d); default = picked from the title, false = none. */
  icon?: string | false
}

export const SIGN_FONT_FAMILY = "'Baloo 2'"
const SIGN_FONT = "'Baloo 2', 'Nunito', ui-rounded, 'Segoe UI', system-ui, sans-serif"

/**
 * Draws a shop sign. Returns the texture plus a `redraw` to call once web fonts
 * finish loading (the first draw may use a fallback font).
 */
export function makeSignTexture(opts: SignOptions) {
  const { canvas, ctx } = newCanvas(Math.round(256 * (opts.aspect ?? 4)), 256)
  const texture = toTexture(canvas)
  const iconName = opts.icon === false || (opts.aspect ?? 4) < 2.6 ? null : (opts.icon ?? iconForText(opts.title))
  const iconSrc = iconName ? ICON3D[iconName] : undefined
  let icon: HTMLImageElement | null = null
  if (iconSrc && typeof Image !== 'undefined') {
    icon = new Image()
    icon.onload = () => redraw()
    icon.src = iconSrc
  }

  const redraw = () => {
    const { width: w, height: h } = canvas
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = opts.border
    ctx.beginPath()
    ctx.roundRect(0, 0, w, h, 56)
    ctx.fill()
    ctx.fillStyle = opts.background
    ctx.beginPath()
    ctx.roundRect(14, 14, w - 28, h - 28, 44)
    ctx.fill()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // Shrink each line until it fits inside the inner border (long names never spill out).
    const fit = (text: string, weight: number, size: number, maxW: number) => {
      let px = size
      ctx.font = `${weight} ${px}px ${SIGN_FONT}`
      while (px > 18 && ctx.measureText(text).width > maxW) {
        px -= 4
        ctx.font = `${weight} ${px}px ${SIGN_FONT}`
      }
      return px
    }
    // 1.46: a little picture of what the shop is at the left end (Fluent Emoji 3D, MIT), text centred in the rest
    const pic = icon && icon.complete && icon.naturalWidth > 0 ? icon : null
    const ip = pic ? h * 0.6 : 0
    if (pic) {
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.beginPath()
      ctx.arc(48 + ip / 2, h / 2, ip * 0.56, 0, Math.PI * 2)
      ctx.fill()
      ctx.drawImage(pic, 48, (h - ip) / 2, ip, ip)
    }
    const cx = pic ? (w + 48 + ip) / 2 : w / 2
    const inner = w - 110 - (pic ? ip + 20 : 0)
    ctx.fillStyle = opts.color
    const titlePx = fit(opts.title, 800, opts.subtitle ? 112 : 140, inner)
    ctx.fillText(opts.title, cx, opts.subtitle ? h * 0.42 + (112 - titlePx) * 0.15 : h * 0.53)
    if (opts.subtitle) {
      ctx.fillStyle = opts.accent
      fit(opts.subtitle, 700, 46, inner)
      ctx.fillText(opts.subtitle, cx, h * 0.76)
    }
    texture.needsUpdate = true
  }

  redraw()
  return { texture, redraw }
}
