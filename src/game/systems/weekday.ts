/**
 * Weekday of a game day (0 = Monday), with no imports: say.ts needs it, and importing time.ts there closed an
 * import cycle (say → time → workStore → jobs → family → say) that crashed the game at start (1.33).
 */
export const weekdayIndex = (day: number) => (((day - 1) % 7) + 7) % 7
