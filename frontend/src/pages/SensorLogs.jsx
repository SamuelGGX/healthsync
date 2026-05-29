import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
const PAGE_SIZE = 25

const EVENT_LABELS = {
  connected:     'Conectado',
  disconnected:  'Desconectado',
  invalid_value: 'Valor inválido',
  timeout:       'Timeout',
}

const EVENT_COLORS = {
  connected:     'bg-emerald-100 text-emerald-700',
  disconnected:  'bg-red-100 text-red-700',
  invalid_value: 'bg-amber-100 text-amber-700',
  timeout:       'bg-slate-100 text-slate-600',
}

const inputClass =
  'border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso))
}

export default function SensorLogs() {
  const { token } = useAuth()

  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const [event, setEvent]                   = useState('')
  const [from, setFrom]                     = useState('')
  const [to, setTo]                         = useState('')
  const [search, setSearch]                 = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage]                     = useState(0)

  // Debounce de la búsqueda para no disparar un fetch por tecla
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (event)          params.set('event', event)
      if (from)           params.set('from', `${from}T00:00:00`)
      if (to)             params.set('to', `${to}T23:59:59`)
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('limit',  PAGE_SIZE)
      params.set('offset', page * PAGE_SIZE)

      const res  = await fetch(`${API_URL}/admin/sensor-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al cargar'); return }
      setRows(data.rows)
      setTotal(data.total)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [token, event, from, to, debouncedSearch, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const onFilterChange = (setter) => (e) => {
    setter(e.target.value)
    setPage(0)
  }

  const clearFilters = () => {
    setEvent(''); setFrom(''); setTo(''); setSearch(''); setPage(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const fromRow    = total === 0 ? 0 : page * PAGE_SIZE + 1
  const toRow      = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Logs de sensores</h1>
        <p className="text-sm text-slate-500 mt-0.5">Eventos de conexión y lecturas de los sensores de cada cama.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">Evento</label>
            <select className={inputClass} value={event} onChange={onFilterChange(setEvent)}>
              <option value="">Todos</option>
              {Object.entries(EVENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">Desde</label>
            <input type="date" className={inputClass} value={from} onChange={onFilterChange(setFrom)} />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">Hasta</label>
            <input type="date" className={inputClass} value={to} onChange={onFilterChange(setTo)} />
          </div>

          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500">Buscar</label>
            <input
              type="text"
              className={`${inputClass} w-full`}
              placeholder="Cama o detalle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {(event || from || to || search) && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2 transition"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm p-3">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Fecha / hora</th>
                <th className="px-4 py-3">Cama</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400">Sin registros</td></tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">{fmtDate(r.occurred_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{r.bed_code ?? `#${r.bed_id}`}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${EVENT_COLORS[r.event] ?? 'bg-slate-100 text-slate-600'}`}>
                        {EVENT_LABELS[r.event] ?? r.event}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <span className="text-slate-500 text-xs" title={r.detail ?? ''}>{r.detail ?? '—'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
          <span className="text-slate-500">
            {total === 0 ? 'Sin resultados' : `${fromRow}–${toRow} de ${total}`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 0))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page + 1 >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
