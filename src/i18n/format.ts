export type Currency = 'VND' | 'EUR'

const formatters: Record<Currency, Intl.NumberFormat> = {
  VND: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }),
}
const groups = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

/** Money is shown in VND in Vietnam and EUR in Germany (plan §5). */
export function formatMoney(amount: number, currency: Currency = 'VND'): string {
  // 1.28: "84.000đ" — the ₫ sign renders as an underlined đ in our fonts, which the user found ugly.
  if (currency === 'VND') return `${amount < 0 ? '−' : ''}${groups.format(Math.abs(Math.round(amount)))}đ`
  return formatters[currency].format(amount)
}
