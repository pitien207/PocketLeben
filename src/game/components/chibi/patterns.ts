import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import type { Outfit } from '../../../data/npcs'

/**
 * Fabric prints ("sprites" for clothes, 1.23): every SVG in src/assets/patterns is a tileable print,
 * its file name the id (see the README there). `currentColor` becomes the item's pattern colour.
 * The 3D characters sample it in the body shader (chibi/materials.ts makePrintMaterial) wherever
 * the vertex colour equals the shirt (or shorts) colour; the 2D portraits use it as an SVG fill.
 */

const RAW = import.meta.glob('../../../assets/patterns/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

interface Pattern {
  svg: string
  /** Metres one tile covers on a character. */
  size: number
}

export const PATTERNS: Record<string, Pattern> = {}
for (const [path, svg] of Object.entries(RAW)) {
  const id = path.split('/').pop()!.replace(/\.svg$/, '')
  const m = /data-size="([\d.]+)"/.exec(svg)
  PATTERNS[id] = { svg, size: m ? Number(m[1]) : 0.14 }
}

/** A print from a file (not the older geometry prints 'stripes' / 'flowers'). */
export const isFilePattern = (id?: string | null): id is string => !!id && id in PATTERNS

const urls = new Map<string, string>()
/** The print in a colour, as an SVG data URL (portraits, shop swatches, textures). */
export function patternDataUrl(id: string, color: string): string | null {
  const p = PATTERNS[id]
  if (!p) return null
  const key = `${id}|${color}`
  let url = urls.get(key)
  if (!url) {
    let svg = p.svg.replace(/currentColor/g, color)
    // Give the root a pixel size so every browser rasterises it at 128 px.
    if (!/<svg[^>]*\swidth=/.test(svg)) svg = svg.replace('<svg', '<svg width="128" height="128"')
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    urls.set(key, url)
  }
  return url
}

const textures = new Map<string, Texture>()
/** Repeating texture of a print (cached per print + colour; drawn as soon as the SVG has decoded). */
export function patternTexture(id: string, color: string): Texture | null {
  const key = `${id}|${color}`
  const cached = textures.get(key)
  if (cached) return cached
  const url = patternDataUrl(id, color)
  if (!url) return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  const img = new Image()
  img.onload = () => {
    canvas.getContext('2d')?.drawImage(img, 0, 0, 128, 128)
    texture.needsUpdate = true
  }
  img.src = url
  textures.set(key, texture)
  return texture
}

export interface PrintSpec {
  map: Texture
  /** The garment colour the print replaces (exactly as in the vertex colours). */
  under: string
  size: number
}

/**
 * 1.34: plain clothes get a fabric texture through the same print shader — a fine knit on tops, a diagonal twill
 * (like denim / chino) on trousers and skirts. Drawn once on a small canvas: faint dark threads with alpha, so the
 * garment colour shows through.
 */
const weaves = new Map<'knit' | 'twill', Texture>()
function weaveTexture(kind: 'knit' | 'twill'): Texture {
  const hit = weaves.get(kind)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64)
    if (kind === 'twill') {
      ctx.strokeStyle = 'rgba(20,24,40,0.16)'
      ctx.lineWidth = 2
      for (let i = -64; i < 128; i += 6) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i + 64, 64)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 37) % 64, (i * 23) % 64, 2, 1)
    } else {
      // rows of small "v" stitches
      ctx.strokeStyle = 'rgba(30,24,30,0.12)'
      ctx.lineWidth = 1.4
      for (let y = 2; y < 64; y += 5)
        for (let x = 0; x < 64; x += 6) {
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + 3, y + 3)
          ctx.lineTo(x + 6, y)
          ctx.stroke()
        }
    }
  }
  const t = new CanvasTexture(canvas)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  weaves.set(kind, t)
  return t
}

/** The prints an outfit wears: on the top (shirt colour) and on the bottom (shorts colour); plain cloth gets a weave. */
export function outfitPrints(o: Outfit): { top: PrintSpec | null; bottom: PrintSpec | null } {
  const spec = (id: string | undefined, color: string | undefined, under: string): PrintSpec | null => {
    if (!isFilePattern(id)) return null
    const map = patternTexture(id, color ?? '#ffffff')
    return map ? { map, under, size: PATTERNS[id].size } : null
  }
  const geometryPrint = o.pattern === 'stripes' || o.pattern === 'flowers'
  const top = spec(o.pattern, o.patternColor, o.shirt) ?? (geometryPrint ? null : { map: weaveTexture('knit'), under: o.shirt, size: 0.05 })
  const bottom = spec(o.patternBottom, o.patternBottomColor, o.shorts) ?? (o.shorts === o.shirt ? null : { map: weaveTexture('twill'), under: o.shorts, size: 0.06 })
  return { top, bottom }
}

/** Shop / wardrobe swatch: the item's colour with its print on top. */
export function swatchStyle(swatch: string, apply: Partial<Outfit>): { backgroundColor: string; backgroundImage?: string; backgroundSize?: string } {
  const id = isFilePattern(apply.pattern) ? apply.pattern : isFilePattern(apply.patternBottom) ? apply.patternBottom : null
  if (!id) return { backgroundColor: swatch }
  const url = patternDataUrl(id, (id === apply.pattern ? apply.patternColor : apply.patternBottomColor) ?? '#ffffff')
  return { backgroundColor: swatch, backgroundImage: `url("${url}")`, backgroundSize: '80%' }
}
