import { CONFIG } from '../data/config'
import { VISA_PATH_NAMES, type DocDef } from '../data/visa'
import { runAction } from '../game/systems/actions'
import { check, getFlag } from '../game/systems/conditions'
import { formatClock } from '../game/systems/time'
import { dateLabel } from '../game/systems/say'
import { useGuide } from '../store/guideStore'
import { pushToast } from '../store/toastStore'
import {
  canRemonstrate,
  docProgress,
  docsComplete,
  docsFor,
  doDocStep,
  eurosInHand,
  laptopFlightPrice,
  manual as isManual,
  nextApsRound,
  officeFlag,
  officeOptions,
  officePending,
  packageAvailable,
  stepCost,
  terminDay,
  visaPath,
  visaReady,
} from '../game/systems/visa'
import { formatMoney } from '../i18n/format'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useFlags } from '../store/flagsStore'
import { usePlayer } from '../store/playerStore'
import { useTime } from '../store/timeStore'
import { useUI } from '../store/uiStore'
import { useWorld } from '../store/worldStore'
import { Sheet } from './Sheet'
import { PinIcon } from './icons'

const V = CONFIG.visa

/** Quest step that leads to a document done in a real place (for "Chỉ đường"). */
function stepFor(docId: string): string | null {
  if (docId === 'photos') return 'visa.photos'
  if (docId === 'diploma') return check({ test: 'visa.originals' }) ? 'visa.notary' : 'visa.originals'
  if (docId === 'aps') return 'visa.aps'
  if (docId === 'cv') return 'visa.writing'
  if (docId === 'portal') return 'visa.portal'
  return null
}

/**
 * The visa file (story 2.1): each document can be done yourself, or (💼) by chị Mai's office —
 * Tuấn always has a phone free, so you can order from here. Then the VFS slot, the interview,
 * a Remonstration after a rejection, the flight and the euros for the first week.
 */
