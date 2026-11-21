import { CONFIG } from '../data/config'
import { runAction } from '../game/systems/actions'
import { getFlag } from '../game/systems/conditions'
import { debtTotal, houseLevel } from '../game/systems/family'
import { useGrab } from '../game/systems/grab'
import { jobCount, jobDoneToday, jobRank, jobUnlocked, RANK_NAMES, teaBanLeft, teaStrikes, VN_JOBS, type VnJob } from '../game/systems/jobs'
import { formatMoney } from '../i18n/format'
import { useT } from '../i18n'
import { useLocalize, type Localized } from '../i18n/localized'
import { useFlags } from '../store/flagsStore'
import { useTime } from '../store/timeStore'
import { useUI } from '../store/uiStore'
import { useWorld } from '../store/worldStore'
import { CheckIcon, LockIcon } from './icons'

/**
 * "Bảng việc hôm nay" on the phone (story 2.1 §11.1): the four side jobs in Hà Nội, what each
 * pays, when, the rank, and whether it's done today. Plus Nicos Weg and what you owe.
 */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })
const vnd = (n: number) => formatMoney(n, 'VND')
const J = CONFIG.vnJobs

const JOBS: Record<VnJob, { name: Localized; where: Localized; pay: string; hours: string; lock: Localized }> = {
  cafe: {
    name: L('Pha trà sữa', 'Bubble-tea maker', 'Bubble-Tea-Service'),
    where: L('Tiệm Trà Sữa Phố Cổ, đầu phố (gặp chị Vy)', 'Old Quarter bubble tea, top of the street'),
    pay: `${vnd(J.tea.pay)} + tip`,
    hours: `${J.tea.hours[0]}–${J.tea.hours[1]}h`,
    lock: L('Chị Vy cho nghỉ việc vì bỏ ca giữa chừng nhiều quá.', 'Vy fired you for walking out too often.'),
  },
  circleK: {
    name: L('Trông quán Circle K', 'Circle K shop assistant', 'Circle-K-Aushilfe'),
    where: L('Góc Hàng Gai – Hàng Bông', 'Corner of Hàng Gai and Hàng Bông'),
    pay: `${vnd(J.circleK.day)} · ${L('đêm', 'night').vi} ${vnd(J.circleK.night)}`,
    hours: '6–22h · 22–6h',
    lock: L('Gặp chị Hạnh (quản lý) ở cửa hàng là được nhận luôn.', 'See Hạnh (manager) at the shop — she hires on the spot.'),
  },
  grab: {
    name: L('Chạy Grab', 'Grab driver', 'Grab-Fahrer'),
    where: L('Chạy thật ngoài phố: chở khách, giao đồ ăn, giao hàng bưu điện', 'In the real streets: passengers, food, parcels'),
    pay: `${vnd(J.grab.min)}–${vnd(J.grab.max)}/giờ`,
    hours: `${J.grab.hours[0]}–${J.grab.hours[1]}h`,
    lock: L('Cần có xe: hỏi mượn xe Wave của bố (ở nhà) hoặc mua xe ở Showroom.', 'You need a vehicle: borrow Dad’s Wave (at home) or buy one.'),
  },
  tutor: {
    name: L('Gia sư Toán lớp 8 (bé Bin)', 'Year-8 maths tutor (Bin)', 'Mathe-Nachhilfe (Bin)'),
    where: L('Nhà bé Bin, phố Hàng Bông', 'Bin’s home, Hàng Bông street'),
    pay: vnd(J.tutor.pay),
    hours: `T2–T6 · ${J.tutor.hours[0]}–${J.tutor.hours[1]}h`,
    lock: L('Kèm em Na học 3 buổi trước (nói chuyện với Na ở nhà).', 'First help Na study 3 times (talk to Na at home).'),
  },
}

