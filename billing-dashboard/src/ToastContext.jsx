import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 9999
            }}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '16px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                        minWidth: '300px',
                        animation: 'slideIn 0.3s ease-out'
                    }}>
                        {toast.type === 'success' ? <CheckCircle color="var(--accent-success)" size={20} /> : <Info color="var(--accent-primary)" size={20} />}
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} style={{ color: 'var(--text-muted)' }}>
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
