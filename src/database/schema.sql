-- ============================================================
-- Multi-Tenant Subscription Billing Platform
-- Complete Database Schema (PostgreSQL)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TENANTS (Companies)
-- ============================================================
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    website         VARCHAR(255),
    logo_url        VARCHAR(500),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100) DEFAULT 'India',
    postal_code     VARCHAR(20),
    gstin           VARCHAR(20),
    pan             VARCHAR(20),
    currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
    timezone        VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    plan_tier       VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter','growth','enterprise')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    trial_ends_at   TIMESTAMPTZ,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);

-- ============================================================
-- 2. ROLES & PERMISSIONS
-- ============================================================
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(50) NOT NULL CHECK (name IN ('owner','admin','accountant','viewer')),
    description TEXT,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource    VARCHAR(100) NOT NULL,
    action      VARCHAR(50) NOT NULL CHECK (action IN ('create','read','update','delete','export','manage')),
    description TEXT,
    UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- 3. USERS
-- ============================================================
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id             UUID NOT NULL REFERENCES roles(id),
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    phone               VARCHAR(20),
    avatar_url          VARCHAR(500),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    email_verify_token  VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    last_login_ip       INET,
    two_fa_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    two_fa_secret       VARCHAR(255),
    preferences         JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    ip_address  INET,
    user_agent  TEXT,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================================
-- 4. CUSTOMERS
-- ============================================================
CREATE TABLE customers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code                VARCHAR(50) NOT NULL,
    company_name        VARCHAR(255),
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    phone               VARCHAR(20),
    mobile              VARCHAR(20),
    website             VARCHAR(255),
    currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
    payment_terms       INTEGER NOT NULL DEFAULT 30,
    credit_limit        NUMERIC(15,2) NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    status              VARCHAR(50) NOT NULL DEFAULT 'active' 
                        CHECK (status IN ('active','inactive','suspended','churned')),
    source              VARCHAR(100),
    notes               TEXT,
    tags                VARCHAR(50)[] DEFAULT '{}',
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_code ON customers(tenant_id, code);

CREATE TABLE customer_addresses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('billing','shipping','both')),
    address_line1   VARCHAR(255) NOT NULL,
    address_line2   VARCHAR(255),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    country         VARCHAR(100) NOT NULL DEFAULT 'India',
    postal_code     VARCHAR(20) NOT NULL,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);

