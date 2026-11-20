import { CITY_PLACES, type CityPlaceId } from '../../data/cityPlaces'
import { useTime } from '../../store/timeStore'
import { registerActions, runAction } from './actions'
import { playSfx } from './audio'
import { say } from './say'

/**
 * The district south of the lake (1.33; one map with Hàng Gai since 1.34): the doors of the functional buildings (data/cityPlaces.ts) — "opening soon" until a place gets its own `action`.
 */

function visit(arg?: string) {
  const place = CITY_PLACES[arg as CityPlaceId]
  if (!place) return false
  const hour = useTime.getState().minutes / 60
  if (place.hours && (hour < place.hours[0] || hour >= place.hours[1])) {
    playSfx('door')
    say({ vi: `${place.name.vi} đã đóng cửa (mở ${place.hours[0]}h–${place.hours[1] % 24}h).`, en: `${place.name.en} is closed.` }, 'info')
    return true
  }
  if (place.action) return runAction(place.action, place.id)
  playSfx('door')
  say({ vi: `${place.name.vi}: ${place.blurb.vi} (Sắp mở cửa — sẽ có hoạt động ở đây sau.)`, en: `${place.name.en}: ${place.blurb.en} (Opening soon.)` }, 'info')
  return true
}

registerActions({
  'city.visit': visit,
})
