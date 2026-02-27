import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Activity, ArrowRight, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STEPS = ['Account', 'Company', 'Done'];

export default function SignUp() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);

    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', password: '',
        name: '', slug: '', phone: '', website: '', currency: 'INR', timezone: 'Asia/Kolkata',
    });

    const set = (k) => (e) => {
        let val = e.target.value;
        if (k === 'slug') val = val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        if (k === 'name' && !form.slug) {
            // auto-generate slug from company name
            setForm(p => ({ ...p, name: val, slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
            return;
        }
        setForm(p => ({ ...p, [k]: val }));
    };

    const nextStep = (e) => {
        e.preventDefault();
        setError('');
        if (step === 0) {
            if (!form.first_name || !form.last_name) return setError('First and last name are required.');
            if (!form.email) return setError('Email is required.');
            if (!form.password || form.password.length < 8) return setError('Password must be at least 8 characters.');
            const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
            if (!pwRegex.test(form.password)) return setError('Password must include uppercase, lowercase, a number and a special character (@$!%*?&).');
        }
        if (step === 1) {
            if (!form.name) return setError('Company name is required.');
            if (!form.slug || form.slug.length < 2) return setError('Workspace URL is required (min 2 chars).');
        }
        setStep(s => s + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register({
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                password: form.password,
                name: form.name,
                slug: form.slug,
                phone: form.phone || undefined,
                website: form.website || undefined,
                currency: form.currency,
                timezone: form.timezone,
            });
            setStep(2); // Done
            setTimeout(() => navigate('/'), 1800);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', backgroundColor: '#0a0d1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Inter, sans-serif',
            backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 60%)',
        }}>
            <div style={{
                width: '100%', maxWidth: '460px', margin: '24px',
                backgroundColor: '#111827', borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                overflow: 'hidden',
            }}>
                <div style={{ height: '3px', background: 'linear-gradient(90deg, #6366f1, #a855f7, #10b981)' }} />

                <div style={{ padding: '40px 36px 36px' }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Activity size={20} color="white" />
                        </div>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
                            Bill<span style={{ color: '#6366f1' }}>Flow</span>
                        </span>
                    </div>

                    {/* Step Progress */}
                    {step < 2 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
                            {STEPS.slice(0, 2).map((s, i) => (
                                <React.Fragment key={s}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '50%', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700,
                                            backgroundColor: i <= step ? '#6366f1' : 'rgba(255,255,255,0.06)',
                                            color: i <= step ? 'white' : '#475569',
                                            transition: 'all 0.3s',
                                        }}>{i + 1}</div>
                                        <span style={{ fontSize: '13px', fontWeight: i === step ? 600 : 400, color: i === step ? 'white' : '#475569' }}>{s}</span>
                                    </div>
                                    {i < 1 && <div style={{ flex: 1, height: '1px', backgroundColor: i < step ? '#6366f1' : 'rgba(255,255,255,0.08)', transition: 'all 0.3s' }} />}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Success State */}
                    {step === 2 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <CheckCircle size={36} color="#10b981" />
                            </div>
                            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>Account Created!</h2>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>Redirecting you to the dashboard…</p>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '0 0 4px' }}>
                                {step === 0 ? 'Create your account' : 'Set up your workspace'}
                            </h1>
                            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
                                {step === 0 ? 'Start your 14-day free trial. No credit card required.' : 'Your Billing.app workspace URL and company details.'}
                            </p>

                            {error && (
                                <div style={{
                                    backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                                    color: '#f87171', borderRadius: '10px', padding: '12px 16px', fontSize: '13px',
                                    marginBottom: '20px', lineHeight: 1.5
                                }}>{error}</div>
                            )}

                            {/* ── STEP 0 — Personal Info ── */}
                            {step === 0 && (
                                <form onSubmit={nextStep} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <AuthField label="First Name">
                                            <input type="text" placeholder="Ashwin" value={form.first_name} onChange={set('first_name')} autoComplete="given-name" />
                                        </AuthField>
                                        <AuthField label="Last Name">
                                            <input type="text" placeholder="Kumar" value={form.last_name} onChange={set('last_name')} autoComplete="family-name" />
                                        </AuthField>
                                    </div>
                                    <AuthField label="Work Email">
                                        <input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} autoComplete="email" />
                                    </AuthField>
                                    <AuthField label="Password">
                                        <div style={{ position: 'relative' }}>
                                            <input type={showPass ? 'text' : 'password'} placeholder="Min 8 chars, upper, lower, number, symbol" value={form.password} onChange={set('password')} autoComplete="new-password" style={{ paddingRight: '44px' }} />
                                            <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={-1}
                                                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', cursor: 'pointer' }}>
                                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {form.password && (
                                            <PasswordStrength password={form.password} />
                                        )}
                                    </AuthField>
                                    <SubmitBtn loading={false}>Continue <ArrowRight size={15} /></SubmitBtn>
                                </form>
                            )}

                            {/* ── STEP 1 — Company Info ── */}
                            {step === 1 && (
                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <AuthField label="Company / Organisation Name">
                                        <input type="text" placeholder="Acme Corp" value={form.name} onChange={set('name')} />
                                    </AuthField>
                                    <AuthField label="Workspace URL (slug)">
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" placeholder="acme-corp" value={form.slug} onChange={set('slug')}
                                                style={{ paddingLeft: '14px' }} />
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                                            billflow.app/<span style={{ color: '#6366f1' }}>{form.slug || 'your-workspace'}</span>
                                        </div>
                                    </AuthField>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <AuthField label="Currency">
                                            <select value={form.currency} onChange={set('currency')}
                                                style={{ padding: '11px 14px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'white', outline: 'none', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                                <option value="INR">₹ INR</option>
                                                <option value="USD">$ USD</option>
                                                <option value="EUR">€ EUR</option>
                                                <option value="GBP">£ GBP</option>
                                            </select>
                                        </AuthField>
                                        <AuthField label="Timezone">
                                            <select value={form.timezone} onChange={set('timezone')}
                                                style={{ padding: '11px 14px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'white', outline: 'none', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                                <option value="Asia/Kolkata">IST (+5:30)</option>
                                                <option value="America/New_York">EST (-5:00)</option>
                                                <option value="Europe/London">GMT (0:00)</option>
                                                <option value="America/Los_Angeles">PST (-8:00)</option>
                                            </select>
                                        </AuthField>
                                    </div>
                                    <AuthField label="Phone (optional)">
                                        <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
                                    </AuthField>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                        <button type="button" onClick={() => { setStep(0); setError(''); }} style={{
                                            flex: 1, padding: '13px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                            backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Inter, sans-serif'
                                        }}>Back</button>
                                        <SubmitBtn loading={loading} style={{ flex: 2 }}>
                                            {loading ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <>Create Workspace <UserPlus size={15} /></>}
                                        </SubmitBtn>
                                    </div>
                                </form>
                            )}

                            <div style={{ marginTop: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                                Already have an account?{' '}
                                <Link to="/signin" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                input { width: 100%; padding: 11px 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.08);
                    background: rgba(255,255,255,0.04); color: white; outline: none; font-size: 14px;
                    font-family: Inter, sans-serif; transition: border-color 0.2s; box-sizing: border-box; }
                input::placeholder { color: #475569; }
                input:focus { border-color: #6366f1; background: rgba(99,102,241,0.06); }
            `}</style>
        </div>
    );
}

function AuthField({ label, children, style }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
            <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>
            {children}
        </div>
    );
}

function SubmitBtn({ children, loading, style }) {
    return (
        <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: 'white', border: 'none', fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 0 24px rgba(99,102,241,0.4)', transition: 'all 0.2s', ...style
        }}>{children}</button>
    );
}

function PasswordStrength({ password }) {
    const checks = [
        { label: 'Uppercase', ok: /[A-Z]/.test(password) },
        { label: 'Lowercase', ok: /[a-z]/.test(password) },
        { label: 'Number', ok: /\d/.test(password) },
        { label: 'Symbol', ok: /[@$!%*?&]/.test(password) },
        { label: '8+ chars', ok: password.length >= 8 },
    ];
    const score = checks.filter(c => c.ok).length;
    const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#6366f1', '#10b981'];
    const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return (
        <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: i < score ? colors[score - 1] : 'rgba(255,255,255,0.08)', transition: 'all 0.3s' }} />
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {checks.map(c => (
                        <span key={c.label} style={{ fontSize: '11px', color: c.ok ? '#10b981' : '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {c.ok ? '✓' : '·'} {c.label}
                        </span>
                    ))}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: colors[score - 1] || '#475569' }}>{score > 0 ? labels[score - 1] : ''}</span>
            </div>
        </div>
    );
}
