import { SECRETS, getSecret, type SecretDef } from '../../data/secrets'
import { currentLanguage, localize } from '../../i18n/localized'
import { useDialogue } from '../../store/dialogueStore'
import { useMinigame } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { pushToast } from '../../store/toastStore'
import { useUI } from '../../store/uiStore'
import { useWorld } from '../../store/worldStore'
import { SCENES } from '../scenes/registry'
import { playSfx } from './audio'
import { bumpFlag, check, getFlag, setFlag } from './conditions'
import { playerState } from './playerState'
import { giftClothing } from './wardrobe'

/** Exploration (data/secrets.ts): walk close to a hidden thing to find it. */

export const secretFound = (id: string) => !!getFlag(`secret.${id}`)
export const secretsFound = () => SECRETS.filter((s) => secretFound(s.id)).length

/** Secrets that could be found here and now (for the sparkles). */
export function activeSecrets(scene = useWorld.getState().scene): SecretDef[] {
  return SECRETS.filter((s) => s.scene === scene && !secretFound(s.id) && (!s.when || check(s.when)))
}

function busy() {
  const ui = useUI.getState()
  return ui.transition !== null || ui.sleeping || ui.fastForward !== null || useDialogue.getState().npcId !== null || useMinigame.getState().active !== null
}

export function discoverSecret(id: string) {
  const s = getSecret(id)
  if (!s || secretFound(id)) return false
  setFlag(`secret.${id}`, true)
  bumpFlag('stats.secrets')
  const p = usePlayer.getState()
  const r = s.reward
  // Money only in the local currency (the Tết trip home happens while you hold euros).
  const local = SCENES[s.scene].country === 'de' ? 'EUR' : 'VND'
  if (r.money && p.currency === local) p.addMoney(r.money)
  if (r.mood) p.changeMood(r.mood)
  if (r.energy) p.restoreEnergy(r.energy)
  if (r.german) p.addGermanXp(r.german)
  if (r.clothing) giftClothing(r.clothing)
  playSfx('success')
  // All of them: the golden hoodie.
  if (secretsFound() === SECRETS.length && giftClothing('giftHoodie')) setFlag('secret.all', true)
  const ui = useUI.getState()
  if (!ui.panel && !ui.settingsOpen) ui.openPanel({ type: 'secret', id })
  else pushToast('toast.secretFound', 'good', { name: localize(s.name, currentLanguage()) })
  return true
}

/** Checks the player's position a few times a second. */
export function startSecrets(): () => void {
  const id = window.setInterval(() => {
    if (busy() || playerState.locked) return
    const { x, z } = playerState.position
    for (const s of activeSecrets()) {
      if (Math.hypot(x - s.at.x, z - s.at.z) <= s.radius) {
        discoverSecret(s.id)
        break
      }
    }
  }, 350)
  return () => window.clearInterval(id)
}
