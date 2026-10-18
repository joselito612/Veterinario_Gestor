// Mutex sencillo en memoria para serializar cierres y anulaciones
// en una misma instancia. En producción multinstancia la
// serialización definitiva la aportan las transacciones con
// SELECT ... FOR UPDATE sobre los productos.
const chains = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  chains.set(key, prev.then(() => current));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (chains.get(key) === current) chains.delete(key);
  }
}
