import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry, CanvasTexture, DoubleSide, MeshBasicMaterial, SRGBColorSpace } from 'three'

/**
 * 1.42 cobwebs (user: "mạng nhện nhìn ảo quá" — the old ones were boxes and tori): a painted web texture — threads
 * fanning out of the corner, a sagging spiral between them, a few broken strands and one loose thread hanging down,
 * a little dust — on a soft four-point sheet spanned across a ceiling corner. All webs of a room = one mesh.
 */

let texture: CanvasTexture | null = null
function webTexture(): CanvasTexture {
  if (texture) return texture
  const N = 512
  const c = document.createElement('canvas')
  c.width = c.height = N
  const g = c.getContext('2d')!
  // seeded so every web looks the same on every visit
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  // The anchor is the top-left corner of the texture (= the room corner)
  const spokes = 9
  const angles: number[] = []
  for (let i = 0; i < spokes; i++) angles.push(((i + 0.15 + rnd() * 0.5) / spokes) * (Math.PI / 2))
  const reach = angles.map(() => N * (0.82 + rnd() * 0.2))
  // a faint haze of dust near the corner
  const haze = g.createRadialGradient(0, 0, 0, 0, 0, N * 0.55)
  haze.addColorStop(0, 'rgba(235,235,230,0.22)')
  haze.addColorStop(1, 'rgba(235,235,230,0)')
  g.fillStyle = haze
  g.fillRect(0, 0, N, N)
  g.lineCap = 'round'
  // spokes: slightly bowed threads
  for (let i = 0; i < spokes; i++) {
    const a = angles[i]
    const r = reach[i]
    g.strokeStyle = `rgba(248,248,244,${0.75 + rnd() * 0.2})`
    g.lineWidth = 2.2
    g.beginPath()
    g.moveTo(0, 0)
    const ma = a + (rnd() - 0.5) * 0.05
    g.quadraticCurveTo(Math.cos(ma) * r * 0.5 + 4, Math.sin(ma) * r * 0.5 + 6, Math.cos(a) * r, Math.sin(a) * r)
    g.stroke()
  }
  // the spiral: sagging arcs from spoke to spoke, closer together near the centre; some segments broken
  for (let ring = 0; ring < 16; ring++) {
    const rr = N * (0.07 + ring * 0.052 + rnd() * 0.01)
    g.strokeStyle = `rgba(245,245,240,${0.55 + rnd() * 0.3})`
    g.lineWidth = 1.5
    for (let i = 0; i < spokes - 1; i++) {
      if (rr > Math.min(reach[i], reach[i + 1]) * 0.96) continue
      if (rnd() < 0.08) continue // a broken strand
      const a0 = angles[i]
      const a1 = angles[i + 1]
      const x0 = Math.cos(a0) * rr
      const y0 = Math.sin(a0) * rr
      const x1 = Math.cos(a1) * rr
      const y1 = Math.sin(a1) * rr
      // sag toward the corner (the threads hang between the spokes)
      const am = (a0 + a1) / 2
      const sag = rr * 0.86
      g.beginPath()
      g.moveTo(x0, y0)
      g.quadraticCurveTo(Math.cos(am) * sag, Math.sin(am) * sag, x1, y1)
      g.stroke()
    }
  }
  // loose threads: one torn spoke dangling, a few stray strands
  g.strokeStyle = 'rgba(245,245,240,0.7)'
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(N * 0.62, N * 0.5)
  g.bezierCurveTo(N * 0.66, N * 0.66, N * 0.6, N * 0.8, N * 0.64, N * 0.97)
  g.stroke()
  for (let i = 0; i < 5; i++) {
    const a = rnd() * (Math.PI / 2)
    const r0 = N * (0.3 + rnd() * 0.4)
    g.beginPath()
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
    g.lineTo(Math.cos(a + 0.2) * (r0 + 40), Math.sin(a + 0.2) * (r0 + 40))
    g.stroke()
  }
  texture = new CanvasTexture(c)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

let material: MeshBasicMaterial | null = null
const webMaterial = () =>
  (material ??= new MeshBasicMaterial({ map: webTexture(), color: '#f4f2ec', transparent: true, depthWrite: false, side: DoubleSide, alphaTest: 0.02 }))

/** A web in a corner: the room corner (x, y, z), the two wall directions (unit vectors along the walls), size in metres. */
export interface WebSpec {
  at: [number, number, number]
  /** Direction along the first wall (texture u) and along the second wall (texture v), e.g. [1,0,0] and [0,0,1]. */
  a: [number, number, number]
  b: [number, number, number]
  size?: number
}

export function Cobwebs({ webs }: { webs: WebSpec[] }) {
  const geometry = useMemo(() => {
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    webs.forEach((w, i) => {
      const s = w.size ?? 1
      const [cx, cy, cz] = w.at
      // corner, out along wall A (a bit down), out along wall B (a bit down), and the low middle of the sheet
      const pa = [cx + w.a[0] * s, cy - 0.22 * s, cz + w.a[2] * s]
      const pb = [cx + w.b[0] * s, cy - 0.22 * s, cz + w.b[2] * s]
      const pd = [cx + (w.a[0] + w.b[0]) * 0.62 * s, cy - 0.78 * s, cz + (w.a[2] + w.b[2]) * 0.62 * s]
      pos.push(cx, cy, cz, ...pa, ...pb, ...pd)
      uv.push(0, 1, 1, 1, 0, 0, 1, 0)
      const k = i * 4
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
    g.setIndex(idx)
    return g
  }, [webs])
  return <mesh geometry={geometry} material={webMaterial()} renderOrder={4} />
}
