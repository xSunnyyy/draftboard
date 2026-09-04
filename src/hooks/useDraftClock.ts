import { useEffect, useState } from 'react'
import type { ClockState } from '../types'

export function secondsRemaining(clock: ClockState, now: number): number | null {
  if (clock.status === 'running' && clock.deadline != null) {
    return Math.max(0, Math.round((clock.deadline - now) / 1000))
  }
  if (clock.status === 'paused' && clock.remainingWhenPaused != null) {
    return clock.remainingWhenPaused
  }
  return null
}

export function startClock(timerSeconds: number): ClockState {
  return { status: 'running', deadline: Date.now() + timerSeconds * 1000, remainingWhenPaused: null }
}

export function pauseClock(clock: ClockState, now: number): ClockState {
  const remaining = secondsRemaining(clock, now)
  return { status: 'paused', deadline: null, remainingWhenPaused: remaining }
}

export function resumeClock(clock: ClockState): ClockState {
  if (clock.remainingWhenPaused == null) return clock
  return { status: 'running', deadline: Date.now() + clock.remainingWhenPaused * 1000, remainingWhenPaused: null }
}

export function resetClock(timerSeconds: number): ClockState {
  return startClock(timerSeconds)
}

export function stoppedClock(): ClockState {
  return { status: 'stopped', deadline: null, remainingWhenPaused: null }
}

/** Ticks a re-render every second so countdowns stay live. */
export function useClockTick(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}
