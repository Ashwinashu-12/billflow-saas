import React, { useState } from 'react';
import { FileText, Search, Download, MoreVertical, CheckCircle, Clock, XCircle, DollarSign, Eye, Send, Plus, Pencil, Trash2 } from 'lucide-react';
import Modal, { ConfirmDialog, Btn, Input, Select, DetailRow } from '../components/Modal';

const INITIAL_INVOICES = [
    { id: 'INV-4011', customer: 'Acme Corp', plan: 'Enterprise Annual', amount: 4200, status: 'paid', date: 'Feb 27, 2026', dueDate: 'Mar 06, 2026' },
    { id: 'INV-4012', customer: 'Globex Inc', plan: 'Pro Monthly', amount: 1850, status: 'paid', date: 'Feb 27, 2026', dueDate: 'Mar 06, 2026' },
    { id: 'INV-4013', customer: 'Soylent Ltd', plan: 'Basic Monthly', amount: 6400, status: 'pending', date: 'Feb 26, 2026', dueDate: 'Mar 05, 2026' },
    { id: 'INV-4014', customer: 'Initech', plan: 'Pro Monthly', amount: 850, status: 'failed', date: 'Feb 26, 2026', dueDate: 'Mar 05, 2026' },
    { id: 'INV-4015', customer: 'Umbrella Corp', plan: 'Enterprise Annual', amount: 12000, status: 'paid', date: 'Feb 24, 2026', dueDate: 'Mar 03, 2026' },
    { id: 'INV-4016', customer: 'Massive Dynamic', plan: 'Pro Monthly', amount: 9500, status: 'paid', date: 'Feb 22, 2026', dueDate: 'Mar 01, 2026' },
    { id: 'INV-4017', customer: 'Hooli', plan: 'Basic Monthly', amount: 3200, status: 'pending', date: 'Feb 20, 2026', dueDate: 'Feb 27, 2026' },
    { id: 'INV-4018', customer: 'Pied Piper', plan: 'Enterprise Annual', amount: 12000, status: 'failed', date: 'Feb 18, 2026', dueDate: 'Feb 25, 2026' },
    { id: 'INV-4019', customer: 'Acme Corp', plan: 'Enterprise Annual', amount: 4200, status: 'paid', date: 'Jan 27, 2026', dueDate: 'Feb 03, 2026' },
];

const STATUS_CONFIG = {
    paid: { label: 'Paid', icon: CheckCircle, badgeClass: 'paid', iconColor: 'var(--accent-success)' },
    pending: { label: 'Pending', icon: Clock, badgeClass: 'pending', iconColor: 'var(--accent-warning)' },
    failed: { label: 'Failed', icon: XCircle, badgeClass: 'failed', iconColor: 'var(--accent-danger)' },
};

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

const EMPTY_FORM = { customer: '', plan: 'Pro Monthly', amount: '', status: 'pending', dueDate: '' };

