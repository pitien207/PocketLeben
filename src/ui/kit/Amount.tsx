import NumberFlow from '@number-flow/react'
import type { Currency } from '../../i18n/format'
import { formatMoney } from '../../i18n/format'

/**
 * 1.47 UI kit: numbers that roll to their new value (NumberFlow, MIT). The digits live in a shadow
 * root, so a hidden plain copy keeps `textContent` / screen readers / tests reading the real text.
 */
export function Amount({ value, decimals = 0, className = '' }: { value: number; decimals?: number; className?: string }) {
  const text = value.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span className="sr-only">{text}</span>
      <NumberFlow
        aria-hidden="true"
        value={value}
        locales="vi-VN"
        format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
        willChange
        spinTiming={{ duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
    </span>
  )
}

/** Money in the player's currency ("84.000đ", "12,50 €") with rolling digits. */
export function Money({ amount, currency, className = '' }: { amount: number; currency: Currency; className?: string }) {
  const text = formatMoney(amount, currency)
  const eur = currency === 'EUR'
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span className="sr-only">{text}</span>
      <NumberFlow
        aria-hidden="true"
        value={eur ? amount : Math.round(amount)}
        locales={eur ? 'de-DE' : 'vi-VN'}
        format={eur ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 }}
        suffix={eur ? ' €' : 'đ'}
        willChange
        spinTiming={{ duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
    </span>
  )
}
