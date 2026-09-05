import { getPickCallout } from './callouts'
import { teamLabel } from './draftEngine'
import { positionSpokenName } from './position'
import type { DraftRecapData } from './recap'
import { getRoastLine, type TeamHistory } from './roasts'
import type { Draft, DraftPick } from '../types'

const ENABLED_KEY = 'draftboard.voice.enabled'
const VOICE_URI_KEY = 'draftboard.voice.uri'

export function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getVoiceEnabled(): boolean {
  if (!isVoiceSupported()) return false
  try {
    return localStorage.getItem(ENABLED_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setVoiceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, String(enabled))
  } catch {
    // storage unavailable; the in-memory toggle still works for this session
  }
  if (!enabled) cancelSpeech()
}

export function cancelSpeech(): void {
  if (!isVoiceSupported()) return
  window.speechSynthesis.cancel()
}

export function listAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isVoiceSupported()) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('en'))
}

// Browsers vary wildly in built-in voice quality. Edge and Chrome on most
// platforms expose cloud-backed "Natural"/"Neural"/"Online" voices alongside
// the classic robotic local ones — prefer those when no explicit choice has
// been made.
function voiceQualityScore(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase()
  let score = 0
  if (name.includes('natural')) score += 6
  if (name.includes('neural')) score += 6
  if (name.includes('online')) score += 3
  if (name.includes('premium') || name.includes('enhanced')) score += 3
  if (!v.localService) score += 2
  if (v.default) score += 1
  return score
}

export function getPreferredVoiceUri(): string | null {
  try {
    return localStorage.getItem(VOICE_URI_KEY)
  } catch {
    return null
  }
}

export function setPreferredVoiceUri(uri: string): void {
  try {
    localStorage.setItem(VOICE_URI_KEY, uri)
  } catch {
    // storage unavailable; selection just won't persist across reloads
  }
}

export function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = listAvailableVoices()
  if (voices.length === 0) return null
  const storedUri = getPreferredVoiceUri()
  if (storedUri) {
    const found = voices.find((v) => v.voiceURI === storedUri)
    if (found) return found
  }
  return [...voices].sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a))[0] ?? null
}

function speak(text: string): void {
  if (!isVoiceSupported()) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.96
  utterance.pitch = 1
  const voice = getPreferredVoice()
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}

function speakable(text: string): string {
  return text.replace(/—/g, ',').replace(/\s+/g, ' ').trim()
}

export function announcePick(
  draft: Draft,
  landed: DraftPick,
  next: DraftPick | null,
  history?: Map<number, TeamHistory>,
  recap?: DraftRecapData,
  onLine?: (line: string) => void,
): void {
  if (!getVoiceEnabled()) return
  cancelSpeech()

  const say = (line: string) => {
    onLine?.(line)
    speak(line)
  }

  const pickLine = `${teamLabel(draft, landed.slot)} selects ${landed.playerName}${
    landed.position ? `, ${positionSpokenName(landed.position)}` : ''
  }.`
  say(pickLine)

  const callout = getPickCallout(draft, landed)
  if (callout) say(speakable(callout.label))

  if (next) {
    let line = `${teamLabel(draft, next.slot)}, you are now on the clock.`
    const roast = getRoastLine(teamLabel(draft, next.slot), history?.get(next.slot), next.overallPick)
    if (roast) line += ` ${roast}`
    say(line)
  } else {
    say('That is a wrap. The draft is complete.')
    if (recap?.biggestSteal) {
      say(
        `Biggest steal of the draft: ${teamLabel(draft, recap.biggestSteal.pick.slot)} got ${recap.biggestSteal.pick.playerName} ${recap.biggestSteal.valueDelta} picks after their ranking.`,
      )
    }
    if (recap?.biggestReach) {
      say(
        `And the biggest reach: ${teamLabel(draft, recap.biggestReach.pick.slot)} took ${recap.biggestReach.pick.playerName} ${Math.abs(recap.biggestReach.valueDelta)} picks earlier than expected.`,
      )
    }
  }
}
