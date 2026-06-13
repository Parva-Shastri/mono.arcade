import { Suspense, StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const TestRunner = lazy(() => import('./tests/TestRunner'))

const isTestRoute = window.location.pathname === '/test';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTestRoute ? (
      <Suspense fallback={null}>
        <TestRunner />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
