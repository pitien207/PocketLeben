import { useEffect, useMemo } from 'react'
import { MeshLambertMaterial } from 'three'
import type { Vec3 } from '../../../data/config'
import { lambert, withOcclusionFade } from './materials'

const backing = (color: string) => lambert(color)
import { makeSignTexture, SIGN_FONT_FAMILY, type SignOptions } from './textures'

/** A flat painted shop sign. `width` is in metres; height follows the sign's aspect ratio. */
export function SignBoard({
  options,
  width,
  position,
  rotation = [0, 0, 0],
  flat = false,
}: {
  options: SignOptions
  width: number
  position: Vec3
  rotation?: Vec3
  /** Paper posters / painted signs: no backing plate. */
  flat?: boolean
}) {
  const { sign, material } = useMemo(() => {
    const sign = makeSignTexture(options)
    // alphaTest: the rounded corners of the canvas are transparent (no black corners).
    return { sign, material: withOcclusionFade(new MeshLambertMaterial({ map: sign.texture, alphaTest: 0.5 })) }
    // Options are module constants in practice; rebuild only if the text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.title, options.subtitle])

  useEffect(() => {
    let cancelled = false
    document.fonts?.load(`800 118px ${SIGN_FONT_FAMILY}`).then(() => {
      if (!cancelled) sign.redraw()
    })
    return () => {
      cancelled = true
      material.map?.dispose()
      material.dispose()
    }
  }, [sign, material])

  const aspect = options.aspect ?? 4
  const height = width / aspect
  // A painted board on a thin backing plate with two brackets, like a real shop sign.
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0.012]} material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      {!flat && (
        <mesh position={[0, 0, -0.03]} material={backing(options.border)}>
          <boxGeometry args={[width * 0.985, height * 0.94, 0.07]} />
        </mesh>
      )}
    </group>
  )
}
