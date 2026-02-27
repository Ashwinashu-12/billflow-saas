const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'saas_billing',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err);
});

/**
 * Execute a query with optional tenant isolation
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text: text.substring(0, 100), rows: res.rowCount, duration });
    return res;
  } catch (err) {
    logger.error('Database query error', { text: text.substring(0, 100), error: err.message });
    throw err;
  }
};

/**
 * Execute a query within a tenant-isolated transaction
 */
const tenantQuery = async (tenantId, text, params) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    const res = await client.query(text, params);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get a client for multi-statement transactions
 */
const getClient = async (tenantId = null) => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  client.release = () => {
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  if (tenantId) {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
  }

  return client;
};

/**
 * Run a function within a transaction
 */
const withTransaction = async (tenantId, fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (tenantId) {
      await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() as time, version() as version');
    logger.info('Database connected successfully', {
      time: res.rows[0].time,
      version: res.rows[0].version.substring(0, 50),
    });
    return true;
  } catch (err) {
    logger.error('Database connection failed', { error: err.message });
    return false;
  }
};

/**
 * Paginate a query
 */
const paginate = async (text, params, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const countQuery = `SELECT COUNT(*) as total FROM (${text}) as count_query`;
  const dataQuery = `${text} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, params),
    pool.query(dataQuery, [...params, limit, offset]),
  ]);

  const total = parseInt(countResult.rows[0].total);
  const pages = Math.ceil(total / limit);

  return {
    data: dataResult.rows,
    pagination: {
      total,
      pages,
      page: parseInt(page),
      limit: parseInt(limit),
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
};

module.exports = {
  query,
  tenantQuery,
  getClient,
  withTransaction,
  testConnection,
  paginate,
  pool,
};
