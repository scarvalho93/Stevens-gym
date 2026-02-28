import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Custom storage for app data (uses different key prefix to avoid conflicts with Supabase)
window.storage = {
  get: async (key) => {
    try {
      const val = localStorage.getItem('pulse_' + key)
      return val ? { key, value: val } : null
    } catch { return null }
  },
  set: async (key, value) => {
    try {
      localStorage.setItem('pulse_' + key, value)
      return { key, value }
    } catch { return null }
  },
  delete: async (key) => {
    try {
      localStorage.removeItem('pulse_' + key)
      return { key, deleted: true }
    } catch { return null }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
