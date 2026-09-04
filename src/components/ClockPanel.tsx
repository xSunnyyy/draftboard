import { PauseIcon, PlayIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import type { ClockState } from '../types'

interface Props {
  remainingSeconds: number | null
  timerSeconds: number
  clockStatus: ClockState['status']
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

export function ClockPanel({ remainingSeconds, timerSeconds, clockStatus, isManual, onStart, onPause, onResume, onReset }: Props) {
  const expired = remainingSeconds === 0
  const pct = remainingSeconds != null && timerSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / timerSeconds)) : 1

  return (
    <div className="clock">
      <div
        className={`clock-ring ${expired ? 'clock-ring--expired' : ''}`}
        style={{ '--pct': pct } as React.CSSProperties}
      >
        <div className="clock-ring__inner">{remainingSeconds != null ? formatSeconds(remainingSeconds) : '—:—'}</div>
      </div>
      <div className="clock__body">
        <div className="clock__label">Pick clock</div>
        {expired ? (
          <div className="clock__expired-label">Time expired</div>
        ) : (
          <div className="muted" style={{ fontSize: '0.82rem' }}>
            {isManual ? `${timerSeconds}s per pick` : 'Synced from Sleeper'}
          </div>
        )}
        {isManual && (
          <div className="clock__controls">
            {clockStatus === 'stopped' && (
              <button className="btn btn--ghost" onClick={onStart}>
                <PlayIcon size={15} weight="bold" />
                Start
              </button>
            )}
            {clockStatus === 'running' && (
              <button className="btn btn--ghost" onClick={onPause}>
                <PauseIcon size={15} weight="bold" />
                Pause
              </button>
            )}
            {clockStatus === 'paused' && (
              <button className="btn btn--ghost" onClick={onResume}>
                <PlayIcon size={15} weight="bold" />
                Resume
              </button>
            )}
            <button className="btn btn--ghost" onClick={onReset}>
              <ArrowClockwiseIcon size={15} weight="bold" />
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
