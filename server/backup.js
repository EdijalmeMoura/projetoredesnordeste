import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(rootDir, 'data'));
const uploadsDir = path.join(dataDir, 'uploads');
const backupRoot = path.join(dataDir, 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const targetDir = path.join(backupRoot, timestamp);
fs.mkdirSync(targetDir, { recursive: true });
const sourcePath = path.join(dataDir, 'redes-nordeste.sqlite');
const targetDb = path.join(targetDir, 'redes-nordeste.sqlite');
if (!fs.existsSync(sourcePath)) throw new Error(`Banco não encontrado: ${sourcePath}`);
const db = new DatabaseSync(sourcePath);
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
try {
  db.exec(`VACUUM INTO ${quote(targetDb)}`);
} finally {
  db.close();
}
if (fs.existsSync(uploadsDir)) fs.cpSync(uploadsDir, path.join(targetDir, 'uploads'), { recursive: true, errorOnExist: false });
const secretPath = path.join(dataDir, 'jwt.secret');
if (fs.existsSync(secretPath)) fs.copyFileSync(secretPath, path.join(targetDir, 'jwt.secret'));
console.log(`Backup consistente criado em: ${targetDir}`);
