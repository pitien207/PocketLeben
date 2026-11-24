import { lazy, Suspense } from 'react'
import { chunk } from '../../updates'
import { useWorld } from '../../store/worldStore'
import { SCENES } from '../scenes/registry'
import { useFancy } from './fxState'
import { SkyDome } from './SkyDome'

// The effect library (postprocessing, N8AO) loads only when the fancy look is first needed.
const PostFX = lazy(() => chunk(import('./PostFX')).then((m) => ({ default: m.PostFX })))

/** 1.32: the fancy look's sky (outdoors) and post effects, only in the Việt Nam scenes and when the setting is on. */
export function FancyLook() {
  const fancy = useFancy()
  const indoor = useWorld((s) => SCENES[s.scene].indoor)
  if (!fancy) return null
  return (
    <>
      {!indoor && <SkyDome />}
      <Suspense fallback={null}>
        <PostFX />
      </Suspense>
    </>
  )
}
