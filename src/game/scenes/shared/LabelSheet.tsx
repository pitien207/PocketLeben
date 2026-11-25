import { useEffect, useMemo } from 'react'
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, MeshBasicMaterial, SRGBColorSpace } from 'three'
import type { Vec3 } from '../../../data/config'
import { withOcclusionFade } from './materials'

/**
 * 1.43 Many flat signs in ONE draw call: every label gets a cell of one canvas atlas and a quad of one mesh.
 * Used for the row numbers in the plane, the airport signs, the departures board and the gate screens.
 * `version` redraws the canvas in place (same texture and material — never rebuilt on a timer).
 */
export interface Label {
  /** Size in metres. */
  w: number
  h: number
  /** Centre of the quad. */
  at: Vec3
  /** Turn around Y (0 = the text faces +Z). */
  rotY?: number
  /** Paint the cell (0,0 = its top-left corner, W×H pixels). */
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void
}

/** Font stacks for signs (both are loaded by index.html). */
export const SIGN_SANS = "'Barlow Condensed', 'Arial Narrow', 'Segoe UI', sans-serif"
export const SIGN_ROUND = "'Baloo 2', 'Nunito', ui-rounded, 'Segoe UI', sans-serif"

const MAX = 2048

interface Cell {
  x: number
  y: number
  w: number
  h: number
}

/** Shelf packing; shrinks the pixel density until everything fits in 2048². */
function pack(labels: Label[], ppm: number): { cells: Cell[]; width: number; height: number } {
  for (let k = ppm; k > 20; k *= 0.85) {
    const cells: Cell[] = []
    let x = 0
    let y = 0
    let shelf = 0
    let width = 0
    for (const l of labels) {
      const w = Math.min(MAX, Math.ceil(l.w * k))
      const h = Math.ceil(l.h * k)
      if (x + w > MAX) {
        x = 0
        y += shelf + 2
        shelf = 0
      }
      cells.push({ x, y, w, h })
      x += w + 2
      shelf = Math.max(shelf, h)
      width = Math.max(width, x)
    }
    const height = y + shelf
    if (height <= MAX) return { cells, width: Math.max(4, width), height: Math.max(4, height) }
  }
  throw new Error('LabelSheet: too many labels')
}

export function LabelSheet({ labels, version = 0, ppm = 200 }: { labels: Label[]; version?: number | string; ppm?: number }) {
  const { geometry, material, canvas, cells } = useMemo(() => {
    const { cells, width, height } = pack(labels, ppm)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const pos: number[] = []
    const uv: number[] = []
    const nrm: number[] = []
    labels.forEach((l, i) => {
      const c = cells[i]
      const cos = Math.cos(l.rotY ?? 0)
      const sin = Math.sin(l.rotY ?? 0)
      const corner = (dx: number, dy: number): [number, number, number] => [l.at[0] + dx * cos, l.at[1] + dy, l.at[2] - dx * sin]
      const p00 = corner(-l.w / 2, -l.h / 2)
      const p10 = corner(l.w / 2, -l.h / 2)
      const p11 = corner(l.w / 2, l.h / 2)
      const p01 = corner(-l.w / 2, l.h / 2)
      const u0 = (c.x + 0.5) / width
      const u1 = (c.x + c.w - 0.5) / width
      const v0 = 1 - (c.y + c.h - 0.5) / height
      const v1 = 1 - (c.y + 0.5) / height
      pos.push(...p00, ...p10, ...p11, ...p00, ...p11, ...p01)
      uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1)
      for (let k = 0; k < 6; k++) nrm.push(sin, 0, cos)
    })
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geometry.setAttribute('normal', new Float32BufferAttribute(nrm, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
    geometry.computeBoundingSphere()
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    const material = withOcclusionFade(new MeshBasicMaterial({ map: texture }))
    return { geometry, material, canvas, cells }
    // The layout (count, sizes, positions) is fixed per mount; `version` only repaints.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels.length, ppm])

  useEffect(() => {
    let cancelled = false
    const paint = () => {
      if (cancelled) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      labels.forEach((l, i) => {
        const c = cells[i]
        if (!c) return
        ctx.save()
        ctx.beginPath()
        ctx.rect(c.x, c.y, c.w, c.h)
        ctx.clip()
        ctx.translate(c.x, c.y)
        l.draw(ctx, c.w, c.h)
        ctx.restore()
      })
      if (material.map) material.map.needsUpdate = true
    }
    paint()
    // Web fonts may arrive after the first paint
    document.fonts?.ready.then(paint)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, canvas, cells, material])

  useEffect(
    () => () => {
      geometry.dispose()
      material.map?.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return <mesh geometry={geometry} material={material} />
}

/** A plain sign: background, optional border, one or two lines centred. */
export function signDraw(opts: { bg: string; fg: string; title: string; sub?: string; border?: string; font?: string; align?: 'center' | 'left'; titleScale?: number }) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = opts.border ?? opts.bg
    ctx.fillRect(0, 0, W, H)
    if (opts.border) {
      ctx.fillStyle = opts.bg
      const b = Math.max(2, H * 0.06)
      ctx.fillRect(b, b, W - 2 * b, H - 2 * b)
    }
    const font = opts.font ?? SIGN_SANS
    ctx.fillStyle = opts.fg
    ctx.textBaseline = 'middle'
    ctx.textAlign = opts.align ?? 'center'
    const x = opts.align === 'left' ? H * 0.25 : W / 2
    const fit = (text: string, size: number, weight: number) => {
      let s = size
      ctx.font = `${weight} ${s}px ${font}`
      while (s > 8 && ctx.measureText(text).width > W * 0.92) {
        s *= 0.92
        ctx.font = `${weight} ${s}px ${font}`
      }
    }
    if (opts.sub) {
      fit(opts.title, H * 0.46 * (opts.titleScale ?? 1), 800)
      ctx.fillText(opts.title, x, H * 0.36)
      ctx.globalAlpha = 0.85
      fit(opts.sub, H * 0.26, 600)
      ctx.fillText(opts.sub, x, H * 0.74)
      ctx.globalAlpha = 1
    } else {
      fit(opts.title, H * 0.62 * (opts.titleScale ?? 1), 800)
      ctx.fillText(opts.title, x, H * 0.54)
    }
  }
}
