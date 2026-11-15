import { CHAPTER_INTROS } from '../../data/story'
import { useDialogue } from '../../store/dialogueStore'
import { useFlags } from '../../store/flagsStore'
import { useUI } from '../../store/uiStore'
import { flagNumber, getFlag, setFlag } from './conditions'
import { currentObjective } from './watchers'

/**
 * Chapter cards: when the story reaches a new chapter, a short narration appears once
 * (flag `story.chapterSeen`). Waits for the first-time tour and for quiet moments.
 */
function maybeShow() {
  if (!getFlag('tut.done')) return
  const ui = useUI.getState()
  if (ui.chapterCard !== null || ui.settingsOpen || ui.transition || ui.panel || ui.sleeping || ui.fastForward || ui.newDayOpen || useDialogue.getState().npcId) return
  const chapter = currentObjective()?.quest.chapter
  if (!chapter || !CHAPTER_INTROS[chapter] || chapter <= flagNumber('story.chapterSeen')) return
  setFlag('story.chapterSeen', chapter)
  ui.setChapterCard(chapter)
}

export function startStory(): () => void {
  const id = window.setInterval(maybeShow, 1500)
  const unsub = useFlags.subscribe(() => window.setTimeout(maybeShow, 2500))
  return () => {
    window.clearInterval(id)
    unsub()
  }
}
