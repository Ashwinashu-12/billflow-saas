import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

// Pages
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Onboarding from './pages/Onboarding';
import Customers from './pages/Customers';
import Subscriptions from './pages/Subscriptions';
import Invoices from './pages/Invoices';
import Plans from './pages/Plans';
import SettingsPage from './pages/Settings';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Roles from './pages/Roles';
import JobMonitor from './pages/JobMonitor';
import FeatureFlags from './pages/FeatureFlags';
import UsageBilling from './pages/UsageBilling';

// Lucide icons
import {
    LayoutDashboard, Users, CreditCard, FileText, Package, Settings,
    Bell, Sun, Moon, ChevronLeft, ChevronRight, LogOut, User,
    Activity, TrendingUp, Shield, Cpu, Flag, Zap, BarChart2, Search,
    ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

import {
    AreaChart as RAreaChart, Area as RArea,
    BarChart as RBarChart, Bar as RBar,
    XAxis as RXAxis, YAxis as RYAxis,
    CartesianGrid as RCartesianGrid,
    Tooltip as RTooltip,
    ResponsiveContainer as RResponsiveContainer,
} from 'recharts';

// ─── Nav config ───────────────────────────────────────────────
const NAV = [
    { section: 'Main' },
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { path: '/invoices', label: 'Invoices', icon: FileText },
    { path: '/payments', label: 'Payments', icon: ArrowUpRight },
    { path: '/plans', label: 'Plans & Pricing', icon: Package },
    { path: '/usage', label: 'Usage & Billing', icon: Zap },
    { section: 'Analytics' },
    { path: '/reports', label: 'Reports', icon: BarChart2 },
    { section: 'System' },
    { path: '/roles', label: 'Roles & Permissions', icon: Shield },
    { path: '/audit', label: 'Audit Logs', icon: Activity },
    { path: '/jobs', label: 'Job Monitor', icon: Cpu },
    { path: '/flags', label: 'Feature Flags', icon: Flag },
    { section: 'Account' },
    { path: '/settings', label: 'Settings', icon: Settings },
];

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ collapsed, setCollapsed }) {
    const navigate = useNavigate();
    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                <div className="sidebar-logo-icon">
                    <Activity size={18} color="white" />
                </div>
                <div className="sidebar-logo-text">Bill<span>Flow</span></div>
            </div>

            <nav className="sidebar-nav">
                {NAV.map((item, i) => {
                    if (item.section) return (
                        <div key={i} className="nav-section-label">{item.section}</div>
                    );
                    const Icon = item.icon;
                    return (
                        <NavLink key={item.path} to={item.path} end={item.path === '/'}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <span className="nav-icon"><Icon size={17} /></span>
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>
        </aside>
    );
}

// ─── Notification data ────────────────────────────────────────
const INITIAL_NOTIFS = [
    { id: 1, msg: "Invoice INV-4011 paid by Acme Corp", time: "2m ago", read: false },
    { id: 2, msg: "New subscription — Pied Piper (Pro)", time: "14m ago", read: false },
    { id: 3, msg: "Payment failed — Initech (₹1,003)", time: "1h ago", read: false },
    { id: 4, msg: "Billing run completed — 1,201 invoices", time: "3h ago", read: true },
];

// ─── Topbar ───────────────────────────────────────────────────
function Topbar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { isDark, toggle: toggleTheme } = useTheme();

    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifs, setNotifs] = useState(INITIAL_NOTIFS);

    const notifRef = useRef();
    const profileRef = useRef();

    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unread = notifs.filter(n => !n.read).length;
    const markAll = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
    const clearAll = () => { setNotifs([]); setNotifOpen(false); };
    const markOne = (id) => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));

    const initials = user ? (user.first_name?.[0] || 'U').toUpperCase() : 'A';
    const displayName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Ashwin Kumar';

    return (
        <header className="topbar">
            {/* Search */}
            <div className="topbar-search">
                <Search size={14} className="topbar-search-icon" />
                <input placeholder="Search anything…" />
            </div>

            <div className="topbar-actions">
                {/* Theme toggle */}
                <button className="icon-btn" onClick={toggleTheme} title={isDark ? 'Switch to Light' : 'Switch to Dark'}>
                    {isDark ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {/* Notifications */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button className="icon-btn" onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}>
                        <Bell size={17} />
                        {unread > 0 && (
                            <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', border: '1.5px solid var(--color-bg-secondary)' }} />
                        )}
                    </button>

                    {notifOpen && (
                        <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 10px)', width: 320, padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>Notifications {unread > 0 && <span className="badge danger" style={{ marginLeft: 6 }}>{unread}</span>}</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {unread > 0 && <button style={{ fontSize: 11.5, color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }} onClick={markAll}>Mark all read</button>}
                                    <button style={{ fontSize: 11.5, color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={clearAll}>Clear</button>
                                </div>
                            </div>
                            {notifs.length === 0 ? (
                                <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No notifications</div>
                            ) : notifs.map(n => (
                                <div key={n.id} onClick={() => markOne(n.id)} style={{ padding: '11px 14px', borderBottom: '1px solid var(--color-border)', background: n.read ? 'transparent' : 'var(--color-bg-active)', cursor: 'pointer', transition: 'background 0.15s' }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0, marginTop: 5 }} />}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12.5, color: 'var(--color-text-primary)', lineHeight: 1.5, fontWeight: n.read ? 400 : 600 }}>{n.msg}</div>
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{n.time}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div ref={profileRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 10, transition: 'background 0.15s' }}
                    onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <div className="user-avatar">{initials}</div>
                    <div style={{ lineHeight: 1.3 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{displayName}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{user?.role || 'Owner'}</div>
                    </div>

                    {profileOpen && (
                        <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 10px)', width: 200 }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', marginBottom: 4 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>{displayName}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{user?.email || 'admin@billflow.com'}</div>
                            </div>
                            <button className="dropdown-item" onClick={() => { navigate('/settings'); setProfileOpen(false); }}><User size={14} /> My Account</button>
                            <button className="dropdown-item" onClick={() => { navigate('/settings'); setProfileOpen(false); }}><Bell size={14} /> Notifications</button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item danger" onClick={async () => { setProfileOpen(false); await logout(); navigate('/signin'); }}><LogOut size={14} /> Sign Out</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

// ─── Dashboard ────────────────────────────────────────────────
const revenueData = [
    { name: 'Aug', value: 68000 }, { name: 'Sep', value: 74000 }, { name: 'Oct', value: 82000 },
    { name: 'Nov', value: 90000 }, { name: 'Dec', value: 105000 }, { name: 'Jan', value: 112000 },
    { name: 'Feb', value: 124500 },
];
const customerData = [
    { name: 'Mon', value: 14 }, { name: 'Tue', value: 22 }, { name: 'Wed', value: 18 },
    { name: 'Thu', value: 31 }, { name: 'Fri', value: 27 }, { name: 'Sat', value: 8 }, { name: 'Sun', value: 5 },
];
const RECENT_TRANSACTIONS = [
    { id: 'INV-4011', customer: 'Acme Corp', amount: '₹5,900', date: '27 Feb 2026', status: 'paid' },
    { id: 'INV-4012', customer: 'Globex Inc', amount: '₹2,183', date: '27 Feb 2026', status: 'paid' },
    { id: 'INV-4013', customer: 'Soylent Ltd', amount: '₹7,552', date: '26 Feb 2026', status: 'pending' },
    { id: 'INV-4014', customer: 'Initech', amount: '₹1,003', date: '26 Feb 2026', status: 'failed' },
    { id: 'INV-4015', customer: 'Umbrella Corp', amount: '₹14,160', date: '24 Feb 2026', status: 'paid' },
];
const TS = { backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 12 };

function Dashboard() {
    const [loading, setLoading] = useState(true);
    useEffect(() => { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t); }, []);

    return (
        <div className="content-area">
            <div className="page-header">
                <div>
                    <div className="page-title">Dashboard</div>
                    <div className="page-subtitle">Welcome back, here's what's happening today.</div>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <div className="stat-card" key={i}>
                            <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 12 }} />
                            <div className="skeleton" style={{ height: 28, width: '80%', marginBottom: 8 }} />
                            <div className="skeleton" style={{ height: 10, width: '50%' }} />
                        </div>
                    ))
                ) : (
                    <>
                        {[
                            { title: 'Monthly Revenue', value: '₹1,24,500', trend: '+10.2%', up: true, note: 'vs last month', cls: 'primary', icon: <TrendingUp size={22} /> },
                            { title: 'Active Subscriptions', value: '1,204', trend: '+4.2%', up: true, note: '24 new this month', cls: 'success', icon: <CreditCard size={22} /> },
                            { title: 'Churn Rate', value: '0.4%', trend: '-0.1%', up: false, note: 'vs 0.5% last month', cls: 'warning', icon: <TrendingUp size={22} /> },
                            { title: 'Outstanding Invoices', value: '₹28,420', trend: '+3', up: false, note: '3 overdue', cls: 'danger', icon: <FileText size={22} /> },
                        ].map(s => (
                            <div className="stat-card" key={s.title}>
                                <div className="stat-header">
                                    <div>
                                        <div className="stat-title">{s.title}</div>
                                        <div className="stat-value">{s.value}</div>
                                        <div className={`stat-trend ${s.up ? 'up' : 'down'}`}>
                                            {s.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            <span>{s.trend}</span>
                                            <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 4 }}>{s.note}</span>
                                        </div>
                                    </div>
                                    <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Charts */}
            <div className="dashboard-grid" style={{ marginBottom: 24 }}>
                <div className="card">
                    <div className="card-header">Revenue Growth</div>
                    <div className="card-body" style={{ padding: 24 }}>
                        <div style={{ width: '100%', height: 260 }}>
                            <RResponsiveContainer width="100%" height="100%">
                                <RAreaChart data={revenueData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="clrV" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <RCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <RXAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                    <RYAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                                    <RTooltip contentStyle={TS} formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                                    <RArea type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#clrV)" />
                                </RAreaChart>
                            </RResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header">New Customers (This Week)</div>
                    <div className="card-body" style={{ padding: 24 }}>
                        <div style={{ width: '100%', height: 260 }}>
                            <RResponsiveContainer width="100%" height="100%">
                                <RBarChart data={customerData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                    <RCartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <RXAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                    <RYAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                    <RTooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={TS} />
                                    <RBar dataKey="value" name="New Customers" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </RBarChart>
                            </RResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="card">
                <div className="card-header">
                    Recent Transactions
                    <button style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 500 }}>View all →</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                        <tbody>
                            {RECENT_TRANSACTIONS.map(tx => (
                                <tr key={tx.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: 12 }}>{tx.id}</td>
                                    <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{tx.customer}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{tx.amount}</td>
                                    <td style={{ fontSize: 12 }}>{tx.date}</td>
                                    <td><span className={`badge ${tx.status}`}>{tx.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Protected Route ──────────────────────────────────────────
function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--color-accent-subtle)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--color-accent)', fontSize: 13 }}>Loading…</p>
                <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
            </div>
        </div>
    );
    if (!isAuthenticated) return <Navigate to="/signin" replace />;
    return children;
}

// ─── Dashboard Layout ─────────────────────────────────────────
function DashboardLayout() {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <div className="app-layout">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <div className="main-wrapper">
                <Topbar />
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/plans" element={<Plans />} />
                    <Route path="/usage" element={<UsageBilling />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/roles" element={<Roles />} />
                    <Route path="/audit" element={<AuditLogs />} />
                    <Route path="/jobs" element={<JobMonitor />} />
                    <Route path="/flags" element={<FeatureFlags />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={
                        <div className="content-area flex-center" style={{ flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--color-text-disabled)' }}>404</div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>Page not found</div>
                        </div>
                    } />
                </Routes>
            </div>
        </div>
    );
}

// ─── App ──────────────────────────────────────────────────────
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/*" element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
