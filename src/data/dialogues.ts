import type { DialogueDef } from './dialogueTypes'
import { GERMANY_DIALOGUES } from './dialogues/germany'
import { STORY_DIALOGUES } from './dialogues/story'
import { STREET_DIALOGUES } from './dialogues/street'
import { UNIVERSITY_DIALOGUES } from './dialogues/university'
import { EXPLORE_DIALOGUES } from './dialogues/explore'
import { OFFICE_DIALOGUES } from './dialogues/offices'
import { VN21_DIALOGUES } from './dialogues/vn21'
import { GOLD_DIALOGUES } from './dialogues/gold'
import { VEHICLE_DIALOGUES } from './dialogues/vehicles'
import { EATERY_DIALOGUES } from './dialogues/eateries'

export type { DialogueChoice, DialogueDef, DialogueEffect, DialogueNode } from './dialogueTypes'

/** All conversations by id (NPCs reference them via `dialogueId`). */
export const DIALOGUES: Record<string, DialogueDef> = {
  ...STREET_DIALOGUES,
  ...STORY_DIALOGUES,
  ...GERMANY_DIALOGUES,
  ...UNIVERSITY_DIALOGUES,
  ...EXPLORE_DIALOGUES,
  ...OFFICE_DIALOGUES,
  ...GOLD_DIALOGUES,
  ...VEHICLE_DIALOGUES,
  ...EATERY_DIALOGUES,
  // Story 2.1 (Vietnam): overrides the older family / teacher / Mai / embassy lines.
  ...VN21_DIALOGUES,
}
