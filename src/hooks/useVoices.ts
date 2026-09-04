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
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])

  return voices
}
