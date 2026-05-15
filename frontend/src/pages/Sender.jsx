import { useEffect, useState } from 'react'

const API_URL = `http://${window.location.hostname}:3000`

const PRESETS = {
  normal:      { bpm: 80,  spo2: 97, temperature: 36.5 },
  tachycardia: { bpm: 180, spo2: 97, temperature: 36.5 },
  bradycardia: { bpm: 30,  spo2: 97, temperature: 36.5 },
  lowOxygen:   { bpm: 80,  spo2: 85, temperature: 36.5 },
  invalid:     { bpm: 80,  spo2: 97, temperature: 150  },
}

function Sender() {
  const [beds, setBeds] = useState([])
  const [bedId, setBedId] = useState('')
  const [bpm, setBpm] = useState(80)
  const [spo2, setSpo2] = useState(97)
  const [temperature, setTemperature] = useState(36.5)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bedsError, setBedsError] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/beds`)
      .then((r) => r.json())
      .then((data) => {
        setBeds(data)
        if (data.length > 0) setBedId(String(data[0].id))
      })
      .catch((err) => setBedsError(err.message))
  }, [])

  const applyPreset = (p) => {
    setBpm(p.bpm)
    setSpo2(p.spo2)
    setTemperature(p.temperature)
  }

  const send = async () => {
    setLoading(true)
    setResponse(null)
    try {
      const res = await fetch(`${API_URL}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bed_id:      Number(bedId),
          bpm:         Number(bpm),
          spo2:        Number(spo2),
          temperature: Number(temperature),
        }),
      })
      const data = await res.json()
      setResponse({ status: res.status, data })
    } catch (err) {
      setResponse({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Enviar vitals</h1>
        <p className="text-sm text-gray-600">Manda lecturas manuales a cualquier cama.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        {bedsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">
            No se pudieron cargar las camas: {bedsError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cama</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
            value={bedId}
            onChange={(e) => setBedId(e.target.value)}
          >
            {beds.map((b) => (
              <option key={b.id} value={b.id}>{b.code}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BPM</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SpO2 (%)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temp (°C)</label>
            <input
              type="number"
              step="0.1"
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center pt-1">
          <span className="text-xs text-gray-500">Presets:</span>
          <button onClick={() => applyPreset(PRESETS.normal)}      className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Normal</button>
          <button onClick={() => applyPreset(PRESETS.tachycardia)} className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Taquicardia</button>
          <button onClick={() => applyPreset(PRESETS.bradycardia)} className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Bradicardia</button>
          <button onClick={() => applyPreset(PRESETS.lowOxygen)}   className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Hipoxia</button>
          <button onClick={() => applyPreset(PRESETS.invalid)}     className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Imposible</button>
        </div>

        <button
          onClick={send}
          disabled={loading || !bedId}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enviando…' : 'Enviar'}
        </button>
      </div>

      {response && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3">
          <h2 className="text-base font-semibold">Respuesta del backend</h2>
          {response.error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">
              Error: {response.error}
            </div>
          ) : (
            <>
              <div className={`inline-block text-xs font-semibold px-2 py-1 rounded ${
                response.status >= 400
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                HTTP {response.status}
              </div>
              {response.data?.alerts?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-300 p-3 rounded text-sm">
                  <div className="font-semibold mb-1">
                    ⚠ {response.data.alerts.length} alerta(s) disparada(s):
                  </div>
                  {response.data.alerts.map((a) => (
                    <div key={a.id}>· {a.type} — {a.message} (value={a.value})</div>
                  ))}
                </div>
              )}
              <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto">
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
