import React, { useState } from 'react';
import { Check, Plus, Zap, Shield, Star, Users, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import Modal, { ConfirmDialog, Btn, Input, Select } from '../components/Modal';

const INITIAL_PLANS = [
    {
        id: 'plan-basic', name: 'Basic', monthlyPrice: 99, annualPrice: 79,
        description: 'Perfect for small teams and individuals getting started with billing.',
        icon: Zap, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)', subscribers: 127,
        features: ['Up to 5 users', 'Basic reporting & analytics', '10GB storage', 'Email support', 'Up to 100 invoices/mo', 'Stripe integration'],
        isPopular: false,
    },
    {
        id: 'plan-pro', name: 'Pro', monthlyPrice: 499, annualPrice: 399,
        description: 'Ideal for growing businesses that need advanced tools and integrations.',
        icon: Star, color: '#10b981', bgColor: 'rgba(16,185,129,0.1)', subscribers: 384, isPopular: true,
        features: ['Up to 25 users', 'Advanced analytics & reports', '100GB storage', 'Priority 24/7 support', 'Unlimited invoices', 'Custom integrations', 'Webhook events', 'Multi-currency support'],
    },
    {
        id: 'plan-enterprise', name: 'Enterprise', monthlyPrice: 1500, annualPrice: 1200,
        description: 'For large-scale organizations requiring maximum control and security.',
        icon: Shield, color: '#6366f1', bgColor: 'rgba(99,102,241,0.1)', subscribers: 56, isPopular: false,
        features: ['Unlimited users', 'Custom reporting & dashboards', 'Unlimited storage', 'Dedicated success manager', 'SLA guarantees (99.99%)', 'SSO authentication', 'Advanced audit logs', 'Custom contract & pricing', 'On-premise deployment option'],
    },
];

const ICON_MAP = { Zap, Star, Shield };

const EMPTY_FORM = { name: '', monthlyPrice: '', annualPrice: '', description: '', features: '', isPopular: false };

