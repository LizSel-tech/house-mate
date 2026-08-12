import { Pool, type PoolClient, type QueryResultRow } from 'pg';

type Queryable = Pool | PoolClient;

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function required(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(env('DATABASE_HOST') && env('DATABASE_USER') && env('DATABASE_NAME'));
}

export function getPool(): Pool {
  if (!globalForDb.pgPool) {
    globalForDb.pgPool = new Pool({
      host: required('DATABASE_HOST'),
      port: Number(env('DATABASE_PORT') || 5432),
      user: required('DATABASE_USER'),
      password: process.env.DATABASE_PASSWORD ?? '',
      database: required('DATABASE_NAME'),
      max: 10,
    });
  }
  return globalForDb.pgPool;
}

function camelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function toCamel<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => toCamel(item)) as T;
  }
  if (value instanceof Date || value === null || value === undefined) {
    return value as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[camelCase(key)] = toCamel(nested);
    }
    return out as T;
  }
  return value as T;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: Queryable,
): Promise<T[]> {
  const result = await (client ?? getPool()).query(text, params);
  return result.rows.map((row) => toCamel<T>(row));
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: Queryable,
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] ?? null;
}

/** Nested JSON selected as `data` (snake_case keys), mapped to camelCase. */
export async function queryData<T>(
  text: string,
  params: unknown[] = [],
  client?: Queryable,
): Promise<T[]> {
  const result = await (client ?? getPool()).query(text, params);
  return result.rows.map((row) => toCamel<T>(row.data));
}

export async function queryDataOne<T>(
  text: string,
  params: unknown[] = [],
  client?: Queryable,
): Promise<T | null> {
  const rows = await queryData<T>(text, params, client);
  return rows[0] ?? null;
}

export function buildUpdates(fields: Record<string, unknown>): {
  sets: string[];
  values: unknown[];
} {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [column, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  }
  return { sets, values };
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