CREATE TABLE tax_details (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    gstin           VARCHAR(20),
    pan             VARCHAR(20),
    tan             VARCHAR(20),
    tax_category    VARCHAR(50) DEFAULT 'regular' CHECK (tax_category IN ('regular','composition','unregistered','sez','overseas')),
    state_code      VARCHAR(5),
    is_sez          BOOLEAN NOT NULL DEFAULT FALSE,
    is_overseas     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tax_details_customer ON tax_details(customer_id);

-- ============================================================
-- 5. SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE plans (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    code                VARCHAR(50) NOT NULL,
    description         TEXT,
    billing_cycle       VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly','yearly','quarterly','weekly','one_time')),
    billing_interval    INTEGER NOT NULL DEFAULT 1,
    price               NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
    trial_days          INTEGER NOT NULL DEFAULT 0,
    setup_fee           NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_custom           BOOLEAN NOT NULL DEFAULT FALSE,
    max_users           INTEGER,
    max_storage_gb      INTEGER,
    max_api_calls       INTEGER,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_plans_tenant ON plans(tenant_id);
CREATE INDEX idx_plans_is_active ON plans(is_active);

CREATE TABLE plan_features (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id     UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    key         VARCHAR(100) NOT NULL,
    value       VARCHAR(255),
    is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(plan_id, key)
);

CREATE INDEX idx_plan_features_plan ON plan_features(plan_id);

CREATE TABLE plan_pricing (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id         UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pricing_model   VARCHAR(50) NOT NULL DEFAULT 'flat' 
                    CHECK (pricing_model IN ('flat','per_unit','tiered','volume','graduated','stairstep')),
    currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
    unit_amount     NUMERIC(15,4) NOT NULL DEFAULT 0,
    tiers           JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usage_pricing (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id         UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name     VARCHAR(100) NOT NULL,
    metric_key      VARCHAR(100) NOT NULL,
    unit_name       VARCHAR(50),
    pricing_model   VARCHAR(50) NOT NULL DEFAULT 'per_unit'
                    CHECK (pricing_model IN ('per_unit','tiered','volume')),
    unit_price      NUMERIC(15,6) NOT NULL DEFAULT 0,
    included_units  INTEGER NOT NULL DEFAULT 0,
    tiers           JSONB,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(plan_id, metric_key)
);

-- ============================================================
-- 6. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    plan_id             UUID NOT NULL REFERENCES plans(id),
    status              VARCHAR(50) NOT NULL DEFAULT 'trial'
                        CHECK (status IN ('trial','active','past_due','paused','cancelled','expired','pending')),
    quantity            INTEGER NOT NULL DEFAULT 1,
    unit_amount         NUMERIC(15,2) NOT NULL,
    discount_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
    subtotal            NUMERIC(15,2) NOT NULL,
    tax_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(15,2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
    billing_cycle       VARCHAR(20) NOT NULL,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_ends_at       TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end  TIMESTAMPTZ NOT NULL,
    cancelled_at        TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    next_billing_date   TIMESTAMPTZ,
    last_billed_at      TIMESTAMPTZ,
    auto_renew          BOOLEAN NOT NULL DEFAULT TRUE,
    notes               TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date) WHERE status = 'active';

CREATE TABLE subscription_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type      VARCHAR(100) NOT NULL 
                    CHECK (event_type IN ('created','activated','upgraded','downgraded','paused','resumed','cancelled','expired','renewed','trial_started','trial_ended')),
    from_plan_id    UUID REFERENCES plans(id),
    to_plan_id      UUID REFERENCES plans(id),
    from_status     VARCHAR(50),
    to_status       VARCHAR(50),
    change_reason   TEXT,
    effective_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by    UUID REFERENCES users(id),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_history_subscription ON subscription_history(subscription_id);
CREATE INDEX idx_sub_history_event ON subscription_history(event_type);

-- ============================================================
-- 7. INVOICES
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

CREATE TABLE invoices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id         UUID NOT NULL REFERENCES customers(id),
    subscription_id     UUID REFERENCES subscriptions(id),
    invoice_number      VARCHAR(50) NOT NULL,
    type                VARCHAR(20) NOT NULL DEFAULT 'invoice'
                        CHECK (type IN ('invoice','credit_note','debit_note','proforma')),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','sent','paid','partially_paid','overdue','void','write_off')),
    reference_number    VARCHAR(100),
    po_number           VARCHAR(100),
    issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date            DATE NOT NULL,
    paid_date           DATE,
    billing_period_start DATE,
    billing_period_end   DATE,
    currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
    exchange_rate       NUMERIC(15,6) NOT NULL DEFAULT 1,
    subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
    taxable_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_paid         NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_due          NUMERIC(15,2) NOT NULL DEFAULT 0,
    notes               TEXT,
    terms               TEXT,
    footer_text         TEXT,
    pdf_url             VARCHAR(500),
    sent_at             TIMESTAMPTZ,
    viewed_at           TIMESTAMPTZ,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status IN ('sent','overdue');
CREATE INDEX idx_invoices_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_issue_date ON invoices(tenant_id, issue_date);

CREATE TABLE invoice_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL DEFAULT 'subscription'
                    CHECK (type IN ('subscription','usage','one_time','discount','tax','credit')),
    description     VARCHAR(500) NOT NULL,
    quantity        NUMERIC(15,4) NOT NULL DEFAULT 1,
    unit            VARCHAR(50),
    unit_price      NUMERIC(15,4) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
    period_start    DATE,
    period_end      DATE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE invoice_taxes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tax_name        VARCHAR(100) NOT NULL,
    tax_type        VARCHAR(20) NOT NULL CHECK (tax_type IN ('CGST','SGST','IGST','UTGST','Cess','Other')),
    tax_rate        NUMERIC(5,2) NOT NULL,
    taxable_amount  NUMERIC(15,2) NOT NULL,
    tax_amount      NUMERIC(15,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_taxes_invoice ON invoice_taxes(invoice_id);

-- ============================================================
-- 8. PAYMENTS
-- ============================================================
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id         UUID NOT NULL REFERENCES customers(id),
    invoice_id          UUID REFERENCES invoices(id),
    subscription_id     UUID REFERENCES subscriptions(id),
    payment_number      VARCHAR(50) NOT NULL,
    method              VARCHAR(50) NOT NULL 
                        CHECK (method IN ('bank_transfer','credit_card','debit_card','upi','cheque','cash','wallet','net_banking','other')),
    gateway             VARCHAR(100),
    gateway_payment_id  VARCHAR(255),
    gateway_order_id    VARCHAR(255),
    gateway_response    JSONB,
    status              VARCHAR(30) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','completed','failed','refunded','partially_refunded','cancelled')),
    amount              NUMERIC(15,2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
    exchange_rate       NUMERIC(15,6) NOT NULL DEFAULT 1,
    fees                NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_amount          NUMERIC(15,2) NOT NULL,
    reference_number    VARCHAR(255),
    cheque_number       VARCHAR(100),
    bank_name           VARCHAR(255),
    payment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    cleared_date        DATE,
    failure_reason      TEXT,
    refund_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
    refund_reason       TEXT,
    notes               TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, payment_number)
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_gateway_id ON payments(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;

CREATE TABLE payment_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id      UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL CHECK (type IN ('charge','refund','partial_refund','chargeback','dispute','fee')),
    amount          NUMERIC(15,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
    status          VARCHAR(30) NOT NULL,
    gateway_txn_id  VARCHAR(255),
    error_code      VARCHAR(100),
    error_message   TEXT,
    raw_response    JSONB,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_txn_payment ON payment_transactions(payment_id);
CREATE INDEX idx_payment_txn_gateway ON payment_transactions(gateway_txn_id) WHERE gateway_txn_id IS NOT NULL;

-- ============================================================
-- 9. USAGE TRACKING
-- ============================================================
CREATE TABLE usage_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    metric_key      VARCHAR(100) NOT NULL,
    metric_name     VARCHAR(255) NOT NULL,
    quantity        NUMERIC(15,4) NOT NULL,
    unit            VARCHAR(50),
    unit_price      NUMERIC(15,6) NOT NULL DEFAULT 0,
    amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
    billed          BOOLEAN NOT NULL DEFAULT FALSE,
    billed_invoice_id UUID REFERENCES invoices(id),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    billing_period_start TIMESTAMPTZ,
    billing_period_end   TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_tenant ON usage_logs(tenant_id);
CREATE INDEX idx_usage_logs_customer ON usage_logs(customer_id);
CREATE INDEX idx_usage_logs_subscription ON usage_logs(subscription_id);
CREATE INDEX idx_usage_logs_metric ON usage_logs(tenant_id, metric_key);
CREATE INDEX idx_usage_logs_billed ON usage_logs(billed) WHERE billed = FALSE;
CREATE INDEX idx_usage_logs_recorded_at ON usage_logs(recorded_at);

CREATE TABLE billing_calculations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id     UUID NOT NULL REFERENCES subscriptions(id),
    invoice_id          UUID REFERENCES invoices(id),
    period_start        TIMESTAMPTZ NOT NULL,
    period_end          TIMESTAMPTZ NOT NULL,
    metric_key          VARCHAR(100) NOT NULL,
    total_usage         NUMERIC(15,4) NOT NULL DEFAULT 0,
    included_units      NUMERIC(15,4) NOT NULL DEFAULT 0,
    billable_units      NUMERIC(15,4) NOT NULL DEFAULT 0,
    unit_price          NUMERIC(15,6) NOT NULL DEFAULT 0,
    amount              NUMERIC(15,2) NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','calculated','invoiced')),
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_calc_subscription ON billing_calculations(subscription_id);
CREATE INDEX idx_billing_calc_status ON billing_calculations(status);

-- ============================================================
-- 10. TAX RULES
-- ============================================================
CREATE TABLE tax_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    tax_type        VARCHAR(20) NOT NULL CHECK (tax_type IN ('GST','VAT','Sales_Tax','Custom')),
    is_inclusive    BOOLEAN NOT NULL DEFAULT FALSE,
    is_compound     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tax_rules_tenant ON tax_rules(tenant_id);

CREATE TABLE tax_rates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_rule_id     UUID NOT NULL REFERENCES tax_rules(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('CGST','SGST','IGST','UTGST','Cess','Other')),
    rate            NUMERIC(5,2) NOT NULL,
    country_code    VARCHAR(5) DEFAULT 'IN',
    state_code      VARCHAR(5),
    hsn_code        VARCHAR(20),
    effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to    DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tax_rates_rule ON tax_rates(tax_rule_id);

-- ============================================================
-- 11. WEBHOOKS
-- ============================================================
CREATE TABLE webhooks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    url             VARCHAR(500) NOT NULL,
    secret          VARCHAR(255) NOT NULL,
    events          VARCHAR(100)[] NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    retry_count     INTEGER NOT NULL DEFAULT 3,
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    headers         JSONB DEFAULT '{}',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

CREATE TABLE webhook_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id      UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type      VARCHAR(100) NOT NULL,
    event_id        UUID NOT NULL,
    payload         JSONB NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','delivered','failed','retrying')),
    response_status INTEGER,
    response_body   TEXT,
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    next_retry_at   TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_retry ON webhook_logs(next_retry_at) WHERE status = 'retrying';

-- ============================================================
-- 12. AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100) NOT NULL,
    resource_id     UUID,
    old_values      JSONB,
    new_values      JSONB,
    changes         JSONB,
    ip_address      INET,
    user_agent      TEXT,
    request_id      VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'success'
                    CHECK (status IN ('success','failure','error')),
    error_message   TEXT,
    duration_ms     INTEGER,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(tenant_id, action);

-- ============================================================
-- 13. REPORTING VIEWS
-- ============================================================

-- MRR View
CREATE MATERIALIZED VIEW mrr_report AS
SELECT
    s.tenant_id,
    DATE_TRUNC('month', NOW()) AS period,
    COUNT(DISTINCT s.id) AS active_subscriptions,
    COUNT(DISTINCT s.customer_id) AS active_customers,
    SUM(CASE
        WHEN p.billing_cycle = 'monthly' THEN s.total_amount
        WHEN p.billing_cycle = 'yearly'  THEN s.total_amount / 12
        WHEN p.billing_cycle = 'quarterly' THEN s.total_amount / 3
        WHEN p.billing_cycle = 'weekly' THEN s.total_amount * 4
        ELSE s.total_amount
    END) AS mrr,
    SUM(CASE
        WHEN p.billing_cycle = 'monthly' THEN s.total_amount * 12
        WHEN p.billing_cycle = 'yearly'  THEN s.total_amount
        WHEN p.billing_cycle = 'quarterly' THEN s.total_amount * 4
        WHEN p.billing_cycle = 'weekly' THEN s.total_amount * 52
        ELSE s.total_amount
    END) AS arr
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active'
GROUP BY s.tenant_id;

CREATE UNIQUE INDEX idx_mrr_report ON mrr_report(tenant_id);

-- Revenue by Plan View
CREATE VIEW revenue_by_plan AS
SELECT
    s.tenant_id,
    p.id AS plan_id,
    p.name AS plan_name,
    p.billing_cycle,
    COUNT(DISTINCT s.id) AS subscription_count,
    SUM(s.total_amount) AS total_revenue,
    AVG(s.total_amount) AS avg_revenue
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active'
GROUP BY s.tenant_id, p.id, p.name, p.billing_cycle;

-- Outstanding invoices view
CREATE VIEW outstanding_invoices AS
SELECT
    i.tenant_id,
    i.id,
    i.invoice_number,
    i.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.company_name,
    i.total_amount,
    i.amount_due,
    i.due_date,
    CURRENT_DATE - i.due_date AS days_overdue,
    i.status
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.status IN ('sent', 'overdue', 'partially_paid')
  AND i.amount_due > 0;

-- ============================================================
-- 14. FUNCTIONS & TRIGGERS
-- ============================================================

-- Updated At trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER tr_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_webhook_logs_updated_at BEFORE UPDATE ON webhook_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Invoice amount_due auto-calculation trigger
CREATE OR REPLACE FUNCTION calc_invoice_amount_due()
RETURNS TRIGGER AS $$
BEGIN
    NEW.amount_due = NEW.total_amount - NEW.amount_paid;
    IF NEW.amount_due <= 0 THEN
        NEW.status = 'paid';
        NEW.paid_date = CURRENT_DATE;
    ELSIF NEW.amount_paid > 0 THEN
        NEW.status = 'partially_paid';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_invoice_amount_due 
    BEFORE INSERT OR UPDATE OF total_amount, amount_paid ON invoices 
    FOR EACH ROW EXECUTE FUNCTION calc_invoice_amount_due();

-- Customer outstanding balance update
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers 
    SET outstanding_balance = (
        SELECT COALESCE(SUM(amount_due), 0)
        FROM invoices
        WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
          AND status IN ('sent', 'overdue', 'partially_paid')
    )
    WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_invoice_customer_balance
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_customer_balance();

-- ============================================================
-- 15. ROW LEVEL SECURITY (Tenant Isolation)
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are enforced by setting app.current_tenant_id session variable
-- The application layer uses SET LOCAL app.current_tenant_id = 'uuid' within transactions

CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_customers ON customers
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_plans ON plans
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_subscriptions ON subscriptions
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_invoices ON invoices
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_payments ON payments
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
