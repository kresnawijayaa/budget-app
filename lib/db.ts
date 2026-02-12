import { Pool, QueryResult, types } from 'pg';

// Override pg's DATE parser to return plain strings (YYYY-MM-DD)
// instead of JS Date objects, avoiding timezone conversion issues
types.setTypeParser(1082, (val: string) => val); // DATE
types.setTypeParser(1114, (val: string) => val); // TIMESTAMP
types.setTypeParser(1184, (val: string) => val); // TIMESTAMPTZ

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false,
});

const schema = process.env.DB_SCHEMA || 'budget_app';

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schema}`);
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}

export default pool;
