/**
 * Application entry point — mounts the React tree with global providers
 * (language, user, weather) around the root App component.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LanguageProvider } from './lib/LanguageContext'
import { UserProvider } from './lib/UserContext'
import { WeatherProvider } from './lib/WeatherContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <UserProvider>
        <WeatherProvider>
          <App />
        </WeatherProvider>
      </UserProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
