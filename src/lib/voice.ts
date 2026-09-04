import { teamLabel } from './draftEngine'
import { positionSpokenName } from './position'
import type { Draft, DraftPick } from '../types'

const STORAGE_KEY = 'draftboard.voice.enabled'

export function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getVoiceEnabled(): boolean {
  if (!isVoiceSupported()) return false
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setVoiceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled))
  } catch {
    // storage unavailable; the in-memory toggle still works for this session
  }
  if (!enabled) cancelSpeech()
}

export function cancelSpeech(): void {
  if (!isVoiceSupported()) return
  window.speechSynthesis.cancel()
}

function speak(text: string): void {
  if (!isVoiceSupported()) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1.03
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
}

export function announcePick(draft: Draft, landed: DraftPick, next: DraftPick | null): void {
  if (!getVoiceEnabled()) return
  cancelSpeech()

  const pickLine = `${teamLabel(draft, landed.slot)} selects ${landed.playerName}${
    landed.position ? `, ${positionSpokenName(landed.position)}` : ''
  }.`
  speak(pickLine)

  if (next) {
    speak(`${teamLabel(draft, next.slot)}, you are now on the clock.`)
  } else {
    speak('That is a wrap. The draft is complete.')
  }
}
