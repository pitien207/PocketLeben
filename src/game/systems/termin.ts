/**
 * Booked Termin slots (minigames/TerminHunt.tsx → systems/visa.ts, germany.ts): the mini-game's
 * result value is days-from-today × 1440 + minute of the day; −1 = closed with ✕.
 */
export const TERMIN_CANCELLED = -1
export const encodeSlot = (dayOffset: number, minutes: number) => dayOffset * 1440 + minutes
export const decodeSlot = (value: number) => ({ dayOffset: Math.floor(value / 1440), minutes: value % 1440 })
