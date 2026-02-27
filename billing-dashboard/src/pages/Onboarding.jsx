import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, ArrowLeft, Package, Users, CreditCard, FileText, X, Zap } from 'lucide-react';

const STEPS = [
    { id: 0, label: 'Create Plan', icon: Package, desc: 'Set up your first pricing plan' },
    { id: 1, label: 'Add Customer', icon: Users, desc: 'Add your first customer' },
    { id: 2, label: 'New Subscription', icon: CreditCard, desc: 'Link customer to a plan' },
    { id: 3, label: 'Preview Invoice', icon: FileText, desc: 'Review the generated invoice' },
];

const Field = ({ label, children }) => (
    <div className="form-group">
        <label className="form-label">{label}</label>
        {children}
    </div>
);

export default function Onboarding() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [done, setDone] = useState(false);

    const [plan, setPlan] = useState({ name: 'Starter', price: '999', cycle: 'monthly', features: 'Up to 5 users\nAPI access\nEmail support' });
    const [cust, setCust] = useState({ name: '', email: '', company: '' });
    const [sub, setSub] = useState({ plan: 'Starter', seats: '1', cycle: 'monthly' });

    const next = () => { if (step < 3) setStep(s => s + 1); else setDone(true); };
    const back = () => setStep(s => s - 1);

    const invoice = {
        id: 'INV-1001', customer: cust.name || 'Test Customer',
        company: cust.company || 'Acme Corp', plan: sub.plan,
        seats: sub.seats, amount: (parseInt(plan.price) || 999) * (parseInt(sub.seats) || 1),
        date: new Date().toLocaleDateString('en-IN'), due: new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-IN'),
    };

    if (done) return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ textAlign: 'center', maxWidth: 420, padding: 40 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-success-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle size={40} color="var(--color-success)" />
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 10 }}>You're all set! 🎉</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
                    Your BillFlow workspace is ready. Your first plan, customer, subscription, and invoice have been created.
                </p>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/')} style={{ width: '100%', justifyContent: 'center' }}>
                    <Zap size={18} /> Go to Dashboard
                </button>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 640, background: 'var(--color-bg-secondary)', borderRadius: 20, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '28px 32px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>Quick Setup Wizard</h1>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 3 }}>Step {step + 1} of 4 — {STEPS[step].desc}</p>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <X size={14} /> Skip
                        </button>
                    </div>
                    {/* Step indicators */}
                    <div style={{ display: 'flex', gap: 0 }}>
                        {STEPS.map((s, i) => {
                            const Icon = s.icon;
                            const state = i < step ? 'done' : i === step ? 'active' : 'pending';
                            return (
                                <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                    {i < 3 && <div style={{ position: 'absolute', top: 15, left: '50%', width: '100%', height: 2, background: i < step ? 'var(--color-success)' : 'var(--color-border)', transition: 'background 0.3s' }} />}
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, fontSize: 12, fontWeight: 700, transition: 'all 0.3s', background: state === 'done' ? 'var(--color-success)' : state === 'active' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)', color: state === 'pending' ? 'var(--color-text-muted)' : 'white', border: state === 'active' ? '2px solid var(--color-accent)' : '2px solid transparent', boxShadow: state === 'active' ? '0 0 0 4px var(--color-accent-subtle)' : 'none' }}>
                                        {state === 'done' ? '✓' : i + 1}
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 600, marginTop: 6, color: state === 'active' ? 'var(--color-accent)' : state === 'done' ? 'var(--color-success)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{s.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '28px 32px' }}>
                    {step === 0 && (
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Create your first plan</h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Define pricing, billing cycle, and included features.</p>
                            <div className="form-grid-2">
                                <Field label="Plan Name"><input className="form-input" value={plan.name} onChange={e => setPlan(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Starter" /></Field>
                                <Field label="Price (₹/month)"><input className="form-input" type="number" value={plan.price} onChange={e => setPlan(p => ({ ...p, price: e.target.value }))} placeholder="999" /></Field>
                            </div>
                            <Field label="Billing Cycle">
                                <select className="form-select" value={plan.cycle} onChange={e => setPlan(p => ({ ...p, cycle: e.target.value }))}>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                    <option value="quarterly">Quarterly</option>
                                </select>
                            </Field>
                            <Field label="Features (one per line)">
                                <textarea className="form-textarea" value={plan.features} onChange={e => setPlan(p => ({ ...p, features: e.target.value }))} rows={4} />
                            </Field>
                        </div>
                    )}
                    {step === 1 && (
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Add your first customer</h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Enter the basic details of your first billing customer.</p>
                            <Field label="Full Name"><input className="form-input" value={cust.name} onChange={e => setCust(p => ({ ...p, name: e.target.value }))} placeholder="Ashwin Kumar" /></Field>
                            <Field label="Email"><input className="form-input" type="email" value={cust.email} onChange={e => setCust(p => ({ ...p, email: e.target.value }))} placeholder="ashwin@company.com" /></Field>
                            <Field label="Company Name"><input className="form-input" value={cust.company} onChange={e => setCust(p => ({ ...p, company: e.target.value }))} placeholder="Acme Corp" /></Field>
                        </div>
                    )}
                    {step === 2 && (
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Create subscription</h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Connect <strong style={{ color: 'var(--color-text-primary)' }}>{cust.name || 'your customer'}</strong> to the {plan.name} plan.</p>
                            <Field label="Plan">
                                <select className="form-select" value={sub.plan} onChange={e => setSub(p => ({ ...p, plan: e.target.value }))}>
                                    <option value={plan.name}>{plan.name} — ₹{plan.price}/{plan.cycle}</option>
                                </select>
                            </Field>
                            <div className="form-grid-2">
                                <Field label="Number of Seats"><input className="form-input" type="number" min={1} value={sub.seats} onChange={e => setSub(p => ({ ...p, seats: e.target.value }))} /></Field>
                                <Field label="Billing Cycle">
                                    <select className="form-select" value={sub.cycle} onChange={e => setSub(p => ({ ...p, cycle: e.target.value }))}>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </Field>
                            </div>
                            <div style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent)', borderRadius: 10, padding: 14, marginTop: 8 }}>
                                <div style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 700, marginBottom: 4 }}>ESTIMATED CHARGE</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>₹{((parseInt(plan.price) || 0) * (parseInt(sub.seats) || 1)).toLocaleString('en-IN')}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>/{sub.cycle}</span></div>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Invoice Preview</h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>This is what your first auto-generated invoice will look like.</p>
                            <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 12, padding: 20, border: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <div><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-accent)' }}>BillFlow</div><div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Invoice #{invoice.id}</div></div>
                                    <span className="badge active">Draft</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
                                    {[['Bill To', `${invoice.company}\n${invoice.customer}`], ['Issue Date', invoice.date], ['Due Date', invoice.due], ['Status', 'Unpaid']].map(([k, v]) => (
                                        <div key={k}><div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div><div style={{ color: 'var(--color-text-primary)', fontWeight: 600, whiteSpace: 'pre-line' }}>{v}</div></div>
                                    ))}
                                </div>
                                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>{invoice.plan} × {invoice.seats} seat(s)</span>
                                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>₹{invoice.amount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>GST (18%)</span>
                                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>₹{Math.round(invoice.amount * 0.18).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--color-border)', fontSize: 15, fontWeight: 800 }}>
                                        <span style={{ color: 'var(--color-text-primary)' }}>Total</span>
                                        <span style={{ color: 'var(--color-accent)' }}>₹{Math.round(invoice.amount * 1.18).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'space-between' }}>
                        <button className="btn btn-secondary" onClick={back} disabled={step === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ArrowLeft size={15} /> Back
                        </button>
                        <button className="btn btn-primary" onClick={next} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {step === 3 ? 'Finish Setup' : 'Continue'} <ArrowRight size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
