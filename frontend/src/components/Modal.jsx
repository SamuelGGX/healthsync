export default function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-slate-600 mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
          Cancelar
        </button>
        <button onClick={onConfirm}
          className={`px-4 py-2 text-sm rounded-lg text-white transition ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-700'
          }`}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
