const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { mensaje?: string }).mensaje ?? 'Ocurrió un error.');
  return body as T;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { mensaje?: string }).mensaje ?? 'No se pudo iniciar sesión.');
  return body as { token: string; user: { name: string; role: string } };
}
