import React, { useState } from 'react';
import { CreditCard, Search, MoreVertical, Plus, TrendingUp, RefreshCw, AlertCircle, XCircle, Eye, Pencil, Trash2, Pause, Play } from 'lucide-react';
import Modal, { ConfirmDialog, Btn, Input, Select, DetailRow } from '../components/Modal';

const INITIAL_SUBS = [
    { id: 'SUB-1029', customer: 'Acme Corp', plan: 'Enterprise Annual', amount: 12000, interval: '/yr', status: 'Active', nextBilling: 'Oct 12, 2026', startDate: 'Oct 12, 2025', seats: 45 },
    { id: 'SUB-1030', customer: 'Globex Inc', plan: 'Pro Monthly', amount: 499, interval: '/mo', status: 'Active', nextBilling: 'Mar 05, 2026', startDate: 'Feb 05, 2026', seats: 12 },
    { id: 'SUB-1031', customer: 'Soylent Ltd', plan: 'Basic Monthly', amount: 99, interval: '/mo', status: 'Past Due', nextBilling: 'Feb 18, 2026', startDate: 'Jan 18, 2026', seats: 3 },
    { id: 'SUB-1032', customer: 'Umbrella Corp', plan: 'Enterprise Annual', amount: 15000, interval: '/yr', status: 'Active', nextBilling: 'Mar 15, 2027', startDate: 'Mar 15, 2026', seats: 80 },
    { id: 'SUB-1033', customer: 'Initech', plan: 'Pro Monthly', amount: 499, interval: '/mo', status: 'Canceled', nextBilling: '—', startDate: 'Jan 02, 2026', seats: 0 },
    { id: 'SUB-1034', customer: 'Massive Dynamic', plan: 'Pro Monthly', amount: 499, interval: '/mo', status: 'Active', nextBilling: 'Mar 28, 2026', startDate: 'Feb 28, 2026', seats: 18 },
    { id: 'SUB-1035', customer: 'Pied Piper', plan: 'Enterprise Annual', amount: 12000, interval: '/yr', status: 'Past Due', nextBilling: 'Apr 20, 2026', startDate: 'Apr 20, 2025', seats: 30 },
];

const STATUS_CONFIG = {
    'Active': { class: 'paid' },
    'Past Due': { class: 'pending' },
    'Canceled': { class: 'failed' },
};

const EMPTY_FORM = { customer: '', plan: 'Pro Monthly', seats: '10', status: 'Active' };

const PLAN_AMOUNTS = { 'Basic Monthly': { amount: 99, interval: '/mo' }, 'Pro Monthly': { amount: 499, interval: '/mo' }, 'Enterprise Annual': { amount: 12000, interval: '/yr' } };

