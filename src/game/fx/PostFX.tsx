import { useLayoutEffect, useRef, type ReactElement } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, SMAA, TiltShift2 } from '@react-three/postprocessing'
import type { BloomEffect } from 'postprocessing'
import { HalfFloatType } from 'three'
import { useSettings } from '../../store/settingsStore'
import { fxState, useFxAuto } from './fxState'

/**
 * 1.32 post effects for the fancy look (mounted by Game only while `useFancy()`):
 * - N8AO: soft contact shadows in corners, under awnings, around feet (quality "high" only, half resolution)
 * - Bloom: lamps, lanterns, lit windows and the moon at night. Sunlit surfaces go above 1 by day (no tone
 *   mapping), so the threshold follows the night amount: high by day, low at night when nothing is sunlit.
 * - a light grade (a touch more saturation and contrast; the pastel palette stays)
 * - tilt-shift: the far street and the very bottom soften a little, like a toy diorama (high only)
 * The composer keeps a stencil buffer: the player's see-through silhouette relies on it.
 */
export function PostFX() {
  const quality = useSettings((s) => s.quality)
  // 1.39: a phone that cannot hold its frame rate drops the costly effects for the session (Game.tsx)
  const lite = useFxAuto((s) => s.lite)
  const high = quality === 'high' && !lite
  const bloom = useRef<BloomEffect>(null)
  // 1.39 (lag): N8AO saw the (fading) transparent scene materials and then rendered the whole scene twice more every
  // frame, traversing it three times (garbage → hitches). Faded parts may simply get AO like solid ones.
  const ao = useRef<{ autoDetectTransparency: boolean; configuration: { transparencyAware: boolean } } | null>(null)
  useLayoutEffect(() => {
    const e = ao.current
    if (!e) return
    e.autoDetectTransparency = false
    e.configuration.transparencyAware = false
  }, [high])
  useFrame(() => {
    const b = bloom.current
    if (!b) return
    const n = fxState.night
    b.luminanceMaterial.threshold = 1.7 - n * 1.08
    b.intensity = 0.25 + n * 0.85
  })
  const effects: ReactElement[] = []
  if (high) {
    effects.push(
      <N8AO
        key="ao"
        ref={ao as never}
        halfRes
        depthAwareUpsampling
        aoRadius={1.4}
        distanceFalloff={0.8}
        intensity={3}
        aoSamples={12}
        denoiseSamples={6}
        denoiseRadius={10}
        color="#3d2c3f"
      />,
    )
  }
  effects.push(
    <Bloom key="bloom" ref={bloom} mipmapBlur luminanceThreshold={1.7} luminanceSmoothing={0.1} intensity={0.25} radius={0.72} />,
    <HueSaturation key="sat" saturation={0.07} />,
    <BrightnessContrast key="contrast" brightness={0.0} contrast={0.07} />,
  )
  if (high) {
    effects.push(<TiltShift2 key="tilt" blur={0.09} taper={0.55} start={[0, 0.48]} end={[1, 0.48]} samples={6} />)
  } else {
    effects.push(<SMAA key="smaa" />)
  }
  return (
    <EffectComposer multisampling={high ? 4 : 0} stencilBuffer frameBufferType={HalfFloatType} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  )
}
