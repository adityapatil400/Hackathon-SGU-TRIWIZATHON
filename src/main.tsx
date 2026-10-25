import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import LandingPage from './components/LandingPage.tsx'
import { TranslationProvider } from './context/TranslationContext.tsx'

const isDashboardRoute = window.location.pathname.replace(/\/$/, '') === '/dashboard'
const RootPage = isDashboardRoute ? App : LandingPage

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TranslationProvider>
      <RootPage />
    </TranslationProvider>
  </StrictMode>,
)
