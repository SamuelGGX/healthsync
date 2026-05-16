import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const API_URL = `http://${window.location.hostname}:3000`

const ALERT_LABELS = {
  tachycardia: 'Taquicardia',
  bradycardia:  'Bradicardia',
  low_oxygen:   'Hipoxia',
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

function BedCard({ bed }) {
  const isAlert  = bed.status === 'alert'
  const isNormal = bed.status === 'normal'
  const hasData  = bed.bpm !== undefined

  const bpmAbnormal  = isAlert && hasData && (bed.bpm > 150 || bed.bpm < 40)
  const spo2Abnormal = isAlert && hasData && bed.spo2 < 90

  return (
    <div
      className={[
        'rounded-2xl border-2 p-4 transition-all duration-500 flex flex-col gap-3',
        isAlert  ? 'border-red-400 bg-red-50'                   : '',
        isNormal ? 'border-emerald-200 bg-white shadow-sm'     : '',
        !isAlert && !isNormal ? 'border-slate-200 bg-slate-50' : '',
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
            <span className="text-[11px] text-slate-400 italic">Sin paciente</span>
          )}
        </div>
        <StatusBadge status={bed.status} alertType={bed.alertType} />
      </div>

      {hasData ? (
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
      ) : (
        <p className="text-xs text-slate-400 text-center py-3">Sin lecturas</p>
      )}
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
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 whitespace-nowrap">
      Sin señal
    </span>
  )
}

function StatCard({ label, value, accent }) {
  const accents = {
    slate:   'text-slate-700  bg-white      border-slate-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    red:     'text-red-700    bg-red-50     border-red-200',
    amber:   'text-amber-700  bg-amber-50   border-amber-200',
  }
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${accents[accent]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5 opacity-75">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const [beds, setBeds]           = useState({})
  const [connected, setConnected] = useState(false)
  const [tick, setTick]           = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch(`${API_URL}/beds`)
      .then(r => r.json())
      .then(data => {
        const initial = {}
        data.forEach(b => {
          initial[b.id] = {
            id:               b.id,
            code:             b.code,
            status:           'disconnected',
            patientName:      b.patient_name      ?? null,
            patientBloodType: b.patient_blood_type ?? null,
          }
        })
        setBeds(initial)
      })
      .catch(console.error)

    const socket = io(`http://${window.location.hostname}:3000`, {
      transports: ['websocket'],
    })

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('vital', ({ bed_id, bpm, spo2, temperature, recorded_at, is_anomaly }) => {
      setBeds(prev => ({
        ...prev,
        [bed_id]: {
          ...prev[bed_id],
          id:          bed_id,
          bpm,
          spo2,
          temperature,
          lastReading: recorded_at ?? new Date().toISOString(),
          status:      is_anomaly ? 'alert' : 'normal',
          alertType:   is_anomaly ? prev[bed_id]?.alertType : undefined,
        },
      }))
    })

    socket.on('alert', ({ bed_id, type }) => {
      setBeds(prev => ({
        ...prev,
        [bed_id]: {
          ...prev[bed_id],
          alertType: type,
        },
      }))
    })

    return () => socket.disconnect()
  }, [])

  const bedList = Object.values(beds).sort((a, b) =>
    (a.code ?? '').localeCompare(b.code ?? '')
  )

  const stats = {
    total:    bedList.length,
    normal:   bedList.filter(b => b.status === 'normal').length,
    alert:    bedList.filter(b => b.status === 'alert').length,
    noSignal: bedList.filter(b => b.status === 'disconnected').length,
  }

  void tick

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Monitor en tiempo real</h1>
        <p className="text-sm text-slate-500 mt-0.5">Estado de todas las camas via WebSocket</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total camas"  value={stats.total}    accent="slate"   />
        <StatCard label="Normal"       value={stats.normal}   accent="emerald" />
        <StatCard label="En alerta"    value={stats.alert}    accent="red"     />
        <StatCard label="Sin señal"    value={stats.noSignal} accent="amber"   />
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
        <span className="text-xs text-slate-500">
          {connected ? 'Conectado — actualizaciones en vivo' : 'Reconectando…'}
        </span>
      </div>

      {bedList.length === 0 ? (
        <p className="text-slate-400 text-center py-16 text-sm">Cargando camas…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {bedList.map(bed => (
            <BedCard key={bed.id} bed={bed} />
          ))}
        </div>
      )}
    </div>
  )
}
