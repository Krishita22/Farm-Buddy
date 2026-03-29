/**
 * Online-status hook — pings a remote endpoint periodically to detect real connectivity.
 */
import { useState, useEffect } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    // Actually check internet by pinging a real endpoint
    const check = async () => {
      try {
        await fetch('https://httpbin.org/get', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
        setIsOnline(true)
      } catch {
        setIsOnline(false)
      }
    }

    check() // check immediately
    const interval = setInterval(check, 15000) // recheck every 15s

    const on = () => check()
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return isOnline
}
