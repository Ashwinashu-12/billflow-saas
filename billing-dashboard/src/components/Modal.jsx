import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', danger = false }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const widths = { sm: '420px', md: '560px', lg: '720px', xl: '880px' };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                animation: 'fadeIn 0.15s ease'
            }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
            `}</style>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: widths[size],
                    backgroundColor: '#1a1d2e',
                    border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '16px',
                    boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)'}`,
                    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                    animation: 'slideUp 0.2s ease',
                    margin: '0 16px'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0
                }}>
                    <h2 style={{ color: 'white', fontSize: '17px', fontWeight: 700, margin: 0 }}>{title}</h2>
                    <button
                        onClick={onClose}
                        style={{
                            color: 'var(--text-muted)', padding: '6px', borderRadius: '8px',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export function ModalFooter({ children }) {
    return (
        <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'flex-end', gap: '10px',
            flexShrink: 0, backgroundColor: '#1a1d2e', borderRadius: '0 0 16px 16px'
        }}>
            {children}
        </div>
    );
}

export function Btn({ children, onClick, variant = 'primary', disabled = false, type = 'button', danger = false, icon: Icon }) {
    const variants = {
        primary: { bg: 'var(--accent-primary)', color: 'white', border: 'none', shadow: '0 0 20px rgba(99,102,241,0.25)' },
        secondary: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.08)', shadow: 'none' },
        danger: { bg: 'var(--accent-danger)', color: 'white', border: 'none', shadow: '0 0 20px rgba(239,68,68,0.25)' },
        success: { bg: 'var(--accent-success)', color: 'white', border: 'none', shadow: '0 0 20px rgba(16,185,129,0.25)' },
    };
    const s = variants[variant];
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 18px', borderRadius: '9px', fontWeight: 600, fontSize: '14px',
                backgroundColor: s.bg, color: s.color, border: s.border,
                boxShadow: s.shadow, cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1, transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif'
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '1'; }}
        >
            {Icon && <Icon size={15} />}
            {children}
        </button>
    );
}

export function FormField({ label, children, hint, required }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}{required && <span style={{ color: 'var(--accent-danger)', marginLeft: '3px' }}>*</span>}
            </label>
            {children}
            {hint && <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{hint}</p>}
        </div>
    );
}

export const inputStyle = {
    width: '100%', padding: '10px 14px',
    borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)', color: 'white',
    outline: 'none', fontSize: '14px', fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
};

export function Input({ label, required, hint, ...props }) {
    return (
        <FormField label={label} hint={hint} required={required}>
            <input
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                {...props}
            />
        </FormField>
    );
}

export function Select({ label, required, hint, children, ...props }) {
    return (
        <FormField label={label} hint={hint} required={required}>
            <select
                style={{ ...inputStyle, background: '#1a1d2e', cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                {...props}
            >
                {children}
            </select>
        </FormField>
    );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading = false }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" danger>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7 }}>{message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
                <Btn variant="danger" onClick={onConfirm} disabled={loading}>
                    {loading ? 'Deleting...' : confirmLabel}
                </Btn>
            </div>
        </Modal>
    );
}

export function DetailRow({ label, value, accent }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{label}</span>
            <span style={{ color: accent || 'white', fontSize: '14px', fontWeight: 500 }}>{value}</span>
        </div>
    );
}
