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
