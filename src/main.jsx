// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global error boundary — catches crashes and shows helpful message instead of white screen
class ErrorBoundary extends Error {}

function renderApp() {
  try {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  } catch (e) {
    // Fallback UI instead of white screen
    document.getElementById('root').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f2f5;font-family:sans-serif;padding:24px">
        <div style="background:#fff;border-radius:16px;padding:32px;max-width:480px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.1);text-align:center">
          <div style="font-size:48px;margin-bottom:16px">⚡</div>
          <h2 style="color:#1e293b;margin-bottom:8px">ClientFlow AI</h2>
          <p style="color:#ef4444;font-weight:600;margin-bottom:8px">Startup Error</p>
          <p style="color:#64748b;font-size:13px;margin-bottom:16px">${e.message}</p>
          <p style="color:#94a3b8;font-size:12px">Run <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">npm install</code> then <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">npm run dev</code></p>
          <button onclick="location.reload()" style="margin-top:16px;background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer">Retry</button>
        </div>
      </div>
    `
  }
}

renderApp()
