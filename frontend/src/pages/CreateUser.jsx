import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_URL = `http://${window.location.hostname}:3000`

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-slate-400'

const ROLES = [
  { value: 'medico',    label: 'Médico',    desc: 'Accede al dashboard',        color: 'blue'    },
  { value: 'enfermero', label: 'Enfermero', desc: 'Accede al dashboard',        color: 'violet'  },
  { value: 'admin',     label: 'Admin',     desc: 'Acceso completo al sistema', color: 'emerald' },
]

const roleColors = {
  blue:    { base: 'border-blue-200   bg-blue-50   text-blue-700',   active: 'border-blue-500   bg-blue-100   ring-blue-500'   },
  violet:  { base: 'border-violet-200 bg-violet-50 text-violet-700', active: 'border-violet-500 bg-violet-100 ring-violet-500' },
  emerald: { base: 'border-emerald-200 bg-emerald-50 text-emerald-700', active: 'border-emerald-500 bg-emerald-100 ring-emerald-500' },
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  )
}

export default function CreateUser() {
  const { token } = useAuth()

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [role, setRole]         = useState('medico')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res  = await fetch(`${API_URL}/users`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ error: data.error || 'Error al crear usuario' })
      } else {
        setResult({ ok: true, user: data })
        setName('')
        setEmail('')
        setPassword('')
        setRole('medico')
      }
    } catch {
      setResult({ error: 'No se pudo conectar al servidor' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-white flex-shrink-0">
          <UserIcon />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Crear usuario</h1>
          <p className="text-sm text-slate-500">Agrega un nuevo miembro al sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={submit}>
          <div className="p-6 space-y-5">
            {/* Alerts */}
            {result?.error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-xl">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 mt-0.5">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {result.error}
              </div>
            )}
            {result?.ok && (
              <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3.5 rounded-xl">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 mt-0.5">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z"/>
                </svg>
                <span>
                  Usuario <strong>{result.user.name}</strong> creado correctamente como{' '}
                  <strong>{result.user.role}</strong>.
                </span>
              </div>
            )}

            {/* Nombre */}
            <Field label="Nombre completo">
              <input
                type="text"
                className={inputClass}
                placeholder="Dr. Juan Pérez"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </Field>

            {/* Email */}
            <Field label="Correo electrónico">
              <input
                type="email"
                className={inputClass}
                placeholder="usuario@healthsync.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </Field>

            {/* Contraseña */}
            <Field label="Contraseña" hint="Mínimo 8 caracteres">
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`${inputClass} pr-11`}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
            </Field>

            {/* Rol */}
            <Field label="Rol">
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => {
                  const colors = roleColors[r.color]
                  const isActive = role === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition ${
                        isActive
                          ? `${colors.active} ring-2 ring-offset-1`
                          : `${colors.base} hover:opacity-80`
                      }`}
                    >
                      <span className="text-sm font-semibold">{r.label}</span>
                      <span className="text-[10px] opacity-70 leading-tight">{r.desc}</span>
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 active:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Creando…
                </span>
              ) : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
