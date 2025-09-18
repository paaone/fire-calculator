import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ThemeProvider } from './theme/ThemeProvider'
import './styles/base.css'
import './styles/components.css'
import './styles/theme/light.css'
import './styles/theme/dark.css'

const el = document.getElementById('root')!
const qc = new QueryClient()
createRoot(el).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
