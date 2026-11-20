import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three'
import { useTime } from '../../store/timeStore'
import { createSkyState, skyAt } from '../systems/daylight'
import { weatherState } from '../systems/weather'
import { fxState } from './fxState'

/**
 * 1.32 sky for the fancy look: a gradient dome (fog colour at the horizon, deeper colour overhead),
 * a soft sun / moon glow, drifting cartoon clouds with a lit top and a shaded belly, stars at night.
 * One draw call, drawn first and never written to depth; it follows the camera.
 */

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uNight;
uniform float uCloud;
uniform float uGrey;
uniform float uTime;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float up = max(d.y, 0.0);
  // Gradient: hazy horizon band, colour deepening toward the top.
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.02, 0.85, up), 0.7));
  // Warm band right at the horizon around the sun (sunrise / sunset).
  float toSun = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(toSun, 6.0) * 0.22 + pow(toSun, 48.0) * 0.45) * (1.0 - uNight * 0.6);

  // Stars (night, clear sky)
  vec3 sp = d * 160.0;
  vec3 cell = floor(sp);
  float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  float star = step(0.9965, h) * (1.0 - smoothstep(0.1, 0.42, length(fract(sp) - 0.5)));
  star *= 0.6 + 0.4 * sin(uTime * 1.7 + h * 60.0);
  col += vec3(1.0, 0.96, 0.88) * star * uNight * smoothstep(0.06, 0.3, up) * (1.0 - uCloud) * 1.4;

  // Moon / sun disc
  float disc = smoothstep(0.99935, 0.99965, dot(d, uSunDir));
  col = mix(col, mix(uSunColor * 1.6, vec3(1.0, 0.98, 0.9) * 1.3, uNight), disc * (1.0 - uGrey));

  // Clouds: a flat layer seen from below, so they bunch up toward the horizon.
  if (d.y > 0.0) {
    vec2 p = d.xz / (d.y + 0.16) * 1.35 + vec2(uTime * 0.012, uTime * 0.004);
    float n = fbm(p);
    float cover = 0.5 - uCloud * 0.2;
    float c = smoothstep(cover, cover + 0.09, n) * smoothstep(0.0, 0.22, d.y);
    // Light from the sun side: sample again a little toward the sun for a lit rim / shaded belly.
    float n2 = fbm(p + normalize(uSunDir.xz + 1e-4) * 0.06);
    float shade = clamp((n2 - n) * 7.0 + 0.55, 0.0, 1.0);
    vec3 lit = mix(vec3(1.0), uSunColor, 0.35) * mix(1.0, 0.3, uNight);
    vec3 dark = mix(uHorizon, uZenith, 0.35) * mix(0.9, 0.7, uNight);
    vec3 cloudCol = mix(dark, lit, shade);
    cloudCol = mix(cloudCol, uHorizon, smoothstep(0.35, 0.0, d.y) * 0.55);
    col = mix(col, cloudCol, c * 0.95);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const RAIN_SKY = new Color('#a9b4c2')

export function SkyDome() {
  const mesh = useRef<Mesh>(null)
  const sky = useRef(createSkyState())
  const geometry = useMemo(() => new SphereGeometry(110, 32, 16), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        uniforms: {
          uZenith: { value: new Color() },
          uHorizon: { value: new Color() },
          uSunColor: { value: new Color() },
          uSunDir: { value: new Vector3(0, 1, 0) },
          uNight: { value: 0 },
          uCloud: { value: 0 },
          uGrey: { value: 0 },
          uTime: { value: 0 },
        },
      }),
    [],
  )

  useFrame(({ camera, clock }) => {
    const m = mesh.current
    if (!m) return
    m.position.copy(camera.position)
    const s = skyAt(useTime.getState().minutes / 60, sky.current)
    const u = material.uniforms
    const { rain, cloud, fog } = weatherState
    const grey = Math.min(1, Math.max(rain * 0.7, cloud * 0.5, fog * 0.7))
    const night = fxState.night
    // Overhead a deeper, more saturated version of the keyed sky colour; the horizon is the fog colour.
    const z = u.uZenith.value as Color
    z.copy(s.sky).offsetHSL(0, 0.14, -0.13 - night * 0.04)
    z.lerp(RAIN_SKY, grey * 0.8)
    ;(u.uHorizon.value as Color).copy(s.fog).lerp(RAIN_SKY, grey * 0.85)
    ;(u.uSunColor.value as Color).copy(s.sun)
    ;(u.uSunDir.value as Vector3).set(...s.lightPos).normalize()
    u.uNight.value = night
    u.uCloud.value = Math.min(1, cloud + rain + fog * 0.5)
    u.uGrey.value = grey
    u.uTime.value = clock.elapsedTime
  })

  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={-1000} frustumCulled={false} />
}
