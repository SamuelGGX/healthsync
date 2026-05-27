import { useMemo, useState, useEffect, useRef } from 'react'

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3h7v7" />
      <path d="M10 14L21 3" />
      <path d="M21 14v7h-7" />
      <path d="M3 10v11h11" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15A9 9 0 0 1 5.64 18.36L1 14" />
    </svg>
  )
}

export default function Monitoring() {
  const [reloadKey, setReloadKey] = useState(0)
  const [summary, setSummary] = useState(null)
  const prevNetRef = useRef(null)
  const [netRate, setNetRate] = useState({ rx: 0, tx: 0, iface: null })

  const iframeSrc = useMemo(() => `/munin/?ts=${reloadKey}`, [reloadKey])

  function humanBytes(bytes) {
    if (bytes === null || bytes === undefined) return '—'
    const units = ['B','KB','MB','GB','TB']
    let i = 0
    let v = bytes
    while (v >= 1024 && i < units.length-1) { v = v/1024; i++ }
    return `${v.toFixed(1)} ${units[i]}`
  }

  function kbToHuman(kb) {
    if (kb === null || kb === undefined) return '—'
    return humanBytes(kb * 1024)
  }

  function statusColor(status) {
    if (!status) return 'text-slate-800'
    if (status === 'critical') return 'text-red-600'
    if (status === 'warning') return 'text-amber-600'
    return 'text-emerald-600'
  }

  function statusBadge(status) {
    if (status === 'critical') return 'bg-red-100 text-red-700 border-red-200'
    if (status === 'warning') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }

  const summaryStatus = useMemo(() => {
    const items = []
    if (summary?.cpu?.status) items.push({ label: 'CPU', status: summary.cpu.status })
    if (summary?.mem != null) {
      const status = summary.mem >= 90 ? 'critical' : summary.mem >= 75 ? 'warning' : 'ok'
      items.push({ label: 'Memoria', status })
    }
    if (summary?.disk?.percent != null) {
      const status = summary.disk.percent >= 90 ? 'critical' : summary.disk.percent >= 75 ? 'warning' : 'ok'
      items.push({ label: 'Disco', status })
    }
    const worst = items.find((item) => item.status === 'critical') || items.find((item) => item.status === 'warning')
    return {
      items,
      status: worst?.status ?? 'ok',
    }
  }, [summary])

  const openMunin = () => {
    window.open('/munin/', '_blank', 'noopener,noreferrer')
  }

  // Poll summary endpoint every 3s for fresher cards
  useEffect(() => {
    let mounted = true
    async function fetchSummary() {
      try {
        const res = await fetch('/munin/munin-summary.json', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        setSummary(data)

        // compute net rates if previous exists
        if (data.net && data.net.iface) {
          const now = data.ts || Math.floor(Date.now()/1000)
          const prev = prevNetRef.current
          if (prev && prev.iface === data.net.iface) {
            const dt = Math.max(1, now - prev.ts)
            const rx = Math.max(0, data.net.rx_bytes - prev.rx_bytes) / dt
            const tx = Math.max(0, data.net.tx_bytes - prev.tx_bytes) / dt
            setNetRate({ rx, tx, iface: data.net.iface })
          }
          prevNetRef.current = { iface: data.net.iface, rx_bytes: data.net.rx_bytes, tx_bytes: data.net.tx_bytes, ts: data.ts }
        }
      } catch (err) {
        // ignore
      }
    }
    fetchSummary()
    const id = setInterval(fetchSummary, 3000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border px-4 py-3 text-sm ${statusBadge(summaryStatus.status)}`}>
        <div className="font-semibold">Estado general: {summaryStatus.status.toUpperCase()}</div>
        <div className="mt-1 text-xs opacity-90">
          {summaryStatus.items.length > 0
            ? summaryStatus.items.map((item) => `${item.label}: ${item.status}`).join(' · ')
            : 'Sin datos todavía'}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500">Carga (load)</div>
          <div className="text-xl font-semibold text-slate-800">{summary?.load ?? '—'}</div>
          <div className="text-xs text-slate-400 mt-1">{summary?.cpu?.load_per_core != null ? `por núcleo: ${summary.cpu.load_per_core}` : ''}</div>
        </div>
        <div className="bg-white border rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500">CPU</div>
          <div className={`text-xl font-semibold ${statusColor(summary?.cpu?.status)}`}>{summary?.cpu?.util_percent != null ? `${summary.cpu.util_percent}%` : (summary?.cpu?.load_per_core != null ? `${(summary.cpu.load_per_core*100).toFixed(1)}% est.` : '—')}</div>
          <div className="text-xs text-slate-400 mt-1">{summary?.cpu ? `${summary.cpu.cores} cores · estado: ${summary.cpu.status}` : ''}</div>
        </div>
        <div className="bg-white border rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500">Memoria usada</div>
          <div className="text-xl font-semibold text-slate-800">{summary?.mem != null ? `${summary.mem}%` : '—'}</div>
          <div className="text-xs text-slate-400 mt-1">{summary?.mem_kb ? `${kbToHuman(summary.mem_kb.used_kb)} / ${kbToHuman(summary.mem_kb.total_kb)}` : ''}</div>
        </div>
        <div className="bg-white border rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500">Disco / (used)</div>
          <div className="text-xl font-semibold text-slate-800">{summary?.disk ? `${summary.disk.percent}%` : '—'}</div>
          <div className="text-xs text-slate-400 mt-1">{summary?.disk ? `${kbToHuman(summary.disk.used_kb)} / ${kbToHuman(summary.disk.total_kb)} (${summary.disk.mount || '/'})` : ''}</div>
        </div>
        <div className="bg-white border rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500">Red RX</div>
          <div className="text-xl font-semibold text-slate-800">{netRate.rx ? `${(netRate.rx/1024).toFixed(1)} KB/s` : '—'}</div>
        </div>
        <div className="bg-white border rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500">Red TX</div>
          <div className="text-xl font-semibold text-slate-800">{netRate.tx ? `${(netRate.tx/1024).toFixed(1)} KB/s` : '—'}</div>
        </div>
        <div className="bg-white border rounded-xl p-3 shadow-sm">
          <div className="text-xs text-slate-500">Interfaz</div>
          <div className="text-xl font-semibold text-slate-800">{netRate.iface ?? (summary?.net?.iface ?? '—')}</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Monitoreo</h1>
          <p className="text-sm text-slate-500">Panel interno</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshIcon />
            Actualizar
          </button>
          <button
            type="button"
            onClick={openMunin}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            <ExternalLinkIcon />
            Abrir
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <iframe
          key={reloadKey}
          title="Munin monitoring dashboard"
          src={iframeSrc}
          className="h-[80vh] min-h-[680px] w-full bg-white"
        />
      </section>
    </div>
  )
}