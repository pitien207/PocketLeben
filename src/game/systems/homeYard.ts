import { ITEMS } from '../../data/items'
import { useInventory } from '../../store/inventoryStore'
import { useTime } from '../../store/timeStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { canCarry } from './bag'
import { getFlag, registerTests, setFlag } from './conditions'
import { houseLevel } from './family'
import { say } from './say'
import { spendTime } from './time'
import { travelTo } from './travel'

/**
 * 1.42 The back yard (user: "đằng sau có cửa bấm vào ra phần vườn sau nhà có nuôi gà"). The back door of the home
 * leads to scene `homeYard` (scenes/HomeYard): the hens and their coop, the vegetable beds, the water jars.
 * Once a day you can scatter rice for the hens (→ eggs the next morning), and water the greens (three waterings →
 * a bunch of rau muống to pick). The yard follows the family's debt like the house: hens get sold (`yardHens()`),
 * the beds go dry.
 *
 * Flags: `yard.fedDay`, `yard.eggDay` (eggs taken), `yard.waterDay`, `yard.waterCount`, `yard.visited`.
 */

const today = () => useTime.getState().day
const flagDay = (key: string) => {
  const v = getFlag(key)
  return typeof v === 'number' ? v : -99
}

/** How many grown hens are left (plus the rooster and chicks only while the family has no debts). */
export function yardHens(level = houseLevel()) {
  return [5, 4, 2, 1][Math.min(3, Math.max(0, level))]
}

/** Visual hooks for the yard scene: the time (seconds) rice was last scattered, so the hens come running. */
export const yardFx = { fedAt: -100 }

export const canFeed = () => flagDay('yard.fedDay') !== today()
export const eggsReady = () => flagDay('yard.fedDay') === today() - 1 && flagDay('yard.eggDay') !== today()
export const canWater = () => flagDay('yard.waterDay') !== today()
export const canHarvest = () => (Number(getFlag('yard.waterCount')) || 0) >= 3

function feed() {
  if (!canFeed()) {
    say({ vi: 'Hôm nay cho gà ăn rồi — chúng no căng diều, đang đi dạo.', en: 'The hens have been fed today.' }, 'info')
    return false
  }
  setFlag('yard.fedDay', today())
  yardFx.fedAt = performance.now() / 1000
  spendTime(5)
  playSfx('pickup')
  const hens = yardHens()
  say(
    hens > 1
      ? { vi: 'Rắc một nắm thóc: "Bập bập bập!" — cả đàn gà chạy tới mổ lia lịa. Mai ra nhặt trứng nhé.', en: 'You scatter rice — the hens come running. Eggs tomorrow.' }
      : { vi: 'Rắc nắm thóc cho con gà mái cuối cùng. Chuồng vắng quá… Mai ra xem có trứng không.', en: 'You feed the last hen. Look for an egg tomorrow.' },
    'good',
  )
  return true
}

function eggs() {
  if (!eggsReady()) {
    say({ vi: 'Ổ rơm chưa có trứng. Cho gà ăn hôm nay, sáng mai sẽ có.', en: 'No eggs yet. Feed the hens today, eggs tomorrow.' }, 'info')
    return false
  }
  if (!canCarry(ITEMS.trungGa.weight)) return false
  setFlag('yard.eggDay', today())
  useInventory.getState().add('trungGa', 1)
  playSfx('success')
  say({ vi: 'Nhặt được mấy quả trứng gà ta còn ấm trong ổ rơm 🥚', en: 'You pick up warm eggs from the straw nest 🥚' }, 'good')
  return true
}

function water() {
  if (!canWater()) {
    say({ vi: 'Rau tưới hôm nay rồi, tưới nữa úng mất.', en: 'Already watered today.' }, 'info')
    return false
  }
  setFlag('yard.waterDay', today())
  setFlag('yard.waterCount', (Number(getFlag('yard.waterCount')) || 0) + 1)
  spendTime(10)
  playSfx('sip')
  say({ vi: 'Múc nước chum tưới mấy luống rau muống, rau cải. Đất thơm mùi ẩm.', en: 'You water the beds from the jar.' }, 'good')
  return true
}

function harvest() {
  if (!canHarvest()) {
    say({ vi: 'Rau còn non lắm. Tưới thêm vài hôm nữa.', en: 'The greens are still small.' }, 'info')
    return false
  }
  if (!canCarry(ITEMS.rauMuong.weight)) return false
  setFlag('yard.waterCount', 0)
  useInventory.getState().add('rauMuong', 1)
  spendTime(10)
  playSfx('success')
  say({ vi: 'Hái được một bó rau muống non. Tối nay có rau muống luộc chấm nước mắm rồi!', en: 'You pick a bunch of water spinach.' }, 'good')
  return true
}

registerActions({
  'home.toYard': () => {
    playSfx('door')
    setFlag('yard.visited', true)
    travelTo('homeYard', 'default', { minutes: 1 })
    return true
  },
  'yard.toHouse': () => {
    playSfx('door')
    travelTo('home', 'backDoor', { minutes: 1 })
    return true
  },
  'yard.feed': feed,
  'yard.eggs': eggs,
  'yard.water': water,
  'yard.harvest': harvest,
})

registerTests({
  'yard.canFeed': canFeed,
  'yard.eggsReady': eggsReady,
  'yard.canWater': canWater,
  'yard.canHarvest': canHarvest,
})
