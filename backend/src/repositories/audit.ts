import { randomUUID } from 'node:crypto';
import type { DbClient } from '../db/pool.js';
import type { AuthUser } from '../domain/types.js';

export async function writeAudit(
  db: DbClient,
  user: AuthUser | { id: string; name: string; role: string },
  action: string,
  entity: string,
  entityId: string,
  details: string
): Promise<void> {
  await db.query(
    'INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [randomUUID(), user.id, user.name, user.role, action, entity, entityId, details]
  );
}

export async function listAudit(db: DbClient, limit = 200): Promise<any[]> {
  const res = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
  return res.rows;
}
