import { applyUpdate, useUpdate } from '../updates'

/**
 * 1.42 a new version of the game is out (src/updates.ts): a small pill under the compass. Tapping saves and reloads;
 * otherwise the game reloads by itself the next time it goes to the background.
 */
export function UpdatePill() {
  const ready = useUpdate((s) => s.ready)
  if (!ready) return null
  return (
    <button
      type="button"
      data-testid="update-pill"
      onClick={() => applyUpdate(true)}
      className="pointer-events-auto absolute top-[calc(max(0.45rem,env(safe-area-inset-top))+2.6rem)] left-1/2 z-[17] flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-outline bg-linear-to-b from-[#ffe48a] to-[#f2b632] py-0.5 pr-3 pl-1 text-[12px] font-black text-ink shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none short:top-[2.4rem]"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/80 text-[12px]">⟳</span>
      Có bản cập nhật mới · Tải lại
    </button>
  )
}
