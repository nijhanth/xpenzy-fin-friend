import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { FinancialProvider } from './contexts/FinancialContext'

createRoot(document.getElementById("root")!).render(
  <FinancialProvider>
    <App />
  </FinancialProvider>
);
