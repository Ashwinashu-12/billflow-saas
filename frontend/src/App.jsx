import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState('Checking...')
  const [isApiConnected, setIsApiConnected] = useState(false)

  useEffect(() => {
    // Ping the backend server to check if it's running
    fetch('http://localhost:5000/health')
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'ok') {
          setIsApiConnected(true)
          setApiStatus('API Connected')
        } else {
          setApiStatus('API error')
        }
      })
      .catch((err) => {
        setApiStatus('API Disconnected')
      })
  }, [])

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo">
          <span>SaaS</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Billing Platform</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#docs">API Docs</a>
        </div>
      </nav>

      <main className="hero">
        <div className="badge">
          🚀 v1.0.0 Now Available
        </div>

        <h1 className="title">
          The Ultimate <span className="title-gradient">Multi-Tenant</span>
          <br />
          <span className="title-accent">Billing Engine</span>
        </h1>

        <p className="subtitle">
          Powerful, scalable subscription management for modern B2B SaaS.
          Handle complex billing models, usage tracking, and multi-tenancy effortlessly.
        </p>

        <div className="cta-group">
          <button className="btn btn-primary" onClick={() => window.open('http://localhost:5000/api-docs', '_blank')}>
            View API Docs
          </button>
          <button className="btn btn-secondary">
            Go to Dashboard
          </button>
        </div>

        <div className="dashboard-preview">
          <div className="dashboard-header">
            <div className="dot dot-red"></div>
            <div className="dot dot-yellow"></div>
            <div className="dot dot-green"></div>
          </div>
          <div className="dashboard-body">
            <div className="sidebar">
              <div className="sidebar-item active">Overview</div>
              <div className="sidebar-item">Subscriptions</div>
              <div className="sidebar-item">Invoices</div>
              <div className="sidebar-item">Usage Reports</div>
              <div className="sidebar-item" style={{ marginTop: 'auto' }}>Settings</div>
            </div>
            <div className="main-content">
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-value">$124.5K</div>
                  <div className="stat-label">MRR (Monthly Recurring Revenue)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">1,204</div>
                  <div className="stat-label">Active Subscriptions</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">0.4%</div>
                  <div className="stat-label">Low Churn Rate</div>
                </div>
              </div>
              <div className="chart-area" style={{
                background: 'linear-gradient(to top right, rgba(79, 70, 229, 0.2), rgba(236, 72, 153, 0.1))',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ color: 'var(--text-muted)' }}>Revenue Chart Visualization</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating status widget */}
      <div className="api-status" style={{
        borderColor: isApiConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        background: isApiConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        color: isApiConnected ? '#34d399' : '#f87171'
      }}>
        <div className="status-dot" style={{
          background: isApiConnected ? '#10b981' : '#ef4444',
          boxShadow: `0 0 8px ${isApiConnected ? '#10b981' : '#ef4444'}`
        }}></div>
        {apiStatus} (Port 5000)
      </div>
    </div>
  )
}

export default App
