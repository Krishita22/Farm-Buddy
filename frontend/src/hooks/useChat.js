import { useState, useCallback } from 'react'
import { api } from '../lib/api'

export function useChat(farmerId, language) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || !farmerId) return null

    const userMsg = { role: 'farmer', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const response = await api.chat({
        farmer_id: farmerId,
        message: text,
        language: language,
      })

      const agentMsg = {
        role: 'agent',
        content: response.reply,
        audio: response.audio_base64,
        timestamp: new Date().toISOString(),
        disease: response.disease_detected,
      }
      setMessages(prev => [...prev, agentMsg])
      setIsLoading(false)
      return response
    } catch (err) {
      const errorMsg = {
        role: 'agent',
        content: 'Sorry, I had trouble processing that. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMsg])
      setIsLoading(false)
      return null
    }
  }, [farmerId, language])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isLoading, sendMessage, clearMessages }
}
