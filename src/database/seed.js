const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'saas_billing',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
    const client = await pool.connect();
    console.log('🌱 Seeding database with demo data...\n');

    try {
        await client.query('BEGIN');

        // ─── 1. TENANT ──────────────────────────────────────────────
        console.log('📦 Creating demo tenant...');
        const tenantResult = await client.query(`
      INSERT INTO tenants (id, name, slug, email, phone, website, city, state, country, 
        postal_code, gstin, currency, timezone, plan_tier, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [
            uuidv4(), 'Acme Corp Solutions', 'acme-corp', 'admin@acmecorp.com',
            '+91-9876543210', 'https://acmecorp.com', 'Mumbai', 'Maharashtra',
            'India', '400001', '27AABCA1234A1Z5', 'INR', 'Asia/Kolkata', 'growth', true
        ]);
        const tenantId = tenantResult.rows[0].id;
        console.log(`   ✅ Tenant: Acme Corp (ID: ${tenantId})`);

        // ─── 2. ROLES ────────────────────────────────────────────────
        console.log('🔐 Creating roles...');
        const roleNames = ['owner', 'admin', 'accountant', 'viewer'];
        const roleIds = {};
        for (const roleName of roleNames) {
            const r = await client.query(`
        INSERT INTO roles (id, tenant_id, name, description, is_system)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
        RETURNING id
      `, [uuidv4(), tenantId, roleName, `System ${roleName} role`]);
            roleIds[roleName] = r.rows[0].id;
        }
        console.log(`   ✅ Roles: ${roleNames.join(', ')}`);

        // ─── 3. PERMISSIONS ──────────────────────────────────────────
        console.log('🔑 Creating permissions...');
        const resources = ['customers', 'plans', 'subscriptions', 'invoices', 'payments',
            'usage', 'reports', 'webhooks', 'audit_logs', 'users', 'settings'];
        const actions = ['create', 'read', 'update', 'delete', 'export', 'manage'];

        const permIds = {};
        for (const resource of resources) {
            for (const action of actions) {
                const p = await client.query(`
          INSERT INTO permissions (id, resource, action, description)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (resource, action) DO UPDATE SET description = EXCLUDED.description
          RETURNING id
        `, [uuidv4(), resource, action, `${action} ${resource}`]);
                permIds[`${resource}:${action}`] = p.rows[0].id;
            }
        }

        // Owner gets all permissions
        for (const [key, permId] of Object.entries(permIds)) {
            await client.query(`
        INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [roleIds['owner'], permId]);
        }

        // Admin gets most permissions (not manage)
        for (const [key, permId] of Object.entries(permIds)) {
            if (!key.includes(':manage')) {
                await client.query(`
          INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [roleIds['admin'], permId]);
            }
        }

        // Accountant: read + create/update for financial
        const accountantResources = ['invoices', 'payments', 'reports'];
        for (const res of accountantResources) {
            for (const act of ['create', 'read', 'update', 'export']) {
                const key = `${res}:${act}`;
                if (permIds[key]) {
                    await client.query(`
            INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [roleIds['accountant'], permIds[key]]);
                }
            }
        }
        for (const res of ['customers', 'subscriptions', 'plans']) {
            const p = permIds[`${res}:read`];
            if (p) await client.query(`INSERT INTO role_permissions VALUES ($1,$2) ON CONFLICT DO NOTHING`, [roleIds['accountant'], p]);
        }

        // Viewer: read only
        for (const [key, permId] of Object.entries(permIds)) {
            if (key.includes(':read')) {
                await client.query(`
          INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [roleIds['viewer'], permId]);
            }
        }
        console.log(`   ✅ Permissions matrix created`);

        // ─── 4. USERS ────────────────────────────────────────────────
        console.log('👤 Creating demo users...');
        const passwordHash = await bcrypt.hash('Demo@123456', 12);

        const users = [
            { email: 'owner@acmecorp.com', firstName: 'John', lastName: 'Owner', role: 'owner' },
            { email: 'admin@acmecorp.com', firstName: 'Jane', lastName: 'Admin', role: 'admin' },
            { email: 'accountant@acmecorp.com', firstName: 'Bob', lastName: 'Accountant', role: 'accountant' },
            { email: 'viewer@acmecorp.com', firstName: 'Alice', lastName: 'Viewer', role: 'viewer' },
        ];

        const userIds = {};
        for (const u of users) {
            const r = await client.query(`
        INSERT INTO users (id, tenant_id, role_id, email, password_hash, first_name, last_name, is_active, is_email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
        ON CONFLICT (tenant_id, email) DO UPDATE SET first_name = EXCLUDED.first_name
        RETURNING id
      `, [uuidv4(), tenantId, roleIds[u.role], u.email, passwordHash, u.firstName, u.lastName]);
            userIds[u.role] = r.rows[0].id;
        }
        console.log(`   ✅ Users: owner, admin, accountant, viewer`);
        console.log(`   📧 Login: owner@acmecorp.com / Demo@123456`);

        // ─── 5. SUBSCRIPTION PLANS ───────────────────────────────────
        console.log('📋 Creating subscription plans...');
        const plans = [
            { name: 'Starter', code: 'STARTER', price: 999, cycle: 'monthly', trialDays: 14, maxUsers: 5, maxApi: 10000 },
            { name: 'Growth', code: 'GROWTH', price: 2999, cycle: 'monthly', trialDays: 14, maxUsers: 25, maxApi: 100000 },
            { name: 'Professional', code: 'PRO', price: 7999, cycle: 'monthly', trialDays: 7, maxUsers: 100, maxApi: 1000000 },
            { name: 'Enterprise', code: 'ENT', price: 24999, cycle: 'yearly', trialDays: 30, maxUsers: -1, maxApi: -1 },
            { name: 'Starter Annual', code: 'STARTER-ANNUAL', price: 9990, cycle: 'yearly', trialDays: 14, maxUsers: 5, maxApi: 10000 },
        ];

        const planIds = {};
        for (let i = 0; i < plans.length; i++) {
            const p = plans[i];
            const r = await client.query(`
        INSERT INTO plans (id, tenant_id, name, code, description, billing_cycle, price, currency,
          trial_days, max_users, max_api_calls, is_active, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'INR',$8,$9,$10,true,$11)
        ON CONFLICT (tenant_id, code) DO UPDATE SET price = EXCLUDED.price
        RETURNING id
      `, [
                uuidv4(), tenantId, p.name, p.code,
                `${p.name} plan - perfect for ${p.name.toLowerCase()} businesses`,
                p.cycle, p.price, p.trialDays, p.maxUsers, p.maxApi, i
            ]);
            planIds[p.code] = r.rows[0].id;

            // Plan features
            const features = [
                { key: 'api_access', name: 'API Access', value: p.maxApi === -1 ? 'Unlimited' : p.maxApi.toLocaleString() },
                { key: 'users', name: 'Team Members', value: p.maxUsers === -1 ? 'Unlimited' : p.maxUsers.toString() },
                { key: 'support', name: 'Support Level', value: i < 2 ? 'Email' : i < 3 ? 'Priority' : '24/7 Dedicated' },
                { key: 'analytics', name: 'Advanced Analytics', value: i >= 2 ? 'true' : 'false' },
                { key: 'custom_domain', name: 'Custom Domain', value: i >= 2 ? 'true' : 'false' },
            ];
            for (const feat of features) {
                await client.query(`
          INSERT INTO plan_features (id, plan_id, tenant_id, name, key, value, is_enabled)
          VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT DO NOTHING
        `, [uuidv4(), r.rows[0].id, tenantId, feat.name, feat.key, feat.value]);
            }

            // Usage pricing for API calls
            await client.query(`
        INSERT INTO usage_pricing (id, plan_id, tenant_id, metric_name, metric_key, unit_name, unit_price, included_units)
        VALUES ($1,$2,$3,'API Calls','api_calls','call',0.001,$4) ON CONFLICT DO NOTHING
      `, [uuidv4(), r.rows[0].id, tenantId, p.maxApi === -1 ? 99999999 : p.maxApi]);
        }
        console.log(`   ✅ Plans: Starter, Growth, Professional, Enterprise + Annual`);

        // ─── 6. TAX RULES ────────────────────────────────────────────
        console.log('🧾 Creating GST tax rules...');
        const taxRuleResult = await client.query(`
      INSERT INTO tax_rules (id, tenant_id, name, tax_type, is_inclusive)
      VALUES ($1,$2,'GST 18%','GST',false)
      ON CONFLICT DO NOTHING RETURNING id
    `, [uuidv4(), tenantId]);

        if (taxRuleResult.rows.length > 0) {
            const taxRuleId = taxRuleResult.rows[0].id;
            await client.query(`
        INSERT INTO tax_rates (id, tax_rule_id, tenant_id, name, type, rate, country_code, state_code)
        VALUES
          ($1,$2,$3,'CGST 9%','CGST',9,'IN','MH'),
          ($4,$2,$3,'SGST 9%','SGST',9,'IN','MH'),
          ($5,$2,$3,'IGST 18%','IGST',18,'IN',NULL)
        ON CONFLICT DO NOTHING
      `, [uuidv4(), taxRuleId, tenantId, uuidv4(), uuidv4()]);
        }
        console.log(`   ✅ GST rules: CGST 9% + SGST 9% (intra-state), IGST 18% (inter-state)`);

        // ─── 7. CUSTOMERS ────────────────────────────────────────────
        console.log('👥 Creating demo customers...');
        const customers = [
            { code: 'CUST-001', company: 'TechStart Ltd', first: 'Rahul', last: 'Sharma', email: 'rahul@techstart.com', state: 'MH' },
            { code: 'CUST-002', company: 'Digital Dynamics', first: 'Priya', last: 'Patel', email: 'priya@digitaldyn.com', state: 'GJ' },
            { code: 'CUST-003', company: 'CloudWave Inc', first: 'Amit', last: 'Singh', email: 'amit@cloudwave.in', state: 'DL' },
            { code: 'CUST-004', company: 'InnoSoft Solutions', first: 'Sneha', last: 'Gupta', email: 'sneha@innosoft.com', state: 'KA' },
            { code: 'CUST-005', company: 'NetBridge Corp', first: 'Vikram', last: 'Nair', email: 'vikram@netbridge.co', state: 'MH' },
        ];

        const customerIds = [];
        for (const c of customers) {
            const r = await client.query(`
        INSERT INTO customers (id,tenant_id,code,company_name,first_name,last_name,email,currency,payment_terms,status,created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'INR',30,'active',$8)
        ON CONFLICT (tenant_id,email) DO UPDATE SET company_name = EXCLUDED.company_name
        RETURNING id
      `, [uuidv4(), tenantId, c.code, c.company, c.first, c.last, c.email, userIds['admin']]);
            customerIds.push({ id: r.rows[0].id, state: c.state });

            await client.query(`
        INSERT INTO tax_details (id,customer_id,tenant_id,tax_category,state_code)
        VALUES ($1,$2,$3,'regular',$4) ON CONFLICT DO NOTHING
      `, [uuidv4(), r.rows[0].id, tenantId, c.state]);
        }
        console.log(`   ✅ Customers: ${customers.length} demo customers`);

        // ─── 8. SUBSCRIPTIONS ────────────────────────────────────────
        console.log('🔄 Creating subscriptions...');
        const now = new Date();
        const subIds = [];

        for (let i = 0; i < customerIds.length; i++) {
            const custData = customerIds[i];
            const planCode = i === 0 ? 'GROWTH' : i === 1 ? 'STARTER' : i === 2 ? 'PRO' : i === 3 ? 'ENT' : 'STARTER';
            const planId = planIds[planCode];
            const planPrices = { 'GROWTH': 2999, 'STARTER': 999, 'PRO': 7999, 'ENT': 24999 };
            const price = planPrices[planCode] || 999;
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            const r = await client.query(`
        INSERT INTO subscriptions (id,tenant_id,customer_id,plan_id,status,quantity,unit_amount,
          discount_percent,discount_amount,subtotal,tax_amount,total_amount,currency,
          billing_cycle,current_period_start,current_period_end,next_billing_date,auto_renew,created_by)
        VALUES ($1,$2,$3,$4,'active',1,$5,0,0,$5,$6,$7,'INR','monthly',$8,$9,$9,true,$10)
        RETURNING id
      `, [
                uuidv4(), tenantId, custData.id, planId, price,
                price * 0.18, price + price * 0.18,
                now, periodEnd, userIds['admin']
            ]);
            subIds.push(r.rows[0].id);

            await client.query(`
        INSERT INTO subscription_history (id,subscription_id,tenant_id,event_type,to_plan_id,from_status,to_status,performed_by)
        VALUES ($1,$2,$3,'activated',$4,NULL,'active',$5)
      `, [uuidv4(), r.rows[0].id, tenantId, planId, userIds['admin']]);
        }
        console.log(`   ✅ Subscriptions: ${customerIds.length} active subscriptions`);

        // ─── 9. WEBHOOKS ─────────────────────────────────────────────
        console.log('🔔 Creating demo webhook...');
        await client.query(`
      INSERT INTO webhooks (id,tenant_id,name,url,secret,events,is_active,created_by)
      VALUES ($1,$2,'Demo Webhook','https://webhook.site/demo-endpoint','whsec_demo123456',
        ARRAY['invoice.created','invoice.paid','subscription.activated','payment.completed'],
        true,$3)
      ON CONFLICT DO NOTHING
    `, [uuidv4(), tenantId, userIds['owner']]);
        console.log(`   ✅ Webhook registered`);

        // ─── 10. USAGE LOGS ──────────────────────────────────────────
        console.log('📊 Creating usage logs...');
        for (let i = 0; i < Math.min(subIds.length, 3); i++) {
            for (let d = 0; d < 5; d++) {
                const logDate = new Date(now);
                logDate.setDate(logDate.getDate() - d);
                const qty = Math.floor(Math.random() * 500) + 100;
                await client.query(`
          INSERT INTO usage_logs (id,tenant_id,customer_id,subscription_id,metric_key,metric_name,
            quantity,unit,unit_price,amount,billed,recorded_at)
          VALUES ($1,$2,$3,$4,'api_calls','API Calls',$5,'call',0.001,$6,false,$7)
        `, [uuidv4(), tenantId, customerIds[i].id, subIds[i], qty, qty * 0.001, logDate]);
            }
        }
        console.log(`   ✅ Usage logs: 15 usage records`);

        await client.query('COMMIT');
        console.log('\n🎉 Database seeded successfully!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('  🏢 Tenant:      Acme Corp Solutions');
        console.log('  🔑 Login URL:   http://localhost:5000/api/v1/auth/login');
        console.log('  📧 Owner:       owner@acmecorp.com / Demo@123456');
        console.log('  📧 Admin:       admin@acmecorp.com / Demo@123456');
        console.log('  📧 Accountant:  accountant@acmecorp.com / Demo@123456');
        console.log('  📧 Viewer:      viewer@acmecorp.com / Demo@123456');
        console.log('  👥 Customers:   5 demo customers');
        console.log('  📋 Plans:       5 subscription plans');
        console.log('  🔄 Active Subs: 5 subscriptions');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
