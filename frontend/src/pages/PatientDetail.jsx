import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PatientForm from '../components/PatientForm'
import PasswordPrompt from '../components/PasswordPrompt'

const API_URL = `http://${window.location.hostname}:3000`

function fmt(iso, opts = { dateStyle: 'long' }) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', opts).format(new Date(iso))
}

function calcAge(birthDate) {
  if (!birthDate) return null
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function Field({ label, value }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

export default function PatientDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()

  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const [pendingEdit, setPendingEdit]           = useState(null)
  const [showEditPrompt, setShowEditPrompt]     = useState(false)
  const [editError, setEditError]               = useState(null)
  const [editLoading, setEditLoading]           = useState(false)

  const [showDischargePrompt, setShowDischargePrompt] = useState(false)
  const [dischargeError, setDischargeError]           = useState(null)
  const [dischargeLoading, setDischargeLoading]       = useState(false)

  const canEdit      = user?.role === 'admin' || user?.role === 'medico'
  const canDischarge = user?.role === 'medico'

  const load = () => {
    setLoading(true)
    fetch(`${API_URL}/patients/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setPatient(data?.error ? null : data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id, token])

  const handleEditSubmit = (formData) => {
    setPendingEdit(formData)
    setShowEditPrompt(true)
    setEditError(null)
  }

  const handleEditConfirm = async (password) => {
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...pendingEdit, password }),
      })
      const json = await res.json()
      if (!res.ok) { setEditError(json.error ?? 'Error al actualizar'); return }
      setShowEditPrompt(false)
      setEditing(false)
      setPendingEdit(null)
      load()
    } catch { setEditError('Error de conexión') }
    finally   { setEditLoading(false) }
  }

  const handleDischarge = async (password) => {
    setDischargeLoading(true)
    setDischargeError(null)
    try {
      const res = await fetch(`${API_URL}/patients/${id}/discharge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (!res.ok) { setDischargeError(json.error ?? 'Error al dar de alta'); return }
      setShowDischargePrompt(false)
      load()
    } catch { setDischargeError('Error de conexión') }
    finally   { setDischargeLoading(false) }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-slate-500 font-medium">Paciente no encontrado</p>
        <button onClick={() => navigate('/patients')} className="text-sm text-emerald-600 hover:underline">
          ← Volver a pacientes
        </button>
      </div>
    )
  }

  const initials = patient.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')
  const age      = calcAge(patient.birth_date)

  return (
    <div className="max-w-2xl space-y-5">

      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Pacientes
      </button>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="h-16 bg-gradient-to-r from-emerald-600 to-teal-500" />
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-7 mb-4">
            <div className="w-14 h-14 rounded-2xl border-4 border-white bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-sm">
              {initials}
            </div>
            {patient.discharged_at ? (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 text-slate-500">
                Dado de alta
              </span>
            ) : (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                ● Activo
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold text-slate-800">{patient.full_name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {patient.document_id}
            {age && <span className="ml-2 text-slate-400">· {age} años</span>}
            {patient.blood_type && (
              <span className="ml-2 font-bold text-red-600">{patient.blood_type}</span>
            )}
          </p>
        </div>
      </div>

      {/* Info / Edit */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">
            {editing ? 'Editar datos clínicos' : 'Datos clínicos'}
          </h2>
          {!editing && canEdit && !patient.discharged_at && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar
            </button>
          )}
        </div>

        <div className="px-5 py-5">
          {editing ? (
            <PatientForm
              initial={patient}
              onSubmit={handleEditSubmit}
              onCancel={() => { setEditing(false); setPendingEdit(null) }}
              submitLabel="Guardar cambios"
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Nombre completo"    value={patient.full_name} />
              <Field label="Documento"          value={patient.document_id} />
              <Field label="Fecha de nacimiento"
                value={patient.birth_date
                  ? `${fmt(patient.birth_date, { dateStyle: 'long' })} (${age} años)`
                  : '—'}
              />
              <Field label="Tipo de sangre" value={patient.blood_type ?? '—'} />
              <Field label="Fecha de ingreso"
                value={fmt(patient.admitted_at, { dateStyle: 'medium', timeStyle: 'short' })}
              />
              {patient.discharged_at && (
                <Field label="Dado de alta"
                  value={fmt(patient.discharged_at, { dateStyle: 'medium', timeStyle: 'short' })}
                />
              )}
              {patient.bed_code && (
                <Field label="Cama actual" value={patient.bed_code} />
              )}
            </div>
          )}
        </div>

        {/* Discharge button */}
        {!editing && canDischarge && !patient.discharged_at && (
          <div className="px-5 pb-5">
            <div className="border-t border-slate-100 pt-4">
              <button
                onClick={() => { setShowDischargePrompt(true); setDischargeError(null) }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Dar de alta
              </button>
            </div>
          </div>
        )}
      </div>

      {showEditPrompt && (
        <PasswordPrompt
          title="Confirmar edición"
          description="Introduce tu contraseña para guardar los cambios en el paciente."
          error={editError}
          loading={editLoading}
          onConfirm={handleEditConfirm}
          onCancel={() => { setShowEditPrompt(false); setEditError(null) }}
        />
      )}

      {showDischargePrompt && (
        <PasswordPrompt
          title="Dar de alta al paciente"
          description={`¿Confirmas el alta de ${patient.full_name}? Se cerrará la asignación de cama activa.`}
          error={dischargeError}
          loading={dischargeLoading}
          onConfirm={handleDischarge}
          onCancel={() => { setShowDischargePrompt(false); setDischargeError(null) }}
        />
      )}
    </div>
  )
}
