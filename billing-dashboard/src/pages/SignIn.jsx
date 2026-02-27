import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Activity, ArrowRight, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignIn() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ email: '', password: '', tenant_slug: '' });
    const [showPass, setShowPass] = useState(false);
    const [showSlug, setShowSlug] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) { setError('Email and password are required.'); return; }
        setError('');
        setLoading(true);
        try {
            await login(form.email, form.password, form.tenant_slug || undefined);
            navigate('/');
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
            {/* Card */}
            <div style={{
                width: '100%', maxWidth: '420px', margin: '24px',
                backgroundColor: '#111827', borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                overflow: 'hidden',
            }}>
                {/* Top gradient bar */}
                <div style={{ height: '3px', background: 'linear-gradient(90deg, #6366f1, #a855f7, #10b981)' }} />

                <div style={{ padding: '40px 36px 36px' }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Activity size={20} color="white" />
                        </div>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
                            Bill<span style={{ color: '#6366f1' }}>Flow</span>
                        </span>
                    </div>

                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: '0 0 6px' }}>Welcome back</h1>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 28px' }}>Sign in to your BillFlow account</p>

                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                            color: '#f87171', borderRadius: '10px', padding: '12px 16px', fontSize: '13px',
                            marginBottom: '20px', lineHeight: 1.5
                        }}>{error}</div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Email */}
                        <AuthField label="Email Address">
                            <input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} autoComplete="email" />
                        </AuthField>

                        {/* Password */}
                        <AuthField label="Password">
                            <div style={{ position: 'relative' }}>
                                <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={set('password')} autoComplete="current-password" style={{ paddingRight: '44px' }} />
                                <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={-1}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', cursor: 'pointer' }}>
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </AuthField>

                        {/* Optional workspace slug */}
                        <div>
                            <button type="button" onClick={() => setShowSlug(!showSlug)}
                                style={{ color: '#6366f1', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'Inter, sans-serif' }}>
                                {showSlug ? '− Hide' : '+ Have a workspace slug?'}
                            </button>
                            {showSlug && (
                                <AuthField label="Workspace Slug" style={{ marginTop: '12px' }}>
                                    <input type="text" placeholder="your-company" value={form.tenant_slug} onChange={set('tenant_slug')} autoComplete="off" />
                                </AuthField>
                            )}
                        </div>

                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '13px', borderRadius: '10px', fontWeight: 700,
                            fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                            color: 'white', border: 'none', fontFamily: 'Inter, sans-serif',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 0 24px rgba(99,102,241,0.4)', transition: 'all 0.2s',
                            marginTop: '4px',
                        }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 36px rgba(99,102,241,0.6)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(99,102,241,0.4)'; }}
                        >
                            {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</> : <><LogIn size={16} /> Sign In</>}
                        </button>
                    </form>

                    <div style={{ marginTop: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                        Don't have an account?{' '}
                        <Link to="/signup" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                            Create one <ArrowRight size={13} style={{ verticalAlign: 'middle' }} />
                        </Link>
                    </div>
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
