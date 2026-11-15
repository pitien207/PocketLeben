import { FORTUNES } from '../../data/fortunes'
import { useInventory } from '../../store/inventoryStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { registerActions, runAction } from './actions'
import { playSfx } from './audio'
import { bumpFlag, getFlag, registerTests, setFlag } from './conditions'
import { openDialogue } from './dialogue'
import { spendTime } from './time'

/**
 * Things to do in the new districts (1.7): draw a fortune stick at the đình, read at the
 * old bookshop, swing in the Stadtpark, feed the ducks, learn words from Oma Gerda.
 * Most give their full bonus once per day.
 */

const today = () => useTime.getState().day
const doneToday = (key: string) => getFlag(key) === today()

/** At the hall: ask Ông Từ for a fortune. */
function fortune() {
  setFlag('fortune.ask', true)
  openDialogue('ongTu')
  setFlag('fortune.ask', false)
  return true
}

function drawFortune() {
  if (doneToday('fortune.day')) return false
  const i = Math.floor(Math.random() * FORTUNES.length)
  setFlag('fortune.day', today())
  setFlag('fortune.result', i)
  setFlag('fortune.first', true)
  bumpFlag('stats.fortunes')
  usePlayer.getState().changeMood(FORTUNES[i].mood)
  playSfx('bell')
  return true
}

function readBook() {
  if (doneToday('books.day')) {
    pushToast('toast.readAgain', 'info')
    return false
  }
  setFlag('books.day', today())
  bumpFlag('stats.booksRead')
  const p = usePlayer.getState()
  p.addGermanXp(12)
  p.changeMood(4)
  spendTime(45)
  playSfx('pickup')
  pushToast('toast.readBook', 'good', { xp: 12 })
  return true
}

function swing() {
  const p = usePlayer.getState()
  const first = !doneToday('park.swingDay')
  setFlag('park.swingDay', today())
  bumpFlag('stats.swings')
  p.changeMood(first ? 10 : 3)
  spendTime(15)
  playSfx('success')
  pushToast(first ? 'toast.swing' : 'toast.swingAgain', 'good')
  return true
}

const BREAD = ['broetchen', 'brezel']

function feedDucks() {
  const inv = useInventory.getState()
  const bread = BREAD.find((id) => (inv.items[id] ?? 0) > 0)
  if (!bread) {
    pushToast('toast.needBread', 'info')
    return false
  }
  inv.remove(bread)
  bumpFlag('stats.ducks')
  usePlayer.getState().changeMood(doneToday('park.duckDay') ? 3 : 10)
  setFlag('park.duckDay', today())
  spendTime(10)
  playSfx('pickup')
  pushToast('toast.ducks', 'good')
  return true
}

function gerdaWords() {
  if (doneToday('park.wordsDay')) return false
  setFlag('park.wordsDay', today())
  bumpFlag('stats.gerdaWords')
  usePlayer.getState().addGermanXp(8)
  pushToast('toast.wordsLearned', 'good', { xp: 8 })
  return true
}

/** Ngọc Sơn: light incense and make a wish — calm and luck, once a day. */
function incense() {
  if (doneToday('incense.day')) {
    pushToast('toast.incenseAgain', 'info')
    return false
  }
  setFlag('incense.day', today())
  bumpFlag('stats.incense')
  usePlayer.getState().changeMood(12)
  spendTime(15)
  playSfx('bell')
  pushToast('toast.incense', 'good')
  return true
}

registerActions({
  'place.incense': incense,
  'place.fortune': fortune,
  'place.drawFortune': drawFortune,
  'place.readBook': readBook,
  'park.swing': swing,
  'park.ducks': feedDucks,
  'park.words': gerdaWords,
  'park.eis': () => {
    setFlag('stats.eis', 1)
    return runAction('de.openShop', 'eiswagen')
  },
})

registerTests({
  'fortune.today': () => doneToday('fortune.day'),
  'park.wordsToday': () => doneToday('park.wordsDay'),
})
