import type { DialogueDef } from './dialogueTypes'
import { GERMANY_DIALOGUES } from './dialogues/germany'
import { STORY_DIALOGUES } from './dialogues/story'
import { STREET_DIALOGUES } from './dialogues/street'
import { UNIVERSITY_DIALOGUES } from './dialogues/university'
import { EXPLORE_DIALOGUES } from './dialogues/explore'

export type { DialogueChoice, DialogueDef, DialogueEffect, DialogueNode } from './dialogueTypes'

/** All conversations by id (NPCs reference them via `dialogueId`). */
export const DIALOGUES: Record<string, DialogueDef> = {
  ...STREET_DIALOGUES,
  ...STORY_DIALOGUES,
  ...GERMANY_DIALOGUES,
  ...UNIVERSITY_DIALOGUES,
  ...EXPLORE_DIALOGUES,
}
