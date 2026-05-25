import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PasswordPrompt from './PasswordPrompt'
import AssignBedModal from './AssignBedModal'
import WaveformCanvas from './WaveformCanvas'

const API_URL = `http://${window.location.hostname}:3000`

const ALERT_LABELS = {
  tachycardia: 'Taquicardia',
  bradycardia:  'Bradicardia',
  low_oxygen:   'Hipoxia',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

function calcAge(birthDate) {
  if (!birthDate) return null
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

export default function BedDetailsPanel({ bedId, bedCode, bed, onClose, onPatientChanged }) {
  const { token, user } = useAuth()
  const navigate        = useNavigate()

  const [details, setDetails]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [showDischargePrompt, setShowDischargePrompt] = useState(false)
  const [dischargeError, setDischargeError]           = useState(null)
  const [discharging, setDischarging]                 = useState(false)

  const [showAssignModal, setShowAssignModal] = useState(false)

  const canEdit      = user?.role === 'admin' || user?.role === 'medico'
  const canDischarge = user?.role === 'medico'

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/beds/${bedId}/details`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setDetails(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [bedId, token, refreshKey])

  const refresh = () => {
    setRefreshKey(k => k + 1)
    onPatientChanged?.()
  }

  const handleDischarge = async (password) => {
    setDischarging(true)
    setDischargeError(null)
    try {
      const res = await fetch(`${API_URL}/patients/${details.patient.id}/discharge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (!res.ok) { setDischargeError(json.error ?? 'Error al dar de alta'); return }
      setShowDischargePrompt(false)
      refresh()
    } catch {
      setDischargeError('Error de conexión')
    } finally {
      setDischarging(false)
    }
  }

  const handleAssigned = () => {
    setShowAssignModal(false)
    refresh()
  }

  const patient = details?.patient ?? null
  const alerts  = details?.alerts  ?? []

  const isAlert        = bed?.status === 'alert'
  const isDisconnected = bed?.status === 'disconnected'
  const isInactive     = bed?.status === 'inactive'
  // No signal: sensor is off or lost — waveforms go flat, vitals show "—"
  const noSignal       = isInactive || isDisconnected || !bed?.patientName
  const hasData        = bed?.bpm != null && !noSignal
  const bpmAbnormal    = isAlert && hasData && (bed.bpm > 150 || bed.bpm < 40)
  const spo2Abnormal   = isAlert && hasData && bed.spo2 < 90

  let statusLabel = 'Sin datos'
  let statusDot   = 'bg-slate-600'
  if (isInactive) {
    statusLabel = 'Monitor apagado'
    statusDot   = 'bg-slate-600'
  } else if (isDisconnected) {
    statusLabel = 'Sensor desconectado'
    statusDot   = 'bg-amber-500'
  } else if (!bed?.patientName) {
    statusLabel = 'Sin paciente'
    statusDot   = 'bg-slate-600'
  } else if (hasData) {
    statusLabel = isAlert ? 'ALERTA ACTIVA' : 'Monitoreo activo'
    statusDot   = isAlert ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
  }

  return (
    <>
      {/* Backdrop — click outside closes */}
      <div
        className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal — fixed height so alerts don't push it taller */}
        <div
          className="relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex"
          style={{ height: '580px' }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── LEFT PANEL: dark medical monitor ── */}
          <div className="w-[42%] shrink-0 bg-[#020817] border-r border-slate-800 flex flex-col p-5 gap-5 overflow-hidden">

            {/* Bed header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-white text-base leading-none">{bedCode}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">{statusLabel}</span>
                </div>
              </div>
            </div>

            {/* ECG waveform + BPM */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest text-emerald-500 uppercase">ECG</span>
                {isAlert && bed?.alertType && (
                  <span className="text-[10px] font-bold text-red-400">
                    ⚠ {ALERT_LABELS[bed.alertType] ?? bed.alertType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <WaveformCanvas
                  type="ecg"
                  value={bed?.bpm}
                  width={176}
                  height={64}
                  color={bpmAbnormal ? '#f87171' : '#22c55e'}
                  glowColor={bpmAbnormal ? '#f8717160' : '#22c55e60'}
                  flat={noSignal}
                />
                <div className="text-right shrink-0 w-14">
                  <span className={`text-4xl font-bold font-mono leading-none block ${bpmAbnormal ? 'text-red-400 animate-pulse' : 'text-emerald-400'} ${noSignal ? 'opacity-30' : ''}`}>
                    {noSignal ? '—' : (bed?.bpm ?? '—')}
                  </span>
                  <span className="text-[11px] text-slate-500">BPM</span>
                </div>
              </div>
            </div>

            {/* SpO2 waveform + value */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold tracking-widest text-cyan-500 uppercase block">SpO₂</span>
              <div className="flex items-center gap-3">
                <WaveformCanvas
                  type="spo2"
                  value={bed?.spo2}
                  width={176}
                  height={64}
                  color={spo2Abnormal ? '#f87171' : '#06b6d4'}
                  glowColor={spo2Abnormal ? '#f8717160' : '#06b6d460'}
                  flat={noSignal}
                />
                <div className="text-right shrink-0 w-14">
                  <span className={`text-4xl font-bold font-mono leading-none block ${spo2Abnormal ? 'text-red-400 animate-pulse' : 'text-cyan-400'} ${noSignal ? 'opacity-30' : ''}`}>
                    {noSignal ? '—' : (bed?.spo2 != null ? bed.spo2 : '—')}
                  </span>
                  <span className="text-[11px] text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* Temperature */}
            <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                  <path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0zm-3 7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                </svg>
                <span className="text-[10px] font-bold tracking-widest text-amber-500 uppercase">Temperatura</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold font-mono text-amber-400 leading-none ${noSignal ? 'opacity-30' : ''}`}>
                  {noSignal ? '—' : (bed?.temperature != null ? Number(bed.temperature).toFixed(1) : '—')}
                </span>
                <span className="text-[11px] text-slate-500">°C</span>
              </div>
            </div>

            {/* Last reading timestamp */}
            {bed?.lastReading && (
              <p className="text-[10px] text-slate-600 text-center -mt-2">
                Última lectura: {new Date(bed.lastReading).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>

          {/* ── RIGHT PANEL: patient info ── */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50">

            {/* Right header */}
            <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-800 text-base">
                {loading ? 'Cargando…' : patient ? 'Paciente asignado' : 'Cama disponible'}
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Right body — no scroll here; only alerts scroll */}
            <div className="flex-1 flex flex-col overflow-hidden px-5 py-4 gap-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : patient ? (
                <>
                  {/* Patient card — fixed, never shrinks */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shrink-0">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datos del paciente</span>
                      {patient.blood_type && (
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {patient.blood_type}
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {patient.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-tight">{patient.full_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Doc: {patient.document_id}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Edad</span>
                          <span className="font-medium text-slate-700 text-xs">
                            {patient.birth_date ? `${calcAge(patient.birth_date)} años` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Fecha de ingreso</span>
                          <span className="font-medium text-slate-700 text-xs">{formatDate(patient.admitted_at)}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Asignado a cama</span>
                          <span className="font-medium text-slate-700 text-xs">{formatDate(patient.assigned_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons — fixed, never shrinks */}
                  <div className="flex gap-2 shrink-0">
                    {canEdit && (
                      <button
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="flex-1 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 font-medium transition flex items-center justify-center gap-1.5"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Ver paciente
                      </button>
                    )}
                    {canDischarge && !patient.discharged_at && (
                      <button
                        onClick={() => { setShowDischargePrompt(true); setDischargeError(null) }}
                        className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition flex items-center justify-center gap-1.5"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Dar de alta
                      </button>
                    )}
                  </div>

                  {/* Alert history — takes remaining space, list scrolls */}
                  <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Últimas alertas</span>
                      {alerts.length > 0 && (
                        <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{alerts.length}</span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-50 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <p className="px-4 py-5 text-xs text-slate-400 italic text-center">Sin alertas registradas</p>
                      ) : (
                        alerts.map(alert => (
                          <div key={alert.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                            <div>
                              <span className="text-xs font-semibold text-red-700">
                                {ALERT_LABELS[alert.type] ?? alert.type}
                              </span>
                              {alert.value != null && (
                                <span className="ml-2 text-[11px] text-slate-400">valor: {alert.value}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                              {formatDate(alert.triggered_at)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Empty bed state */
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                      <path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/>
                      <path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-700 font-bold text-base">Sin paciente asignado</p>
                    <p className="text-sm text-slate-400 mt-1.5">Esta cama está disponible para asignar un paciente.</p>
                  </div>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Asignar paciente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDischargePrompt && (
        <PasswordPrompt
          title="Dar de alta al paciente"
          description={`Confirma con tu contraseña para dar de alta a ${patient?.full_name}.`}
          error={dischargeError}
          loading={discharging}
          onConfirm={handleDischarge}
          onCancel={() => { setShowDischargePrompt(false); setDischargeError(null) }}
        />
      )}

      {showAssignModal && (
        <AssignBedModal
          bedId={bedId}
          bedCode={bedCode}
          onAssigned={handleAssigned}
          onCancel={() => setShowAssignModal(false)}
        />
      )}
    </>
  )
}
