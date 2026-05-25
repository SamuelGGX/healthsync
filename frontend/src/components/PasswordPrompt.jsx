import { useState } from 'react'

export default function PasswordPrompt({ title, description, onConfirm, onCancel, error, loading }) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!password.trim()) return
    onConfirm(password)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4">
          <h3 className="text-base font-bold text-slate-800">{title ?? 'Confirmar acción'}</h3>
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            autoFocus
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'Verificando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
