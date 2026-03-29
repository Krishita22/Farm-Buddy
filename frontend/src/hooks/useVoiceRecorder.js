/**
 * Voice recorder — uses browser Web Speech API when online (better for Indic languages),
 * falls back to local Whisper when offline.
 */
import { useState, useRef, useCallback } from 'react'

// Languages where browser speech recognition works better than Whisper
const BROWSER_STT_LANGS = {
  gu: 'gu-IN', hi: 'hi-IN', bn: 'bn-BD', ar: 'ar-SA',
  fr: 'fr-FR', es: 'es-ES', pt: 'pt-BR', en: 'en-US',
}

export function useVoiceRecorder(languageHint) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [detectedLanguage, setDetectedLanguage] = useState(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const recognitionRef = useRef(null)

  const startRecording = useCallback(async () => {
    setTranscript('')
    setIsRecording(true)

    const browserLang = BROWSER_STT_LANGS[languageHint]
    const hasBrowserSTT = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window

    // Try browser speech recognition first (better for Gujarati, Hindi, Bengali, Arabic)
    if (hasBrowserSTT && browserLang && navigator.onLine) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = browserLang
      recognition.continuous = true
      recognition.interimResults = true

      let finalText = ''
      recognition.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
          else interim += e.results[i][0].transcript
        }
        setTranscript((finalText + interim).trim())
      }
      recognition.onerror = () => {}
      recognition.onend = () => {
        setIsRecording(false)
        if (finalText.trim()) {
          setTranscript(finalText.trim())
          setDetectedLanguage(languageHint)
        }
      }

      recognitionRef.current = recognition
      recognition.start()
      return
    }

    // Fallback: record audio and send to local Whisper
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      })

      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        if (blob.size < 1000) { setTranscript(''); return }

        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')
          const langParam = languageHint ? `?language_hint=${languageHint}` : ''
          const res = await fetch(`/api/voice/transcribe${langParam}`, { method: 'POST', body: formData })
          if (res.ok) {
            const data = await res.json()
            setTranscript(data.text || '')
            setDetectedLanguage(data.language || null)
          }
        } catch {
          setTranscript('[Speech recognition unavailable — type instead]')
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(250)
    } catch {
      alert('Please allow microphone access.')
      setIsRecording(false)
    }
  }, [languageHint])

  const stopRecording = useCallback(() => {
    // Stop browser speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    // Stop media recorder (Whisper path)
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }, [isRecording])

  return {
    isRecording, isTranscribing, transcript, detectedLanguage,
    startRecording, stopRecording, setTranscript,
  }
}
