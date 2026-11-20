import { useEffect, useState, type ReactNode } from 'react'
import { playerState } from '../systems/playerState'

/**
 * 1.34 (one big Hà Nội map): traffic and passers-by of a district only exist while the player is near it, so the
 * far side of the lake costs nothing on the Hàng Gai side and the other way round. Checked twice a second; `when`
 * must be a stable (module-level) function. Give the test some margin so it does not flip at the edge.
 */
export function ActiveArea({ when, children }: { when: (x: number, z: number) => boolean; children: ReactNode }) {
  const [on, setOn] = useState(() => when(playerState.position.x, playerState.position.z))
  useEffect(() => {
    const id = window.setInterval(() => {
      const v = when(playerState.position.x, playerState.position.z)
      setOn((o) => (o === v ? o : v))
    }, 500)
    return () => window.clearInterval(id)
  }, [when])
  return on ? <>{children}</> : null
}
