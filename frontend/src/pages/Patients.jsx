import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PatientForm from '../components/PatientForm'

const API_URL = `http://${window.location.hostname}:3000`

function calcAge(birthDate) {
  if (!birthDate) return null
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function StatBadge({ label, value, color }) {
  const colors = {
    slate:   'bg-white    border-slate-200  text-slate-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50  border-amber-200  text-amber-700',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-col gap-0.5 ${colors[color]}`}>
      <span className="text-2xl font-bold leading-none">{value}</span>
      <span className="text-xs text-current opacity-70 font-medium">{label}</span>
    </div>
  )
}

export default function Patients() {
  const { token, user } = useAuth()
  const navigate        = useNavigate()

  const [patients, setPatients]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')   // all | active | discharged
  const [page, setPage]             = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [creating, setCreating]     = useState(false)

  const PAGE_SIZE = 25

  const canCreate = user?.role === 'admin' || user?.role === 'medico'

  useEffect(() => { setPage(1) }, [search, filter])

  const load = () => {
    setLoading(true)
    fetch(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setPatients(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const handleCreate = async (formData) => {
    setCreateError(null)
    setCreating(true)
    try {
      const res = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) {
        setCreateError(json.error ?? 'Error al crear paciente')
        return
      }
      setShowCreate(false)
      load()
    } catch {
      setCreateError('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const stats = {
    total:      patients.length,
    active:     patients.filter(p => !p.discharged_at).length,
    discharged: patients.filter(p =>  p.discharged_at).length,
  }

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = p.full_name.toLowerCase().includes(q) || p.document_id.toLowerCase().includes(q)
    const matchFilter = filter === 'all' || (filter === 'active' ? !p.discharged_at : !!p.discharged_at)
    return matchSearch && matchFilter
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const goToPage = (p) => setPage(Math.max(1, Math.min(p, totalPages)))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pacientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro clínico del personal</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setShowCreate(true); setCreateError(null) }}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo paciente
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBadge label="Total"       value={stats.total}      color="slate"   />
        <StatBadge label="Activos"     value={stats.active}     color="emerald" />
        <StatBadge label="Dados de alta" value={stats.discharged} color="amber"   />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o documento…"
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex gap-1 bg-slate-200 rounded-lg p-0.5 self-start">
          {[['all', 'Todos'], ['active', 'Activos'], ['discharged', 'Alta']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                filter === val ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p className="text-slate-400 text-sm">
            {search ? 'Sin resultados para esa búsqueda' : 'No hay pacientes en esta categoría'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Paciente</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Documento</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Edad</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Sangre</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Cama</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map(p => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="hover:bg-emerald-50/50 cursor-pointer transition group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition">
                        {p.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="font-medium text-slate-800 text-sm">{p.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden sm:table-cell">{p.document_id}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">
                    {p.birth_date ? `${calcAge(p.birth_date)} años` : '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {p.blood_type
                      ? <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{p.blood_type}</span>
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {p.bed_code
                      ? <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{p.bed_code}</span>
                      : <span className="text-slate-300 text-xs italic">Sin cama</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {p.discharged_at
                      ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Alta</span>
                      : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Activo</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-slate-400">
              Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length} pacientes
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="px-2 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  ‹ Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…')
                    acc.push(n)
                    return acc
                  }, [])
                  .map((n, i) =>
                    n === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => goToPage(n)}
                        className={`w-7 h-7 rounded text-xs font-semibold transition ${
                          n === safePage
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )
                }
                <button
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="px-2 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  Siguiente ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Nuevo paciente</h3>
                <p className="text-xs text-slate-500 mt-0.5">Completa los datos del paciente</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <PatientForm
                error={createError}
                onSubmit={handleCreate}
                onCancel={() => setShowCreate(false)}
                submitLabel={creating ? 'Creando…' : 'Crear paciente'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
