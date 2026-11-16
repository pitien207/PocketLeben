import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { useLocalize, type Localized } from '../i18n/localized'
import { useUI } from '../store/uiStore'
import { LoaderArt, LoaderLogo } from './LoaderArt'

const L = (vi: string, en: string, de: string): Localized => ({ vi, en, de })

/** Rotating tips under the loading bar (true to how the game plays). */
const TIPS: { label: 'tip' | 'word'; text: Localized }[] = [
  { label: 'tip', text: L('Có B1 là cửa Ausbildung rộng hơn hẳn.', 'With B1, the door to an Ausbildung opens wide.', 'Mit B1 stehen dir viel mehr Ausbildungen offen.') },
  { label: 'tip', text: L('Săn lịch Đại sứ quán: bấm Tải lại liên tục, ô trống chỉ hiện trong chớp mắt!', 'Embassy Termin: keep pressing Refresh — a free slot only shows for a blink!', 'Botschaftstermin: immer wieder aktualisieren — freie Termine sind blitzschnell weg!') },
  { label: 'tip', text: L('Đi làm thêm ở tiệm trà sữa kiếm tiền, nhưng đừng bỏ học nha.', 'Shifts at the café pay the bills — just don’t skip class.', 'Schichten im Café bringen Geld — aber schwänz den Kurs nicht.') },
  { label: 'tip', text: L('Chứng minh tài chính: ra ngân hàng, trong ví đủ tiền là xong.', 'Proof of funds: go to the bank — enough money in your wallet is all it takes.', 'Finanzierungsnachweis: zur Bank — genug Geld im Geldbeutel reicht.') },
  { label: 'tip', text: L('Đổi đủ Euro trước khi bay, sang Đức là tiêu toàn bằng Euro.', 'Change enough euros before you fly — Germany runs on euros.', 'Tausch genug Euro vor dem Flug — in Deutschland zahlst du in Euro.') },
  { label: 'tip', text: L('Ở Đức, chai nhựa Pfand trả lại được 0,25 €.', 'In Germany, a Pfand bottle gets you €0.25 back.', 'In Deutschland bringt eine Pfandflasche 0,25 € zurück.') },
  { label: 'tip', text: L('Bấm vào một nhiệm vụ để được chỉ đường tận nơi.', 'Tap a task in the quest log and the arrow shows you the way.', 'Tippe auf eine Aufgabe — der Pfeil zeigt dir den Weg.') },
  { label: 'word', text: L('„Viel Erfolg!" = „Chúc thành công!"', '“Viel Erfolg!” = “Good luck!”', '„Viel Erfolg!" = „Chúc thành công!" auf Vietnamesisch') },
]

/**
 * Covers the screen until the 3D scene has rendered a few frames, then fades out. The art is the
 * user's design (dusk on a Hà Nội rooftop); the bar eases toward 92 % while loading, fills on ready.
 */
export function LoadingScreen() {
  const t = useT()
  const localize = useLocalize()
  const ready = useUI((s) => s.sceneReady)
  const [gone, setGone] = useState(false)
  const [progress, setProgress] = useState(4)
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length))
  const [tipShown, setTipShown] = useState(true)

  useEffect(() => {
    if (ready) {
      setProgress(100)
      const id = window.setTimeout(() => setGone(true), 900)
      return () => window.clearTimeout(id)
    }
    const id = window.setInterval(() => setProgress((p) => p + (92 - p) * 0.05), 120)
    return () => window.clearInterval(id)
  }, [ready])

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipShown(false)
      window.setTimeout(() => {
        setTip((i) => (i + 1) % TIPS.length)
        setTipShown(true)
      }, 350)
    }, 4000)
    return () => window.clearInterval(id)
  }, [])

  if (gone) return null
  const pct = Math.round(progress)
  const message = ready ? t('loading.ready') : pct < 50 ? t('loading.assets') : t('loading.text')
  const current = TIPS[tip]

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="loading-screen"
      className={`absolute inset-0 z-50 overflow-hidden bg-[#2f1d36] font-display text-white transition-opacity duration-500 ${ready ? 'pointer-events-none opacity-0 delay-300' : 'opacity-100'}`}
    >
      <LoaderArt />
      <LoaderLogo />
      <div className="absolute left-1/2 z-[2] w-[min(560px,86vw)] -translate-x-1/2 text-center" style={{ bottom: 'max(5vh, 22px)' }}>
        <p
          className={`mb-3.5 min-h-[2.8em] text-[clamp(14px,2.2vw,16px)] leading-[1.35] font-semibold text-[#fbe9d4] transition-opacity duration-300 [text-shadow:0_2px_6px_rgba(0,0,0,.6)] ${tipShown ? 'opacity-100' : 'opacity-0'}`}
        >
          <b className="text-[#ffc65c]">{t(current.label === 'tip' ? 'loading.tip' : 'loading.word')}:</b> {localize(current.text)}
        </p>
        <div className="relative h-3 overflow-hidden rounded-full bg-[rgba(20,10,30,.55)] shadow-[inset_0_0_0_2px_rgba(255,230,200,.25)]">
          <div
            className="absolute inset-y-0.5 left-0.5 overflow-hidden rounded-full bg-linear-to-r from-[#ff9a52] to-[#ffc65c] shadow-[0_0_12px_#ffb35c] transition-[width] duration-300"
            style={{ width: `calc(${pct}% - 4px)` }}
          >
            <span className="absolute inset-0 animate-[ld-shine_1.6s_linear_infinite] bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.55)_50%,transparent_70%)]" />
          </div>
        </div>
        <div className="mt-1.5 flex justify-between text-[13px] font-semibold text-[#e9d3c0] [text-shadow:0_1px_4px_rgba(0,0,0,.6)]">
          <span>{message}</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
      </div>
      <span className="absolute right-3.5 bottom-2 z-[2] font-sans text-[11px] font-semibold text-[rgba(255,240,225,.45)]">v{__APP_VERSION__}</span>
    </div>
  )
}
