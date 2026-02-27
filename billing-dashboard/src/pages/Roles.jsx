import React, { useState } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

const RESOURCES = ['Customers', 'Plans', 'Subscriptions', 'Invoices', 'Payments', 'Usage', 'Reports', 'Webhooks', 'Users', 'Settings'];
const ACTIONS = ['Read', 'Create', 'Update', 'Delete', 'Export', 'Manage'];

const INITIAL_ROLES = [
    { id: 1, name: 'Owner', color: '#a855f7', system: true, desc: 'Full access to everything', perms: Object.fromEntries(RESOURCES.map(r => [r, ACTIONS])) },
    { id: 2, name: 'Admin', color: '#6366f1', system: true, desc: 'All access except manage', perms: Object.fromEntries(RESOURCES.map(r => [r, ACTIONS.filter(a => a !== 'Manage')])) },
    { id: 3, name: 'Accountant', color: '#10b981', system: false, desc: 'Invoices, payments and reports', perms: { Invoices: ['Read', 'Create', 'Update', 'Export'], Payments: ['Read', 'Create', 'Export'], Reports: ['Read', 'Export'], Customers: ['Read'] } },
    { id: 4, name: 'Viewer', color: '#f59e0b', system: false, desc: 'Read-only across all modules', perms: Object.fromEntries(RESOURCES.map(r => [r, ['Read']])) },
];

export default function Roles() {
    const [roles, setRoles] = useState(INITIAL_ROLES);
    const [selected, setSelected] = useState(INITIAL_ROLES[0]);
    const [modal, setModal] = useState(null); // 'add' | 'edit' | 'delete'
    const [form, setForm] = useState({ name: '', desc: '', color: '#6366f1' });

    const hasPerm = (role, resource, action) => (role.perms[resource] || []).includes(action);

    const togglePerm = (resource, action) => {
        setRoles(prev => prev.map(r => {
            if (r.id !== selected.id) return r;
            const cur = r.perms[resource] || [];
            const next = cur.includes(action) ? cur.filter(a => a !== action) : [...cur, action];
            const updated = { ...r, perms: { ...r.perms, [resource]: next } };
            setSelected(updated);
            return updated;
        }));
    };

    const saveNew = () => {
        const nr = { id: Date.now(), name: form.name, color: form.color, system: false, desc: form.desc, perms: {} };
        setRoles(p => [...p, nr]);
        setModal(null); setForm({ name: '', desc: '', color: '#6366f1' });
    };

    const deleteRole = (id) => { setRoles(p => p.filter(r => r.id !== id)); if (selected.id === id) setSelected(roles[0]); setModal(null); };

    return (
        <div className="content-area">
            <div className="page-header">
                <div>
                    <div className="page-title">Roles & Permissions</div>
                    <div className="page-subtitle">Configure role-based access control for your team</div>
                </div>
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setModal('add')}>
                    <Plus size={15} /> New Role
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
                {/* Role List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {roles.map(r => (
                        <div key={r.id} onClick={() => setSelected(r)} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${selected.id === r.id ? r.color : 'var(--color-border)'}`, background: selected.id === r.id ? `${r.color}14` : 'var(--color-bg-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>{r.name}</span>
                                {r.system && <span className="badge neutral" style={{ fontSize: 9 }}>System</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginLeft: 18 }}>{r.desc}</div>
                        </div>
                    ))}
                </div>

                {/* Permission Matrix */}
                <div className="card">
                    <div className="card-header" style={{ gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: selected.color }} />
                            <span>{selected.name} — Permission Matrix</span>
                        </div>
                        {!selected.system && (
                            <button className="btn btn-sm btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => setModal('delete')}>
                                <Trash2 size={12} /> Delete Role
                            </button>
                        )}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 140 }}>Resource</th>
                                    {ACTIONS.map(a => <th key={a} style={{ textAlign: 'center' }}>{a}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {RESOURCES.map(res => (
                                    <tr key={res}>
                                        <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{res}</td>
                                        {ACTIONS.map(act => (
                                            <td key={act} style={{ textAlign: 'center' }}>
                                                {selected.system ? (
                                                    <span className={`permission-check ${hasPerm(selected, res, act) ? 'perm-yes' : 'perm-no'}`}>
                                                        {hasPerm(selected, res, act) ? <Check size={15} /> : <X size={13} />}
                                                    </span>
                                                ) : (
                                                    <label className="toggle-switch" style={{ margin: '0 auto' }}>
                                                        <input type="checkbox" checked={hasPerm(selected, res, act)} onChange={() => togglePerm(res, act)} />
                                                        <span className="toggle-slider" />
                                                    </label>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Role Modal */}
            {modal === 'add' && (
                <div className="modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Create New Role</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Role Name</label><input className="form-input" placeholder="e.g. Support Agent" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Description</label><input className="form-input" placeholder="Brief description..." value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Color</label><input type="color" className="form-input" style={{ height: 40, cursor: 'pointer', padding: 4 }} value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveNew} disabled={!form.name}><Plus size={14} /> Create Role</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {modal === 'delete' && (
                <div className="modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
                            <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--color-danger-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Trash2 size={22} color="var(--color-danger)" /></div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Delete "{selected.name}"?</h3>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 22 }}>Users assigned this role will lose access. This cannot be undone.</p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn btn-secondary w-full" onClick={() => setModal(null)}>Cancel</button>
                                <button className="btn btn-danger w-full" onClick={() => deleteRole(selected.id)}>Delete Role</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
