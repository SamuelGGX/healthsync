import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import Sender from './pages/Sender'
import Dashboard from './pages/Dashboard'

function PulseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

const navLink = ({ isActive }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-slate-700 text-white'
      : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
  }`

function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 border-b border-slate-700/60 sticky top-0 z-10">
        <nav className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2 text-white mr-2">
            <span className="text-emerald-400"><PulseIcon /></span>
            <span className="font-bold text-base tracking-tight">HealthSync</span>
          </div>

          <div className="flex items-center gap-1">
            <NavLink to="/dashboard" className={navLink}>Dashboard</NavLink>
            <NavLink to="/sender" className={navLink}>Enviar vitals</NavLink>
          </div>
        </nav>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sender" element={<Sender />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
