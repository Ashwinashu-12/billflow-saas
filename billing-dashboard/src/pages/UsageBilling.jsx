import React, { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, Database, Activity, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const API_DATA = [
    { day: 'Mon', calls: 12400, limit: 50000 }, { day: 'Tue', calls: 18900, limit: 50000 },
    { day: 'Wed', calls: 22100, limit: 50000 }, { day: 'Thu', calls: 31500, limit: 50000 },
    { day: 'Fri', calls: 28000, limit: 50000 }, { day: 'Sat', calls: 9200, limit: 50000 },
    { day: 'Sun', calls: 6400, limit: 50000 },
];
const STORAGE_DATA = [
    { month: 'Nov', gb: 12 }, { month: 'Dec', gb: 18 },
    { month: 'Jan', gb: 24 }, { month: 'Feb', gb: 31 },
];
const SIM_LOG = [
    { ts: '00:00:01', msg: '[START] Billing simulation started', type: 'info' },
    { ts: '00:00:02', msg: '[INFO] Fetching active subscriptions… 1,204 found', type: 'info' },
    { ts: '00:00:04', msg: '[PROCESS] INV-5001 — Acme Corp — ₹5,900.00 (PRO × 2)', type: 'success' },
    { ts: '00:00:05', msg: '[PROCESS] INV-5002 — Globex Inc — ₹2,950.00 (PRO × 1)', type: 'success' },
    { ts: '00:00:06', msg: '[WARN] SUB-1035 — Pied Piper — payment method expired, skipping', type: 'warning' },
    { ts: '00:00:08', msg: '[PROCESS] INV-5003 — Umbrella Corp — ₹41,300.00 (ENT × 7)', type: 'success' },
    { ts: '00:00:10', msg: '[DONE] Simulation complete. 1,201 invoices generated, 3 skipped, ₹1,46,900 total.', type: 'success' },
];
const TS_PROPS = { backgroundColor: '#1a2540', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f4ff' };

export default function UsageBilling() {
    const [simRunning, setSimRunning] = useState(false);
    const [simDone, setSimDone] = useState(false);
    const [simLog, setSimLog] = useState([]);
    const [toast, setToast] = useState(null);

    const runSim = () => {
        setSimRunning(true); setSimDone(false); setSimLog([]);
        SIM_LOG.forEach((entry, i) => {
            setTimeout(() => {
                setSimLog(prev => [...prev, entry]);
                if (i === SIM_LOG.length - 1) { setSimRunning(false); setSimDone(true); setToast({ msg: 'Simulation complete — no charges applied', type: 'success' }); setTimeout(() => setToast(null), 4000); }
            }, i * 400);
        });
    };

    const apiUsed = API_DATA.reduce((s, d) => s + d.calls, 0);
    const storageGb = 31;

    return (
        <div className="content-area">
            <div className="page-header">
                <div>
                    <div className="page-title">Usage & Billing</div>
                    <div className="page-subtitle">Monitor API consumption, storage, and run billing simulations</div>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[
                    { label: 'API Calls (7d)', value: apiUsed.toLocaleString(), sub: `of 350,000 limit`, cls: 'primary', icon: Activity, pct: Math.round(apiUsed / 350000 * 100) },
                    { label: 'Storage Used', value: `${storageGb} GB`, sub: 'of 100 GB', cls: 'purple', icon: Database, pct: 31 },
                    { label: 'Last Billing Run', value: '1 Feb 2026', sub: '1,201 invoices', cls: 'success', icon: CheckCircle, pct: null },
                    { label: 'Billable Events', value: '1,204', sub: 'This month', cls: 'warning', icon: Zap, pct: null },
                ].map(s => (
                    <div className="stat-card" key={s.label}>
                        <div className="stat-header">
                            <div>
                                <div className="stat-title">{s.label}</div>
                                <div className="stat-value">{s.value}</div>
                                {s.pct !== null ? (
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 2 }}>
                                            <div style={{ height: '100%', width: `${s.pct}%`, borderRadius: 2, background: `var(--color-${s.cls === 'primary' ? 'accent' : s.cls === 'purple' ? 'purple' : 'success'})`, transition: 'width 0.6s' }} />
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.pct}% used</div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.sub}</div>
                                )}
                            </div>
                            <div className={`stat-icon ${s.cls}`}><s.icon size={18} /></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="dashboard-grid" style={{ marginBottom: 24 }}>
                <div className="card">
                    <div className="card-header">API Calls — Last 7 Days</div>
                    <div className="card-body" style={{ padding: 24 }}>
                        <div style={{ height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={API_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="apiGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="day" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v / 1000}k`} />
                                    <Tooltip contentStyle={TS_PROPS} formatter={v => [v.toLocaleString(), 'API Calls']} />
                                    <Area type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={2.5} fill="url(#apiGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header">Storage Usage (GB)</div>
                    <div className="card-body" style={{ padding: 24 }}>
                        <div style={{ height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={STORAGE_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="month" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={TS_PROPS} formatter={v => [`${v} GB`, 'Storage']} />
                                    <Bar dataKey="gb" fill="#a855f7" radius={[5, 5, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Billing Simulation */}
            <div className="card" style={{ borderColor: simDone ? 'var(--color-success)' : simRunning ? 'var(--color-accent)' : 'var(--color-border)' }}>
                <div className="card-header" style={{ gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={16} color="var(--color-warning)" />
                        <span>Billing Simulation Mode</span>
                        <span className="badge warning">Dry Run</span>
                    </div>
                    <button className="btn btn-primary" onClick={runSim} disabled={simRunning} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {simRunning ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running…</> : <><Play size={14} /> Run Billing Now</>}
                    </button>
                </div>
                <div className="card-body" style={{ padding: 20 }}>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                        Simulates the billing cycle for all active subscriptions without creating real invoices or charging customers. Safe to run anytime.
                    </p>
                    {simLog.length > 0 && (
                        <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 10, border: '1px solid var(--color-border)', padding: '12px 16px', maxHeight: 240, overflowY: 'auto' }}>
                            {simLog.map((l, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}>
                                    <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{l.ts}</span>
                                    <span style={{ color: l.type === 'error' ? 'var(--color-danger)' : l.type === 'warning' ? 'var(--color-warning)' : l.type === 'success' ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>{l.msg}</span>
                                </div>
                            ))}
                            {simRunning && <div style={{ height: 16, width: '40%', borderRadius: 3 }} className="skeleton" />}
                        </div>
                    )}
                    {!simRunning && !simDone && simLog.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                            Click "Run Billing Now" to preview what the billing cycle will generate.
                        </div>
                    )}
                </div>
            </div>

            {toast && <div className="toast-container"><div className={`toast ${toast.type}`}><CheckCircle size={14} /> {toast.msg}</div></div>}
        </div>
    );
}
