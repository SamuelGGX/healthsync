import { useState } from 'react'

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

export default function PatientForm({ initial = {}, onSubmit, onCancel, error, submitLabel = 'Guardar' }) {
  const [form, setForm] = useState({
    full_name:   initial.full_name   ?? '',
    document_id: initial.document_id ?? '',
    birth_date:  initial.birth_date  ? String(initial.birth_date).slice(0, 10) : '',
    blood_type:  initial.blood_type  ?? '',
  })

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.document_id.trim() || !form.birth_date) return
    onSubmit({
      full_name:   form.full_name.trim(),
      document_id: form.document_id.trim(),
      birth_date:  form.birth_date,
      blood_type:  form.blood_type || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Nombre completo *</label>
        <input
          type="text"
          value={form.full_name}
          onChange={set('full_name')}
          required
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Documento de identidad *</label>
        <input
          type="text"
          value={form.document_id}
          onChange={set('document_id')}
          required
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Fecha de nacimiento *</label>
          <input
            type="date"
            value={form.birth_date}
            onChange={set('birth_date')}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Tipo de sangre</label>
          <select
            value={form.blood_type}
            onChange={set('blood_type')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            <option value="">—</option>
            {BLOOD_TYPES.map(bt => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
