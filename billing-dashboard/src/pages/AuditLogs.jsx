import React, { useState } from 'react';
import { Search, Filter, Eye, ChevronDown, ChevronUp } from 'lucide-react';

const LOGS = [
    { id: 1, user: 'Ashwin Kumar', role: 'owner', action: 'invoice.created', entity: 'Invoice', entityId: 'INV-4011', ip: '103.12.44.21', ts: '27 Feb 2026, 14:45', before: null, after: { status: 'draft', amount: 4956 } },
    { id: 2, user: 'Ashwin Kumar', role: 'owner', action: 'invoice.marked_paid', entity: 'Invoice', entityId: 'INV-4011', ip: '103.12.44.21', ts: '27 Feb 2026, 14:52', before: { status: 'sent' }, after: { status: 'paid' } },
    { id: 3, user: 'Priya Singh', role: 'admin', action: 'customer.created', entity: 'Customer', entityId: 'CUS-209', ip: '49.32.115.7', ts: '27 Feb 2026, 11:30', before: null, after: { name: 'Hooli', email: 'pay@hooli.com' } },
    { id: 4, user: 'Admin Bot', role: 'system', action: 'subscription.renewed', entity: 'Subscription', entityId: 'SUB-1042', ip: 'system', ts: '27 Feb 2026, 00:01', before: { period: 'Jan 2026' }, after: { period: 'Feb 2026', amount: 2950 } },
    { id: 5, user: 'Ashwin Kumar', role: 'owner', action: 'plan.updated', entity: 'Plan', entityId: 'PLAN-PRO', ip: '103.12.44.21', ts: '26 Feb 2026, 16:10', before: { price: 1999 }, after: { price: 2499 } },
    { id: 6, user: 'Priya Singh', role: 'admin', action: 'customer.deleted', entity: 'Customer', entityId: 'CUS-198', ip: '49.32.115.7', ts: '26 Feb 2026, 09:22', before: { name: 'Old Corp', active: true }, after: { active: false, deleted_at: '2026-02-26' } },
    { id: 7, user: 'Admin Bot', role: 'system', action: 'invoice.auto_generated', entity: 'Invoice', entityId: 'INV-4018', ip: 'system', ts: '25 Feb 2026, 00:01', before: null, after: { status: 'draft', amount: 8850 } },
    { id: 8, user: 'Raj Verma', role: 'accountant', action: 'payment.recorded', entity: 'Payment', entityId: 'PAY-8801', ip: '110.45.22.9', ts: '24 Feb 2026, 15:05', before: null, after: { amount: 14160, method: 'Bank Transfer' } },
];

const ACTION_COLOR = {
    'invoice.created': 'cyan',
    'invoice.marked_paid': 'active',
    'customer.created': 'active',
    'subscription.renewed': 'purple',
    'plan.updated': 'warning',
    'customer.deleted': 'danger',
    'invoice.auto_generated': 'cyan',
    'payment.recorded': 'active',
};

export default function AuditLogs() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState(null);

    const filtered = LOGS.filter(l => {
        const q = search.toLowerCase();
        const matchSearch = l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q) || l.entityId.toLowerCase().includes(q);
        const matchFilter = filter === 'all' || l.entity.toLowerCase() === filter;
        return matchSearch && matchFilter;
    });

    return (
        <div className="content-area">
            <div className="page-header">
                <div>
                    <div className="page-title">Audit Logs</div>
                    <div className="page-subtitle">Complete record of all system and user actions</div>
                </div>
                <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Filter size={14} /> Export Logs
                </button>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <div className="search-box">
                    <Search size={14} className="search-icon" />
                    <input placeholder="Search by user, action, entity..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="all">All Entities</option>
                    <option value="invoice">Invoice</option>
                    <option value="customer">Customer</option>
                    <option value="subscription">Subscription</option>
                    <option value="plan">Plan</option>
                    <option value="payment">Payment</option>
                </select>
            </div>

            {/* Log Entries */}
            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th><th>User</th><th>Role</th>
                            <th>Action</th><th>Entity</th><th>IP</th><th>Diff</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(log => (
                            <React.Fragment key={log.id}>
                                <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11.5 }}>{log.ts}</td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 13 }}>{log.user}</div>
                                    </td>
                                    <td><span className={`badge ${log.role === 'system' ? 'cyan' : log.role === 'owner' ? 'purple' : 'neutral'}`}>{log.role}</span></td>
                                    <td><span className={`badge ${ACTION_COLOR[log.action] || 'neutral'}`} style={{ fontFamily: 'monospace', fontSize: 10.5 }}>{log.action}</span></td>
                                    <td>
                                        <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{log.entity}</div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{log.entityId}</div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)' }}>{log.ip}</td>
                                    <td>
                                        <button style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                            {expanded === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            View diff
                                        </button>
                                    </td>
                                </tr>
                                {expanded === log.id && (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '0 16px 16px', background: 'var(--color-bg-tertiary)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 0' }}>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Before</div>
                                                    <pre style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, fontSize: 11.5, color: 'var(--color-danger)', fontFamily: 'monospace', lineHeight: 1.7, overflowX: 'auto' }}>
                                                        {log.before ? JSON.stringify(log.before, null, 2) : '—  (new record)'}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>After</div>
                                                    <pre style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, fontSize: 11.5, color: 'var(--color-success)', fontFamily: 'monospace', lineHeight: 1.7, overflowX: 'auto' }}>
                                                        {log.after ? JSON.stringify(log.after, null, 2) : '—'}
                                                    </pre>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
