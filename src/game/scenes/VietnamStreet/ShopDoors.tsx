import { memo } from 'react'
import { SHOP_ROOM_LIST, shopDoorSpot, type ShopRoomDef } from '../../../data/shopRooms'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'

/**
 * 1.41 The street doors of the shop rooms (data/shopRooms.ts): one spot per shop that has no door of its own
 * (Hàng Khay's gold shop and restaurant keep their city-place doors). "Vào quán / Vào tiệm / Vào văn phòng" →
 * `shop.enter` (systems/shopRooms.ts: opening hours, parking the bike) → the room.
 */

const LABEL = { eat: 'action.enterEatery', shop: 'action.enterShop', office: 'action.enterRoom' } as const

const ACTIONS = Object.fromEntries(
  SHOP_ROOM_LIST.map((r): [string, SpotAction[]] => [r.id, [{ id: 'enter', labelKey: LABEL[r.enter], icon: 'door', action: 'shop.enter', arg: r.id, primary: true }]]),
)
const ZONES = Object.fromEntries(
  SHOP_ROOM_LIST.map((r) => {
    const turned = Math.abs(Math.sin(r.door.yaw)) > 0.5
    return [r.id, { x: r.door.x, z: r.door.z, halfX: turned ? r.door.halfD : r.door.halfW, halfZ: turned ? r.door.halfW : r.door.halfD }]
  }),
)

function Door({ r }: { r: ShopRoomDef }) {
  return <ActionSpot id={shopDoorSpot(r.id)} name={r.name} zone={ZONES[r.id]} actions={ACTIONS[r.id]} priority={2} />
}

export const ShopDoors = memo(function ShopDoors() {
  return (
    <>
      {SHOP_ROOM_LIST.filter((r) => !r.spot).map((r) => (
        <Door key={r.id} r={r} />
      ))}
    </>
  )
})