export default function Subscriptions() {
    const [subs, setSubs] = useState(INITIAL_SUBS);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [openMenu, setOpenMenu] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [viewSub, setViewSub] = useState(null);
    const [editSub, setEditSub] = useState(null);
    const [deleteSub, setDeleteSub] = useState(null);

    const filters = ['All', 'Active', 'Past Due', 'Canceled'];
    const filtered = subs.filter(s => {
        const matchesSearch = s.customer.toLowerCase().includes(search.toLowerCase()) ||
            s.id.toLowerCase().includes(search.toLowerCase()) ||
            s.plan.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = activeFilter === 'All' || s.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const activeSubs = subs.filter(s => s.status === 'Active').length;
    const pastDueSubs = subs.filter(s => s.status === 'Past Due').length;
    const canceledSubs = subs.filter(s => s.status === 'Canceled').length;

    const handleAdd = () => {
        if (!form.customer) return;
        const planInfo = PLAN_AMOUNTS[form.plan] || { amount: 499, interval: '/mo' };
        const next = new Date(); next.setMonth(next.getMonth() + 1);
        const newSub = {
            id: `SUB-${1035 + subs.length - 6}`,
            customer: form.customer,
            plan: form.plan,
            amount: planInfo.amount,
            interval: planInfo.interval,
            status: form.status,
            nextBilling: form.status === 'Canceled' ? '—' : next.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            startDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            seats: parseInt(form.seats) || 1,
        };
        setSubs(prev => [newSub, ...prev]);
        setForm(EMPTY_FORM);
        setAddOpen(false);
    };

    const handleEdit = () => {
        setSubs(prev => prev.map(s => s.id === editSub.id ? editSub : s));
        setEditSub(null);
    };

    const handleDelete = () => {
        setSubs(prev => prev.filter(s => s.id !== deleteSub.id));
        setDeleteSub(null);
    };

    const handleStatusChange = (sub, newStatus) => {
        setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus, nextBilling: newStatus === 'Canceled' ? '—' : s.nextBilling } : s));
        setOpenMenu(null);
    };

    return (
        <div className="content-area" onClick={() => setOpenMenu(null)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Subscriptions</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Monitor and manage all active subscription plans</p>
                </div>
                <Btn onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }} icon={Plus}>New Subscription</Btn>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Subscriptions', value: subs.length, icon: CreditCard, color: 'primary' },
                    { label: 'Active', value: activeSubs, icon: TrendingUp, color: 'success' },
                    { label: 'Past Due', value: pastDueSubs, icon: AlertCircle, color: 'warning' },
                    { label: 'Canceled', value: canceledSubs, icon: XCircle, color: 'danger' },
                ].map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="stat-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div className="stat-title">{stat.label}</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginTop: '4px' }}>{stat.value}</div>
                                </div>
                                <div className={`stat-icon ${stat.color}`}><Icon size={20} /></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="card">
                <div style={{ padding: '20px 24px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Search subscriptions..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '9px 9px 9px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'white', outline: 'none', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {filters.map(f => (
                            <button key={f} onClick={() => setActiveFilter(f)} style={{
                                padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                border: activeFilter === f ? 'none' : '1px solid var(--border-color)',
                                backgroundColor: activeFilter === f ? 'rgba(99,102,241,0.15)' : 'transparent',
                                color: activeFilter === f ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer'
                            }}>{f}</button>
                        ))}
                    </div>
                    <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>{filtered.length} subscriptions</div>
                </div>

                <div style={{ padding: '0 24px 24px 24px' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Subscription</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Seats</th><th>Status</th><th>Next Billing</th><th style={{ width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((sub) => {
                                const cfg = STATUS_CONFIG[sub.status];
                                return (
                                    <tr key={sub.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <CreditCard size={16} color="var(--accent-primary)" />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>{sub.id}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Since {sub.startDate}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{sub.customer}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{sub.plan}</td>
                                        <td>
                                            <span style={{ fontWeight: 700, color: 'white' }}>₹{sub.amount.toLocaleString()}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{sub.interval}</span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>
                                            {sub.seats > 0 ? `${sub.seats} seats` : <span style={{ color: 'var(--accent-danger)' }}>Inactive</span>}
                                        </td>
                                        <td><span className={`badge ${cfg.class}`}>{sub.status}</span></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                            {sub.nextBilling === '—' ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-danger)' }}><XCircle size={14} /> Canceled</span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={13} color="var(--text-muted)" /> {sub.nextBilling}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setOpenMenu(openMenu === sub.id ? null : sub.id)}
                                                    style={{ color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}>
                                                    <MoreVertical size={16} />
                                                </button>
                                                {openMenu === sub.id && (
                                                    <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, backgroundColor: '#1a1d2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '5px', minWidth: '185px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                                                        {[
                                                            { label: 'View Details', icon: Eye, action: () => { setViewSub(sub); setOpenMenu(null); } },
                                                            { label: 'Edit Subscription', icon: Pencil, action: () => { setEditSub({ ...sub }); setOpenMenu(null); } },
                                                            sub.status === 'Active'
                                                                ? { label: 'Pause Subscription', icon: Pause, action: () => handleStatusChange(sub, 'Past Due') }
                                                                : sub.status === 'Past Due'
                                                                    ? { label: 'Reactivate', icon: Play, action: () => handleStatusChange(sub, 'Active') }
                                                                    : null,
                                                            { label: 'Cancel Subscription', icon: XCircle, danger: true, action: () => handleStatusChange(sub, 'Canceled') },
                                                            { label: 'Delete', icon: Trash2, danger: true, action: () => { setDeleteSub(sub); setOpenMenu(null); } },
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
                            <CreditCard size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <p>No subscriptions found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── ADD MODAL ── */}
            <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Subscription" size="md">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <Input label="Customer Name" required placeholder="e.g. Acme Corp" value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Select label="Plan" value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
                            <option>Basic Monthly</option><option>Pro Monthly</option><option>Enterprise Annual</option>
                        </Select>
                        <Select label="Status" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                            <option>Active</option><option>Past Due</option><option>Canceled</option>
                        </Select>
                    </div>
                    <Input label="Number of Seats" type="number" min="1" value={form.seats} onChange={e => setForm(p => ({ ...p, seats: e.target.value }))} />
                    {form.plan && (
                        <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Plan Cost</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                                ₹{(PLAN_AMOUNTS[form.plan]?.amount || 499).toLocaleString()}<span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>{PLAN_AMOUNTS[form.plan]?.interval || '/mo'}</span>
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                        <Btn variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Btn>
                        <Btn onClick={handleAdd} disabled={!form.customer} icon={Plus}>Create Subscription</Btn>
                    </div>
                </div>
            </Modal>

            {/* ── VIEW MODAL ── */}
            <Modal isOpen={!!viewSub} onClose={() => setViewSub(null)} title="Subscription Details" size="md">
                {viewSub && (
                    <div>
                        <DetailRow label="Subscription ID" value={viewSub.id} accent="var(--accent-primary)" />
                        <DetailRow label="Customer" value={viewSub.customer} />
                        <DetailRow label="Plan" value={viewSub.plan} />
                        <DetailRow label="Amount" value={`₹${viewSub.amount.toLocaleString()}${viewSub.interval}`} accent="var(--accent-success)" />
                        <DetailRow label="Seats" value={`${viewSub.seats} seats`} />
                        <DetailRow label="Status" value={viewSub.status} accent={viewSub.status === 'Active' ? 'var(--accent-success)' : viewSub.status === 'Past Due' ? 'var(--accent-warning)' : 'var(--accent-danger)'} />
                        <DetailRow label="Start Date" value={viewSub.startDate} />
                        <DetailRow label="Next Billing" value={viewSub.nextBilling} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <Btn variant="secondary" onClick={() => setViewSub(null)}>Close</Btn>
                            <Btn icon={Pencil} onClick={() => { setEditSub({ ...viewSub }); setViewSub(null); }}>Edit</Btn>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── EDIT MODAL ── */}
            <Modal isOpen={!!editSub} onClose={() => setEditSub(null)} title="Edit Subscription" size="md">
                {editSub && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <Input label="Customer" value={editSub.customer} onChange={e => setEditSub(p => ({ ...p, customer: e.target.value }))} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Select label="Plan" value={editSub.plan} onChange={e => { const info = PLAN_AMOUNTS[e.target.value]; setEditSub(p => ({ ...p, plan: e.target.value, ...(info || {}) })); }}>
                                <option>Basic Monthly</option><option>Pro Monthly</option><option>Enterprise Annual</option>
                            </Select>
                            <Select label="Status" value={editSub.status} onChange={e => setEditSub(p => ({ ...p, status: e.target.value }))}>
                                <option>Active</option><option>Past Due</option><option>Canceled</option>
                            </Select>
                        </div>
                        <Input label="Seats" type="number" min="0" value={editSub.seats} onChange={e => setEditSub(p => ({ ...p, seats: parseInt(e.target.value) || 0 }))} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                            <Btn variant="secondary" onClick={() => setEditSub(null)}>Cancel</Btn>
                            <Btn icon={Pencil} onClick={handleEdit}>Save Changes</Btn>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── DELETE CONFIRM ── */}
            <ConfirmDialog
                isOpen={!!deleteSub}
                onClose={() => setDeleteSub(null)}
                onConfirm={handleDelete}
                title="Delete Subscription"
                message={`Are you sure you want to permanently delete subscription "${deleteSub?.id}" for ${deleteSub?.customer}? This action cannot be undone.`}
                confirmLabel="Delete Subscription"
            />
        </div>
    );
}
