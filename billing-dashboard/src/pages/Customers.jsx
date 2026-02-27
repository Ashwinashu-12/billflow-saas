import React, { useState } from 'react';
import { Search, MoreVertical, Plus, Users, UserCheck, UserX, Clock, Eye, Pencil, Trash2, ExternalLink } from 'lucide-react';
import Modal, { ConfirmDialog, Btn, Input, Select, DetailRow } from '../components/Modal';

const INITIAL_CUSTOMERS = [
    { id: 'CUS-001', name: 'Acme Corp', email: 'billing@acme.com', plan: 'Enterprise', status: 'Active', joined: 'Oct 12, 2025', mrr: 12000, invoices: 14, phone: '+91 98765 43210', address: 'Mumbai, Maharashtra' },
    { id: 'CUS-002', name: 'Globex Inc', email: 'finance@globex.io', plan: 'Pro', status: 'Active', joined: 'Nov 05, 2025', mrr: 499, invoices: 8, phone: '+91 87654 32109', address: 'Bangalore, Karnataka' },
    { id: 'CUS-003', name: 'Soylent Ltd', email: 'hello@soylent.co', plan: 'Basic', status: 'Past Due', joined: 'Jan 18, 2026', mrr: 99, invoices: 3, phone: '+91 76543 21098', address: 'Pune, Maharashtra' },
    { id: 'CUS-004', name: 'Initech', email: 'admin@initech.net', plan: 'Pro', status: 'Canceled', joined: 'Feb 02, 2026', mrr: 0, invoices: 2, phone: '+91 65432 10987', address: 'Chennai, Tamil Nadu' },
    { id: 'CUS-005', name: 'Umbrella Corp', email: 'accounts@umbrella.com', plan: 'Enterprise', status: 'Active', joined: 'Mar 15, 2026', mrr: 15000, invoices: 21, phone: '+91 54321 09876', address: 'Delhi, NCR' },
    { id: 'CUS-006', name: 'Massive Dynamic', email: 'billing@massive.io', plan: 'Pro', status: 'Active', joined: 'Apr 01, 2026', mrr: 499, invoices: 5, phone: '+91 43210 98765', address: 'Hyderabad, Telangana' },
    { id: 'CUS-007', name: 'Hooli', email: 'finance@hooli.com', plan: 'Basic', status: 'Active', joined: 'Apr 10, 2026', mrr: 99, invoices: 4, phone: '+91 32109 87654', address: 'Kolkata, West Bengal' },
    { id: 'CUS-008', name: 'Pied Piper', email: 'richard@piedpiper.com', plan: 'Enterprise', status: 'Past Due', joined: 'Apr 20, 2026', mrr: 12000, invoices: 7, phone: '+91 21098 76543', address: 'Ahmedabad, Gujarat' },
];

const AVATAR_COLORS = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #10b981, #06b6d4)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #3b82f6, #6366f1)',
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #14b8a6, #3b82f6)',
    'linear-gradient(135deg, #f97316, #eab308)',
    'linear-gradient(135deg, #a855f7, #ec4899)',
];

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const EMPTY_FORM = { name: '', email: '', phone: '', plan: 'Basic', status: 'Active', address: '' };

