/**
 * Voice recorder hook — records audio as blob and sends to local Whisper STT.
 * Passes the user's selected language as a hint so Whisper transcribes correctly.
 */
import { useState, useRef, useCallback } from 'react'

export function useVoiceRecorder(languageHint) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [detectedLanguage, setDetectedLanguage] = useState(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = useCallback(async () => {
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
        if (blob.size < 1000) {
          setTranscript('')
          return
        }

        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')

          // Pass language hint so Whisper knows what language to expect
          const langParam = languageHint ? `?language_hint=${languageHint}` : ''
          const res = await fetch(`/api/voice/transcribe${langParam}`, {
            method: 'POST',
            body: formData,
          })

          if (res.ok) {
            const data = await res.json()
            setTranscript(data.text || '')
            setDetectedLanguage(data.language || null)
          }
        } catch (err) {
          console.error('Transcription failed:', err)
          setTranscript('[Whisper unavailable — type your message instead]')
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(250)
      setIsRecording(true)
      setTranscript('')
    } catch (err) {
      console.error('Microphone access failed:', err)
      alert('Please allow microphone access to use voice input.')
    }
  }, [languageHint])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  return {
    isRecording,
    isTranscribing,
    transcript,
    detectedLanguage,
    startRecording,
    stopRecording,
    setTranscript,
  }
}
