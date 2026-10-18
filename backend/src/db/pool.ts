import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { newDb } from 'pg-mem';

export interface DbClient {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number }>;
}

export interface DbPool extends DbClient {
  connect(): Promise<DbPoolClient>;
  end(): Promise<void>;
  isMemory: boolean;
}

export interface DbPoolClient extends DbClient {
  release(): void;
  queryRaw(text: string, params?: unknown[]): Promise<{ rows: any[]; rowCount: number }>;
}

function wrapPgPool(pool: Pool, isMemory: boolean): DbPool {
  return {
    isMemory,
    query: async (text: string, params?: unknown[]) => {
      const res = await pool.query(text, params as any[]);
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
    },
    connect: async () => {
      const client = await pool.connect();
      return {
        query: async (text: string, params?: unknown[]) => {
          const res = await client.query(text, params as any[]);
          return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
        },
        queryRaw: async (text: string, params?: unknown[]) => {
          const res = await client.query(text, params as any[]);
          return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
        },
        release: () => client.release()
      };
    },
    end: async () => {
      await pool.end();
    }
  };
}

export function createPool(): DbPool {
  const useMemory = (process.env.USE_PG_MEMORY ?? 'false').toLowerCase() !== 'false';
  if (useMemory) {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: 'uuid' as any,
      implementation: () => randomUUID()
    } as any);
    const pg = db.adapters.createPg();
    const pool = new pg.Pool();
    return wrapPgPool(pool as unknown as Pool, true);
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Falta configurar DATABASE_URL para usar PostgreSQL real (USE_PG_MEMORY=true solo está permitido en pruebas).');
  }
  const pool = new Pool({ connectionString });
  return wrapPgPool(pool, false);
}