export default function Customers() {
    const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [openMenu, setOpenMenu] = useState(null);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [viewCustomer, setViewCustomer] = useState(null);
    const [editCustomer, setEditCustomer] = useState(null);
    const [deleteCustomer, setDeleteCustomer] = useState(null);

    // Form state
    const [form, setForm] = useState(EMPTY_FORM);

    const filters = ['All', 'Active', 'Past Due', 'Canceled'];
    const filtered = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase()) ||
            c.id.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = activeFilter === 'All' || c.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const totalActive = customers.filter(c => c.status === 'Active').length;
    const totalPastDue = customers.filter(c => c.status === 'Past Due').length;
    const totalCanceled = customers.filter(c => c.status === 'Canceled').length;

    const handleAdd = () => {
        if (!form.name || !form.email) return;
        const newCustomer = {
            ...form,
            id: `CUS-${String(customers.length + 1).padStart(3, '0')}`,
            joined: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            mrr: form.plan === 'Enterprise' ? 12000 : form.plan === 'Pro' ? 499 : 99,
            invoices: 0,
        };
        setCustomers(prev => [newCustomer, ...prev]);
        setForm(EMPTY_FORM);
        setAddOpen(false);
    };

    const handleEdit = () => {
        setCustomers(prev => prev.map(c => c.id === editCustomer.id ? { ...editCustomer } : c));
        setEditCustomer(null);
    };

    const handleDelete = () => {
        setCustomers(prev => prev.filter(c => c.id !== deleteCustomer.id));
        setDeleteCustomer(null);
        setOpenMenu(null);
    };

    const menuItems = (customer) => [
        { label: 'View Details', icon: Eye, action: () => { setViewCustomer(customer); setOpenMenu(null); } },
        { label: 'Edit Customer', icon: Pencil, action: () => { setEditCustomer({ ...customer }); setOpenMenu(null); } },
        { label: 'Delete Customer', icon: Trash2, danger: true, action: () => { setDeleteCustomer(customer); setOpenMenu(null); } },
    ];

    return (
        <div className="content-area" onClick={() => setOpenMenu(null)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Customers</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage and track all your customer accounts</p>
                </div>
                <Btn onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }} icon={Plus}>Add Customer</Btn>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Customers', value: customers.length, icon: Users, color: 'primary' },
                    { label: 'Active', value: totalActive, icon: UserCheck, color: 'success' },
                    { label: 'Past Due', value: totalPastDue, icon: Clock, color: 'warning' },
                    { label: 'Canceled', value: totalCanceled, icon: UserX, color: 'danger' },
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
                {/* Search & Filters */}
                <div style={{ padding: '20px 24px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}
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
                    <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>{filtered.length} of {customers.length} customers</div>
                </div>

                <div style={{ padding: '0 24px 24px 24px' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Customer</th><th>Contact</th><th>Plan</th><th>MRR</th><th>Invoices</th><th>Status</th><th>Joined</th><th style={{ width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((customer, i) => (
                                <tr key={customer.id} style={{ transition: 'background 0.15s' }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                                {getInitials(customer.name)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'white' }}>{customer.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{customer.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{customer.email}</td>
                                    <td>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                            backgroundColor: customer.plan === 'Enterprise' ? 'rgba(99,102,241,0.1)' : customer.plan === 'Pro' ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                                            color: customer.plan === 'Enterprise' ? 'var(--accent-primary)' : customer.plan === 'Pro' ? 'var(--accent-success)' : 'var(--text-muted)'
                                        }}>{customer.plan}</span>
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'white' }}>₹{customer.mrr.toLocaleString()}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{customer.invoices}</td>
                                    <td><span className={`badge ${customer.status === 'Active' ? 'paid' : customer.status === 'Past Due' ? 'pending' : 'failed'}`}>{customer.status}</span></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{customer.joined}</td>
                                    <td>
                                        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                            <button onClick={() => setOpenMenu(openMenu === customer.id ? null : customer.id)}
                                                style={{ color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}>
                                                <MoreVertical size={16} />
                                            </button>
                                            {openMenu === customer.id && (
                                                <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, backgroundColor: '#1a1d2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '5px', minWidth: '170px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                                                    {menuItems(customer).map(item => {
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
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <p>No customers found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── ADD MODAL ── */}
            <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add New Customer" size="md">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input label="Company Name" required placeholder="e.g. Acme Corp" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                        <Input label="Email Address" required type="email" placeholder="billing@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input label="Phone Number" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                        <Input label="Address / City" placeholder="Mumbai, Maharashtra" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Select label="Plan" value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
                            <option>Basic</option><option>Pro</option><option>Enterprise</option>
                        </Select>
                        <Select label="Status" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                            <option>Active</option><option>Past Due</option><option>Canceled</option>
                        </Select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                        <Btn variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Btn>
                        <Btn onClick={handleAdd} disabled={!form.name || !form.email} icon={Plus}>Add Customer</Btn>
                    </div>
                </div>
            </Modal>

            {/* ── VIEW MODAL ── */}
            <Modal isOpen={!!viewCustomer} onClose={() => setViewCustomer(null)} title="Customer Details" size="md">
                {viewCustomer && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: AVATAR_COLORS[customers.findIndex(c => c.id === viewCustomer.id) % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                {getInitials(viewCustomer.name)}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '18px', color: 'white' }}>{viewCustomer.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{viewCustomer.id}</div>
                            </div>
                            <span className={`badge ${viewCustomer.status === 'Active' ? 'paid' : viewCustomer.status === 'Past Due' ? 'pending' : 'failed'}`} style={{ marginLeft: 'auto' }}>{viewCustomer.status}</span>
                        </div>
                        <DetailRow label="Email" value={viewCustomer.email} />
                        <DetailRow label="Phone" value={viewCustomer.phone || '—'} />
                        <DetailRow label="Address" value={viewCustomer.address || '—'} />
                        <DetailRow label="Plan" value={viewCustomer.plan} accent="var(--accent-primary)" />
                        <DetailRow label="Monthly Recurring Revenue" value={`₹${viewCustomer.mrr.toLocaleString()}`} accent="var(--accent-success)" />
                        <DetailRow label="Total Invoices" value={viewCustomer.invoices} />
                        <DetailRow label="Customer Since" value={viewCustomer.joined} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <Btn variant="secondary" onClick={() => setViewCustomer(null)}>Close</Btn>
                            <Btn icon={Pencil} onClick={() => { setEditCustomer({ ...viewCustomer }); setViewCustomer(null); }}>Edit Customer</Btn>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── EDIT MODAL ── */}
            <Modal isOpen={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer" size="md">
                {editCustomer && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input label="Company Name" required value={editCustomer.name} onChange={e => setEditCustomer(p => ({ ...p, name: e.target.value }))} />
                            <Input label="Email Address" required type="email" value={editCustomer.email} onChange={e => setEditCustomer(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input label="Phone Number" value={editCustomer.phone} onChange={e => setEditCustomer(p => ({ ...p, phone: e.target.value }))} />
                            <Input label="Address / City" value={editCustomer.address} onChange={e => setEditCustomer(p => ({ ...p, address: e.target.value }))} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Select label="Plan" value={editCustomer.plan} onChange={e => setEditCustomer(p => ({ ...p, plan: e.target.value }))}>
                                <option>Basic</option><option>Pro</option><option>Enterprise</option>
                            </Select>
                            <Select label="Status" value={editCustomer.status} onChange={e => setEditCustomer(p => ({ ...p, status: e.target.value }))}>
                                <option>Active</option><option>Past Due</option><option>Canceled</option>
                            </Select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                            <Btn variant="secondary" onClick={() => setEditCustomer(null)}>Cancel</Btn>
                            <Btn icon={Pencil} onClick={handleEdit}>Save Changes</Btn>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── DELETE CONFIRM ── */}
            <ConfirmDialog
                isOpen={!!deleteCustomer}
                onClose={() => setDeleteCustomer(null)}
                onConfirm={handleDelete}
                title="Delete Customer"
                message={`Are you sure you want to delete "${deleteCustomer?.name}"? This action cannot be undone and will remove all associated data.`}
                confirmLabel="Delete Customer"
            />
        </div>
    );
}
