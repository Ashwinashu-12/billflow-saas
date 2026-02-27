# Multi-Tenant SaaS Billing Platform

A **production-ready**, **SQL-based**, **Multi-Tenant Subscription Billing Platform** built with Node.js + Express + PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14
- npm

### Setup

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Create database
psql -U postgres -c "CREATE DATABASE saas_billing;"

# 4. Run migrations (creates all tables, triggers, views)
npm run db:migrate

# 5. Seed demo data
npm run db:seed

# 6. Start development server
npm run dev
```

### Access Points
| Resource | URL |
|---|---|
| API Server | http://localhost:5000 |
| API Documentation (Swagger) | http://localhost:5000/api-docs |
| Health Check | http://localhost:5000/health |

---

## 🔐 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Owner | owner@acmecorp.com | Demo@123456 |
| Admin | admin@acmecorp.com | Demo@123456 |
| Accountant | accountant@acmecorp.com | Demo@123456 |
| Viewer | viewer@acmecorp.com | Demo@123456 |

---

## 🏗 Architecture

```
src/
├── config/
│   └── swagger.js           # OpenAPI 3.0 specification
├── controllers/
│   ├── auth.controller.js   # Registration, login, JWT
│   ├── customer.controller.js
│   ├── plan.controller.js
│   ├── subscription.controller.js
│   ├── invoice.controller.js
│   ├── payment.controller.js
│   ├── usage.controller.js
│   ├── report.controller.js
│   ├── webhook.controller.js
│   └── audit.controller.js
├── database/
│   ├── connection.js        # PG pool + transaction helpers
│   ├── schema.sql           # Complete schema (12 modules)
│   ├── migrate.js           # Migration runner
│   └── seed.js              # Demo data seeder
├── middleware/
│   ├── auth.js              # JWT authentication + RBAC
│   ├── audit.js             # Financial audit logging
│   ├── validate.js          # Joi validation schemas
│   └── error.js             # Global error handler
├── routes/
│   ├── auth.routes.js
│   ├── customer.routes.js
│   ├── plan.routes.js
│   ├── subscription.routes.js
│   ├── invoice.routes.js
│   ├── payment.routes.js
│   └── index.routes.js      # Usage, Reports, Audit, Webhooks
├── services/
│   ├── billing.service.js   # Cron jobs (renewals, expiry)
│   ├── pdf.service.js       # PDFKit invoice generator
│   └── webhook.service.js   # HMAC-signed webhook delivery
└── utils/
    ├── helpers.js           # Business logic utilities
    ├── logger.js            # Winston logger
    └── response.js          # API response helpers
