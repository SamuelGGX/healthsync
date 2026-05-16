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

  useEffect(() => {
    fetch(`${API_URL}/beds`)
      .then(r => r.json())
      .then(data => {
        setBeds(data)
        if (data.length > 0) setBedId(String(data[0].id))
      })
      .catch(err => setBedsError(err.message))
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

  const startStream = () => {
    if (!bedId || streaming) return

    const snapshot  = { bedId, bpm, spo2, temperature }
    let   remaining = STREAM_DURATION

    setStreaming(true)
    setCountdown(remaining)
    setResponse(null)

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
        clearInterval(streamRef.current)
        setStreaming(false)
      }
    }

    doSend()
    streamRef.current = setInterval(doSend, 1000)
  }

  const stopStream = () => {
    clearInterval(streamRef.current)
    setStreaming(false)
    setCountdown(0)
  }

  const progress       = ((STREAM_DURATION - countdown) / STREAM_DURATION) * 100
  const statusColor    = response
    ? response.error || response.status >= 400
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : ''

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
          <div className="grid grid-cols-3 gap-3">
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
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!bedId) return
                  setLoading(true)
                  try {
                    const r = await fetch(`${API_URL}/beds/${bedId}/disconnect`, { method: 'POST' })
                    setResponse({ status: r.status, data: await r.json() })
                  } catch (err) {
                    setResponse({ error: err.message })
                  } finally { setLoading(false) }
                }}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Desconectar
              </button>
              <button
                onClick={async () => {
                  if (!bedId) return
                  setLoading(true)
                  try {
                    const r = await fetch(`${API_URL}/beds/${bedId}/reconnect`, { method: 'POST' })
                    setResponse({ status: r.status, data: await r.json() })
                  } catch (err) {
                    setResponse({ error: err.message })
                  } finally { setLoading(false) }
                }}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Reconectar
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
