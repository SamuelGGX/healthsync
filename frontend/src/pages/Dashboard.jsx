import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import BedDetailsPanel from '../components/BedDetailsPanel'
import { API_URL } from '../config'

const ALERT_LABELS = {
  tachycardia: 'Taquicardia',
  bradycardia:  'Bradicardia',
  low_oxygen:   'Hipoxia',
}

const METRIC_LABELS = {
  bpm:         'BPM',
  spo2:        'SpO2',
  temperature: 'Temperatura',
}

function formatElapsed(isoString) {
  if (!isoString) return '—'
  const secs = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (secs < 5)  return 'ahora'
  if (secs < 60) return `hace ${secs}s`
  const mins = Math.floor(secs / 60)
  return `hace ${mins}m`
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  )
}

function DropIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    </svg>
  )
}

function TempIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0zm-3 7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  )
}

function SoundOnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    </svg>
  )
}

function SoundOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    </svg>
  )
}

function MetricBox({ icon, label, value, isAbnormal }) {
  return (
    <div className={`rounded-lg p-2 text-center ${isAbnormal ? 'bg-red-100' : 'bg-slate-100'}`}>
      <div className={`flex items-center justify-center gap-1 mb-0.5 ${isAbnormal ? 'text-red-500' : 'text-slate-400'}`}>
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-base font-bold leading-none ${isAbnormal ? 'text-red-700' : 'text-slate-800'}`}>
        {value ?? '—'}
      </div>
    </div>
  )
}

function StatusBadge({ status, alertType }) {
  if (status === 'alert') {
    const label = ALERT_LABELS[alertType] ?? 'Alerta'
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 whitespace-nowrap">
        {label}
      </span>
    )
  }
  if (status === 'normal') {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">
        Normal
      </span>
    )
  }
  if (status === 'inactive') {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 whitespace-nowrap">
        Apagado
      </span>
    )
  }
  // disconnected (inesperado)
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 whitespace-nowrap flex items-center gap-1">
      <WarningIcon /> Desconectado
    </span>
  )
}

function BedCard({ bed, onClick }) {
  const isAlert        = bed.status === 'alert'
  const isNormal       = bed.status === 'normal'
  const isInactive     = bed.status === 'inactive'
  const isDisconnected = bed.status === 'disconnected'
  const hasData        = bed.bpm !== undefined
  const isVacant       = !bed.patientName

  const bpmAbnormal  = isAlert && hasData && (bed.bpm > 150 || bed.bpm < 40)
  const spo2Abnormal = isAlert && hasData && bed.spo2 < 90

  const sensorErr      = bed.sensorError
  const sensorErrLabel = sensorErr
    ? `Error sensor (${METRIC_LABELS[sensorErr.metric] ?? sensorErr.metric}: ${sensorErr.value})`
    : null

  return (
    <div
      onClick={onClick}
      className={[
        'rounded-2xl border-2 p-4 transition-all duration-500 flex flex-col gap-3',
        isVacant                         ? 'border-dashed border-slate-300 bg-slate-50 opacity-60 hover:opacity-90' : '',
        !isVacant && isAlert             ? 'border-red-400 bg-red-50'                                              : '',
        !isVacant && isNormal            ? 'border-emerald-200 bg-white shadow-sm'                                 : '',
        !isVacant && isDisconnected      ? 'border-amber-400 bg-amber-50 alert-pulse'                              : '',
        !isVacant && isInactive          ? 'border-slate-200 bg-slate-50 opacity-70'                               : '',
        onClick                          ? 'cursor-pointer hover:shadow-md'                                        : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-bold text-slate-700 text-sm block">{bed.code}</span>
          {bed.patientName ? (
            <span className="text-[11px] text-slate-500 truncate block" title={bed.patientName}>
              {bed.patientName}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full inline-block">
              Disponible
            </span>
          )}
        </div>
        <StatusBadge status={bed.status} alertType={bed.alertType} />
      </div>

      {sensorErr && (
        <div
          className="text-[11px] font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5"
          title={sensorErr.reason}
        >
          <WarningIcon /> <span className="truncate">{sensorErrLabel}</span>
        </div>
      )}

      {hasData && !isInactive ? (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <MetricBox
              icon={<HeartIcon />}
              label="BPM"
              value={bed.bpm}
              isAbnormal={bpmAbnormal}
            />
            <MetricBox
              icon={<DropIcon />}
              label="SpO2"
              value={`${bed.spo2}%`}
              isAbnormal={spo2Abnormal}
            />
            <MetricBox
              icon={<TempIcon />}
              label="Temp"
              value={`${Number(bed.temperature).toFixed(1)}°`}
              isAbnormal={false}
            />
          </div>
          <p className="text-[11px] text-slate-400 text-right -mt-1">
            {formatElapsed(bed.lastReading)}
          </p>
        </>
      ) : isInactive ? (
        <p className="text-xs text-slate-400 text-center py-3 italic">Monitoreo apagado</p>
      ) : (
        <p className="text-xs text-slate-400 text-center py-3">Sin lecturas</p>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  const accents = {
    slate:   'text-slate-700  bg-white      border-slate-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    red:     'text-red-700    bg-red-50     border-red-200',
    amber:   'text-amber-700  bg-amber-50   border-amber-200',
    gray:    'text-slate-600  bg-slate-100  border-slate-200',
  }
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${accents[accent]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5 opacity-75">{label}</div>
    </div>
  )
}

// Mapea el status del backend al status que la UI muestra inicialmente.
// 'active' -> 'normal' (optimista; los eventos 'vital' lo refinan)
// 'inactive' / 'disconnected' -> tal cual
function uiStatusFromDb(dbStatus) {
  if (dbStatus === 'active')       return 'normal'
  if (dbStatus === 'inactive')     return 'inactive'
  if (dbStatus === 'disconnected') return 'disconnected'
  return 'inactive'
}

function playBeep(audioCtx) {
  const osc  = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.type = 'sine'
  osc.frequency.value = 880
  const t = audioCtx.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.35, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
  osc.start(t)
  osc.stop(t + 0.28)
}

export default function Dashboard() {
  const { token }                   = useAuth()
  const [beds, setBeds]             = useState({})
  const [connected, setConnected]   = useState(false)
  const [tick, setTick]             = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [muted, setMuted]           = useState(false)
  const [selectedBedId, setSelectedBedId] = useState(null)
  const audioCtxRef                 = useRef(null)
  const mutedRef                    = useRef(false)

  const initAndToggleSound = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
      setSoundEnabled(true)
      mutedRef.current = false
      setMuted(false)
    } else {
      const next = !mutedRef.current
      mutedRef.current = next
      setMuted(next)
    }
  }

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetch(`${API_URL}/beds`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        const initial = {}
        data.forEach(b => {
          initial[b.id] = {
            id:               b.id,
            code:             b.code,
            status:           uiStatusFromDb(b.status),
            autoSimulate:     b.auto_simulate,
            patientName:      b.patient_name      ?? null,
            patientBloodType: b.patient_blood_type ?? null,
            bpm:              b.bpm,
            spo2:             b.spo2,
            temperature:      b.temperature,
            lastReading:      b.last_reading,
          }
        })
        setBeds(initial)
      })
      .catch(console.error)

    const socket = io({
      transports: ['websocket'],
      auth: { token },
    })

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('vital', ({ bed_id, bpm, spo2, temperature, recorded_at, is_anomaly }) => {
      setBeds(prev => {
        const current = prev[bed_id]
        // Si la cama está manualmente desconectada o apagada, ignoramos vitals
        // tardíos para que no la "revivan" antes de que el simulator se entere.
        if (current?.status === 'disconnected' || current?.status === 'inactive') {
          return prev
        }
        return {
          ...prev,
          [bed_id]: {
            ...current,
            id:          bed_id,
            bpm,
            spo2,
            temperature,
            lastReading: recorded_at ?? new Date().toISOString(),
            status:      is_anomaly ? 'alert' : 'normal',
            alertType:   is_anomaly ? current?.alertType : undefined,
            sensorError: null,
          },
        }
      })
    })

    socket.on('alert', ({ bed_id, type }) => {
      setBeds(prev => ({
        ...prev,
        [bed_id]: {
          ...prev[bed_id],
          alertType: type,
        },
      }))
      if (audioCtxRef.current && !mutedRef.current) {
        playBeep(audioCtxRef.current)
      }
    })

    socket.on('bed_status', ({ bed_id, status }) => {
      setBeds(prev => ({
        ...prev,
        [bed_id]: {
          ...prev[bed_id],
          status: uiStatusFromDb(status),
          // si se apaga, limpia datos viejos para que no se vean residuales
          ...(status === 'inactive' ? { alertType: undefined, sensorError: null } : {}),
        },
      }))
    })

    socket.on('bed_status_bulk', ({ status }) => {
      if (status !== 'inactive') return // solo manejamos apagado masivo aquí
      setBeds(prev => {
        const next = {}
        for (const id in prev) {
          next[id] = {
            ...prev[id],
            status:     'inactive',
            alertType:  undefined,
            sensorError: null,
          }
        }
        return next
      })
    })

    socket.on('sensor_error', ({ bed_id, metric, value, reason, occurred_at }) => {
      setBeds(prev => ({
        ...prev,
        [bed_id]: {
          ...prev[bed_id],
          sensorError: { metric, value, reason, time: occurred_at ?? new Date().toISOString() },
        },
      }))
    })

    return () => socket.disconnect()
  }, [])

  const bedList = Object.values(beds).sort((a, b) =>
    (a.code ?? '').localeCompare(b.code ?? '')
  )

  const stats = {
    total:        bedList.length,
    normal:       bedList.filter(b => b.status === 'normal').length,
    alert:        bedList.filter(b => b.status === 'alert').length,
    disconnected: bedList.filter(b => b.status === 'disconnected').length,
    inactive:     bedList.filter(b => b.status === 'inactive').length,
    sensorError:  bedList.filter(b => b.sensorError).length,
  }

  const refreshBeds = () => {
    fetch(`${API_URL}/beds`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        setBeds(prev => {
          const next = { ...prev }
          data.forEach(b => {
            if (next[b.id]) {
              next[b.id] = {
                ...next[b.id],
                patientName:      b.patient_name      ?? null,
                patientBloodType: b.patient_blood_type ?? null,
              }
            }
          })
          return next
        })
      })
      .catch(console.error)
  }

  void tick

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Monitor en tiempo real</h1>
        <p className="text-sm text-slate-500 mt-0.5">Estado de todas las camas via WebSocket</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total camas"   value={stats.total}        accent="slate"   />
        <StatCard label="Normal"        value={stats.normal}       accent="emerald" />
        <StatCard label="En alerta"     value={stats.alert}        accent="red"     />
        <StatCard label="Desconectadas" value={stats.disconnected} accent="amber"   />
        <StatCard label="Apagadas"      value={stats.inactive}     accent="gray"    />
        <StatCard label="Error sensor"  value={stats.sensorError}  accent="amber"   />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-xs text-slate-500">
            {connected ? 'Conectado — actualizaciones en vivo' : 'Reconectando…'}
          </span>
        </div>
        <button
          onClick={initAndToggleSound}
          title={!soundEnabled ? 'Haz clic para activar alertas sonoras' : muted ? 'Sonido silenciado — clic para activar' : 'Sonido activo — clic para silenciar'}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
            !soundEnabled
              ? 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              : muted
                ? 'border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {!soundEnabled ? (
            <><SoundOffIcon /> Activar sonido</>
          ) : muted ? (
            <><SoundOffIcon /> Silenciado</>
          ) : (
            <><SoundOnIcon /> Sonido activo</>
          )}
        </button>
      </div>

      {bedList.length === 0 ? (
        <p className="text-slate-400 text-center py-16 text-sm">Cargando camas…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {bedList.map(bed => (
            <BedCard key={bed.id} bed={bed} onClick={() => setSelectedBedId(bed.id)} />
          ))}
        </div>
      )}

      {selectedBedId && beds[selectedBedId] && (
        <BedDetailsPanel
          bedId={selectedBedId}
          bedCode={beds[selectedBedId].code}
          bed={beds[selectedBedId]}
          onClose={() => setSelectedBedId(null)}
          onPatientChanged={refreshBeds}
        />
      )}
    </div>
  )
}
