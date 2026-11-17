import { useEffect, useState } from 'react'

/** Same queries as the `land:` / `short:` CSS variants in index.css (keep them in sync). */
export const LAND_QUERY = '(orientation: landscape) and (min-width: 600px)'
export const SHORT_QUERY = '(orientation: landscape) and (max-height: 540px)'

/** Live result of a media query (re-renders when the phone is turned). */
export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatch(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return match
}

/** A landscape screen wide enough for side-by-side layouts (phone on its side, tablet, desktop). */
export const useLandscape = () => useMedia(LAND_QUERY)
