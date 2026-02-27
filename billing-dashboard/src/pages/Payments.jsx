import React, { useState } from 'react';
import { Search, Download, RefreshCw, ArrowUpRight, ArrowDownLeft, CreditCard } from 'lucide-react';

const PAYMENTS = [
    { id: 'PAY-8801', customer: 'Acme Corp', invoice: 'INV-4011', method: 'UPI', amount: 4956, status: 'completed', date: '27 Feb 2026, 2:45 PM', gateway: 'Razorpay' },
    { id: 'PAY-8802', customer: 'Globex Inc', invoice: 'INV-4012', method: 'Credit Card', amount: 2183, status: 'completed', date: '27 Feb 2026, 11:30 AM', gateway: 'Stripe' },
    { id: 'PAY-8803', customer: 'Soylent Ltd', invoice: 'INV-4013', method: 'Net Banking', amount: 7552, status: 'pending', date: '26 Feb 2026', gateway: 'HDFC' },
    { id: 'PAY-8804', customer: 'Initech', invoice: 'INV-4014', method: 'Debit Card', amount: 1003, status: 'failed', date: '26 Feb 2026', gateway: 'Paytm' },
    { id: 'PAY-8805', customer: 'Umbrella Corp', invoice: 'INV-4015', method: 'Bank Transfer', amount: 14160, status: 'completed', date: '24 Feb 2026', gateway: 'Manual' },
    { id: 'PAY-8806', customer: 'Massive Dynamic', invoice: 'INV-4016', method: 'UPI', amount: 5900, status: 'refunded', date: '22 Feb 2026', gateway: 'Razorpay' },
    { id: 'PAY-8807', customer: 'Pied Piper', invoice: 'INV-4017', method: 'Credit Card', amount: 2950, status: 'completed', date: '20 Feb 2026', gateway: 'Stripe' },
    { id: 'PAY-8808', customer: 'Hooli', invoice: 'INV-4018', method: 'Cheque', amount: 8850, status: 'pending', date: '19 Feb 2026', gateway: 'Manual' },
];

const METHOD_ICONS = { UPI: '🏦', 'Credit Card': '💳', 'Debit Card': '💳', 'Net Banking': '🏛️', 'Bank Transfer': '🔄', Cheque: '📄', Cash: '💵' };

export default function Payments() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [refundId, setRefundId] = useState(null);
    const [payments, setPayments] = useState(PAYMENTS);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = payments.filter(p => {
        const matchSearch = p.customer.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.invoice.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || p.status === filter;
        return matchSearch && matchFilter;
    });

    const summary = {
        total: payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0),
        pending: payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
        failed: payments.filter(p => p.status === 'failed').length,
        refunded: payments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0),
    };

    const handleRefund = (id) => {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'refunded' } : p));
        setRefundId(null);
        showToast('Refund processed successfully');
    };

    return (
        <div className="content-area">
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">Payments</div>
                    <div className="page-subtitle">All transaction records across customers and invoices</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Sync</button>
                    <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> Export CSV</button>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                    { label: 'Total Collected', value: `₹${summary.total.toLocaleString('en-IN')}`, icon: ArrowUpRight, cls: 'success', sub: 'This month' },
                    { label: 'Pending Amount', value: `₹${summary.pending.toLocaleString('en-IN')}`, icon: CreditCard, cls: 'warning', sub: `${payments.filter(p => p.status === 'pending').length} transactions` },
                    { label: 'Failed Payments', value: summary.failed, icon: ArrowDownLeft, cls: 'danger', sub: 'Require attention' },
                    { label: 'Total Refunded', value: `₹${summary.refunded.toLocaleString('en-IN')}`, icon: RefreshCw, cls: 'purple', sub: `${payments.filter(p => p.status === 'refunded').length} refunds` },
                ].map(s => (
                    <div className="stat-card" key={s.label}>
                        <div className="stat-header">
                            <div>
                                <div className="stat-title">{s.label}</div>
                                <div className="stat-value">{s.value}</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.sub}</div>
                            </div>
                            <div className={`stat-icon ${s.cls}`}><s.icon size={18} /></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <div className="search-box">
                    <Search size={14} className="search-icon" />
                    <input placeholder="Search by customer, invoice, payment ID..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {['all', 'completed', 'pending', 'failed', 'refunded'].map(f => (
                    <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f === 'all' ? 'All' : f}</button>
                ))}
            </div>

            {/* Table */}
            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Payment ID</th><th>Customer</th><th>Invoice</th>
                            <th>Method</th><th>Amount</th><th>Gateway</th>
                            <th>Date</th><th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No payments found</td></tr>
                        ) : filtered.map(p => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: 12 }}>{p.id}</td>
                                <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{p.customer}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.invoice}</td>
                                <td><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span>{METHOD_ICONS[p.method] || '💰'}</span>{p.method}</span></td>
                                <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                                <td><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.gateway}</span></td>
                                <td style={{ fontSize: 12 }}>{p.date}</td>
                                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                                <td>
                                    {p.status === 'completed' && (
                                        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-warning)', fontSize: 12 }} onClick={() => setRefundId(p.id)}>
                                            Refund
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Refund Confirm Dialog */}
            {refundId && (
                <div className="modal-backdrop" onClick={() => setRefundId(null)}>
                    <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
                            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-warning-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <RefreshCw size={24} color="var(--color-warning)" />
                            </div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Process Refund?</h3>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>This will reverse payment <strong>{refundId}</strong> and notify the customer via email.</p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn btn-secondary w-full" onClick={() => setRefundId(null)}>Cancel</button>
                                <button className="btn btn-danger w-full" onClick={() => handleRefund(refundId)}>Yes, Refund</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>✓ {toast.msg}</div></div>}
        </div>
    );
}
