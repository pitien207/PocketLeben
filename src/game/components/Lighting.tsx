import { useRef } from 'react'
import { playerState } from '../systems/playerState'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, Fog, Vector3, type DirectionalLight, type HemisphereLight } from 'three'
import { CONFIG } from '../../data/config'
import { useSettings } from '../../store/settingsStore'
import { useTime } from '../../store/timeStore'
import { useWorld } from '../../store/worldStore'
import { SCENES } from '../scenes/registry'
import { createSkyState, skyAt } from '../systems/daylight'
import { setRainAmbience } from '../systems/audio'
import { petalAmount, rainStrength, weatherAt, weatherState } from '../systems/weather'
import { fancyOn, fxState, fxUniforms, nightAt } from '../fx/fxState'
import { glowMaterial } from '../scenes/shared/materials'

// Indoors: a warm, fixed light and a dark "diorama" backdrop around the room.
const INDOOR = {
  background: new Color('#2f2938'),
  hemiSky: new Color('#fff3e2'),
  hemiGround: new Color('#c9b8e0'),
  sun: new Color('#fff1e0'),
}

const SHADOW_EXTENT = 22
const _up = new Vector3(0, 1, 0)
const _lx = new Vector3()
const _ly = new Vector3()
const _lz = new Vector3()
const _c = new Vector3()

// Rainy days: a flat grey sky, closer fog, a weaker sun.
const RAIN_SKY = new Color('#a9b4c2')
const RAIN_FOG = new Color('#b9c2cc')

let lastScene = ''

/** Ease weather values toward their targets (minutes-scale changes, not instant). */
function updateWeather(dt: number, indoor: boolean) {
  const { day, minutes } = useTime.getState()
  const country = SCENES[useWorld.getState().scene].country
  const kind = weatherAt(day, minutes, country)
  // A new place (behind the fade): jump straight to its weather, no petals drifting indoors.
  const scene = useWorld.getState().scene
  const k = scene !== lastScene ? 1 : 1 - Math.exp(-dt * 0.8)
  lastScene = scene
  const strength = rainStrength(kind)
  const cloud = kind === 'cloudy' ? 1 : kind === 'fog' ? 0.5 : 0
  weatherState.cloud += ((indoor ? 0 : cloud) - weatherState.cloud) * k
  weatherState.fog += ((indoor || kind !== 'fog' ? 0 : 1) - weatherState.fog) * k
  weatherState.rainOutside += (strength - weatherState.rainOutside) * k
  weatherState.rain += ((indoor ? 0 : strength) - weatherState.rain) * k
  weatherState.petals += ((indoor ? 0 : petalAmount(minutes, country, kind)) - weatherState.petals) * k
  setRainAmbience(weatherState.rainOutside * (indoor ? 0.35 : 1))
}

/** Sun/moon + sky fill, driven by the in-game clock. Shadows are soft and light (toy look). */
export function Lighting() {
  const quality = useSettings((s) => s.quality)
  const mapSize = CONFIG.graphics[quality].shadowMapSize
  const scene = useThree((s) => s.scene)
  const hemi = useRef<HemisphereLight>(null)
  const sun = useRef<DirectionalLight>(null)
  const sky = useRef(createSkyState())

  useFrame((_, rawDt) => {
    const indoor = SCENES[useWorld.getState().scene].indoor
    updateWeather(Math.min(rawDt, 0.1), indoor)
    // 1.32 fancy look: night amount drives lit windows, lamp pools and how bright glowing bulbs are
    // (above 1 → they bloom). Outside the fancy look everything stays exactly as before.
    const fancy = fancyOn()
    const night = nightAt(useTime.getState().minutes / 60)
    fxState.night = night
    fxState.indoor = indoor
    fxUniforms.uNight.value = fancy && !indoor ? night : 0
    glowMaterial.color.setScalar(fancy ? 1 + (indoor ? 0.9 : 0.85) * night : 1)
    if (indoor) {
      if (scene.background instanceof Color) scene.background.copy(INDOOR.background)
      if (scene.fog instanceof Fog) {
        scene.fog.color.copy(INDOOR.background)
        scene.fog.near = 22
        scene.fog.far = 45
      }
      if (hemi.current) {
        hemi.current.color.copy(INDOOR.hemiSky)
        hemi.current.groundColor.copy(INDOOR.hemiGround)
        hemi.current.intensity = 2.2
      }
      if (sun.current) {
        sun.current.color.copy(INDOOR.sun)
        sun.current.intensity = 2.0
        sun.current.position.set(5, 16, 11)
      }
      return
    }
    const s = skyAt(useTime.getState().minutes / 60, sky.current)
    const rain = weatherState.rain
    // Darker skies stay dark at night: only blend toward grey as much as the sky is bright.
    const { cloud, fog } = weatherState
    const grey = Math.max(rain * 0.55, cloud * 0.42, fog * 0.6) * Math.min(1, s.sunI / 1.5)
    if (scene.background instanceof Color) scene.background.copy(s.sky).lerp(RAIN_SKY, grey)
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(s.fog).lerp(RAIN_FOG, grey)
      scene.fog.near = 30 - rain * 8 - fog * 22
      scene.fog.far = 80 - rain * 22 - fog * 46
      // dev: overview screenshots of a whole map (tests set window.__noFog)
      if (import.meta.env.DEV && (window as { __noFog?: boolean }).__noFog) {
        scene.fog.near = 400
        scene.fog.far = 900
      }
    }
    if (hemi.current) {
      hemi.current.color.copy(s.hemiSky)
      hemi.current.groundColor.copy(s.hemiGround)
      // Fancy nights are a little darker, so lamps, lanterns and windows carry the scene.
      hemi.current.intensity = s.hemi * (1 - rain * 0.18 - cloud * 0.08) * (fancy ? 1 - night * 0.2 : 1)
    }
    if (sun.current) {
      sun.current.color.copy(s.sun)
      sun.current.intensity = s.sunI * (1 - Math.min(0.75, rain * 0.6 + cloud * 0.4))
      // The shadow box (±SHADOW_EXTENT) follows the player (1.34: before, only the area round the origin had shadows).
      // 1.38: its centre is snapped to whole shadow-map texels along the light's own axes, so shadow edges stay put
      // while you walk — the 2 m steps made them jump and flicker (user, phone view).
      _lz.set(s.lightPos[0], s.lightPos[1], s.lightPos[2]).normalize()
      _lx.crossVectors(_up, _lz).normalize()
      _ly.crossVectors(_lz, _lx)
      const texel = (2 * SHADOW_EXTENT) / mapSize
      const p = playerState.position
      const u = Math.round(p.dot(_lx) / texel) * texel
      const v = Math.round(p.dot(_ly) / texel) * texel
      const w = p.dot(_lz)
      _c.copy(_lx).multiplyScalar(u).addScaledVector(_ly, v).addScaledVector(_lz, w)
      sun.current.target.position.copy(_c)
      sun.current.position.copy(_c).addScaledVector(_lz, 24)
      sun.current.target.updateMatrixWorld()
      sun.current.shadow.intensity = 0.55 * (1 - Math.min(0.8, rain * 0.6 + cloud * 0.5))
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff6ea', '#d6c8ff', 2.1]} />
      <directionalLight
        ref={sun}
        // Re-mount when the shadow map size changes so three allocates a new map.
        key={mapSize}
        position={[11, 20, 9]}
        intensity={2.6}
        color="#fff0dc"
        castShadow
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={4}
        shadow-intensity={0.55}
      />
    </>
  )
}
