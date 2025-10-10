import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'

const rootEl = document.getElementById('root')!

// Disable StrictMode in development to avoid double-invoking effects (duplicate API calls)
createRoot(rootEl).render(
  import.meta.env.DEV ? (
    <App />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  )
)
