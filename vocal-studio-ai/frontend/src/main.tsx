import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // Esta linha é crucial para o Tailwind funcionar
import { ThemeProvider } from './context/ThemeContext'; // Assuming ThemeContext is in src/context
import { LanguageProvider } from './context/LanguageContext'; // Corrigido
 
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
)