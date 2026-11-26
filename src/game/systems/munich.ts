import { MUC_SIGHTS, MUC_SIGHT_IDS } from '../../data/munich'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, getFlag, registerTests, setFlag } from './conditions'
import { say } from './say'
import { travelTo } from './travel'
import { check } from './conditions'
import type { Condition } from '../../data/conditions'

/**
 * 1.44 München: looking at the sights (data/munich.ts) — flag `muc.seen.<id>`, the "Khám phá München" side quest
 * (test `muc.allSeen`) — and walking into the LMU (the university scene) from Ludwigstraße.
 */

export const sightsSeen = () => MUC_SIGHT_IDS.filter((id) => getFlag(`muc.seen.${id}`)).length

function lookAt(arg?: string) {
  const sight = MUC_SIGHTS.find((s) => s.id === arg)
  if (!sight) return false
  const first = !getFlag(`muc.seen.${sight.id}`)
  playSfx(first ? 'success' : 'click')
  say({ vi: `📍 ${sight.name.vi}: ${sight.blurb.vi}`, en: `📍 ${sight.name.en}: ${sight.blurb.en}` }, 'info')
  if (first) {
    setFlag(`muc.seen.${sight.id}`, true)
    bumpFlag('stats.sights')
    const n = sightsSeen()
    const all = MUC_SIGHT_IDS.length
    if (n === all) say({ vi: `🏆 Bạn đã đi hết ${all} địa danh của München — giờ bạn là dân München thật rồi!`, en: `You have seen all ${all} sights of Munich!` }, 'good')
    else say({ vi: `Khám phá München: ${n}/${all} địa danh`, en: `Exploring Munich: ${n}/${all} sights` }, 'good')
  }
  return true
}

/** Students walk into the LMU; everyone else only looks at it. */
const UNI_ALLOWED: Condition = { any: [{ flag: 'visa.path', is: 'studium' }, { flag: 'talked.anna' }] }

function walkUni() {
  if (!check(UNI_ALLOWED)) return lookAt('lmu')
  playSfx('door')
  travelTo('university', 'default', { minutes: 2 })
  return true
}

registerActions({
  'muc.sight': lookAt,
  'muc.walkUni': walkUni,
})

registerTests({
  'muc.allSeen': () => sightsSeen() === MUC_SIGHT_IDS.length,
})

export { UNI_ALLOWED }
