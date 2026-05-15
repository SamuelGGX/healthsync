import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Sender from './pages/Sender'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <nav className="max-w-3xl mx-auto px-4 py-3 flex gap-4 text-sm items-center">
          <Link to="/sender" className="font-semibold text-gray-900">HealthSync</Link>
          <span className="text-gray-300">·</span>
          <Link to="/sender" className="text-gray-600 hover:text-gray-900">Enviar vitals</Link>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/sender" replace />} />
          <Route path="/sender" element={<Sender />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
