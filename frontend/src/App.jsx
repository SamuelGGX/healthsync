import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Sender from './pages/Sender'
import Login from './pages/Login'
import CreateUser from './pages/CreateUser'
import SlowQueries from './pages/SlowQueries'
import Uptime from './pages/Uptime'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import AuditLogs from './pages/AuditLogs'

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

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const isAdmin          = user?.role === 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 border-b border-slate-700/60 sticky top-0 z-10">
        <nav className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2 text-white mr-2">
            <span className="text-emerald-400"><PulseIcon /></span>
            <span className="font-bold text-base tracking-tight">HealthSync</span>
          </div>

          <div className="flex items-center gap-1 flex-1">
            <NavLink to="/dashboard" className={navLink}>Dashboard</NavLink>
            <NavLink to="/patients"  className={navLink}>Pacientes</NavLink>
            {isAdmin && <NavLink to="/sender" className={navLink}>Enviar vitals</NavLink>}
            {isAdmin && <NavLink to="/create-user" className={navLink}>Crear usuario</NavLink>}
            {isAdmin && <NavLink to="/slow-queries" className={navLink}>Slow Queries</NavLink>}
            {isAdmin && <NavLink to="/uptime" className={navLink}>Uptime</NavLink>}
            {isAdmin && <NavLink to="/audit" className={navLink}>Auditoría</NavLink>}
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:block">
                {user.name}
                <span className="ml-1 text-slate-500">({user.role})</span>
              </span>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1.5 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </nav>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/sender" element={
            <ProtectedRoute roles={['admin']}>
              <Sender />
            </ProtectedRoute>
          } />
          <Route path="/create-user" element={
            <ProtectedRoute roles={['admin']}>
              <CreateUser />
            </ProtectedRoute>
          } />
          <Route path="/slow-queries" element={
            <ProtectedRoute roles={['admin']}>
              <SlowQueries />
            </ProtectedRoute>
          } />
          <Route path="/uptime" element={
            <ProtectedRoute roles={['admin']}>
              <Uptime />
            </ProtectedRoute>
          } />
          <Route path="/patients" element={
            <ProtectedRoute>
              <Patients />
            </ProtectedRoute>
          } />
          <Route path="/patients/:id" element={
            <ProtectedRoute>
              <PatientDetail />
            </ProtectedRoute>
          } />
          <Route path="/audit" element={
            <ProtectedRoute roles={['admin']}>
              <AuditLogs />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  )
}
