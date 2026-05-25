import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API_URL = `http://${window.location.hostname}:3000`

function UptimeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
    </svg>
  )
}
function CheckCircle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-500">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  )
}
function XCircle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
    </svg>
  )
}
function Spinner({ size = 16 }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
function ChevronDown({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusBadge(status) {
  if (status === 'up')     return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (status === 'down')   return 'text-red-700 bg-red-50 border-red-200'
  if (status === 'paused') return 'text-slate-500 bg-slate-50 border-slate-200'
  return 'text-amber-700 bg-amber-50 border-amber-200'
}
function statusLabel(s) {
  if (s === 'up')     return 'UP'
  if (s === 'down')   return 'DOWN'
  if (s === 'paused') return 'PAUSED'
  return s?.toUpperCase() ?? '—'
}
function msColor(ms) {
  if (ms == null) return 'text-slate-400'
  if (ms >= 1000) return 'text-red-600 font-semibold'
  if (ms >= 300)  return 'text-amber-600 font-semibold'
  return 'text-emerald-600'
}
function uptimeColor(pct) {
  if (pct == null) return 'text-slate-400'
  const n = parseFloat(pct)
  if (n >= 99.9) return 'text-emerald-600 font-semibold'
  if (n >= 99)   return 'text-emerald-500'
  if (n >= 95)   return 'text-amber-600 font-semibold'
  return 'text-red-600 font-semibold'
}
function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60)    return `hace ${diff}s`
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}
function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function formatDuration(secs) {
  if (!secs || secs <= 0) return '—'
  if (secs < 60)    return `${secs}s`
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ${secs % 60}s`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
  return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`
}

// ---------------------------------------------------------------------------
// Internal health card
// ---------------------------------------------------------------------------
function InternalHealthCard({ token, refreshKey }) {
  const [health,  setHealth]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const check = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const t0      = Date.now()
      const res     = await fetch(`${API_URL}/health`, { headers: { Authorization: `Bearer ${token}` } })
      const latency = Date.now() - t0
      const data    = await res.json()
      setHealth({ ...data, latency_ms: latency })
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { check() }, [check, refreshKey])

  const isUp = health?.status === 'ok'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Health interno</h2>
        <button onClick={check} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
          {loading ? 'Verificando…' : 'Verificar'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
      )}

      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <span>{loading ? <Spinner /> : isUp ? <CheckCircle /> : <XCircle />}</span>
            <div>
              <p className="text-xs text-slate-500">Backend</p>
              <p className={`text-sm font-semibold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                {loading ? '…' : isUp ? 'Activo' : 'Caído'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <span>{loading ? <Spinner /> : health?.db === 'connected' ? <CheckCircle /> : <XCircle />}</span>
            <div>
              <p className="text-xs text-slate-500">Base de datos</p>
              <p className={`text-sm font-semibold ${health?.db === 'connected' ? 'text-emerald-600' : 'text-red-600'}`}>
                {loading ? '…' : health?.db === 'connected' ? 'Conectada' : health?.db ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <div className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Latencia respuesta</p>
              <p className={`text-sm font-semibold ${msColor(health?.latency_ms)}`}>
                {loading ? '…' : health?.latency_ms != null ? `${health.latency_ms} ms` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Incidents panel (expandable per check)
// ---------------------------------------------------------------------------
function IncidentsPanel({ token, checkId }) {
  const [outages,  setOutages]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const res  = await fetch(`${API_URL}/admin/pingdom/outages/${checkId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al cargar')
        if (!cancelled) setOutages(data.outages)
      } catch (err) { if (!cancelled) setError(err.message) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [token, checkId])

  if (loading) return (
    <tr><td colSpan={7} className="px-5 py-4 bg-slate-50 border-b border-slate-100">
      <div className="flex items-center gap-2 text-xs text-slate-400"><Spinner size={13} /> Cargando incidentes…</div>
    </td></tr>
  )
  if (error) return (
    <tr><td colSpan={7} className="px-5 py-3 bg-red-50 border-b border-slate-100">
      <p className="text-xs text-red-600">{error}</p>
    </td></tr>
  )

  return (
    <tr>
      <td colSpan={7} className="bg-slate-50 border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Incidentes recientes (DOWN / UNKNOWN)
        </p>
        {outages.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            Sin incidentes registrados. ¡Todo estuvo siempre UP! 🎉
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="text-left pb-2 pr-4 font-medium">Tipo</th>
                <th className="text-left pb-2 pr-4 font-medium">Inicio</th>
                <th className="text-left pb-2 pr-4 font-medium">Fin</th>
                <th className="text-left pb-2 font-medium">Duración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {outages.map((o, i) => {
                const duration = o.timeto ? o.timeto - o.timefrom : null
                const isDown   = o.status === 'down'
                return (
                  <tr key={i} className="text-slate-600">
                    <td className="py-2 pr-4">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        isDown
                          ? 'text-red-700 bg-red-50 border-red-200'
                          : 'text-slate-600 bg-slate-100 border-slate-300'
                      }`}>
                        {isDown ? 'DOWN' : 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={isDown ? 'text-red-600 font-medium' : 'text-slate-500'}>
                        {formatDate(o.timefrom)}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {o.timeto
                        ? <span className="text-slate-500">{formatDate(o.timeto)}</span>
                        : <span className="text-amber-600 font-medium">Todavía activo</span>
                      }
                    </td>
                    <td className="py-2">
                      <span className={`font-medium ${duration && duration > 300 ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatDuration(duration)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Pingdom section
// ---------------------------------------------------------------------------
function PingdomSection({ token, refreshKey }) {
  const [checks,    setChecks]    = useState(null)
  const [uptimeMap, setUptimeMap] = useState({})   // { checkId: { uptime_pct, avg_response_ms } }
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [latency,   setLatency]   = useState(null)
  const [expanded,  setExpanded]  = useState(null) // checkId expanded para ver incidentes

  const loadChecks = useCallback(async () => {
    setLoading(true); setError(null); setUptimeMap({})
    try {
      const res  = await fetch(`${API_URL}/admin/pingdom/checks`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar checks')
      setChecks(data.checks)
      setLatency(data.latency_ms)

      // Cargar uptime de cada check en paralelo
      if (data.checks?.length) {
        const results = await Promise.allSettled(
          data.checks.map(c =>
            fetch(`${API_URL}/admin/pingdom/uptime/${c.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then(r => r.json()).then(d => ({ id: c.id, ...d }))
          )
        )
        const map = {}
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value?.id) {
            map[r.value.id] = { uptime_pct: r.value.uptime_pct, avg_response_ms: r.value.avg_response_ms }
          }
        })
        setUptimeMap(map)
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadChecks() }, [loadChecks, refreshKey])

  const toggleExpanded = (id) => setExpanded(prev => prev === id ? null : id)

  const notConfigured = error?.includes('not configured')
  const total  = checks?.length ?? 0
  const up     = checks?.filter(c => c.status === 'up').length    ?? 0
  const down   = checks?.filter(c => c.status === 'down').length  ?? 0
  const paused = checks?.filter(c => c.status === 'paused').length ?? 0

  // Uptime promedio global
  const uptimeValues = Object.values(uptimeMap).map(u => parseFloat(u.uptime_pct)).filter(n => !isNaN(n))
  const avgUptime    = uptimeValues.length ? (uptimeValues.reduce((a, b) => a + b, 0) / uptimeValues.length).toFixed(3) : null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Pingdom — Checks de uptime
          </h2>
          {latency != null && (
            <p className="text-xs text-slate-400 mt-0.5">API respondió en {latency} ms</p>
          )}
        </div>
        <button onClick={loadChecks} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {/* Not configured */}
      {notConfigured && !loading && (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700 mb-1">Pingdom no está configurado</p>
          <p className="text-xs text-slate-500 mb-4">
            Agregá tu API key al archivo <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">.env</code>:
          </p>
          <pre className="inline-block text-left bg-slate-900 text-emerald-400 text-xs px-5 py-3 rounded-xl">
            PINGDOM_API_KEY=tu_api_key_aqui
          </pre>
          <p className="text-xs text-slate-400 mt-4">
            Obtenés el token en{' '}
            <a href="https://my.pingdom.com/app/api-tokens" target="_blank" rel="noopener noreferrer"
              className="text-blue-500 hover:underline">
              my.pingdom.com → API Tokens
            </a>
          </p>
        </div>
      )}

      {/* Generic error */}
      {error && !notConfigured && (
        <div className="m-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Stats bar */}
      {!error && !loading && checks !== null && (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 border-b border-slate-100 bg-slate-50/60 text-xs">
            <span className="text-slate-500">Total: <strong className="text-slate-700">{total}</strong></span>
            <span className="text-emerald-600">UP: <strong>{up}</strong></span>
            {down   > 0 && <span className="text-red-600 font-semibold">DOWN: <strong>{down}</strong></span>}
            {paused > 0 && <span className="text-slate-400">Pausados: <strong>{paused}</strong></span>}
            {avgUptime != null && (
              <span className="ml-auto">
                Uptime promedio (30d):{' '}
                <strong className={uptimeColor(avgUptime)}>{avgUptime}%</strong>
              </span>
            )}
          </div>

          {checks.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-14">
              No hay checks configurados en Pingdom.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 font-medium">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium">Host</th>
                    <th className="text-left px-4 py-3 font-medium">Tipo</th>
                    <th className="text-center px-4 py-3 font-medium">Estado</th>
                    <th className="text-right px-4 py-3 font-medium">Uptime 30d</th>
                    <th className="text-right px-4 py-3 font-medium">Resp. prom.</th>
                    <th className="text-right px-4 py-3 font-medium">Último resp.</th>
                    <th className="text-right px-4 py-3 font-medium">Último chequeo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {checks.map(c => {
                    const stats   = uptimeMap[c.id]
                    const isOpen  = expanded === c.id
                    return (
                      <>
                        <tr key={c.id}
                          className={`border-b border-slate-50 transition-colors ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                          <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.hostname || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs uppercase">{c.type || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge(c.status)}`}>
                              {statusLabel(c.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs">
                            {stats
                              ? <span className={uptimeColor(stats.uptime_pct)}>{stats.uptime_pct != null ? `${stats.uptime_pct}%` : '—'}</span>
                              : <span className="text-slate-300"><Spinner size={12} /></span>
                            }
                          </td>
                          <td className="px-4 py-3 text-right text-xs">
                            {stats
                              ? <span className={msColor(stats.avg_response_ms)}>{stats.avg_response_ms != null ? `${stats.avg_response_ms} ms` : '—'}</span>
                              : <span className="text-slate-300"><Spinner size={12} /></span>
                            }
                          </td>
                          <td className={`px-4 py-3 text-right text-xs ${msColor(c.lastresponsetime)}`}>
                            {c.lastresponsetime != null ? `${c.lastresponsetime} ms` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-400">{timeAgo(c.lasttesttime)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => toggleExpanded(c.id)}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition ml-auto"
                            >
                              <span>{isOpen ? 'Ocultar' : 'Incidentes'}</span>
                              <ChevronDown open={isOpen} />
                            </button>
                          </td>
                        </tr>
                        {isOpen && <IncidentsPanel key={`inc-${c.id}`} token={token} checkId={c.id} />}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Loading first time */}
      {loading && checks === null && !error && (
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-14">
          <Spinner size={16} /> Cargando checks…
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Uptime() {
  const { token }                     = useAuth()
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [countdown,   setCountdown]   = useState(30)
  const [tick,        setTick]        = useState(0)

  const INTERVAL_S   = 30
  const intervalRef  = useRef(null)
  const countdownRef = useRef(null)

  useEffect(() => {
    if (autoRefresh) {
      setCountdown(INTERVAL_S)
      intervalRef.current  = setInterval(() => { setTick(t => t + 1); setCountdown(INTERVAL_S) }, INTERVAL_S * 1000)
      countdownRef.current = setInterval(() => setCountdown(c => c - 1), 1000)
    } else {
      clearInterval(intervalRef.current)
      clearInterval(countdownRef.current)
    }
    return () => {
      clearInterval(intervalRef.current)
      clearInterval(countdownRef.current)
    }
  }, [autoRefresh])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-white flex-shrink-0">
            <UptimeIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Uptime & Monitoreo</h1>
            <p className="text-sm text-slate-500">Health interno del sistema + checks de Pingdom</p>
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
            onClick={() => setTick(t => t + 1)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            Actualizar todo
          </button>
        </div>
      </div>

      <InternalHealthCard token={token} refreshKey={tick} />
      <PingdomSection     token={token} refreshKey={tick} />
    </div>
  )
}
