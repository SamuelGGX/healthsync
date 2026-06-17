import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import { API_URL } from '../config'

const ROLES = ['medico', 'enfermero']
const ROLE_LABEL = { medico: 'Médico', enfermero: 'Enfermero' }
const PAGE_SIZE = 10

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  )
}

function UserForm({ initial, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({
    name:     initial?.name     ?? '',
    email:    initial?.email    ?? '',
    role:     initial?.role     ?? 'medico',
    password: '',
  })
  const [error, setError] = useState(null)
  const isEdit = !!initial

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const payload = { name: form.name, email: form.email, role: form.role }
    if (!isEdit) payload.password = form.password
    const err = await onSubmit(payload)
    if (err) setError(err)
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
        <input className={inputCls} value={form.name} onChange={set('name')} required />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input className={inputCls} type="email" value={form.email} onChange={set('email')} required />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
        <select className={inputCls} value={form.role} onChange={set('role')}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div>
      {!isEdit && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña</label>
          <input className={inputCls} type="password" value={form.password} onChange={set('password')} required minLength={8} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 text-sm rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 transition">
          {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </div>
    </form>
  )
}

function RoleBadge({ role }) {
  const cls = role === 'medico'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-violet-50 text-violet-700 border-violet-200'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {ROLE_LABEL[role]}
    </span>
  )
}

export default function Staff() {
  const { token }                     = useAuth()
  const toast                         = useToast()
  const [users,     setUsers]         = useState([])
  const [loading,   setLoading]       = useState(true)
  const [error,     setError]         = useState(null)
  const [tab,       setTab]           = useState('medico')
  const [modal,     setModal]         = useState(null) // null | 'create' | user object (edit)
  const [saving,    setSaving]        = useState(false)
  const [search,    setSearch]        = useState('')
  const [page,      setPage]          = useState(0)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`${API_URL}/users`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar')
      setUsers(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async (payload) => {
    setSaving(true)
    try {
      const res  = await fetch(`${API_URL}/users`, { method: 'POST', headers, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) return data.error || 'Error al crear'
      setUsers(prev => [...prev, data])
      setModal(null)
      toast({ message: 'Usuario creado correctamente', type: 'success' })
    } catch { return 'Error de red' }
    finally { setSaving(false) }
  }

  const handleEdit = async (payload) => {
    setSaving(true)
    try {
      const res  = await fetch(`${API_URL}/users/${modal.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) return data.error || 'Error al editar'
      setUsers(prev => prev.map(u => u.id === modal.id ? data : u))
      setModal(null)
      toast({ message: 'Usuario actualizado correctamente', type: 'success' })
    } catch { return 'Error de red' }
    finally { setSaving(false) }
  }

  const q = search.trim().toLowerCase()
  const filtered = users.filter(u =>
    u.role === tab &&
    (q === '' || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const fromRow    = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1
  const toRow      = Math.min((page + 1) * PAGE_SIZE, filtered.length)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-white flex-shrink-0">
            <UserIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Personal médico</h1>
            <p className="text-sm text-slate-500">Gestión de médicos y enfermeros</p>
          </div>
        </div>
        <button
          onClick={() => setModal('create')}
          className="text-sm px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition"
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {ROLES.map(r => (
          <button key={r}
            onClick={() => { setTab(r); setPage(0) }}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              tab === r
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {ROLE_LABEL[r]}s <span className="ml-1 text-xs text-slate-400">({users.filter(u => u.role === r).length})</span>
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="mb-4 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
        >
          <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Buscar por nombre o email…"
          className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center text-slate-400 text-sm py-16">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-16">
            {q ? 'No se encontraron resultados.' : `No hay ${ROLE_LABEL[tab].toLowerCase()}s registrados.`}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Rol</th>
                <th className="text-left px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Editar"
                      >
                        <EditIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">{fromRow}–{toRow} de {filtered.length}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 0))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page + 1 >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear */}
      {modal === 'create' && (
        <Modal title="Nuevo usuario" onClose={() => setModal(null)}>
          <UserForm onSubmit={handleCreate} onClose={() => setModal(null)} loading={saving} />
        </Modal>
      )}

      {/* Modal editar */}
      {modal && modal !== 'create' && (
        <Modal title={`Editar — ${modal.name}`} onClose={() => setModal(null)}>
          <UserForm initial={modal} onSubmit={handleEdit} onClose={() => setModal(null)} loading={saving} />
        </Modal>
      )}

    </div>
  )
}
