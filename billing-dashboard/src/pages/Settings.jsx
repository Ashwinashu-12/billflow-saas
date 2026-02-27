import React, { useState } from 'react';
import { Save, User, Building, Lock, Bell, CreditCard, Shield, Eye, EyeOff, CheckCircle, LogOut } from 'lucide-react';

const TABS = [
    { key: 'organization', label: 'Organization', icon: Building },
    { key: 'account', label: 'My Account', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'billing', label: 'Billing', icon: CreditCard },
    { key: 'security', label: 'Security', icon: Shield },
];

function InputField({ label, type = 'text', value, onChange, placeholder, hint, readOnly }) {
    const [showPass, setShowPass] = useState(false);
    const isPass = type === 'password';
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
            <div style={{ position: 'relative' }}>
                <input
                    type={isPass && !showPass ? 'password' : 'text'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    style={{
                        width: '100%', padding: '11px 16px', paddingRight: isPass ? '44px' : '16px',
                        borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)',
                        background: readOnly ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                        color: readOnly ? 'var(--text-muted)' : 'white', outline: 'none',
                        fontSize: '14px', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s',
                        cursor: readOnly ? 'default' : 'text',
                    }}
                    onFocus={e => { if (!readOnly) e.target.style.borderColor = 'var(--accent-primary)'; }}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                {isPass && (
                    <button type="button" onClick={() => setShowPass(!showPass)}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
            {hint && <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{hint}</p>}
        </div>
    );
}

function Toggle({ label, description, checked, onChange }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div>
                <div style={{ fontWeight: 500, color: 'white', fontSize: '14px' }}>{label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>{description}</div>
            </div>
            <button onClick={onChange} style={{
                width: '44px', height: '24px', borderRadius: '999px', position: 'relative', cursor: 'pointer',
                backgroundColor: checked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', transition: 'all 0.2s', flexShrink: 0
            }}>
                <div style={{
                    position: 'absolute', top: '3px', left: checked ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }} />
            </button>
        </div>
    );
}

export default function Settings() {
    const [activeTab, setActiveTab] = useState('organization');
    const [savedTab, setSavedTab] = useState(null);

    // Org settings
    const [org, setOrg] = useState({ company: 'BillFlow Inc.', website: 'https://billflow.com', email: 'support@billflow.com', address: '123 Tech Lane, Suite 400\nSan Francisco, CA 94107\nUnited States', timezone: 'Asia/Kolkata (IST +5:30)' });

    // Account settings
    const [account, setAccount] = useState({ firstName: 'Ashwin', lastName: '', email: 'ashwin@billflow.com', role: 'Administrator' });

    // Notifications settings
    const [notifications, setNotifications] = useState({
        invoicePaid: true, subCanceled: true, paymentFailed: true,
        newCustomer: false, upcomingRenewals: true, weeklyReport: false
    });

    // Billing settings
    const [billing, setBilling] = useState({ currency: '₹ INR — Indian Rupee', taxId: '29AABCT1332L1Z7' });

    // Security
    const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
    const [twoFa, setTwoFa] = useState(false);
    const [sessions, setSessions] = useState([
        { id: 1, device: 'Windows PC — Chrome', location: 'Mumbai, India', time: 'Active now', current: true },
        { id: 2, device: 'iPhone 15 — Safari', location: 'Mumbai, India', time: '2 hours ago', current: false },
    ]);

    const [passError, setPassError] = useState('');

    const handleSave = () => {
        // Password validation for security tab
        if (activeTab === 'security' && (passwords.current || passwords.newPass || passwords.confirm)) {
            if (!passwords.current) { setPassError('Enter your current password.'); return; }
            if (passwords.newPass.length < 8) { setPassError('New password must be at least 8 characters.'); return; }
            if (passwords.newPass !== passwords.confirm) { setPassError('Passwords do not match.'); return; }
            setPasswords({ current: '', newPass: '', confirm: '' });
        }
        setPassError('');
        setSavedTab(activeTab);
        setTimeout(() => setSavedTab(null), 2000);
    };

    const revokeSession = (id) => setSessions(prev => prev.filter(s => s.id !== id));

    const renderContent = () => {
        switch (activeTab) {
            case 'organization':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <InputField label="Company Name" value={org.company} onChange={e => setOrg(p => ({ ...p, company: e.target.value }))} />
                            <InputField label="Website" value={org.website} onChange={e => setOrg(p => ({ ...p, website: e.target.value }))} />
                        </div>
                        <InputField label="Support Email" type="email" value={org.email} onChange={e => setOrg(p => ({ ...p, email: e.target.value }))} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Billing Address</label>
                            <textarea rows="3" value={org.address} onChange={e => setOrg(p => ({ ...p, address: e.target.value }))} style={{
                                padding: '11px 16px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.04)', color: 'white', outline: 'none', fontSize: '14px', resize: 'vertical', fontFamily: 'Inter, sans-serif'
                            }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Timezone</label>
                            <select value={org.timezone} onChange={e => setOrg(p => ({ ...p, timezone: e.target.value }))} style={{
                                padding: '11px 16px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)',
                                background: '#1a1d2e', color: 'white', outline: 'none', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                            }}>
                                <option>Asia/Kolkata (IST +5:30)</option>
                                <option>America/New_York (EST -5:00)</option>
                                <option>Europe/London (GMT 0:00)</option>
                                <option>America/Los_Angeles (PST -8:00)</option>
                            </select>
                        </div>
                    </div>
                );

            case 'account':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '26px', fontWeight: 700, color: 'white', flexShrink: 0
                            }}>{account.firstName[0] || 'A'}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '18px', color: 'white' }}>{account.firstName} {account.lastName}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Administrator · {account.email}</div>
                                <button style={{ marginTop: '8px', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                                    onClick={() => alert('Avatar upload coming soon!')}>Change Avatar</button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <InputField label="First Name" value={account.firstName} onChange={e => setAccount(p => ({ ...p, firstName: e.target.value }))} />
                            <InputField label="Last Name" value={account.lastName} onChange={e => setAccount(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
                        </div>
                        <InputField label="Email Address" type="email" value={account.email} onChange={e => setAccount(p => ({ ...p, email: e.target.value }))} />
                        <InputField label="Role" value={account.role} readOnly hint="Contact your workspace owner to change your role." />
                    </div>
                );

            case 'notifications':
                return (
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>Configure which events trigger email or in-app notifications.</p>
                        <Toggle label="New Invoice Paid" description="Receive a notification when a customer pays an invoice." checked={notifications.invoicePaid} onChange={() => setNotifications(p => ({ ...p, invoicePaid: !p.invoicePaid }))} />
                        <Toggle label="Subscription Canceled" description="Get notified when a customer cancels their subscription." checked={notifications.subCanceled} onChange={() => setNotifications(p => ({ ...p, subCanceled: !p.subCanceled }))} />
                        <Toggle label="Payment Failed" description="Alert when a payment attempt fails." checked={notifications.paymentFailed} onChange={() => setNotifications(p => ({ ...p, paymentFailed: !p.paymentFailed }))} />
                        <Toggle label="New Customer Signup" description="Notify when a new customer registers." checked={notifications.newCustomer} onChange={() => setNotifications(p => ({ ...p, newCustomer: !p.newCustomer }))} />
                        <Toggle label="Upcoming Renewals" description="7-day advance notice for upcoming subscription renewals." checked={notifications.upcomingRenewals} onChange={() => setNotifications(p => ({ ...p, upcomingRenewals: !p.upcomingRenewals }))} />
                        <Toggle label="Weekly Revenue Report" description="Receive a weekly summary of revenue metrics." checked={notifications.weeklyReport} onChange={() => setNotifications(p => ({ ...p, weeklyReport: !p.weeklyReport }))} />
                    </div>
                );

            case 'billing':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ fontWeight: 600, color: 'white' }}>Current Plan</div>
                                <span style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>ACTIVE</span>
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Enterprise Plan</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>₹15,000 / month · Renews on Apr 01, 2026</div>
                            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                                <button onClick={() => alert('Opening plan management...')} style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, backgroundColor: 'var(--accent-primary)', color: 'white', cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif' }}>Manage Plan</button>
                                <button onClick={() => alert('Downloading latest invoice...')} style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', fontFamily: 'Inter, sans-serif' }}>Download Invoice</button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Default Currency</label>
                            <select value={billing.currency} onChange={e => setBilling(p => ({ ...p, currency: e.target.value }))} style={{
                                padding: '11px 16px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)',
                                background: '#1a1d2e', color: 'white', outline: 'none', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                            }}>
                                <option>₹ INR — Indian Rupee</option>
                                <option>$ USD — US Dollar</option>
                                <option>€ EUR — Euro</option>
                                <option>£ GBP — British Pound</option>
                            </select>
                        </div>
                        <InputField label="Tax ID / GST Number" value={billing.taxId} onChange={e => setBilling(p => ({ ...p, taxId: e.target.value }))} hint="Used on invoices sent to customers." />
                    </div>
                );

            case 'security':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div>
                            <h3 style={{ color: 'white', fontWeight: 600, marginBottom: '16px', fontSize: '15px' }}>Change Password</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <InputField label="Current Password" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                                <InputField label="New Password" type="password" value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} placeholder="Min. 8 characters" hint="Use a mix of letters, numbers, and symbols." />
                                <InputField label="Confirm New Password" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
                                {passError && <div style={{ color: 'var(--accent-danger)', fontSize: '13px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{passError}</div>}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                            <h3 style={{ color: 'white', fontWeight: 600, marginBottom: '4px', fontSize: '15px' }}>Two-Factor Authentication</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>Add an extra layer of security to your account.</p>
                            <Toggle label="Enable 2FA" description="Use an authenticator app to generate one-time codes." checked={twoFa} onChange={() => setTwoFa(!twoFa)} />
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                            <h3 style={{ color: 'white', fontWeight: 600, marginBottom: '4px', fontSize: '15px' }}>Active Sessions</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>Review and manage your logged-in devices.</p>
                            {sessions.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'white', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {s.device}
                                            {s.current && <span style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--accent-success)', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>CURRENT</span>}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{s.location} · {s.time}</div>
                                    </div>
                                    {!s.current && (
                                        <button onClick={() => revokeSession(s.id)} style={{ color: 'var(--accent-danger)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: '6px 12px', borderRadius: '7px', fontFamily: 'Inter, sans-serif' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            Revoke
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="content-area">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Settings</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage your workspace preferences and configurations</p>
                </div>
                <button onClick={handleSave} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                    backgroundColor: savedTab === activeTab ? 'var(--accent-success)' : 'var(--accent-primary)',
                    color: 'white', padding: '10px 18px', borderRadius: '8px', fontWeight: 600,
                    boxShadow: `0 0 20px ${savedTab === activeTab ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
                    transition: 'all 0.3s', border: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px'
                }}>
                    {savedTab === activeTab ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '28px', alignItems: 'start' }}>
                {/* Tab Nav */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSavedTab(null); setPassError(''); }} style={{
                                textAlign: 'left', padding: '11px 14px', borderRadius: '9px', cursor: 'pointer',
                                backgroundColor: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                                fontWeight: isActive ? 600 : 500, fontSize: '14px', border: 'none',
                                display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s',
                                borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                fontFamily: 'Inter, sans-serif'
                            }}
                                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--text-main)'; } }}
                                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                            >
                                <Icon size={17} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Card */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {(() => { const tab = TABS.find(t => t.key === activeTab); const Icon = tab?.icon; return Icon ? <Icon size={18} color="var(--accent-primary)" /> : null; })()}
                        {TABS.find(t => t.key === activeTab)?.label}
                    </div>
                    <div className="card-body">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
