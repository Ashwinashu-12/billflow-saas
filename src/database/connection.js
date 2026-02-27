const { Pool } = require('pg');
const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Use DATABASE_URL in production (Render)
 * Use individual DB_* vars locally
 */
const pool = isProduction
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'saas_billing',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: false,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', {
    error: err.message,
  });
});

/**
 * Execute a query
 */
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Executed query', {
      text: text.substring(0, 100),
      rows: res.rowCount,
      duration,
    });

    return res;
  } catch (err) {
    logger.error('Database query error', {
      text: text.substring(0, 100),
      error: err.message,
    });
    throw err;
  }
};

/**
 * Execute query with tenant isolation
 */
const tenantQuery = async (tenantId, text, params = []) => {
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
 * Transaction helper
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
 * Test connection
 */
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() as time');
    logger.info('Database connected successfully', {
      time: res.rows[0].time,
    });
    return true;
  } catch (err) {
    logger.error('Database connection failed', {
      error: err.message,
    });
    return false;
  }
};

/**
 * Pagination helper
 */
const paginate = async (text, params = [], page = 1, limit = 20) => {
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
  withTransaction,
  testConnection,
  paginate,
  pool,
};