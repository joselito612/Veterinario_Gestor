// Copia los archivos SQL versionados junto al código compilado.
// Uso: node scripts/copy-migrations.js (se ejecuta como parte de `npm run build`).
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '..', 'src', 'db', 'migrations');
const dst = path.join(__dirname, '..', 'dist', 'db', 'migrations');

fs.mkdirSync(dst, { recursive: true });
for (const file of fs.readdirSync(src)) {
  if (file.endsWith('.sql')) {
    fs.copyFileSync(path.join(src, file), path.join(dst, file));
  }
}
console.log(`Migraciones copiadas a ${dst}`);
