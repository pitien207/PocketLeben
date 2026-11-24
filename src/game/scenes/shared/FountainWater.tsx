import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CircleGeometry, Color, DoubleSide, IcosahedronGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, ShaderMaterial, Vector3 } from 'three'

/**
 * 1.42 moving water for the fountains (user: "đài phun nước đứng yên"): a jet rising from the top and falling back
 * into the bowl, a ring of drops spilling over the bowl's rim into the basin, and rippling surfaces (rings running
 * outward, sparkles) on the bowl and the basin. Drops = one instanced mesh, surfaces = one shader each. The drops
 * only move while the camera is within 45 m.
 */

export interface FountainSpec {
  x: number
  z: number
  /** Water level and radius of the big basin. */
  basinY: number
  basinR: number
  /** The upper bowl the jet falls into. */
  bowlY: number
  bowlR: number
  /** Top of the column (where the jet starts) and how high it shoots. */
  topY: number
  jet?: number
}

const JET = 26
const RIM = 36
const SPLASH = 18

const RIPPLE_VS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const RIPPLE_FS = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  // rings running outward from the centre and a second set from the spill line, a few sparkles
  float rings = smoothstep(0.82, 1.0, sin(r * 26.0 - uTime * 3.2) * 0.5 + 0.5);
  float rim = smoothstep(0.85, 1.0, sin(r * 40.0 + uTime * 2.1 + p.x * 3.0) * 0.5 + 0.5) * smoothstep(0.5, 0.9, r);
  float glint = step(0.985, fract(sin(dot(floor(p * 24.0 + vec2(uTime * 0.6, 0.0)), vec2(12.9898, 78.233))) * 43758.5453));
  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 1.0, r * 0.8));
  col += vec3(0.95, 0.98, 1.0) * (rings * 0.32 + rim * 0.22 + glint * 0.6);
  gl_FragColor = vec4(col, 0.92);
  #include <colorspace_fragment>
}`

const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()

export function FountainWater({ fountains }: { fountains: FountainSpec[] }) {
  const { drops, surfaces, rippleMat } = useMemo(() => {
    const geo = new IcosahedronGeometry(1, 0)
    const mat = new MeshBasicMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.85, depthWrite: false })
    const drops = new InstancedMesh(geo, mat, fountains.length * (JET + RIM + SPLASH))
    drops.frustumCulled = false
    const rippleMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uDeep: { value: new Color('#5fb3c9') }, uShallow: { value: new Color('#a9e3ef') } },
      vertexShader: RIPPLE_VS,
      fragmentShader: RIPPLE_FS,
      transparent: true,
      side: DoubleSide,
    })
    const surfaces = fountains.flatMap((f) => [
      { geo: new CircleGeometry(f.basinR, 40), y: f.basinY + 0.012, x: f.x, z: f.z },
      { geo: new CircleGeometry(f.bowlR * 0.92, 28), y: f.bowlY + 0.012, x: f.x, z: f.z },
    ])
    return { drops, surfaces, rippleMat }
  }, [fountains])

  useEffect(
    () => () => {
      drops.geometry.dispose()
      ;(drops.material as MeshBasicMaterial).dispose()
      rippleMat.dispose()
      for (const s of surfaces) s.geo.dispose()
    },
    [drops, surfaces, rippleMat],
  )

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime
    rippleMat.uniforms.uTime.value = t
    let i = 0
    for (const f of fountains) {
      const near = camera.position.distanceToSquared(_p.set(f.x, f.basinY, f.z)) < 45 * 45
      const jet = f.jet ?? 0.8
      // the jet: drops rise from the top and fall back into the bowl, each on its own phase
      for (let k = 0; k < JET; k++) {
        const ph = near ? (t * 0.9 + k / JET) % 1 : k / JET
        const a = k * 2.399
        const spread = f.bowlR * 0.55 * ph
        const y = f.topY + jet * 4 * ph * (1 - ph) - (f.topY - f.bowlY) * ph * ph
        const sz = 0.035 + 0.02 * (1 - ph)
        _m.compose(_p.set(f.x + Math.cos(a) * spread, y, f.z + Math.sin(a) * spread), _q.identity(), _s.set(sz, sz * 1.6, sz))
        drops.setMatrixAt(i++, _m)
      }
      // the spill: a curtain of drops from the bowl's rim down into the basin
      for (let k = 0; k < RIM; k++) {
        const ph = near ? (t * 1.3 + (k * 0.37) % 1) % 1 : (k * 0.37) % 1
        const a = (k / RIM) * Math.PI * 2
        const r = f.bowlR + 0.04 + ph * ph * 0.18
        const y = f.bowlY - (f.bowlY - f.basinY) * ph * ph
        const sz = 0.03
        _m.compose(_p.set(f.x + Math.cos(a) * r, y, f.z + Math.sin(a) * r), _q.identity(), _s.set(sz, sz * 2.4, sz))
        drops.setMatrixAt(i++, _m)
      }
      // splashes where the curtain hits the basin
      for (let k = 0; k < SPLASH; k++) {
        const ph = near ? (t * 2 + k * 0.61) % 1 : 0.5
        const a = (k / SPLASH) * Math.PI * 2 + 0.2
        const r = f.bowlR + 0.25 + ph * 0.15
        const sz = 0.03 * (1 - ph)
        _m.compose(_p.set(f.x + Math.cos(a) * r, f.basinY + 0.03 + Math.sin(ph * Math.PI) * 0.12, f.z + Math.sin(a) * r), _q.identity(), _s.set(sz, sz, sz))
        drops.setMatrixAt(i++, _m)
      }
    }
    drops.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <primitive object={drops} />
      {surfaces.map((s, k) => (
        <mesh key={k} geometry={s.geo} material={rippleMat} position={[s.x, s.y, s.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} />
      ))}
    </>
  )
}
