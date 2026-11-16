import App from './App'
import { initAudio, setMusicTheme } from './game/systems/audio'
import './game/systems/gameplay'
import { loadGame, startAutosave } from './game/systems/save'
import { startWatchers } from './game/systems/watchers'
import { startGuide } from './game/systems/guide'
import { SCENES } from './game/scenes/registry'
import { useWorld } from './store/worldStore'
import { useUI } from './store/uiStore'
import { startNet } from './net/client'
import { startSocial } from './net/social'
import { startSecrets } from './game/systems/secrets'
import { SECRETS_ENABLED } from './data/secrets'
import { startStory } from './game/systems/story'

/**
 * The game itself, loaded after the title screen (keeps the first paint light).
 * Module side effects run once, on first import.
 */

// Restore progress before the first render, then keep saving automatically.
// No save yet (first game, or the character was deleted in Settings): pick male / female first.
// Automated tests skip it unless the URL has ?create.
const hadSave = loadGame()
if (!hadSave && !(import.meta.env.DEV && navigator.webdriver && !location.search.includes('create'))) {
  useUI.getState().openPanel({ type: 'create' })
}
startAutosave()
startWatchers()
startGuide()
initAudio()
// Signed in: multiplayer room + cloud save (does nothing offline / without an account).
startSocial()
startNet()
if (SECRETS_ENABLED) startSecrets()
startStory()

// Background music follows the place you're in.
const applyMusic = () => {
  const scene = SCENES[useWorld.getState().scene]
  setMusicTheme(scene.indoor ? 'indoor' : scene.country)
}
applyMusic()
useWorld.subscribe(applyMusic)

export default App
