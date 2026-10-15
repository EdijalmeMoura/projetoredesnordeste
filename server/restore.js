import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(rootDir, 'data'));
const sourceDir = process.argv[2] ? path.resolve(process.argv[2]) : '';
if (!sourceDir || !fs.existsSync(path.join(sourceDir, 'redes-nordeste.sqlite'))) {
  console.error('Uso: npm run restore -- /caminho/para/a/pasta-do-backup');
  process.exit(1);
}
const sourceDb = new DatabaseSync(path.join(sourceDir, 'redes-nordeste.sqlite'), { readOnly: true });
let integrityCheck;
try { integrityCheck = sourceDb.prepare('PRAGMA integrity_check').get()?.integrity_check; } finally { sourceDb.close(); }
if (integrityCheck !== 'ok') throw new Error(`Backup rejeitado: PRAGMA integrity_check retornou “${integrityCheck ?? 'sem resultado'}”.`);
fs.mkdirSync(dataDir, { recursive: true });
fs.copyFileSync(path.join(sourceDir, 'redes-nordeste.sqlite'), path.join(dataDir, 'redes-nordeste.sqlite'));
fs.rmSync(path.join(dataDir, 'uploads'), { recursive: true, force: true });
if (fs.existsSync(path.join(sourceDir, 'uploads'))) fs.cpSync(path.join(sourceDir, 'uploads'), path.join(dataDir, 'uploads'), { recursive: true });
fs.rmSync(path.join(dataDir, 'jwt.secret'), { force: true });
if (fs.existsSync(path.join(sourceDir, 'jwt.secret'))) fs.copyFileSync(path.join(sourceDir, 'jwt.secret'), path.join(dataDir, 'jwt.secret'));
console.log(`Dados restaurados de ${sourceDir}. Reinicie o servidor e valide o catálogo.`);