export function VisaPanel() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  useFlags((s) => s.flags)
  const day = useTime((s) => s.day)
  const money = usePlayer((s) => s.money)
  const scene = useWorld((s) => s.scene)
  if (panel?.type !== 'visa') return null

  const path = visaPath()
  const docs = docsFor(path)
  const done = docs.filter((d) => docProgress(d) >= d.steps.length).length
  const termin = terminDay()
  const ready = visaReady()
  const readyDay = getFlag('visa.readyDay')
  const offers = officeOptions()
  const vi = (a: string, b: string) => localize({ vi: a, en: b })

  const directions = (doc: DocDef, label: string) => {
    const id = stepFor(doc.id)
    if (!id) return
    useGuide.getState().setFocus(id)
    closePanel()
    pushToast('toast.guideTo', 'info', { step: label })
  }

  return (
    <Sheet title={t('visa.title')} icon="identification-card" onClose={closePanel}>
      {path && (
        <p className="mb-2 text-center text-sm font-extrabold">
          {localize(VISA_PATH_NAMES[path])} · {t('visa.docsCount', { done, total: docs.length })}
          {getFlag('cauNoi.signed') ? ' · Cầu nối Sonnenhof' : ''}
        </p>
      )}
      <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-jade transition-all" style={{ width: `${(done / Math.max(1, docs.length)) * 100}%` }} />
      </div>

      {packageAvailable() && (
        <button
          type="button"
          data-testid="office-package"
          onClick={() => runAction('office.package')}
          className={`mb-2 w-full rounded-2xl py-2 text-[13px] font-extrabold ${money >= V.officePackage ? 'btn-lacquer' : 'bg-ink/15 text-ink/50'}`}
        >
          💼 {vi('Trọn gói văn phòng Mai Anh', 'Mai Anh office: full package')} · {formatMoney(V.officePackage)}
        </button>
      )}

      <ul className="flex flex-col gap-1.5">
        {docs.map((doc) => {
          const progress = docProgress(doc)
          const complete = progress >= doc.steps.length
          const step = doc.steps[progress]
          const cost = step ? stepCost(step) : 0
          const readyAt = getFlag(`doc.${doc.id}.ready`)
          const byOffice = officePending(doc)
          const manual = !!step && isManual(step) && !byOffice
          const label = step ? localize(step.label) : ''
          return (
            <li key={doc.id} data-testid={`doc-${doc.id}`} className="rounded-2xl bg-white/80 px-3 py-2 shadow-[inset_0_0_0_2px_#f1dcb6]">
              <div className="flex items-center gap-2">
                <span className="text-lg">{complete ? '✅' : byOffice ? '💼' : progress > 0 ? '📝' : '📄'}</span>
                <span className="flex-1">
                  <span className="block text-[13px] leading-tight font-extrabold">{localize(doc.name)}</span>
                  {!complete && (
                    <span className="text-[11px] font-bold text-ink/60">
                      {byOffice
                        ? vi(`Tuấn trả giấy ngày ${dateLabel(getFlag(officeFlag(doc.id)) as number)}`, `Tuấn brings it on ${dateLabel(getFlag(officeFlag(doc.id)) as number)}`)
                        : doc.id === 'aps' && progress === 1
                          ? vi(`Đợt phỏng vấn tiếp theo: ${dateLabel(nextApsRound())}`, `Next interview round: ${dateLabel(nextApsRound())}`)
                          : step?.auto && typeof readyAt === 'number' && !(step.cost || step.minutes)
                            ? t('visa.waitUntil', { day: dateLabel(readyAt) })
                            : label}
                    </span>
                  )}
                </span>
              </div>
              {!complete && step && (manual || offers.includes(doc)) && (
                <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
                  {manual && step.at && step.at !== 'bank' && (
                    <button
                      type="button"
                      data-testid={`directions-${doc.id}`}
                      onClick={() => directions(doc, label)}
                      className="rounded-xl border-2 border-lacquer bg-white px-2.5 py-1 text-[12px] font-black text-lacquer active:translate-y-0.5"
                    >
                      <PinIcon className="mr-0.5 inline align-[-2px]" />
                      {t('quests.directions')}
                    </button>
                  )}
                  {manual && !step.at && (step.cost !== undefined || step.minutes !== undefined) && (
                    <button
                      type="button"
                      data-testid={`diy-${doc.id}`}
                      onClick={() => doDocStep(doc.id)}
                      className={`rounded-xl px-2.5 py-1 text-[12px] font-black active:translate-y-0.5 ${cost > money ? 'bg-ink/15 text-ink/50' : 'btn-jade'}`}
                    >
                      🧍 {label}
                      {cost > 0 && <span className="ml-1 opacity-90">· {formatMoney(cost)}</span>}
                    </button>
                  )}
                  {offers.includes(doc) && doc.office && (
                    <button
                      type="button"
                      data-testid={`office-${doc.id}`}
                      onClick={() => runAction('office.buy', doc.id)}
                      className={`rounded-xl px-2.5 py-1 text-[12px] font-black active:translate-y-0.5 ${doc.office > money ? 'bg-ink/15 text-ink/50' : 'bg-[#2f6fb0] text-white shadow-[0_3px_0_#1f4c7a]'}`}
                    >
                      💼 {vi('Văn phòng', 'Office')} · {formatMoney(doc.office)}
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-3 rounded-2xl bg-white/80 p-3 text-center shadow-[inset_0_0_0_2px_#f1dcb6]">
        {ready ? (
          <>
            <p className="font-display text-lg font-extrabold text-jade">🛂 {t('visa.ready')}</p>
            {!getFlag('visa.flight') ? (
              <div className="mt-2 flex flex-col gap-1.5">
                <button type="button" data-testid="flight-mai" onClick={() => runAction('visa.buyFlight')} className="w-full rounded-2xl btn-lacquer py-2 font-extrabold">
                  ✈ {vi('Đặt vé qua văn phòng chị Mai', 'Book through Mai’s office')} · {formatMoney(V.flightCost)}
                </button>
                {scene === 'home' ? (
                  <button type="button" data-testid="flight-laptop" onClick={() => runAction('visa.flightLaptop')} className="w-full rounded-2xl btn-jade py-2 font-extrabold">
                    💻 {vi('Tự đặt trên laptop (giá hôm nay)', 'Book it yourself on the laptop (today’s price)')} · {formatMoney(laptopFlightPrice(day))}
                  </button>
                ) : (
                  <p className="text-[12px] font-bold text-ink/60">
                    {vi(`Hoặc tự đặt trên laptop ở nhà: giá hôm nay ${formatMoney(laptopFlightPrice(day))} (15–20 triệu, đổi mỗi ngày).`, `Or book it on the laptop at home: today ${formatMoney(laptopFlightPrice(day))} (15–20 million, changes daily).`)}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm font-bold">{t('visa.goAirport')}</p>
            )}
            <p className="mt-2 text-[12px] font-bold text-ink/60">
              {vi(`Euro trong ví: ${eurosInHand()} € — tuần đầu ở Đức cần ~${V.firstWeekEur} €.`, `Euros in hand: €${eurosInHand()} — the first week needs ~€${V.firstWeekEur}.`)}
            </p>
          </>
        ) : typeof readyDay === 'number' && readyDay > 0 ? (
          <p className="text-sm font-extrabold">{t('visa.processing', { day: dateLabel(readyDay) })}</p>
        ) : termin && termin >= day ? (
          <>
            <p className="text-sm font-extrabold">
              📅 {vi('Lịch hẹn VFS', 'VFS appointment')}: {dateLabel(termin)}
              {typeof getFlag('visa.terminTime') === 'number' ? ` · ${formatClock(getFlag('visa.terminTime') as number)}` : ''}
            </p>
            <p className="mt-1 text-[12px] font-bold text-ink/60">
              {vi(`Hôm đó: Anh Tú xe ôm → VFS. Phí visa 75 € (${formatMoney(V.vfsVisaFee)}) + phí VFS ${formatMoney(V.vfsServiceFee)}.`, `On the day: Tú (xe ôm) → VFS. Visa fee €75 (${formatMoney(V.vfsVisaFee)}) + VFS fee ${formatMoney(V.vfsServiceFee)}.`)}
            </p>
          </>
        ) : (
          <>
            {canRemonstrate() && (
              <div className="mb-2 rounded-xl bg-lacquer/10 p-2">
                <p className="mb-1.5 text-[12px] font-bold">{vi('Visa bị từ chối. Viết đơn khiếu nại trong 7 ngày (miễn phí nếu viết tốt), hoặc nộp lại từ đầu.', 'Visa refused. Write a Remonstration within 7 days (free if well written), or apply again.')}</p>
                <button type="button" data-testid="remonstrate" onClick={() => runAction('visa.remonstrate')} className="w-full rounded-2xl btn-jade py-2 font-extrabold">
                  ✉️ {vi('Viết đơn Remonstration', 'Write a Remonstration')}
                </button>
              </div>
            )}
            {getFlag('office.termin') ? (
              <p className="text-[13px] font-bold text-ink/70">💼 {vi('Tuấn đang săn lịch VFS hộ — đủ giấy tờ là có lịch sau 2–4 ngày.', 'Tuấn is hunting your VFS slot — 2–4 days once your papers are complete.')}</p>
            ) : (
              <>
                <p className="mb-2 text-[13px] font-bold text-ink/70">{docsComplete() ? t('visa.readyForTermin') : t('visa.terminHint')}</p>
                <button type="button" data-testid="hunt" onClick={() => runAction('visa.termin')} className="w-full rounded-2xl btn-lacquer py-2.5 font-extrabold">
                  📅 {t('visa.huntTermin')}
                </button>
                {path && (
                  <button
                    type="button"
                    data-testid="office-termin"
                    onClick={() => runAction('office.termin')}
                    className={`mt-1.5 w-full rounded-2xl py-2 text-[13px] font-extrabold ${money >= V.officeTermin ? 'bg-[#2f6fb0] text-white shadow-[0_3px_0_#1f4c7a]' : 'bg-ink/15 text-ink/50'}`}
                  >
                    💼 {vi('Nhờ Tuấn săn lịch hộ', 'Let Tuấn hunt it for you')} · {formatMoney(V.officeTermin)}
                  </button>
                )}
                <p className="mt-1.5 text-[11px] font-bold text-lacquer">{vi('Lịch hẹn VFS miễn phí — ai rao bán lịch là lừa đảo!', 'VFS slots are free — anyone selling them is a scammer!')}</p>
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}
