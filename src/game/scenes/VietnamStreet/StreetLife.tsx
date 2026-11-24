import { CONFIG } from '../../../data/config'
import { NPCS } from '../../../data/npcs'
import { ChatterDirector } from '../../components/npc/ChatterDirector'
import { DaCauKids } from '../../components/npc/DaCauKids'
import { NPC } from '../../components/npc/NPC'
import { Traffic } from '../../components/npc/Traffic'
import { ActiveArea } from '../../components/ActiveArea'
import { HomeDoor } from './HomeDoor'
import { KIDS, LAKE, TRAFFIC_LANES, VENDOR_PATH, WALKER_PATHS } from './layout'

const nearHangGai = (_x: number, z: number) => z < LAKE.south - 25
import { TraDaStall } from './TraDaStall'

/** Everyone who makes the street feel alive. */
export function StreetLife() {
  return (
    <>
      <TraDaStall />
      <HomeDoor />

      {/* 1.41 cô Liên sits in her grocery now (data/shopRooms.ts taphoa) */}

      {/* Chú Bình strolls with his shoulder pole of bánh mì */}
      <NPC
        def={NPCS.chuBay}
        at={VENDOR_PATH[0]}
        carry="pole"
        path={{ points: VENDOR_PATH, speed: CONFIG.npc.vendorSpeed, pauseSec: [2.5, 6] }}
      />

      {/* Passers-by */}
      <NPC def={NPCS.coHoa} at={WALKER_PATHS.coHoa[0]} path={{ points: WALKER_PATHS.coHoa, pauseSec: [0.5, 3] }} />
      <NPC def={NPCS.anhKhoa} at={WALKER_PATHS.anhKhoa[1]} path={{ points: WALKER_PATHS.anhKhoa, pauseSec: [1, 4] }} />
      <NPC def={NPCS.chiLan} at={WALKER_PATHS.chiLan[0]} path={{ points: WALKER_PATHS.chiLan, pauseSec: [0.5, 2.5] }} />

      <DaCauKids a={KIDS.a} b={KIDS.b} kidA={NPCS.beTi} kidB={NPCS.beNa} />
      {/* 1.34: one big map — the street's traffic only runs while you are on this side of the lake */}
      <ActiveArea when={nearHangGai}>
        <Traffic lanes={TRAFFIC_LANES} perLane={2} />
      </ActiveArea>

      <ChatterDirector groups={['traDa']} solos={['chuBay', 'coHoa', 'anhKhoa', 'chiLan']} />
    </>
  )
}
