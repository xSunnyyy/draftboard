import { secondsRemaining } from '../hooks/useDraftClock'
import type { ClockState } from '../types'

interface Props {
  clock: ClockState
  now: number
  isManual: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ClockPanel({ clock, now, isManual, onStart, onPause, onResume, onReset }: Props) {
  const remaining = secondsRemaining(clock, now)
  const expired = remaining === 0

  return (
    <div className="clock">
      <div className={`clock__time ${expired ? 'clock__time--expired' : ''}`}>
        {remaining != null ? formatSeconds(remaining) : '—:—'}
      </div>
      {expired && <div className="clock__expired-label">Time expired</div>}
      {isManual && (
        <div className="clock__controls">
          {clock.status === 'stopped' && (
            <button className="btn btn--ghost" onClick={onStart}>
              Start clock
            </button>
          )}
          {clock.status === 'running' && (
            <button className="btn btn--ghost" onClick={onPause}>
              Pause
            </button>
          )}
          {clock.status === 'paused' && (
            <button className="btn btn--ghost" onClick={onResume}>
              Resume
            </button>
          )}
          <button className="btn btn--ghost" onClick={onReset}>
            Reset clock
          </button>
        </div>
      )}
    </div>
  )
}
