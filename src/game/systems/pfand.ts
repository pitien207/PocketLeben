import { CONFIG } from '../../data/config'
import { usePlayer } from '../../store/playerStore'
import { pushToast } from '../../store/toastStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, flagNumber, registerTests, setFlag } from './conditions'
import { canCarry } from './bag'
import { say } from './say'

/**
 * Pfand (plan §6 side hustles, milestone M8): collect bottles, return them for 25 cents each.
 * 1.44: bottles turn up at random spots all over München (systems/pfandWorld.ts); a rare golden one (flag
 * `pfand.gold`) is worth CONFIG.pfand.goldValue at the machine.
 */

export const carried = () => flagNumber('pfand.carried')
export const carriedGold = () => flagNumber('pfand.gold')

/** Room in the bag for one more bottle? (says so when not) */
export const roomForBottle = () => canCarry(CONFIG.bag.bottleKg)

/** A bottle goes into the bag (the caller checked the room). */
export function grantBottle(gold: boolean) {
  if (gold) {
    bumpFlag('pfand.gold')
    bumpFlag('stats.goldBottles')
    playSfx('success')
    say({ vi: `✨ Chai Pfand VÀNG! Hiếm lắm đấy — mang ra máy Pfand đổi được ${CONFIG.pfand.goldValue} €.`, en: `A GOLDEN Pfand bottle! Worth ${CONFIG.pfand.goldValue} € at the machine.` }, 'good')
    return
  }
  bumpFlag('pfand.carried')
  playSfx('pickup')
  pushToast('toast.bottlePicked', 'info', { n: carried() + carriedGold() })
}

/** Pick up a bottle if it fits in the bag (offline bottles). */
export function pickUpBottle(gold = false): boolean {
  if (!roomForBottle()) return false
  grantBottle(gold)
  return true
}

function returnBottles() {
  const n = carried()
  const g = carriedGold()
  if (n === 0 && g === 0) {
    pushToast('toast.noBottles', 'info')
    return false
  }
  const money = Math.round((n * CONFIG.pfand.perBottle + g * CONFIG.pfand.goldValue) * 100) / 100
  usePlayer.getState().addMoney(money)
  setFlag('pfand.carried', 0)
  setFlag('pfand.gold', 0)
  bumpFlag('stats.bottles', n + g)
  playSfx('coin')
  const euro = money.toFixed(2).replace('.', ',')
  if (g > 0) say({ vi: `Máy Pfand kêu "ding ding": ${n} chai + ${g} chai VÀNG → +${euro} €`, en: `${n} bottles + ${g} golden → +${euro} €` }, 'good')
  else pushToast('toast.pfandReturned', 'good', { n, money: euro })
  return true
}

registerActions({ 'de.pfandReturn': returnBottles })
registerTests({ 'pfand.carrying': () => carried() + carriedGold() > 0 })