export default function Invoices() {
    const [invoices, setInvoices] = useState(INITIAL_INVOICES);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [openMenu, setOpenMenu] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [viewInv, setViewInv] = useState(null);
    const [editInv, setEditInv] = useState(null);
    const [deleteInv, setDeleteInv] = useState(null);
    const [resendInv, setResendInv] = useState(null);
    const [resendDone, setResendDone] = useState(false);

    const tabs = [
        { key: 'all', label: 'All' },
        { key: 'paid', label: 'Paid' },
        { key: 'pending', label: 'Pending' },
        { key: 'failed', label: 'Failed' },
    ];

    const filtered = invoices.filter(inv => {
        const matchSearch = inv.id.toLowerCase().includes(search.toLowerCase()) ||
            inv.customer.toLowerCase().includes(search.toLowerCase());
        const matchTab = activeTab === 'all' || inv.status === activeTab;
        return matchSearch && matchTab;
    });

    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount, 0);
    const totalPending = invoices.filter(i => i.status === 'pending').reduce((a, i) => a + i.amount, 0);
    const totalFailed = invoices.filter(i => i.status === 'failed').reduce((a, i) => a + i.amount, 0);
    const totalAll = invoices.reduce((a, i) => a + i.amount, 0);

    const handleAdd = () => {
        if (!form.customer || !form.amount) return;
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const due = form.dueDate || new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const newInv = {
            id: `INV-${4020 + invoices.length - 9}`,
            customer: form.customer,
            plan: form.plan,
            amount: parseFloat(form.amount) || 0,
            status: form.status,
            date: today,
            dueDate: due,
        };
        setInvoices(prev => [newInv, ...prev]);
        setForm(EMPTY_FORM);
        setAddOpen(false);
    };

    const handleEdit = () => {
        setInvoices(prev => prev.map(i => i.id === editInv.id ? editInv : i));
        setEditInv(null);
    };

    const handleDelete = () => {
        setInvoices(prev => prev.filter(i => i.id !== deleteInv.id));
        setDeleteInv(null);
    };

    const handleMarkPaid = (inv) => {
        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'paid' } : i));
        setOpenMenu(null);
    };

    const handleResend = () => {
        setResendDone(true);
        setTimeout(() => { setResendDone(false); setResendInv(null); }, 1800);
    };

    const handleExportCSV = () => {
        const headers = ['ID,Customer,Plan,Amount,Date,Due Date,Status'];
        const rows = invoices.map(i => `${i.id},${i.customer},${i.plan},${i.amount},${i.date},${i.dueDate},${i.status}`);
        const csv = [...headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="content-area" onClick={() => setOpenMenu(null)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Invoices</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Track and manage all your billing invoices</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Btn variant="secondary" onClick={handleExportCSV} icon={Download}>Export CSV</Btn>
                    <Btn onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }} icon={Plus}>Create Invoice</Btn>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Invoiced', value: fmt(totalAll), icon: DollarSign, color: 'primary', count: invoices.length },
                    { label: 'Collected', value: fmt(totalPaid), icon: CheckCircle, color: 'success', count: invoices.filter(i => i.status === 'paid').length },
                    { label: 'Outstanding', value: fmt(totalPending), icon: Clock, color: 'warning', count: invoices.filter(i => i.status === 'pending').length },
                    { label: 'Failed / Overdue', value: fmt(totalFailed), icon: XCircle, color: 'danger', count: invoices.filter(i => i.status === 'failed').length },
                ].map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="stat-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div className="stat-title">{stat.label}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginTop: '4px' }}>{stat.value}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{stat.count} invoices</div>
                                </div>
                                <div className={`stat-icon ${stat.color}`}><Icon size={20} /></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="card">
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '300px' }}>
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '8px 8px 8px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'white', outline: 'none', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-color)' }}>
                        {tabs.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                                padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                                backgroundColor: activeTab === tab.key ? 'rgba(99,102,241,0.2)' : 'transparent',
                                color: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--text-muted)', transition: 'all 0.2s'
                            }}>{tab.label}</button>
                        ))}
                    </div>
                    <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</div>
                </div>

                <div style={{ padding: '0 24px 24px' }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>Invoice</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Date Issued</th><th>Due Date</th><th>Status</th><th style={{ width: '40px' }}></th></tr>
                        </thead>
                        <tbody>
                            {filtered.map(inv => {
                                const cfg = STATUS_CONFIG[inv.status];
                                const StatusIcon = cfg.icon;
                                return (
                                    <tr key={inv.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <FileText size={15} color="var(--accent-primary)" />
                                                </div>
                                                <span style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>{inv.id}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{inv.customer}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{inv.plan}</td>
                                        <td style={{ fontWeight: 700, color: 'white' }}>{fmt(inv.amount)}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{inv.date}</td>
                                        <td style={{ color: inv.status === 'failed' ? 'var(--accent-danger)' : 'var(--text-muted)', fontSize: '13px', fontWeight: inv.status === 'failed' ? 600 : 400 }}>{inv.dueDate}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <StatusIcon size={14} color={cfg.iconColor} />
                                                <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setOpenMenu(openMenu === inv.id ? null : inv.id)}
                                                    style={{ color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}>
                                                    <MoreVertical size={16} />
                                                </button>
                                                {openMenu === inv.id && (
                                                    <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, backgroundColor: '#1a1d2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '5px', minWidth: '170px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                                                        {[
                                                            { label: 'View Invoice', icon: Eye, action: () => { setViewInv(inv); setOpenMenu(null); } },
                                                            { label: 'Edit Invoice', icon: Pencil, action: () => { setEditInv({ ...inv }); setOpenMenu(null); } },
                                                            inv.status !== 'paid' && { label: 'Mark as Paid', icon: CheckCircle, action: () => handleMarkPaid(inv) },
                                                            { label: 'Download PDF', icon: Download, action: () => { alert(`Downloading ${inv.id}.pdf`); setOpenMenu(null); } },
                                                            { label: 'Resend Email', icon: Send, action: () => { setResendInv(inv); setOpenMenu(null); } },
                                                            { label: 'Delete Invoice', icon: Trash2, danger: true, action: () => { setDeleteInv(inv); setOpenMenu(null); } },
                                                        ].filter(Boolean).map(item => {
                                                            const Icon = item.icon;
                                                            return (
                                                                <button key={item.label} onClick={item.action} style={{
                                                                    display: 'flex', alignItems: 'center', gap: '9px', width: '100%', textAlign: 'left',
                                                                    padding: '9px 12px', borderRadius: '7px', fontSize: '13px', cursor: 'pointer',
                                                                    color: item.danger ? 'var(--accent-danger)' : 'var(--text-main)', fontFamily: 'Inter, sans-serif'
                                                                }}
                                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = item.danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)'}
                                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                >
                                                                    <Icon size={14} /> {item.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <p>No invoices found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── ADD MODAL ── */}
            <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Create Invoice" size="md">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input label="Customer" required placeholder="Acme Corp" value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))} />
                        <Select label="Plan" value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
                            <option>Basic Monthly</option><option>Pro Monthly</option><option>Enterprise Annual</option>
                        </Select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input label="Amount (₹)" required type="number" placeholder="4200" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                        <Select label="Status" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                            <option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option>
                        </Select>
                    </div>
                    <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                        <Btn variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Btn>
                        <Btn onClick={handleAdd} disabled={!form.customer || !form.amount} icon={Send}>Create Invoice</Btn>
                    </div>
                </div>
            </Modal>

            {/* ── VIEW MODAL ── */}
            <Modal isOpen={!!viewInv} onClose={() => setViewInv(null)} title="Invoice Details" size="md">
                {viewInv && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{viewInv.id}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Issued {viewInv.date}</div>
                            </div>
                            <span className={`badge ${STATUS_CONFIG[viewInv.status].badgeClass}`} style={{ fontSize: '13px', padding: '6px 14px' }}>
                                {STATUS_CONFIG[viewInv.status].label}
                            </span>
                        </div>
                        <DetailRow label="Customer" value={viewInv.customer} />
                        <DetailRow label="Plan / Service" value={viewInv.plan} />
                        <DetailRow label="Amount" value={fmt(viewInv.amount)} accent="var(--accent-success)" />
                        <DetailRow label="Date Issued" value={viewInv.date} />
                        <DetailRow label="Due Date" value={viewInv.dueDate} accent={viewInv.status === 'failed' ? 'var(--accent-danger)' : undefined} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <Btn variant="secondary" icon={Download} onClick={() => alert(`Downloading ${viewInv.id}.pdf`)}>Download PDF</Btn>
                            <Btn icon={Pencil} onClick={() => { setEditInv({ ...viewInv }); setViewInv(null); }}>Edit</Btn>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── EDIT MODAL ── */}
            <Modal isOpen={!!editInv} onClose={() => setEditInv(null)} title="Edit Invoice" size="md">
                {editInv && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input label="Customer" value={editInv.customer} onChange={e => setEditInv(p => ({ ...p, customer: e.target.value }))} />
                            <Input label="Amount (₹)" type="number" value={editInv.amount} onChange={e => setEditInv(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
                        </div>
                        <Select label="Status" value={editInv.status} onChange={e => setEditInv(p => ({ ...p, status: e.target.value }))}>
                            <option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option>
                        </Select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                            <Btn variant="secondary" onClick={() => setEditInv(null)}>Cancel</Btn>
                            <Btn icon={Pencil} onClick={handleEdit}>Save Changes</Btn>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── RESEND MODAL ── */}
            <Modal isOpen={!!resendInv} onClose={() => { setResendInv(null); setResendDone(false); }} title="Resend Invoice Email" size="sm">
                {resendInv && (
                    <div>
                        {resendDone ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <CheckCircle size={48} color="var(--accent-success)" style={{ margin: '0 auto 12px' }} />
                                <div style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>Email Sent!</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>Invoice {resendInv.id} resent successfully.</div>
                            </div>
                        ) : (
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7 }}>
                                    Resend invoice <strong style={{ color: 'white' }}>{resendInv.id}</strong> to <strong style={{ color: 'white' }}>{resendInv.customer}</strong>?
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                    <Btn variant="secondary" onClick={() => setResendInv(null)}>Cancel</Btn>
                                    <Btn icon={Send} onClick={handleResend}>Send Email</Btn>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ── DELETE CONFIRM ── */}
            <ConfirmDialog
                isOpen={!!deleteInv}
                onClose={() => setDeleteInv(null)}
                onConfirm={handleDelete}
                title="Delete Invoice"
                message={`Are you sure you want to delete invoice "${deleteInv?.id}"? This action cannot be undone.`}
                confirmLabel="Delete Invoice"
            />
        </div>
    );
}
