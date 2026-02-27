import React, { useState } from 'react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, TrendingDown, Users, AlertCircle } from 'lucide-react';

const revenueData = [
    { month: 'Aug', mrr: 68000, arr: 816000, new: 12000 },
    { month: 'Sep', mrr: 74000, arr: 888000, new: 15000 },
    { month: 'Oct', mrr: 82000, arr: 984000, new: 18000 },
    { month: 'Nov', mrr: 90000, arr: 1080000, new: 14000 },
    { month: 'Dec', mrr: 105000, arr: 1260000, new: 22000 },
    { month: 'Jan', mrr: 112000, arr: 1344000, new: 19000 },
    { month: 'Feb', mrr: 124500, arr: 1494000, new: 24000 },
];

const churnData = [
    { month: 'Aug', churned: 8, newSubs: 42 },
    { month: 'Sep', churned: 5, newSubs: 51 },
    { month: 'Oct', churned: 12, newSubs: 38 },
    { month: 'Nov', churned: 7, newSubs: 64 },
    { month: 'Dec', churned: 3, newSubs: 72 },
    { month: 'Jan', churned: 9, newSubs: 55 },
    { month: 'Feb', churned: 6, newSubs: 68 },
];

const planDistrib = [
    { name: 'Starter', value: 38, color: '#6366f1' },
    { name: 'Pro', value: 42, color: '#a855f7' },
    { name: 'Enterprise', value: 20, color: '#10b981' },
];

const TS = { backgroundColor: '#1a2540', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f4ff' };
const AXIS_COLOR = '#475569';

export default function Reports() {
    const [range, setRange] = useState('7m');
    const [tab, setTab] = useState('revenue');

    return (
        <div className="content-area">
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">Reports & Analytics</div>
                    <div className="page-subtitle">Track revenue growth, churn, and subscription health</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['1m', '3m', '7m', '1y'].map(r => (
                        <button key={r} className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange(r)}>{r}</button>
                    ))}
                    <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Download size={13} /> Export</button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
                {[
                    { label: 'MRR', value: '₹1,24,500', trend: '+10.2%', up: true, icon: TrendingUp, cls: 'primary' },
                    { label: 'ARR', value: '₹14,94,000', trend: '+10.2%', up: true, icon: TrendingUp, cls: 'success' },
                    { label: 'Active Subscribers', value: '1,204', trend: '+4.2%', up: true, icon: Users, cls: 'purple' },
                    { label: 'Monthly Churn', value: '0.4%', trend: '-0.1%', up: false, icon: TrendingDown, cls: 'warning' },
                ].map(s => (
                    <div className="stat-card" key={s.label}>
                        <div className="stat-header">
                            <div>
                                <div className="stat-title">{s.label}</div>
                                <div className="stat-value">{s.value}</div>
                                <div className={`stat-trend ${s.up ? 'up' : 'down'}`}>
                                    {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    <span>{s.trend}</span>
                                </div>
                            </div>
                            <div className={`stat-icon ${s.cls}`}><s.icon size={18} /></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs">
                {[['revenue', 'Revenue Trends'], ['churn', 'Churn Analysis'], ['plans', 'Plan Distribution']].map(([id, label]) => (
                    <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
                ))}
            </div>

            {tab === 'revenue' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card">
                        <div className="card-header">Monthly Recurring Revenue (MRR)</div>
                        <div className="card-body" style={{ padding: 24 }}>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                                        <Tooltip contentStyle={TS} formatter={(v, n) => [`₹${v.toLocaleString('en-IN')}`, n.toUpperCase()]} />
                                        <Area type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2.5} fill="url(#mrrGrad)" name="MRR" />
                                        <Area type="monotone" dataKey="new" stroke="#10b981" strokeWidth={2.5} fill="url(#newGrad)" name="New Revenue" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">ARR Projection</div>
                        <div className="card-body" style={{ padding: 24 }}>
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v / 100000}L`} />
                                        <Tooltip contentStyle={TS} formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'ARR']} />
                                        <Line type="monotone" dataKey="arr" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', r: 4 }} name="ARR" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'churn' && (
                <div className="card">
                    <div className="card-header">New Subscriptions vs Churn</div>
                    <div className="card-body" style={{ padding: 24 }}>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={churnData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={TS} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                    <Legend />
                                    <Bar dataKey="newSubs" name="New" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="churned" name="Churned" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', gap: 20, marginTop: 20, padding: '16px 20px', background: 'var(--color-bg-tertiary)', borderRadius: 10 }}>
                            {[['Avg Monthly Churn', '0.4%'], ['Net Revenue Retention', '108%'], ['Customer LTV', '₹48,000'], ['Payback Period', '4.2 months']].map(([k, v]) => (
                                <div key={k} style={{ flex: 1, textAlign: 'center' }}>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>{v}</div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{k}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'plans' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="card">
                        <div className="card-header">Plan Distribution</div>
                        <div className="card-body" style={{ padding: 24 }}>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={planDistrib} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                                            {planDistrib.map(e => <Cell key={e.name} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={TS} formatter={v => [`${v}%`]} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">Plan Breakdown</div>
                        <div className="card-body" style={{ padding: '10px 20px' }}>
                            {planDistrib.map(p => (
                                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 13 }}>{p.name}</div>
                                        <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 3, marginTop: 5 }}>
                                            <div style={{ height: '100%', width: `${p.value}%`, background: p.color, borderRadius: 3, transition: 'width 0.6s' }} />
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: 14 }}>{p.value}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
