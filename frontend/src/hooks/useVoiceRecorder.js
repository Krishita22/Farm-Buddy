/**
 * Voice recorder hook — records audio as blob and sends to local Whisper STT.
 * NO browser Web Speech API (requires internet on Chrome).
 * Uses MediaRecorder API → server-side Whisper → fully offline.
 */
import { useState, useRef, useCallback } from 'react'

export function useVoiceRecorder() {
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
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop())

        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        if (blob.size < 1000) {
          setTranscript('')
          return
        }

        // Send to local Whisper for transcription
        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')

          const res = await fetch('/api/voice/transcribe', {
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
          // Fallback: try browser speech recognition if available
          setTranscript('[Whisper unavailable — type your message instead]')
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(250) // Collect data every 250ms
      setIsRecording(true)
      setTranscript('')
    } catch (err) {
      console.error('Microphone access failed:', err)
      alert('Please allow microphone access to use voice input.')
    }
  }, [])

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
