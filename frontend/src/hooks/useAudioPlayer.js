/**
 * Audio player hook — plays WAV from local Piper TTS or falls back to browser TTS.
 * Fully offline.
 */
import { useState, useRef, useCallback } from 'react'

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  const playAudio = useCallback((base64Audio, format = 'wav') => {
    if (!base64Audio) return

    const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
    const bytes = atob(base64Audio)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i)
    }
    const blob = new Blob([arr], { type: mimeType })
    const url = URL.createObjectURL(blob)

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(url)
    audioRef.current = audio
    setIsPlaying(true)

    audio.onended = () => {
      setIsPlaying(false)
      URL.revokeObjectURL(url)
    }
    audio.onerror = () => {
      setIsPlaying(false)
      URL.revokeObjectURL(url)
    }

    audio.play().catch(() => setIsPlaying(false))
  }, [])

  const speakText = useCallback((text, lang = 'en-US') => {
    // Browser TTS fallback when Piper isn't available
    if (!window.speechSynthesis) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.9
    utterance.pitch = 1.0

    setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) audioRef.current.pause()
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
  }, [])

  return { isPlaying, playAudio, speakText, stop }
}
