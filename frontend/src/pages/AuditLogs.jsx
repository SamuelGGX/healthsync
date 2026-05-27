import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API_URL = `http://${window.location.hostname}:3000`
const PAGE_SIZE = 25

const ACTION_LABELS = {
  CREATE:      'Crear',
  UPDATE:      'Actualizar',
  DELETE:      'Eliminar',
  LOGIN:       'Inicio sesión',
  LOGOUT:      'Cierre sesión',
  BED_ASSIGN:  'Asignar cama',
  BED_RELEASE: 'Liberar cama',
}

const ACTION_COLORS = {
  CREATE:      'bg-emerald-100 text-emerald-700',
  UPDATE:      'bg-blue-100 text-blue-700',
  DELETE:      'bg-red-100 text-red-700',
  LOGIN:       'bg-slate-100 text-slate-600',
  LOGOUT:      'bg-slate-100 text-slate-600',
  BED_ASSIGN:  'bg-violet-100 text-violet-700',
  BED_RELEASE: 'bg-amber-100 text-amber-700',
}

const TABLES = ['patients', 'bed_assignments', 'users', 'beds', 'alerts']

const inputClass =
  'border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso))
}

function fmtValue(raw) {
  if (!raw) return '—'
  try {
    const obj = JSON.parse(raw)
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' · ')
  } catch {
    return raw
  }
}

export default function AuditLogs() {
  const { token } = useAuth()

  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const [action, setAction]       = useState('')
  const [tableName, setTableName] = useState('')
  const [from, setFrom]           = useState('')
  const [to, setTo]               = useState('')
  const [page, setPage]           = useState(0)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (action)    params.set('action', action)
      if (tableName) params.set('table_name', tableName)
      if (from)      params.set('from', `${from}T00:00:00`)
      if (to)        params.set('to', `${to}T23:59:59`)
      params.set('limit',  PAGE_SIZE)
      params.set('offset', page * PAGE_SIZE)

      const res  = await fetch(`${API_URL}/audit?${params.toString()}`, {
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
  }, [token, action, tableName, from, to, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Cuando cambia un filtro, volver a la página 0
  const onFilterChange = (setter) => (e) => {
    setter(e.target.value)
    setPage(0)
  }

  const clearFilters = () => {
    setAction(''); setTableName(''); setFrom(''); setTo(''); setPage(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const fromRow    = total === 0 ? 0 : page * PAGE_SIZE + 1
  const toRow      = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Registro de auditoría</h1>
        <p className="text-sm text-slate-500 mt-0.5">Historial de acciones realizadas en el sistema.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">Acción</label>
            <select className={inputClass} value={action} onChange={onFilterChange(setAction)}>
              <option value="">Todas</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">Tabla</label>
            <select className={inputClass} value={tableName} onChange={onFilterChange(setTableName)}>
              <option value="">Todas</option>
              {TABLES.map(t => <option key={t} value={t}>{t}</option>)}
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

          {(action || tableName || from || to) && (
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
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Tabla</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Sin registros</td></tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">{fmtDate(r.occurred_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{r.user_name ?? `#${r.user_id}`}</span>
                      {r.user_role && <span className="ml-1 text-xs text-slate-400">({r.user_role})</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[r.action] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ACTION_LABELS[r.action] ?? r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{r.table_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{r.record_id ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={fmtValue(r.new_value)}>
                      {fmtValue(r.new_value)}
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
