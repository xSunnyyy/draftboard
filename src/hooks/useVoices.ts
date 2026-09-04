import { useEffect, useState } from 'react'
import { isVoiceSupported, listAvailableVoices } from '../lib/voice'

export function useAvailableVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listAvailableVoices())

  useEffect(() => {
    if (!isVoiceSupported()) return
    function update() {
      setVoices(listAvailableVoices())
    }
    update()
    // Some embedded/TV browsers expose a partial speechSynthesis that lacks
    // full EventTarget behavior — degrade to a one-time voice list instead
    // of crashing the whole board.
    if (typeof window.speechSynthesis.addEventListener !== 'function') return
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])

  return voices
}
