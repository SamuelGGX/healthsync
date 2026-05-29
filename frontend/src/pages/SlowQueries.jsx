import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { ConfirmModal } from '../components/Modal'

const API_URL = `http://${window.location.hostname}:3000`

function DatabaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zm0 2c4.42 0 8 1.57 8 3.5S16.42 11 12 11 4 9.43 4 7.5 7.58 4 12 4zm0 16c-4.42 0-8-1.57-8-3.5v-2.13C5.46 15.45 8.61 16.5 12 16.5s6.54-1.05 8-2.63V16.5c0 1.93-3.58 3.5-8 3.5zm0-5c-4.42 0-8-1.57-8-3.5v-2.13C5.46 10.45 8.61 11.5 12 11.5s6.54-1.05 8-2.63V11.5c0 1.93-3.58 3.5-8 3.5z"/>
    </svg>
  )
}

function msColor(ms) {
  if (ms >= 500) return 'text-red-600 font-semibold'
  if (ms >= 100) return 'text-amber-600 font-semibold'
  return 'text-slate-700'
}

function MsBar({ value, max }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = value >= 500 ? 'bg-red-400' : value >= 100 ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function SlowQueries() {
  const { token }           = useAuth()
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg]   = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [countdown, setCountdown]     = useState(15)

  const INTERVAL_S = 15
  const intervalRef  = useRef(null)
  const countdownRef = useRef(null)

  const headers = { Authorization: `Bearer ${token}` }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`${API_URL}/admin/slow-queries`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar')
      setRows(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (autoRefresh) {
      setCountdown(INTERVAL_S)
      intervalRef.current = setInterval(() => {
        load()
        setCountdown(INTERVAL_S)
      }, INTERVAL_S * 1000)
      countdownRef.current = setInterval(() => {
        setCountdown(c => c - 1)
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
      clearInterval(countdownRef.current)
    }
    return () => {
      clearInterval(intervalRef.current)
      clearInterval(countdownRef.current)
    }
  }, [autoRefresh, load])

  const reset = async () => {
    setConfirmReset(false)
    setResetting(true)
    setResetMsg(null)
    try {
      const res = await fetch(`${API_URL}/admin/slow-queries/reset`, { method: 'POST', headers })
      if (!res.ok) throw new Error('Error al resetear')
      setResetMsg('Estadísticas reseteadas.')
      await load()
    } catch (err) {
      setResetMsg(err.message)
    } finally {
      setResetting(false)
    }
  }

  const maxMean = rows.length ? Math.max(...rows.map(r => +r.mean_ms)) : 1

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-white flex-shrink-0">
            <DatabaseIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Slow Queries</h1>
            <p className="text-sm text-slate-500">Top 20 queries por tiempo promedio de ejecución</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {autoRefresh ? `Auto (${countdown}s)` : 'Auto-refresh'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            disabled={resetting}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
          >
            {resetting ? 'Reseteando…' : 'Resetear stats'}
          </button>
        </div>
      </div>

      {resetMsg && (
        <div className="mb-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          {resetMsg}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/> &lt; 100 ms</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/> 100–499 ms</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/> ≥ 500 ms</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-16">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-16">
            Sin datos. Ejecutá consultas primero.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium w-1/2">Query</th>
                  <th className="text-right px-4 py-3 font-medium">Llamadas</th>
                  <th className="text-right px-4 py-3 font-medium">Promedio</th>
                  <th className="text-right px-4 py-3 font-medium">Máximo</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-right px-4 py-3 font-medium">Filas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 max-w-xs">
                      <div className="truncate" title={r.query}>{r.query}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{Number(r.calls).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={msColor(+r.mean_ms)}>{r.mean_ms} ms</span>
                      <MsBar value={+r.mean_ms} max={maxMean} />
                    </td>
                    <td className={`px-4 py-3 text-right ${msColor(+r.max_ms)}`}>{r.max_ms} ms</td>
                    <td className="px-4 py-3 text-right text-slate-500">{r.total_ms} ms</td>
                    <td className="px-4 py-3 text-right text-slate-500">{Number(r.rows).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmReset && (
        <ConfirmModal
          title="Resetear estadísticas"
          message="¿Resetear todas las estadísticas de pg_stat_statements? Esta acción no se puede deshacer."
          confirmLabel="Resetear"
          danger
          onConfirm={reset}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}
