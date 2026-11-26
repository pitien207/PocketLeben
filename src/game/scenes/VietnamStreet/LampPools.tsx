import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial } from 'three'
import { fxState, useFancy } from '../../fx/fxState'
import { LAMP_XS } from './NorthQuarter'
import { NORTH, PLAY, POLES } from './layout'

/**
 * 1.32 fancy look: warm pools of light on the ground under the street lamps at night
 * (additive decals, one instanced draw call; no real lights, so it costs almost nothing).
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`
const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uNight;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = pow(clamp(1.0 - r, 0.0, 1.0), 1.8);
  gl_FragColor = vec4(uColor * a * uNight * 0.55, 1.0);
}
`

/** [x, z, radius] of every lamp's light on the ground. */
function lampSpots(): [number, number, number][] {
  const spots: [number, number, number][] = []
  // Hàng Gai: lamps on the electricity poles hang out over the road
  for (const p of POLES) if (p.lamp) spots.push([p.x, p.z + 2.0, 5.2])
  // Phố đi bộ Hàng Đào: short lamps on both pavements
  const { walk, ave } = NORTH
  for (const x of LAMP_XS) {
    for (const [z, dir] of [[walk.z0 - 1.0, -1], [walk.z1 + 1.0, 1]] as const) spots.push([x + (dir > 0 ? 3 : 0), z + dir * 0.6, 3.6])
  }
  // Tràng Tiền avenue: tall lamps
  for (let x = PLAY.minX + 8.5; x < PLAY.maxX; x += 18) {
    for (const [z, dir] of [[ave.z0 + 0.5, -1], [ave.z1 - 0.5, 1]] as const) spots.push([x, z + dir * 0.6, 4.8])
  }
  return spots
}

/** `spots`: [x, z, radius] per lamp (default: the Hàng Gai scene's lamps; 1.33 Hàng Khay passes its own). */
export function LampPools({ spots: given }: { spots?: [number, number, number][] } = {}) {
  const fancy = useFancy()
  const { mesh, material } = useMemo(() => {
    const spots = given ?? lampSpots()
    const material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uColor: { value: new Color('#ffb35c') }, uNight: { value: 0 } },
    })
    const geometry = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2)
    const mesh = new InstancedMesh(geometry, material, spots.length)
    const m = new Matrix4()
    spots.forEach(([x, z, r], i) => {
      m.makeScale(r, 1, r).setPosition(x, 0.135, z)
      mesh.setMatrixAt(i, m)
    })
    mesh.frustumCulled = false
    mesh.renderOrder = 2
    return { mesh, material }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame(() => {
    const n = fancy ? fxState.night : 0
    material.uniforms.uNight.value = n
    mesh.visible = n > 0.01
  })

  return <primitive object={mesh} />
}
