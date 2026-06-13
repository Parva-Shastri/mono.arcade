import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import TestRunner from './tests/TestRunner.tsx'

const isTestRoute = window.location.pathname === '/test';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTestRoute ? <TestRunner /> : <App />}
  </StrictMode>,
)
