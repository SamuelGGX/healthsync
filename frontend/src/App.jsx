import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const ALERT_LABELS = {
  tachycardia: 'Taquicardia',
  bradycardia:  'Bradicardia',
  low_oxygen:   'SpO₂ baja',
};

// ─────────────────────────────────────────────────────────────────
// COMPONENTES COMPARTIDOS
// ─────────────────────────────────────────────────────────────────

function Nav({ view, onNav, alertCount, connected }) {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="brand-icon">+</span>
        <span className="brand-name">HealthSync</span>
        <span className="brand-sub">Monitor UCI</span>
      </div>

      <nav className="header-nav">
        <button className={`nav-btn ${view === 'monitor'  ? 'nav-active' : ''}`} onClick={() => onNav('monitor')}>
          Monitor
        </button>
        <button className={`nav-btn ${view === 'alerts'   ? 'nav-active' : ''}`} onClick={() => onNav('alerts')}>
          Alertas
          {alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
        </button>
        <button className={`nav-btn ${view === 'injector' ? 'nav-active' : ''}`} onClick={() => onNav('injector')}>
          Inyector
        </button>
      </nav>

      <div className="header-right">
        <div className={`ws-pill ${connected ? 'ws-on' : 'ws-off'}`}>
          <span className="ws-dot" />
          {connected ? 'En vivo' : 'Conectando'}
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────
// VISTA 1 — MONITOR (grid de camas)
// ─────────────────────────────────────────────────────────────────

function BedCard({ bed }) {
  const empty  = !bed.last_reading;
  const status = empty ? 'empty' : bed.status;
  const fmt    = ts => ts ? new Date(ts).toLocaleTimeString('es', { hour12: false }) : '--:--:--';

  return (
    <div className={`bed-card bed-${status}`}>
      <div className="card-top">
        <span className="bed-code">{bed.code}</span>
        <span className={`dot dot-${status}`} />
      </div>

      <div className="patient-info">
        {bed.patient_name
          ? <>
              <span className="patient-name">{bed.patient_name}</span>
              {bed.patient_blood_type && <span className="blood-type">{bed.patient_blood_type}</span>}
            </>
          : <span className="patient-empty">Sin paciente</span>
        }
      </div>

      <div className="vitals">
        <div className="vital">
          <span className="vital-label">BPM</span>
          <span className="vital-val">{bed.bpm != null ? Math.round(bed.bpm) : '—'}</span>
        </div>
        <div className="vital">
          <span className="vital-label">SpO₂</span>
          <span className="vital-val">{bed.spo2 != null ? `${bed.spo2.toFixed(1)}%` : '—'}</span>
        </div>
        <div className="vital">
          <span className="vital-label">TEMP</span>
          <span className="vital-val">{bed.temperature != null ? `${bed.temperature.toFixed(1)}°` : '—'}</span>
        </div>
      </div>

      <div className="card-footer">
        <span className="last-time">{fmt(bed.last_reading)}</span>
        {status === 'alert' && <span className="alert-pill">ALERTA</span>}
        {status === 'disconnected' && <span className="disconn-pill">DESCONECT.</span>}
      </div>
    </div>
  );
}

function MonitorView({ beds, recentAlerts }) {
  const bedList    = Object.values(beds).sort((a, b) => a.id - b.id);
  const alertCount = bedList.filter(b => b.status === 'alert').length;
  const patCount   = bedList.filter(b => b.patient_name).length;

  return (
    <div className="view">
      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-chip">
          <span className="stat-num">{bedList.length}</span>
          <span className="stat-lbl">Camas</span>
        </div>
        <div className="stat-chip">
          <span className="stat-num">{patCount}</span>
          <span className="stat-lbl">Pacientes</span>
        </div>
        <div className={`stat-chip ${alertCount > 0 ? 'chip-danger' : ''}`}>
          <span className="stat-num">{alertCount}</span>
          <span className="stat-lbl">Alertas activas</span>
        </div>
      </div>

      {/* Franja de alertas en tiempo real */}
      {recentAlerts.length > 0 && (
        <div className="alert-log">
          <span className="alert-log-label">Recientes</span>
          <div className="alert-log-rows">
            {recentAlerts.map(a => (
              <div key={a.id} className="alert-row">
                <span className="alert-row-time">{a.time}</span>
                <span className="alert-row-bed">{a.bedCode}</span>
                <span className="alert-row-type">{ALERT_LABELS[a.type] ?? a.type}</span>
                <span className="alert-row-val">{a.valLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="section-header">
        <span className="section-label">Estado de camas en tiempo real</span>
      </div>
      <div className="beds-grid">
        {bedList.map(bed => <BedCard key={bed.id} bed={bed} />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// VISTA 2 — HISTORIAL DE ALERTAS
// ─────────────────────────────────────────────────────────────────


const STATUS_LABELS = { active: 'Activa', acknowledged: 'Atendida', resolved: 'Resuelta' };

function AlertsView({ liveAlerts }) {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => { setHistory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Inserta alertas en vivo al tope sin recargar
  useEffect(() => {
    if (liveAlerts.length === 0) return;
    const newest = liveAlerts[0];
    setHistory(prev => {
      const already = prev.some(a => a.triggered_at === newest.triggered_at && a.bed_code === newest.bedCode);
      if (already) return prev;
      return [{
        id:           Date.now(),
        bed_code:     newest.bedCode,
        type:         newest.type,
        value:        newest.valLabel,
        status:       'active',
        triggered_at: new Date().toISOString(),
        message:      newest.valLabel,
      }, ...prev];
    });
  }, [liveAlerts]);

  const fmt = ts => ts ? new Date(ts).toLocaleString('es', { hour12: false }) : '—';

  return (
    <div className="view">
      <div className="section-header">
        <span className="section-label">Historial de alertas</span>
        <span className="section-count">{history.length} registros</span>
      </div>

      {loading && <p className="loading-msg">Cargando...</p>}

      {!loading && history.length === 0 && (
        <p className="empty-msg">No hay alertas registradas aún. El simulador genera valores normales por defecto.</p>
      )}

      {!loading && history.length > 0 && (
        <div className="table-wrap">
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Cama</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((a, i) => (
                <tr key={a.id ?? i} className={a.status === 'active' ? 'row-active' : ''}>
                  <td className="td-mono">{fmt(a.triggered_at)}</td>
                  <td><span className="table-bed">{a.bed_code}</span></td>
                  <td><span className={`type-badge type-${a.type}`}>{ALERT_LABELS[a.type] ?? a.type}</span></td>
                  <td className="td-mono">{a.message ?? a.value ?? '—'}</td>
                  <td><span className={`status-badge status-${a.status}`}>{STATUS_LABELS[a.status] ?? a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// VISTA 3 — INYECTOR DE VITALES (reemplaza Postman)
// ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Normal',       color: 'preset-green',  values: { bpm: 75,  spo2: 98,  temperature: 36.5 } },
  { label: 'Taquicardia',  color: 'preset-red',    values: { bpm: 180, spo2: 97,  temperature: 36.5 } },
  { label: 'Bradicardia',  color: 'preset-yellow', values: { bpm: 30,  spo2: 97,  temperature: 36.5 } },
  { label: 'SpO₂ baja',   color: 'preset-blue',   values: { bpm: 80,  spo2: 85,  temperature: 36.5 } },
  { label: 'Temp inválida',color: 'preset-gray',   values: { bpm: 75,  spo2: 98,  temperature: 150  } },
];

function InjectorView({ beds }) {
  const bedList = Object.values(beds).sort((a, b) => a.id - b.id);

  const [bedId,  setBedId]  = useState('');
  const [bpm,    setBpm]    = useState('');
  const [spo2,   setSpo2]   = useState('');
  const [temp,   setTemp]   = useState('');
  const [status, setStatus] = useState(null); // { ok, message, data }
  const [sending, setSending] = useState(false);

  const applyPreset = ({ values }) => {
    setBpm(values.bpm);
    setSpo2(values.spo2);
    setTemp(values.temperature);
    setStatus(null);
  };

  const send = async () => {
    if (!bedId) { setStatus({ ok: false, message: 'Selecciona una cama' }); return; }
    setSending(true);
    setStatus(null);
    try {
      const res  = await fetch('/api/vitals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          bed_id:      parseInt(bedId),
          bpm:         bpm      !== '' ? parseFloat(bpm)  : null,
          spo2:        spo2     !== '' ? parseFloat(spo2) : null,
          temperature: temp     !== '' ? parseFloat(temp) : null,
        }),
      });
      const data = await res.json();
      setStatus({ ok: res.ok, message: res.ok ? 'Vital enviado' : (data.error ?? 'Error'), data });
    } catch (e) {
      setStatus({ ok: false, message: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="view inj-view">
      <div className="section-header">
        <span className="section-label">Inyector de vitales</span>
        <span className="section-count">Simula lecturas manualmente sin Postman</span>
      </div>

      <div className="inj-layout">
        {/* Panel izquierdo: formulario */}
        <div className="inj-card">
          <p className="inj-title">Selecciona cama</p>
          <select className="inj-select" value={bedId} onChange={e => { setBedId(e.target.value); setStatus(null); }}>
            <option value="">— Elige cama —</option>
            {bedList.map(b => (
              <option key={b.id} value={b.id}>
                {b.code}{b.patient_name ? ` · ${b.patient_name}` : ''}
              </option>
            ))}
          </select>

          <p className="inj-title" style={{ marginTop: 20 }}>Presets</p>
          <div className="presets-row">
            {PRESETS.map(p => (
              <button key={p.label} className={`preset-btn ${p.color}`} onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>

          <p className="inj-title" style={{ marginTop: 20 }}>Valores</p>
          <div className="inj-fields">
            <label className="inj-label">
              BPM
              <input className="inj-input" type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="ej. 180" />
            </label>
            <label className="inj-label">
              SpO₂ (%)
              <input className="inj-input" type="number" value={spo2} onChange={e => setSpo2(e.target.value)} placeholder="ej. 85" />
            </label>
            <label className="inj-label">
              Temperatura (°C)
              <input className="inj-input" type="number" value={temp} onChange={e => setTemp(e.target.value)} placeholder="ej. 36.5" />
            </label>
          </div>

          <button className="inj-send" onClick={send} disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar vital'}
          </button>

          {status && (
            <div className={`inj-result ${status.ok ? 'result-ok' : 'result-err'}`}>
              <strong>{status.ok ? '✓' : '✗'} {status.message}</strong>
            </div>
          )}
        </div>

        {/* Panel derecho: guía de umbrales */}
        <div className="inj-card inj-guide">
          <p className="inj-title">Umbrales de detección</p>
          <table className="guide-table">
            <thead>
              <tr><th>Condición</th><th>Umbral</th><th>Tipo de alerta</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>BPM alto</td>
                <td className="td-mono">&gt; 150</td>
                <td><span className="type-badge type-tachycardia">Taquicardia</span></td>
              </tr>
              <tr>
                <td>BPM bajo</td>
                <td className="td-mono">&lt; 40</td>
                <td><span className="type-badge type-bradycardia">Bradicardia</span></td>
              </tr>
              <tr>
                <td>Saturación</td>
                <td className="td-mono">&lt; 90%</td>
                <td><span className="type-badge type-low_oxygen">SpO₂ baja</span></td>
              </tr>
              <tr>
                <td>Temperatura</td>
                <td className="td-mono">&lt;30 o &gt;45°C</td>
                <td><span className="type-badge type-bradycardia">Valor inválido (422)</span></td>
              </tr>
              <tr>
                <td>Valores normales</td>
                <td className="td-mono">BPM 40–150</td>
                <td><span className="type-badge" style={{background:'rgba(16,185,129,0.15)',color:'#6ee7b7'}}>Sin alerta</span></td>
              </tr>
            </tbody>
          </table>
          <p className="inj-hint">
            Después de enviar, ve a la vista <strong>Monitor</strong> para ver la tarjeta cambiar de color, o a <strong>Alertas</strong> para ver el registro en la base de datos.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView]           = useState('monitor');
  const [beds, setBeds]           = useState({});
  const [connected, setConnected] = useState(false);
  const [recentAlerts, setRecent] = useState([]);
  const bedsRef = useRef({});

  useEffect(() => { bedsRef.current = beds; }, [beds]);

  useEffect(() => {
    fetch('/api/beds')
      .then(r => r.json())
      .then(data => {
        const map = {};
        data.forEach(b => { map[b.id] = { ...b, status: b.last_reading ? 'normal' : 'disconnected' }; });
        setBeds(map);
      })
      .catch(console.error);

    const socket = io({ path: '/socket.io' });
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('vital', p => {
      setBeds(prev => {
        if (!prev[p.bed_id]) return prev;
        return { ...prev, [p.bed_id]: { ...prev[p.bed_id], bpm: p.bpm, spo2: p.spo2, temperature: p.temperature, last_reading: p.recorded_at, status: 'normal' } };
      });
    });

    socket.on('alert', p => {
      setBeds(prev => {
        if (!prev[p.bed_id]) return prev;
        return { ...prev, [p.bed_id]: { ...prev[p.bed_id], bpm: p.bpm, spo2: p.spo2, temperature: p.temperature, last_reading: p.recorded_at, status: 'alert' } };
      });

      const bedCode  = bedsRef.current[p.bed_id]?.code ?? `Cama ${p.bed_id}`;
      const valLabel = p.alert_type === 'low_oxygen'
        ? `SpO₂ ${p.spo2?.toFixed(1)}%`
        : `BPM ${Math.round(p.bpm)}`;

      setRecent(prev => {
        const others = prev.filter(a => a.bedCode !== bedCode);
        return [
          { id: Date.now(), bedCode, type: p.alert_type, valLabel, time: new Date().toLocaleTimeString('es', { hour12: false }) },
          ...others.slice(0, 9),
        ];
      });
    });

    return () => socket.disconnect();
  }, []);

  const alertCount = Object.values(beds).filter(b => b.status === 'alert').length;

  return (
    <div className="app">
      <Nav view={view} onNav={setView} alertCount={alertCount} connected={connected} />
      {view === 'monitor'  && <MonitorView  beds={beds} recentAlerts={recentAlerts} />}
      {view === 'alerts'   && <AlertsView   liveAlerts={recentAlerts} />}
      {view === 'injector' && <InjectorView beds={beds} />}
    </div>
  );
}
