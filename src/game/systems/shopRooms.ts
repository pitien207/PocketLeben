import { SHOP_ROOMS, shopScene, shopSpawnKey, type ShopRoomId } from '../../data/shopRooms'
import { shopOfScene } from '../../data/shopRoomIds'
import { useTime } from '../../store/timeStore'
import { useWorld } from '../../store/worldStore'
import { registerActions } from './actions'
import { registerTests } from './conditions'
import { playSfx } from './audio'
import { say } from './say'
import { travelTo } from './travel'
import { dismount, rideHooks, useRide } from './vehicles'

/**
 * 1.41 Walking into a shop (data/shopRooms.ts): the street door (`shopdoor-<id>`, or a Hàng Khay city place)
 * runs `shop.enter <id>`, the mat inside runs `shop.leave`. A shop only opens in its hours; you park the bike
 * outside (not with a Grab passenger on the back).
 */

const hour = () => useTime.getState().minutes / 60

export function shopRoomOpen(id: ShopRoomId, h = hour()) {
  const hours = SHOP_ROOMS[id].hours
  return !hours || (h >= hours[0] && h < hours[1])
}

const fmtHour = (h: number) => {
  const whole = Math.floor(h)
  const min = Math.round((h - whole) * 60)
  return `${whole % 24}h${min ? String(min).padStart(2, '0') : ''}`
}

function enter(arg?: string) {
  const id = arg as ShopRoomId
  const room = SHOP_ROOMS[id]
  if (!room) return false
  if (!shopRoomOpen(id)) {
    const [from, to] = room.hours!
    playSfx('door')
    say({ vi: `${room.name.vi} đóng cửa rồi (mở ${fmtHour(from)}–${fmtHour(to)}).`, en: `${room.name.en} is closed.` }, 'info')
    return false
  }
  if (useRide.getState().riding) {
    const why = rideHooks.blockGetOff?.()
    if (why) {
      playSfx('wrong')
      say({ vi: why, en: why }, 'info')
      return false
    }
    dismount()
  }
  playSfx('door')
  travelTo(shopScene(id), 'default', { minutes: 1 })
  return true
}

function leave() {
  const id = shopOfScene(useWorld.getState().scene)
  if (!id) return false
  playSfx('door')
  travelTo('vietnam', shopSpawnKey(id), { minutes: 1 })
  return true
}

registerActions({
  'shop.enter': enter,
  'shop.leave': leave,
})

registerTests({
  /** Inside any shop room. */
  'shop.inside': () => !!shopOfScene(useWorld.getState().scene),
})
