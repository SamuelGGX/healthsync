import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const API_URL = `http://${window.location.hostname}:3000`

function calcAge(birthDate) {
  if (!birthDate) return null
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

export default function AssignBedModal({ bedId, bedCode, onAssigned, onCancel }) {
  const { token } = useAuth()

  const [patients, setPatients]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/patients?unassigned=true`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setError('Error cargando pacientes'))
      .finally(() => setLoading(false))
  }, [token])

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    return p.full_name.toLowerCase().includes(q) || p.document_id.toLowerCase().includes(q)
  })

  const handleSubmit = async () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/bed-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bed_id: bedId, patient_id: selected.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Error al asignar')
        return
      }
      onAssigned()
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-slate-800">Asignar paciente</h3>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Selecciona el paciente para <span className="font-semibold text-slate-700">{bedCode}</span>
          </p>
        </div>

        {/* Search */}
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o documento…"
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              autoFocus
            />
          </div>
        </div>

        {/* Patient list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-1.5 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              {search ? 'Sin resultados' : 'No hay pacientes disponibles'}
            </p>
          ) : (
            filtered.map(p => {
              const isSelected = selected?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : p)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border-2 transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {p.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.full_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {p.document_id}
                        {p.birth_date && <span className="ml-2">{calcAge(p.birth_date)} años</span>}
                        {p.blood_type && <span className="ml-2 text-red-500 font-semibold">{p.blood_type}</span>}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 shrink-0">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0 space-y-2">
          {selected && (
            <div className="text-xs text-center text-slate-500 bg-emerald-50 border border-emerald-100 rounded-lg py-1.5">
              Seleccionado: <span className="font-semibold text-emerald-700">{selected.full_name}</span>
            </div>
          )}
          {error && <p className="text-xs text-red-600 text-center">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selected || submitting}
              className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-40"
            >
              {submitting ? 'Asignando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
