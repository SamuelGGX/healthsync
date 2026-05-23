import { useEffect, useRef, useState } from 'react'

const API_URL = `http://${window.location.hostname}:3000`

const PRESETS = [
  { key: 'normal',      label: 'Normal',      values: { bpm: 80,  spo2: 97, temperature: 36.5 }, style: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
  { key: 'tachycardia', label: 'Taquicardia', values: { bpm: 180, spo2: 97, temperature: 36.5 }, style: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { key: 'bradycardia', label: 'Bradicardia', values: { bpm: 30,  spo2: 97, temperature: 36.5 }, style: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' },
  { key: 'lowOxygen',   label: 'Hipoxia',     values: { bpm: 80,  spo2: 85, temperature: 36.5 }, style: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
  { key: 'invalid',     label: 'Imposible',   values: { bpm: 80,  spo2: 97, temperature: 150  }, style: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' },
]

const STREAM_DURATION = 30

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

async function postVitals(snapshot) {
  const res = await fetch(`${API_URL}/vitals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bed_id:      Number(snapshot.bedId),
      bpm:         Number(snapshot.bpm),
      spo2:        Number(snapshot.spo2),
      temperature: Number(snapshot.temperature),
    }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function putSimulate(bedId, enabled) {
  const res = await fetch(`${API_URL}/beds/${bedId}/simulate`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Pausa o reactiva el simulator SIN cambiar el status de la cama
// (para no romper la vista en el dashboard durante un stream manual).
async function pauseSimulator(bedId, paused) {
  const res = await fetch(`${API_URL}/beds/${bedId}/simulator-pause`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paused }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function SimulatorToggle({ enabled, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        enabled ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
      aria-label={enabled ? 'Desactivar simulator' : 'Activar simulator'}
    >
      <span
        className={`absolute top-0.5 left-0.5 block w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

function Sender() {
  const [beds, setBeds]           = useState([])
  const [bedId, setBedId]         = useState('')
  const [bpm, setBpm]             = useState(80)
  const [spo2, setSpo2]           = useState(97)
  const [temperature, setTemp]    = useState(36.5)
  const [response, setResponse]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [bedsError, setBedsError] = useState(null)

  const [streaming, setStreaming] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const streamRef                 = useRef(null)
  const finishStreamRef           = useRef(null)

  const [searchTerm, setSearchTerm]   = useState('')
  const [togglingAll, setTogglingAll] = useState(false)

  const refreshBeds = async () => {
    try {
      const res = await fetch(`${API_URL}/beds`)
      const data = await res.json()
      setBeds(data)
      if (!bedId && data.length > 0) setBedId(String(data[0].id))
    } catch (err) {
      setBedsError(err.message)
    }
  }

  useEffect(() => {
    refreshBeds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => clearInterval(streamRef.current), [])

  const applyPreset = ({ bpm, spo2, temperature }) => {
    setBpm(bpm)
    setSpo2(spo2)
    setTemp(temperature)
  }

  const send = async () => {
    if (loading || streaming || !bedId) return
    setLoading(true)
    setResponse(null)
    try {
      const result = await postVitals({ bedId, bpm, spo2, temperature })
      setResponse(result)
    } catch (err) {
      setResponse({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const startStream = async () => {
    if (!bedId || streaming) return

    const streamBedId   = Number(bedId)
    const currentBed    = beds.find(b => b.id === streamBedId)
    const wasSimulating = !!currentBed?.auto_simulate

    // Pausar el simulator para esta cama mientras dura el stream, SIN cambiar
    // el status (para que el dashboard siga viendo la cama activa y refleje
    // los valores que estamos transmitiendo).
    if (wasSimulating) {
      try {
        await pauseSimulator(streamBedId, true)
        setBeds(prev => prev.map(b => b.id === streamBedId ? { ...b, auto_simulate: false } : b))
      } catch (err) {
        console.error('No se pudo pausar el simulator:', err)
      }
    }

    const snapshot  = { bedId: streamBedId, bpm, spo2, temperature }
    let   remaining = STREAM_DURATION

    setStreaming(true)
    setCountdown(remaining)
    setResponse(null)

    const finish = async () => {
      if (streamRef.current) {
        clearInterval(streamRef.current)
        streamRef.current = null
      }
      finishStreamRef.current = null
      setStreaming(false)
      setCountdown(0)

      // Restaurar auto_simulate solo si estaba prendido antes
      if (wasSimulating) {
        try {
          await pauseSimulator(streamBedId, false)
          setBeds(prev => prev.map(b => b.id === streamBedId ? { ...b, auto_simulate: true } : b))
        } catch (err) {
          console.error('No se pudo restaurar el simulator:', err)
        }
      }
    }

    finishStreamRef.current = finish

    const doSend = async () => {
      try {
        const result = await postVitals(snapshot)
        setResponse(result)
      } catch (err) {
        setResponse({ error: err.message })
      }
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        await finish()
      }
    }

    doSend()
    streamRef.current = setInterval(doSend, 1000)
  }

  const stopStream = async () => {
    if (finishStreamRef.current) {
      await finishStreamRef.current()
    }
  }

  const toggleSimulate = async (id, enabled) => {
    // Optimistic update: cuando se prende, status también pasa a 'active';
    // cuando se apaga, a 'inactive'. Esto mantiene los botones consistentes.
    setBeds(prev => prev.map(b =>
      b.id === id
        ? { ...b, auto_simulate: enabled, status: enabled ? 'active' : 'inactive' }
        : b
    ))
    try {
      await putSimulate(id, enabled)
    } catch (err) {
      console.error('toggleSimulate failed', err)
      setBeds(prev => prev.map(b =>
        b.id === id ? { ...b, auto_simulate: !enabled } : b
      ))
    }
  }

  const toggleAll = async (enabled) => {
    setTogglingAll(true)
    setBeds(prev => prev.map(b => ({ ...b, auto_simulate: enabled })))
    try {
      const res = await fetch(`${API_URL}/beds/simulate-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      console.error('toggleAll failed', err)
      await refreshBeds()
    } finally {
      setTogglingAll(false)
    }
  }

  // Simula una falla de sensor: la cama pasa a status='disconnected'.
  // NO toca auto_simulate — el switch sigue como estaba; el simulator deja de mandar
  // porque filtra por status='active'.
  const disconnectBed = async () => {
    if (!bedId || loading || streaming) return
    setLoading(true)
    setResponse(null)
    try {
      const r = await fetch(`${API_URL}/beds/${bedId}/disconnect`, { method: 'POST' })
      const data = await r.json()
      setResponse({ status: r.status, data })
      setBeds(prev => prev.map(b =>
        b.id === Number(bedId) ? { ...b, status: 'disconnected' } : b
      ))
    } catch (err) {
      setResponse({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Reconecta la cama: vuelve a 'active' + auto_simulate=true
  const reconnectBed = async () => {
    if (!bedId || loading || streaming) return
    setLoading(true)
    setResponse(null)
    try {
      const r = await fetch(`${API_URL}/beds/${bedId}/reconnect`, { method: 'POST' })
      const data = await r.json()
      setResponse({ status: r.status, data })
      setBeds(prev => prev.map(b =>
        b.id === Number(bedId) ? { ...b, auto_simulate: true, status: 'active' } : b
      ))
    } catch (err) {
      setResponse({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const progress    = ((STREAM_DURATION - countdown) / STREAM_DURATION) * 100
  const statusColor = response
    ? response.error || response.status >= 400
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : ''

  const filteredBeds = beds.filter((b) => {
    const q = searchTerm.toLowerCase()
    if (!q) return true
    return (
      b.code?.toLowerCase().includes(q) ||
      (b.patient_name && b.patient_name.toLowerCase().includes(q))
    )
  })

  const activeCount = beds.filter(b => b.auto_simulate).length
  const selectedBed = beds.find(b => String(b.id) === String(bedId))

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Enviar vitals</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manda lecturas manuales a cualquier cama para probar el sistema.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        {bedsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            No se pudieron cargar las camas: {bedsError}
          </div>
        )}

        <Field label="Cama">
          <select
            className={inputClass}
            value={bedId}
            onChange={e => setBedId(e.target.value)}
            disabled={streaming}
          >
            {beds.map(b => (
              <option key={b.id} value={b.id}>{b.code}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="BPM">
            <input
              type="number"
              className={inputClass}
              value={bpm}
              onChange={e => setBpm(e.target.value)}
              disabled={streaming}
            />
          </Field>
          <Field label="SpO2 (%)">
            <input
              type="number"
              className={inputClass}
              value={spo2}
              onChange={e => setSpo2(e.target.value)}
              disabled={streaming}
            />
          </Field>
          <Field label="Temp (°C)">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={temperature}
              onChange={e => setTemp(e.target.value)}
              disabled={streaming}
            />
          </Field>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Escenarios de prueba</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.values)}
                disabled={streaming}
                className={`text-xs font-medium px-3 py-1.5 border rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${p.style}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        {!streaming ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={send}
                disabled={loading || !bedId}
                className="bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Enviando…' : 'Enviar'}
              </button>
              <button
                onClick={startStream}
                disabled={!bedId}
                className="bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 active:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Transmitir 30s
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={disconnectBed}
                disabled={loading || !selectedBed || selectedBed.status !== 'active'}
                title={
                  !selectedBed ? 'Selecciona una cama'
                  : selectedBed.status === 'disconnected' ? 'La cama ya está desconectada'
                  : selectedBed.status === 'inactive' ? 'La cama está apagada (sube el switch primero)'
                  : 'Simula que el sensor de esta cama falló'
                }
                className="bg-amber-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Desconectar sensor
              </button>
              <button
                onClick={reconnectBed}
                disabled={loading || !selectedBed || selectedBed.status !== 'disconnected'}
                title={
                  !selectedBed ? 'Selecciona una cama'
                  : selectedBed.status === 'active' ? 'La cama ya está activa'
                  : selectedBed.status === 'inactive' ? 'La cama está apagada (no hay nada que reconectar)'
                  : 'Repara el sensor y reactiva el simulator'
                }
                className="bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Reconectar sensor
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">Transmitiendo…</span>
              <span className="tabular-nums text-slate-500">{countdown}s restantes</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              onClick={stopStream}
              className="w-full bg-red-50 border border-red-200 text-red-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-100 active:bg-red-200 transition"
            >
              Detener
            </button>
          </div>
        )}
      </div>

      {/* Control del simulator */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Control del simulator</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Decide qué camas reciben datos automáticos del simulator.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full whitespace-nowrap">
            {activeCount} / {beds.length} activas
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => toggleAll(true)}
            disabled={togglingAll}
            className="bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            Activar todas
          </button>
          <button
            onClick={() => toggleAll(false)}
            disabled={togglingAll}
            className="bg-slate-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition"
          >
            Desactivar todas
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por código o paciente…"
          className={inputClass}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {filteredBeds.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin resultados</p>
          ) : (
            filteredBeds.map(b => (
              <div
                key={b.id}
                className={`flex items-center justify-between px-3 py-2.5 ${
                  b.status === 'disconnected' ? 'bg-amber-50' : ''
                }`}
              >
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    {b.code}
                    {b.status === 'disconnected' && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 animate-pulse"
                        title="Sensor desconectado"
                      >
                        Desconectado
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {b.patient_name || <span className="italic text-slate-400">Sin paciente</span>}
                  </p>
                </div>
                <SimulatorToggle
                  enabled={!!b.auto_simulate}
                  onClick={() => toggleSimulate(b.id, !b.auto_simulate)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {response && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Respuesta del backend
              {streaming && (
                <span className="ml-2 text-xs font-normal text-blue-600">· actualizando en vivo</span>
              )}
            </h2>
            {!response.error && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColor}`}>
                HTTP {response.status}
              </span>
            )}
          </div>

          {response.error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {response.error}
            </div>
          ) : (
            <>
              {response.data?.alerts?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-800">
                    {response.data.alerts.length} alerta(s) disparada(s)
                  </p>
                  {response.data.alerts.map(a => (
                    <p key={a.id} className="text-xs text-amber-700">
                      · {a.type} — {a.message} (valor: {a.value})
                    </p>
                  ))}
                </div>
              )}
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs overflow-x-auto text-slate-700 leading-relaxed">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Sender