```

---

## 📋 API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/v1/auth/register | Register tenant + owner |
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/refresh | Refresh JWT |
| POST | /api/v1/auth/logout | Logout |
| GET | /api/v1/auth/me | Get current user |
| PUT | /api/v1/auth/change-password | Change password |

### Customers
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/customers | List customers (paginated) |
| POST | /api/v1/customers | Create customer |
| GET | /api/v1/customers/:id | Get customer details |
| PUT | /api/v1/customers/:id | Update customer |
| DELETE | /api/v1/customers/:id | Deactivate customer |
| GET | /api/v1/customers/:id/subscriptions | Get customer subscriptions |
| GET | /api/v1/customers/:id/invoices | Get customer invoices |

### Plans
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/plans | List plans |
| POST | /api/v1/plans | Create plan |
| GET | /api/v1/plans/:id | Get plan with features |
| PUT | /api/v1/plans/:id | Update plan |
| DELETE | /api/v1/plans/:id | Deactivate plan |

### Subscriptions
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/subscriptions | List subscriptions |
| POST | /api/v1/subscriptions | Create subscription |
| GET | /api/v1/subscriptions/:id | Get subscription |
| PUT | /api/v1/subscriptions/:id/upgrade | Change plan |
| PUT | /api/v1/subscriptions/:id/cancel | Cancel |
| PUT | /api/v1/subscriptions/:id/pause | Pause |
| PUT | /api/v1/subscriptions/:id/resume | Resume |

### Invoices
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/invoices | List invoices |
| POST | /api/v1/invoices | Create invoice |
| POST | /api/v1/invoices/generate-from-subscription/:id | Auto-generate |
| GET | /api/v1/invoices/:id | Get invoice |
| PUT | /api/v1/invoices/:id/send | Mark as sent |
| PUT | /api/v1/invoices/:id/void | Void invoice |
| GET | /api/v1/invoices/:id/pdf | Download PDF |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/payments | List payments |
| GET | /api/v1/payments/summary | Payment summary |
| POST | /api/v1/payments | Record payment |
| GET | /api/v1/payments/:id | Get payment |
| POST | /api/v1/payments/:id/refund | Process refund |

### Usage
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/v1/usage/log | Log usage event |
| POST | /api/v1/usage/log/batch | Batch log (up to 1000) |
| GET | /api/v1/usage | List usage logs |
| GET | /api/v1/usage/summary/:subId | Usage summary by period |
| POST | /api/v1/usage/calculate/:subId | Calculate billable usage |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/reports/dashboard | KPI dashboard |
| GET | /api/v1/reports/mrr | MRR trend by month |
| GET | /api/v1/reports/revenue-by-plan | Revenue per plan |
| GET | /api/v1/reports/outstanding-invoices | Aging analysis |
| GET | /api/v1/reports/revenue-collection | Daily collection |
| GET | /api/v1/reports/customer-retention | Cohort retention |
| GET | /api/v1/reports/tax-summary | GST breakdown |

### Webhooks
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/webhooks/events | Available events |
| GET | /api/v1/webhooks | List webhooks |
| POST | /api/v1/webhooks | Register webhook |
| GET | /api/v1/webhooks/:id | Get webhook |
| PUT | /api/v1/webhooks/:id | Update webhook |
| DELETE | /api/v1/webhooks/:id | Delete webhook |
| POST | /api/v1/webhooks/:id/test | Test webhook |
| GET | /api/v1/webhooks/:id/logs | Delivery logs |

### Audit
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/audit | List audit logs |
| GET | /api/v1/audit/summary | Action summary |
| GET | /api/v1/audit/:id | Get audit log |

---

## 🔐 RBAC Permission Matrix

| Resource | Owner | Admin | Accountant | Viewer |
|---|---|---|---|---|
| customers | ✅ Full | ✅ CRUD | 📖 Read | 📖 Read |
| plans | ✅ Full | ✅ CRUD | 📖 Read | 📖 Read |
| subscriptions | ✅ Full | ✅ CRUD | 📖 Read | 📖 Read |
| invoices | ✅ Full | ✅ CRUD + Export | ✅ CRUD + Export | 📖 Read |
| payments | ✅ Full | ✅ CRUD | ✅ CRUD | 📖 Read |
| reports | ✅ Full | ✅ Read + Export | ✅ Read + Export | 📖 Read |
| users | ✅ Manage | ✅ CRUD | ❌ | ❌ |
| webhooks | ✅ Full | ✅ CRUD | ❌ | ❌ |
| audit_logs | ✅ Full | ✅ Read | ❌ | ❌ |
| settings | ✅ Manage | ✅ CRUD | ❌ | ❌ |

---

## 🧾 GST Tax Logic

The platform supports Indian GST:
- **CGST + SGST**: Applied when customer and supplier are in the **same state** (9% + 9% = 18%)
- **IGST**: Applied for **inter-state** transactions (18%)
- Tax breakdown is stored per invoice item
- Tax summary in reports

---

## 🔔 Webhook Events

| Event | Trigger |
|---|---|
| `invoice.created` | New invoice generated |
| `invoice.sent` | Invoice marked as sent |
| `invoice.paid` | Invoice fully paid |
| `invoice.overdue` | Due date passed |
| `payment.completed` | Payment recorded |
| `payment.failed` | Payment failed |
| `payment.refunded` | Refund processed |
| `subscription.activated` | Subscription activated |
| `subscription.cancelled` | Subscription cancelled |
| `subscription.upgraded` | Plan upgraded |

Webhooks are signed with **HMAC-SHA256** using the `X-Webhook-Signature` header.

---

## ⚙️ Environment Variables

See `.env.example` for all configuration options.

Key variables:
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET, JWT_EXPIRES_IN
SMTP_HOST, SMTP_USER, SMTP_PASS
PDF_STORAGE_PATH
NODE_ENV
PORT
```

---

## 📊 Database Schema Highlights

- **22 tables** with proper 3NF normalization
- **Row Level Security** on all tenant-scoped tables
- **UUID primary keys** throughout
- **Composite indexes** on tenant+date for fast reporting
- **Triggers** for auto-updating `updated_at`, invoice `amount_due`, customer balances
- **Materialized view** for MRR reporting
- **Stored check constraints** for data integrity
- **ACID transactions** for all financial operations
