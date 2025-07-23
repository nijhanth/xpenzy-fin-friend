import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import App from './App.tsx'
import './index.css'
import { FinancialProvider } from './contexts/FinancialContext'
import { AuthProvider } from './contexts/AuthContext'
import { PrivacyProvider } from './contexts/PrivacyContext'

const queryClient = new QueryClient()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PrivacyProvider>
          <FinancialProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                <App />
                <Toaster />
              </ThemeProvider>
            </QueryClientProvider>
          </FinancialProvider>
        </PrivacyProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
