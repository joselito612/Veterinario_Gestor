import type { Role } from './types.js';

export type Action =
  | 'users.manage'
  | 'products.write'
  | 'products.read'
  | 'patients.write'
  | 'patients.read'
  | 'attentions.create'
  | 'attentions.close'
  | 'attentions.annul'
  | 'clients.write'
  | 'clients.read'
  | 'appointments.write'
  | 'appointments.checkin'
  | 'payments.write'
  | 'payments.read'
  | 'audit.read';

const adminOnly: Action[] = [
  'users.manage',
  'products.write',
  'attentions.annul',
  'clients.write',
  'appointments.write',
  'appointments.checkin',
  'payments.write',
  'payments.read',
  'audit.read'
];

const vetAllowed: Action[] = [
  'products.read',
  'patients.write',
  'patients.read',
  'clients.read',
  'attentions.create',
  'attentions.close'
];

export function can(role: Role, action: Action): boolean {
  if (role === 'ADMIN') return true;
  return vetAllowed.includes(action);
}

export function adminOnlyActions(): Action[] {
  return [...adminOnly];
}
