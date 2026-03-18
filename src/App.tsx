import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoadingScreen } from './components/ui/LoadingScreen'

const Bulkagachi = lazy(() => import('./pages/games/Bulkagachi'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/games/bulkagachi" replace />} />
          <Route path="/games/bulkagachi" element={<Bulkagachi />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
