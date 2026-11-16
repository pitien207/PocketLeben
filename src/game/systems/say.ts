import { currentLanguage, localize, type Localized } from '../../i18n/localized'
import { formatMoney } from '../../i18n/format'
import { pushToast, type ToastTone } from '../../store/toastStore'
import { useSettings } from '../../store/settingsStore'
import { shortDate } from './calendar'

/** A toast with content text written in the data (Localized), e.g. story reactions. */
export function say(text: Localized, tone: ToastTone = 'info', vars: Record<string, string | number> = {}) {
  let s = localize(text, currentLanguage())
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  pushToast('toast.event', tone, { text: s })
}

export const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })
export const vnd = (n: number) => formatMoney(n, 'VND')
/** "05/10" in the player's language. */
export const dateLabel = (day: number) => shortDate(day, useSettings.getState().language)
