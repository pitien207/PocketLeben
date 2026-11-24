import { memo, useMemo } from 'react'
import { shopOfScene } from '../../../data/shopRoomIds'
import { useFlags } from '../../../store/flagsStore'
import { useTime } from '../../../store/timeStore'
import { useWorld } from '../../../store/worldStore'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { check } from '../../systems/conditions'
import { CeilingFan, TearCalendar, WallClock, WallFan } from '../shared/Decor'
import { glowMaterial } from '../shared/materials'
import { Room } from '../shared/Room'
import { Shapes } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import { planFor, type NpcPlace, type SignPlace } from './plans'

/**
 * 1.41 The inside of a shop (scene `shop.<id>`, data/shopRooms.ts): one "dollhouse" room like home — back wall and
 * the back of the side walls full height, the front open to the camera — furnished from plans.ts. Every shop scene
 * loads this one chunk and picks its plan by the scene id. Draw calls: floor, shell + furniture, glow, one per sign
 * and per character.
 */

const EXIT: SpotAction[] = [{ id: 'exit', labelKey: 'action.toStreet', icon: 'door', action: 'shop.leave', primary: true }]

function Person({ p }: { p: NpcPlace }) {
  const here = useFlags(() => !p.if || check(p.if))
  if (!here) return null
  return <NPC def={p.def} at={p.at} yaw={p.yaw} seatY={p.seatY} activity={p.activity} arms={p.arms} zone={p.zone} extraActions={p.extraActions} />
}

function Sign({ s }: { s: SignPlace }) {
  const day = useTime((t) => (typeof s.options === 'function' ? t.day : 0))
  const options = useMemo(() => (typeof s.options === 'function' ? s.options(day) : s.options), [s, day])
  return <SignBoard options={options} width={s.width} position={s.at} rotation={[0, s.rotY ?? 0, 0]} flat={s.flat} />
}

const ShopRoom = memo(function ShopRoom() {
  const scene = useWorld((s) => s.scene)
  const id = shopOfScene(scene)
  const plan = useMemo(() => (id ? planFor(id) : null), [id])
  if (!plan) return null
  const { w, d, h, b, exit } = plan
  return (
    <>
      <Room w={w} d={d} h={h} style={plan.style} floorKind={plan.floor} windows={plan.windows} furniture={b.s} blockers={b.block} />
      <Shapes shapes={b.glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      {plan.signs.map((s, i) => (
        <Sign key={i} s={s} />
      ))}
      {plan.clocks.map((c, i) => (
        <WallClock key={i} position={c.at} rotation={[0, c.rotY ?? 0, 0]} radius={c.r ?? 0.24} />
      ))}
      {plan.calendars.map((c, i) => (
        <TearCalendar key={i} position={c.at} rotation={[0, c.rotY ?? 0, 0]} />
      ))}
      {plan.wallFans.map((f, i) => (
        <WallFan key={i} position={f.at} rotation={[0, f.rotY ?? 0, 0]} />
      ))}
      {plan.ceilingFans.map((f, i) => (
        <CeilingFan key={i} position={f.at} blade={f.blade} />
      ))}
      {plan.npcs.map((p) => (
        <Person key={p.def.id} p={p} />
      ))}
      {plan.spots.map((s) => (
        <ActionSpot key={s.id} id={s.id} name={s.name} zone={s.zone} actions={s.actions} />
      ))}
      <ActionSpot id="shop-exit" nameKey="interact.exit" zone={{ x: exit.x, z: exit.z, halfX: 0.8, halfZ: 0.55 }} actions={EXIT} />
    </>
  )
})

export default ShopRoom