export default function Plans() {
    const [plans, setPlans] = useState(INITIAL_PLANS);
    const [isAnnual, setIsAnnual] = useState(false);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [editPlan, setEditPlan] = useState(null);
    const [deletePlan, setDeletePlan] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editFeatureInput, setEditFeatureInput] = useState('');

    const totalRevenue = plans.reduce((acc, p) => acc + p.subscribers * (isAnnual ? p.annualPrice : p.monthlyPrice), 0);

    const handleAdd = () => {
        if (!form.name || !form.monthlyPrice) return;
        const featuresList = form.features.split('\n').map(f => f.trim()).filter(Boolean);
        const newPlan = {
            id: `plan-${form.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: form.name,
            monthlyPrice: parseFloat(form.monthlyPrice) || 0,
            annualPrice: parseFloat(form.annualPrice) || Math.round(parseFloat(form.monthlyPrice) * 0.8) || 0,
            description: form.description,
            features: featuresList,
            isPopular: form.isPopular,
            icon: Star, color: '#6366f1', bgColor: 'rgba(99,102,241,0.1)', subscribers: 0,
        };
        setPlans(prev => [...prev, newPlan]);
        setForm(EMPTY_FORM);
        setAddOpen(false);
    };

    const handleEdit = () => {
        const featuresList = editFeatureInput.split('\n').map(f => f.trim()).filter(Boolean);
        setPlans(prev => prev.map(p => p.id === editPlan.id ? { ...editPlan, features: featuresList } : p));
        setEditPlan(null);
    };

    const handleDelete = () => {
        setPlans(prev => prev.filter(p => p.id !== deletePlan.id));
        setDeletePlan(null);
    };

    return (
        <div className="content-area">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Plans & Pricing</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Configure and manage your subscription tiers</p>
                </div>
                <Btn onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }} icon={Plus}>Create New Plan</Btn>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px', marginTop: '24px' }}>
                <div className="stat-card" style={{ padding: '20px' }}>
                    <div className="stat-title">Total Subscribers</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginTop: '4px' }}>{plans.reduce((a, p) => a + p.subscribers, 0).toLocaleString()}</div>
                    <div style={{ color: 'var(--accent-success)', fontSize: '13px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={13} /> Across all plans</div>
                </div>
                <div className="stat-card" style={{ padding: '20px' }}>
                    <div className="stat-title">Est. Monthly Revenue</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginTop: '4px' }}>₹{totalRevenue.toLocaleString()}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>{isAnnual ? 'Billed annually' : 'Billed monthly'}</div>
                </div>
                <div className="stat-card" style={{ padding: '20px' }}>
                    <div className="stat-title">Most Popular Plan</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-success)', marginTop: '4px' }}>
                        {plans.sort((a, b) => b.subscribers - a.subscribers)[0]?.name || 'Pro'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                        {Math.round((plans.sort((a, b) => b.subscribers - a.subscribers)[0]?.subscribers / Math.max(1, plans.reduce((a, p) => a + p.subscribers, 0))) * 100)}% of total subscribers
                    </div>
                </div>
            </div>

            {/* Toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <span style={{ color: isAnnual ? 'var(--text-muted)' : 'white', fontWeight: 500 }}>Monthly</span>
                <button onClick={() => setIsAnnual(!isAnnual)} style={{ color: 'var(--accent-primary)', transition: 'all 0.2s', cursor: 'pointer' }}>
                    {isAnnual ? <ToggleRight size={40} fill="rgba(99,102,241,0.2)" /> : <ToggleLeft size={40} />}
                </button>
                <span style={{ color: isAnnual ? 'white' : 'var(--text-muted)', fontWeight: 500 }}>
                    Annual
                    <span style={{ marginLeft: '8px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--accent-success)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>Save ~20%</span>
                </span>
            </div>

            {/* Plan Cards */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                {plans.map((plan) => {
                    const Icon = plan.icon || Star;
                    const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
                    return (
                        <div key={plan.id} style={{
                            flex: '1 1 300px', maxWidth: '360px',
                            backgroundColor: 'var(--bg-surface)',
                            border: `1px solid ${plan.isPopular ? 'var(--accent-success)' : 'var(--border-color)'}`,
                            borderRadius: '20px', padding: '32px', position: 'relative',
                            display: 'flex', flexDirection: 'column',
                            boxShadow: plan.isPopular ? '0 0 40px rgba(16,185,129,0.12)' : 'none',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = plan.isPopular ? '0 0 50px rgba(16,185,129,0.2)' : '0 12px 40px rgba(0,0,0,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = plan.isPopular ? '0 0 40px rgba(16,185,129,0.12)' : 'none'; }}
                        >
                            {plan.isPopular && (
                                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--accent-success)', color: 'white', fontSize: '12px', fontWeight: 700, padding: '4px 16px', borderRadius: '9999px', letterSpacing: '0.05em' }}>
                                    MOST POPULAR
                                </div>
                            )}

                            {/* Action buttons */}
                            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '6px' }}>
                                <button onClick={() => { setEditPlan({ ...plan }); setEditFeatureInput(plan.features.join('\n')); }} style={{ padding: '6px', borderRadius: '7px', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'white'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                    <Pencil size={15} />
                                </button>
                                <button onClick={() => setDeletePlan(plan)} style={{ padding: '6px', borderRadius: '7px', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'var(--accent-danger)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: plan.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={22} color={plan.color} />
                                </div>
                                <div>
                                    <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 700 }}>{plan.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                        <Users size={11} /> {plan.subscribers} subscribers
                                    </div>
                                </div>
                            </div>

                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>{plan.description}</p>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>₹</span>
                                    <span style={{ fontSize: '42px', fontWeight: 800, color: 'white', letterSpacing: '-2px' }}>{price.toLocaleString()}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{isAnnual ? '/mo billed ann.' : '/month'}</span>
                                </div>
                                {isAnnual && (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', textDecoration: 'line-through', marginTop: '2px' }}>₹{plan.monthlyPrice}/month if billed monthly</div>
                                )}
                            </div>

                            <button onClick={() => { setEditPlan({ ...plan }); setEditFeatureInput(plan.features.join('\n')); }} style={{
                                width: '100%', padding: '13px', borderRadius: '10px', fontWeight: 700, marginBottom: '28px', fontSize: '14px', cursor: 'pointer',
                                backgroundColor: plan.isPopular ? 'var(--accent-success)' : plan.name === 'Enterprise' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                                color: 'white', border: plan.isPopular || plan.name === 'Enterprise' ? 'none' : '1px solid var(--border-color)',
                                boxShadow: plan.isPopular ? '0 0 20px rgba(16,185,129,0.3)' : plan.name === 'Enterprise' ? '0 0 20px rgba(99,102,241,0.3)' : 'none',
                                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif'
                            }}>
                                {plan.name === 'Enterprise' ? 'Contact Sales' : 'Manage Plan'}
                            </button>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                {plan.features.map(feature => (
                                    <div key={feature} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: plan.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Check size={11} color={plan.color} strokeWidth={3} />
                                        </div>
                                        <span style={{ color: 'var(--text-main)' }}>{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── ADD PLAN MODAL ── */}
            <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Create New Plan" size="md">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <Input label="Plan Name" required placeholder="e.g. Starter" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    <Input label="Description" placeholder="Short description of this plan..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input label="Monthly Price (₹)" required type="number" placeholder="499" value={form.monthlyPrice} onChange={e => setForm(p => ({ ...p, monthlyPrice: e.target.value }))} />
                        <Input label="Annual Price (₹)" type="number" placeholder="399" value={form.annualPrice} onChange={e => setForm(p => ({ ...p, annualPrice: e.target.value }))} hint="Leave blank to auto-calculate (80% of monthly)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Features <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', fontSize: '11px' }}>(one per line)</span></label>
                        <textarea rows={6} placeholder={"Up to 5 users\nEmail support\n100GB storage"} value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))}
                            style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'white', outline: 'none', fontSize: '14px', fontFamily: 'Inter, sans-serif', resize: 'vertical' }}
                            onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => setForm(p => ({ ...p, isPopular: !p.isPopular }))} style={{ cursor: 'pointer', color: form.isPopular ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                            {form.isPopular ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                        <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 500 }}>Mark as Most Popular</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                        <Btn variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Btn>
                        <Btn onClick={handleAdd} disabled={!form.name || !form.monthlyPrice} icon={Plus}>Create Plan</Btn>
                    </div>
                </div>
            </Modal>

            {/* ── EDIT PLAN MODAL ── */}
            <Modal isOpen={!!editPlan} onClose={() => setEditPlan(null)} title={`Edit Plan — ${editPlan?.name}`} size="md">
                {editPlan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <Input label="Plan Name" value={editPlan.name} onChange={e => setEditPlan(p => ({ ...p, name: e.target.value }))} />
                        <Input label="Description" value={editPlan.description} onChange={e => setEditPlan(p => ({ ...p, description: e.target.value }))} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input label="Monthly Price (₹)" type="number" value={editPlan.monthlyPrice} onChange={e => setEditPlan(p => ({ ...p, monthlyPrice: parseFloat(e.target.value) || 0 }))} />
                            <Input label="Annual Price (₹)" type="number" value={editPlan.annualPrice} onChange={e => setEditPlan(p => ({ ...p, annualPrice: parseFloat(e.target.value) || 0 }))} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Features (one per line)</label>
                            <textarea rows={7} value={editFeatureInput} onChange={e => setEditFeatureInput(e.target.value)}
                                style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'white', outline: 'none', fontSize: '14px', fontFamily: 'Inter, sans-serif', resize: 'vertical' }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button onClick={() => setEditPlan(p => ({ ...p, isPopular: !p.isPopular }))} style={{ cursor: 'pointer', color: editPlan.isPopular ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                                {editPlan.isPopular ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                            </button>
                            <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 500 }}>Most Popular</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                            <Btn variant="secondary" onClick={() => setEditPlan(null)}>Cancel</Btn>
                            <Btn icon={Pencil} onClick={handleEdit}>Save Changes</Btn>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── DELETE CONFIRM ── */}
            <ConfirmDialog
                isOpen={!!deletePlan}
                onClose={() => setDeletePlan(null)}
                onConfirm={handleDelete}
                title="Delete Plan"
                message={`Are you sure you want to delete the "${deletePlan?.name}" plan? This will not cancel existing subscriptions but will prevent new signups.`}
                confirmLabel="Delete Plan"
            />
        </div>
    );
}
