import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const apiBase = import.meta.env.VITE_API_URL || '/api';
fetch(`${apiBase}/health`)
  .then(r => r.json())
  .then(() => console.log(`[CookShare] Server connection OK (${apiBase})`))
  .catch(() => console.warn('[CookShare] Server unreachable'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
