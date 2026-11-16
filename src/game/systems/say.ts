import { currentLanguage, localize, type Localized } from '../../i18n/localized'
import { formatMoney } from '../../i18n/format'
import { pushToast, type ToastTone } from '../../store/toastStore'
import { useTime } from '../../store/timeStore'
import { weekdayIndex } from './time'

/** A toast with content text written in the data (Localized), e.g. story reactions. */
export function say(text: Localized, tone: ToastTone = 'info', vars: Record<string, string | number> = {}) {
  let s = localize(text, currentLanguage())
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  pushToast('toast.event', tone, { text: s })
}

export const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })
export const vnd = (n: number) => formatMoney(n, 'VND')
/** "05/10" in the player's language. */
const WEEKDAYS = ['thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy', 'Chủ nhật']
export const weekdayName = (day: number) => WEEKDAYS[weekdayIndex(day)]

/**
 * 1.20: the game shows no calendar dates any more (the user's wish). A day is named by how far away
 * it is: "hôm nay", "mai", "thứ Năm (3 ngày nữa)".
 */
export function dateLabel(day: number) {
  const diff = Math.round(day - useTime.getState().day)
  if (diff === 0) return 'hôm nay'
  if (diff === 1) return 'mai'
  if (diff < 0) return `${-diff} ngày trước`
  return `${weekdayName(day)} (${diff} ngày nữa)`
}
