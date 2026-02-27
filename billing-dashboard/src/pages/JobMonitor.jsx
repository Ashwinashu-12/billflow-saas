import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, AlertCircle, CheckCircle, Clock, Cpu, BarChart2 } from 'lucide-react';

const JOBS_INIT = [
    { id: 'billing-cron', name: 'Billing Cycle Runner', schedule: '0 0 1 * *', status: 'idle', lastRun: '1 Feb 2026, 00:01', nextRun: '1 Mar 2026, 00:01', duration: '1m 42s', runs: 28, failures: 0, queue: 0 },
    { id: 'invoice-gen', name: 'Invoice Auto-Generator', schedule: '0 0 * * *', status: 'running', lastRun: '27 Feb 2026, 00:01', nextRun: 'Running now', duration: '—', runs: 58, failures: 2, queue: 4 },
    { id: 'email-notif', name: 'Email Notification Sender', schedule: '*/15 * * * *', status: 'idle', lastRun: '27 Feb 2026, 14:45', nextRun: '27 Feb 2026, 15:00', duration: '3.2s', runs: 2880, failures: 12, queue: 0 },
    { id: 'webhook-retry', name: 'Webhook Retry Processor', schedule: '*/5 * * * *', status: 'idle', lastRun: '27 Feb 2026, 14:55', nextRun: '27 Feb 2026, 15:00', duration: '1.1s', runs: 5760, failures: 34, queue: 2 },
    { id: 'dunning', name: 'Dunning & Payment Retry', schedule: '0 9 * * *', status: 'idle', lastRun: '27 Feb 2026, 09:00', nextRun: '28 Feb 2026, 09:00', duration: '48s', runs: 28, failures: 1, queue: 0 },
    { id: 'report-gen', name: 'Analytics Report Generator', schedule: '0 2 * * 1', status: 'failed', lastRun: '24 Feb 2026, 02:00', nextRun: '3 Mar 2026, 02:00', duration: 'timeout', runs: 4, failures: 1, queue: 0 },
];

const FAILED_JOBS = [
    { id: 'JB-901', job: 'Invoice Auto-Generator', error: 'DB timeout after 30s', ts: '26 Feb 2026, 00:03', retries: 3 },
    { id: 'JB-902', job: 'Analytics Report Generator', error: 'Memory limit exceeded', ts: '24 Feb 2026, 02:10', retries: 3 },
    { id: 'JB-903', job: 'Webhook Retry Processor', error: 'Remote host unreachable', ts: '23 Feb 2026, 17:35', retries: 3 },
];

const DOT = ({ status }) => <div className={`status-dot ${status}`} style={{ marginRight: 6 }} />;

const StatusBadge = ({ status }) => (
    <span className={`badge ${status === 'running' ? 'active' : status === 'failed' ? 'danger' : status === 'idle' ? 'neutral' : 'pending'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <DOT status={status} />{status}
    </span>
);

export default function JobMonitor() {
    const [jobs, setJobs] = useState(JOBS_INIT);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const triggerJob = (id) => {
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'running', nextRun: 'Running now' } : j));
        setTimeout(() => {
            setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'idle', lastRun: 'Just now', runs: j.runs + 1 } : j));
            showToast(`Job triggered successfully`);
        }, 2000);
    };

    const totals = { running: jobs.filter(j => j.status === 'running').length, failed: jobs.filter(j => j.status === 'failed').length, queue: jobs.reduce((s, j) => s + j.queue, 0) };

    return (
        <div className="content-area">
            <div className="page-header">
                <div>
                    <div className="page-title">Background Job Monitor</div>
                    <div className="page-subtitle">Cron schedules, queue health, and failed job diagnostics</div>
                </div>
                <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { setJobs(JOBS_INIT); showToast('Status refreshed'); }}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
                {[
                    { label: 'Total Jobs', value: jobs.length, cls: 'primary', icon: Cpu },
                    { label: 'Currently Running', value: totals.running, cls: 'success', icon: Play },
                    { label: 'Queued Items', value: totals.queue, cls: 'warning', icon: Clock },
                    { label: 'Failed (recent)', value: totals.failed, cls: 'danger', icon: AlertCircle },
                ].map(s => (
                    <div className="stat-card" key={s.label}>
                        <div className="stat-header">
                            <div><div className="stat-title">{s.label}</div><div className="stat-value">{s.value}</div></div>
                            <div className={`stat-icon ${s.cls}`}><s.icon size={18} /></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Job Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {jobs.map(job => (
                    <div className="card" key={job.id} style={{ borderColor: job.status === 'failed' ? 'var(--color-danger)' : job.status === 'running' ? 'var(--color-success)' : 'var(--color-border)' }}>
                        <div className="card-header">
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{job.name}</span>
                            <StatusBadge status={job.status} />
                        </div>
                        <div className="card-body" style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                {[['Schedule', job.schedule], ['Last Run', job.lastRun], ['Next Run', job.nextRun], ['Duration', job.duration]].map(([k, v]) => (
                                    <div key={k}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2, fontFamily: k === 'Schedule' ? 'monospace' : 'inherit' }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}><span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{job.runs}</span> runs</span>
                                    <span style={{ fontSize: 12, color: job.failures > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}><span style={{ fontWeight: 700 }}>{job.failures}</span> failures</span>
                                    {job.queue > 0 && <span style={{ fontSize: 12, color: 'var(--color-warning)' }}><span style={{ fontWeight: 700 }}>{job.queue}</span> queued</span>}
                                </div>
                                <button className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => triggerJob(job.id)} disabled={job.status === 'running'}>
                                    <Play size={11} /> {job.status === 'running' ? 'Running…' : 'Trigger'}
                                </button>
                            </div>
                            {job.status === 'running' && (
                                <div style={{ marginTop: 10, height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: '60%', background: 'linear-gradient(90deg, var(--color-success), var(--color-accent))', borderRadius: 2, animation: 'shimmer 1.6s infinite', backgroundSize: '200% 100%' }} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Failed Jobs */}
            <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
                <div className="card-header" style={{ color: 'var(--color-danger)', gap: 8 }}>
                    <AlertCircle size={16} /> Recent Failures
                </div>
                <table className="data-table">
                    <thead><tr><th>Job ID</th><th>Job Name</th><th>Error</th><th>Timestamp</th><th>Retries</th><th>Action</th></tr></thead>
                    <tbody>
                        {FAILED_JOBS.map(f => (
                            <tr key={f.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--color-text-muted)' }}>{f.id}</td>
                                <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{f.job}</td>
                                <td><span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{f.error}</span></td>
                                <td style={{ fontSize: 12 }}>{f.ts}</td>
                                <td><span className="badge danger">{f.retries}/3</span></td>
                                <td><button className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => showToast('Job queued for retry')}><RefreshCw size={11} /> Retry</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {toast.msg}</div></div>}
        </div>
    );
}
