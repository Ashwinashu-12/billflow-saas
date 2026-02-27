const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'saas_billing',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
    const client = await pool.connect();
    console.log('🔄 Running database migrations...\n');

    try {
        // Create migrations tracking table
        await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Check if already migrated
        const migCheck = await client.query(
            "SELECT name FROM _migrations WHERE name = 'initial_schema'"
        );

        if (migCheck.rows.length === 0) {
            console.log('📦 Applying initial schema...');

            // Split and execute statements (excluding comments and empty lines)
            const statements = schema
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                try {
                    await client.query(statement);
                } catch (err) {
                    // Skip if already exists
                    if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
                        console.warn(`⚠️  Warning on statement: ${err.message}`);
                    }
                }
            }

            await client.query(
                "INSERT INTO _migrations (name) VALUES ('initial_schema')"
            );
            console.log('✅ Initial schema applied successfully!\n');
        } else {
            console.log('✅ Schema already up to date\n');
        }

        // Run any additional migrations here
        const migrationsDir = path.join(__dirname, 'migrations');
        if (fs.existsSync(migrationsDir)) {
            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(f => f.endsWith('.sql'))
                .sort();

            for (const file of migrationFiles) {
                const migCheck = await client.query(
                    'SELECT name FROM _migrations WHERE name = $1', [file]
                );

                if (migCheck.rows.length === 0) {
                    console.log(`📦 Applying migration: ${file}`);
                    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                    await client.query(sql);
                    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
                    console.log(`✅ Applied: ${file}`);
                }
            }
        }

        console.log('\n🎉 All migrations completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
