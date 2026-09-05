interface Props {
  remainingSeconds: number | null
  timerSeconds: number
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** A slim full-width footer clock for Sleeper-synced boards, replacing the sidebar
 *  clock panel — a synced board has no manual controls to justify a whole side column,
 *  so the grid gets the full width and the countdown lives in a strip underneath it. */
export function BoardClockBar({ remainingSeconds, timerSeconds }: Props) {
  const expired = remainingSeconds === 0
  const pct = remainingSeconds != null && timerSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / timerSeconds)) : 1

  return (
    <div className={`clock-bar ${expired ? 'clock-bar--expired' : ''}`}>
      <span className="clock-bar__time">{remainingSeconds != null ? formatSeconds(remainingSeconds) : '—:—'}</span>
      <div className="clock-bar__track">
        <div className="clock-bar__fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="clock-bar__label">{expired ? 'Time expired' : 'Synced from Sleeper'}</span>
    </div>
  )
}
