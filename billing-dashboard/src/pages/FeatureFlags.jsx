import React, { useState } from 'react';
import { Flag, Globe, Zap, Users, Mail, BarChart2, Shield, CheckCircle } from 'lucide-react';

const FLAGS_INIT = [
    { id: 'pdf_invoices', name: 'PDF Invoice Generation', desc: 'Enable downloadable PDF invoices for all customers', enabled: true, plan: 'starter', icon: Flag, category: 'Billing' },
    { id: 'usage_billing', name: 'Usage-Based Billing', desc: 'Charge customers based on API calls and storage used', enabled: true, plan: 'pro', icon: Zap, category: 'Billing' },
    { id: 'webhook_delivery', name: 'Webhook Delivery System', desc: 'Send real-time events to registered endpoints', enabled: true, plan: 'pro', icon: Globe, category: 'Integrations' },
    { id: 'audit_logs', name: 'Audit Log Trail', desc: 'Full before/after audit logging for all mutations', enabled: true, plan: 'pro', icon: Shield, category: 'Security' },
    { id: 'billing_simulation', name: 'Billing Simulation Mode', desc: 'Run billing in dry-run mode without charging', enabled: false, plan: 'enterprise', icon: BarChart2, category: 'Advanced' },
    { id: 'multi_currency', name: 'Multi-Currency Support', desc: 'Bill customers in USD, EUR, GBP and more', enabled: false, plan: 'enterprise', icon: Globe, category: 'Billing' },
    { id: 'advanced_reports', name: 'Advanced Analytics', desc: 'Retention cohorts, LTV, and predictive churn', enabled: true, plan: 'enterprise', icon: BarChart2, category: 'Analytics' },
    { id: 'email_templates', name: 'Custom Email Templates', desc: 'Brand your invoice and notification emails', enabled: true, plan: 'pro', icon: Mail, category: 'Notifications' },
    { id: 'team_members', name: 'Team Members & RBAC', desc: 'Invite teammates and assign roles', enabled: true, plan: 'starter', icon: Users, category: 'Team' },
    { id: '2fa_enforcement', name: '2FA Enforcement', desc: 'Require two-factor authentication for all users', enabled: false, plan: 'enterprise', icon: Shield, category: 'Security' },
];

const PLAN_COLOR = { starter: '#10b981', pro: '#6366f1', enterprise: '#a855f7' };
const CATEGORIES = ['All', ...new Set(FLAGS_INIT.map(f => f.category))];
const PLAN_ORDER = ['starter', 'pro', 'enterprise'];

export default function FeatureFlags() {
    const [flags, setFlags] = useState(FLAGS_INIT);
    const [cat, setCat] = useState('All');
    const [toast, setToast] = useState(null);
    const currentPlan = 'pro';

    const canEnable = (plan) => PLAN_ORDER.indexOf(plan) <= PLAN_ORDER.indexOf(currentPlan);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const toggle = (id) => {
        setFlags(prev => prev.map(f => {
            if (f.id !== id) return f;
            if (!canEnable(f.plan) && !f.enabled) {
                showToast(`Upgrade to ${f.plan.charAt(0).toUpperCase() + f.plan.slice(1)} to enable this`, 'warning');
                return f;
            }
            const next = { ...f, enabled: !f.enabled };
            showToast(`${next.name} ${next.enabled ? 'enabled' : 'disabled'}`, next.enabled ? 'success' : 'info');
            return next;
        }));
    };

    const filtered = flags.filter(f => cat === 'All' || f.category === cat);
    const enabledCount = flags.filter(f => f.enabled).length;

    return (
        <div className="content-area">
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">Feature Flags</div>
                    <div className="page-subtitle">{enabledCount} of {flags.length} features enabled for your workspace</div>
                </div>
                <span style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', fontSize: 13, padding: '6px 14px', borderRadius: 8, fontWeight: 600 }}>
                    Plan: <span style={{ textTransform: 'capitalize' }}>{currentPlan}</span>
                </span>
            </div>

            {/* Summary bar */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '14px 18px', background: 'var(--color-bg-secondary)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                {[
                    ['Enabled', flags.filter(f => f.enabled).length, 'var(--color-success)'],
                    ['Disabled', flags.filter(f => !f.enabled).length, 'var(--color-danger)'],
                    ['Plan-locked', flags.filter(f => !canEnable(f.plan) && !f.enabled).length, 'var(--color-warning)'],
                ].map(([label, count, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            <strong style={{ color: 'var(--color-text-primary)' }}>{count}</strong> {label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => (
                    <button key={c} className={`btn btn-sm ${cat === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCat(c)}>{c}</button>
                ))}
            </div>

            {/* Feature Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {filtered.map(f => {
                    const Icon = f.icon;
                    const locked = !canEnable(f.plan) && !f.enabled;
                    return (
                        <div key={f.id} className="card" style={{ opacity: locked ? 0.72 : 1, borderColor: f.enabled ? 'var(--color-border-hover)' : 'var(--color-border)' }}>
                            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.enabled ? 'var(--color-accent-subtle)' : 'var(--color-bg-tertiary)' }}>
                                    <Icon size={18} style={{ color: f.enabled ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>{f.name}</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: PLAN_COLOR[f.plan], background: `${PLAN_COLOR[f.plan]}20`, padding: '1px 7px', borderRadius: 99, textTransform: 'capitalize' }}>{f.plan}</span>
                                        {locked && <span style={{ fontSize: 10, color: 'var(--color-warning)' }}>🔒 Locked</span>}
                                    </div>
                                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                                        Category: <span style={{ color: 'var(--color-text-secondary)' }}>{f.category}</span>
                                    </div>
                                </div>
                                <label className="toggle-switch" style={{ flexShrink: 0, marginTop: 4, cursor: locked ? 'not-allowed' : 'pointer' }}>
                                    <input type="checkbox" checked={f.enabled} onChange={() => toggle(f.id)} />
                                    <span className="toggle-slider" />
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Toast */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast ${toast.type}`}>
                        {toast.type === 'success' && <CheckCircle size={14} />}
                        {toast.msg}
                    </div>
                </div>
            )}
        </div>
    );
}
