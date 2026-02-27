import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api/v1';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('bf_token'));
    const [loading, setLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        const restore = async () => {
            const stored = localStorage.getItem('bf_token');
            if (!stored) { setLoading(false); return; }
            try {
                const res = await fetch(`${API_BASE}/auth/me`, {
                    headers: { Authorization: `Bearer ${stored}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.data);
                    setToken(stored);
                } else {
                    localStorage.removeItem('bf_token');
                    localStorage.removeItem('bf_refresh');
                    setToken(null);
                }
            } catch {
                // network error — keep loading false, user stays null
            } finally {
                setLoading(false);
            }
        };
        restore();
    }, []);

    const login = useCallback(async (email, password, tenant_slug = '') => {
        const body = { email, password };
        if (tenant_slug) body.tenant_slug = tenant_slug;

        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');

        localStorage.setItem('bf_token', data.data.access_token);
        localStorage.setItem('bf_refresh', data.data.refresh_token);
        setToken(data.data.access_token);
        setUser(data.data.user);
        return data.data;
    }, []);

    const register = useCallback(async (fields) => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        });
        const data = await res.json();
        if (!res.ok) {
            // surface validation errors nicely
            if (data.errors?.length) throw new Error(data.errors.map(e => e.message).join(' · '));
            throw new Error(data.message || 'Registration failed');
        }

        localStorage.setItem('bf_token', data.data.access_token);
        localStorage.setItem('bf_refresh', data.data.refresh_token);
        setToken(data.data.access_token);
        // Fetch the full user profile after register
        try {
            const meRes = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${data.data.access_token}` }
            });
            if (meRes.ok) { const me = await meRes.json(); setUser(me.data); }
        } catch { /* ignore */ }
        return data.data;
    }, []);

    const logout = useCallback(async () => {
        try {
            const rt = localStorage.getItem('bf_refresh');
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ refresh_token: rt }),
            });
        } catch { /* ignore network errors on logout */ }
        localStorage.removeItem('bf_token');
        localStorage.removeItem('bf_refresh');
        setToken(null);
        setUser(null);
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