export function JobBoard() {
  const t = useT()
  const localize = useLocalize()
  useFlags((s) => s.flags)
  useTime((s) => s.day)
  const scene = useWorld((s) => s.scene)
  const grabOn = useGrab((s) => s.online)
  const closePanel = useUI((s) => s.closePanel)
  const inVietnam = scene !== 'germany' && !getFlag('de.arrived')

  if (!inVietnam) {
    return <p className="m-auto p-6 text-center text-[14px] font-bold text-ink/60">{localize(L('Bảng việc này dành cho Hà Nội. Ở Đức thì làm ca ở Sonnenhof nhé!', 'This job board is for Hà Nội. In Germany, work shifts at Sonnenhof!'))}</p>
  }
  const run = (id: string) => {
    closePanel()
    window.setTimeout(() => runAction(id), 50)
  }
  const debt = debtTotal()
  const owe = Number(getFlag('german.owe') ?? 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3" data-testid="job-board">
      <p className="text-[12px] font-bold text-ink/60">{localize(L('Mỗi việc làm được 1 lần mỗi ngày. Làm 8 và 20 lần thì lên hạng (+10% / +20%).', 'Each job once a day. After 8 and 20 times you rank up (+10% / +20%).'))}</p>
      {VN_JOBS.map((id) => {
        const job = JOBS[id]
        const done = jobDoneToday(id)
        const open = jobUnlocked(id)
        const rank = jobRank(id)
        const next = rank < 2 ? J.rankAt[rank] : null
        return (
          <div key={id} data-testid={`job-${id}`} className={`rounded-2xl border-2 px-3 py-2 ${done ? 'border-jade/60 bg-jade/10' : 'border-outline/20 bg-white/80'}`}>
            <div className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full ${done ? 'bg-jade text-white' : open ? 'bg-gold/40 text-ink' : 'bg-ink/10 text-ink/50'}`}>
                {done ? <CheckIcon /> : open ? '·' : <LockIcon />}
              </span>
              <span className="flex-1 text-[14px] leading-tight font-black">{localize(job.name)}</span>
              <span className="rounded-full bg-ink/8 px-2 py-0.5 text-[10px] font-black text-ink/70">
                {localize(RANK_NAMES[rank])}
                {next !== null ? ` ${jobCount(id)}/${next}` : ''}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] font-bold text-ink/65">
              {job.pay} · {job.hours}
            </p>
            <p className="text-[11px] font-bold text-ink/50">
              {open ? localize(job.where) : localize(job.lock)}
              {id === 'cafe' && !open ? ` (còn ${teaBanLeft()} ngày)` : ''}
              {id === 'cafe' && open && teaStrikes() > 0 ? ` · bỏ ca ${teaStrikes()}/${J.tea.maxQuits}` : ''}
            </p>
            {open && id === 'grab' && (
              <button type="button" data-testid="job-grab-start" onClick={() => run('job.grab')} className={`mt-1.5 w-full rounded-xl py-1.5 text-[13px] font-extrabold ${grabOn ? 'btn-lacquer' : 'btn-jade'}`}>
                {grabOn ? localize(L('Tắt app Grab', 'Turn Grab off')) : localize(L('Bật app Grab, nhận cuốc', 'Turn on Grab, take fares'))}
              </button>
            )}
            {open && !done && id === 'tutor' && (
              <button type="button" data-testid="job-tutor-start" onClick={() => run('job.tutor')} className="mt-1.5 w-full rounded-xl btn-jade py-1.5 text-[13px] font-extrabold">
                {localize(L('Sang dạy bé Bin', 'Go and tutor Bin', 'Zu Bin gehen'))}
              </button>
            )}
          </div>
        )
      })}
      <div className="rounded-2xl border-2 border-outline/20 bg-white/80 px-3 py-2">
        <p className="text-[14px] font-black">Nicos Weg · Deutsche Welle</p>
        <p className="text-[12px] font-bold text-ink/60">{localize(L('Khóa tiếng Đức miễn phí: 20 phút, ¼ XP, học ở đâu cũng được.', 'Free German course: 20 minutes, ¼ XP, anywhere.'))}</p>
        <button type="button" data-testid="nicos" onClick={() => run('german.nicos')} className="mt-1.5 w-full rounded-xl btn-lacquer py-1.5 text-[13px] font-extrabold">
          {localize(L('Học một bài', 'Do a lesson', 'Eine Lektion'))}
        </button>
      </div>
      {(debt > 0 || owe > 0 || getFlag('phone.cracked')) && (
        <div className="rounded-2xl border-2 border-lacquer/30 bg-lacquer/5 px-3 py-2 text-[12px] font-bold">
          {debt > 0 && (
            <p>
              {localize(L('Nợ bố mẹ', 'Owed to your parents', 'Schulden bei den Eltern'))}: <b>{vnd(debt)}</b>
              {houseLevel() > 0 ? ` · ${localize(L('nhà mức', 'house level', 'Haus Stufe'))} ${houseLevel()}` : ''}
            </p>
          )}
          {owe > 0 && (
            <p>
              {localize(L('Nợ học phí Thầy Minh', 'Owed to Teacher Minh', 'Kursgebühr offen'))}: <b>{vnd(owe)}</b>
            </p>
          )}
          {!!getFlag('phone.cracked') && (
            <button type="button" onClick={() => runAction('phone.fixScreen')} className="mt-1 w-full rounded-xl btn-jade py-1.5 text-[13px] font-extrabold">
              {localize(L('Thay màn hình vỡ (1.200.000đ)', 'Replace the cracked screen (1,200,000đ)'))}
            </button>
          )}
        </div>
      )}
      <span className="sr-only">{t('phone.title')}</span>
    </div>
  )
}
