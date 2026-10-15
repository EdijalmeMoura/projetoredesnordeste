import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(rootDir, 'data'));
const uploadsDir = path.join(dataDir, 'uploads');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const secretFile = path.join(dataDir, 'jwt.secret');
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (fs.existsSync(secretFile)) jwtSecret = fs.readFileSync(secretFile, 'utf8').trim();
  else {
    jwtSecret = crypto.randomBytes(48).toString('base64url');
    fs.writeFileSync(secretFile, jwtSecret, { mode: 0o600 });
  }
}
if (jwtSecret.length < 32) throw new Error('JWT_SECRET precisa ter no mínimo 32 caracteres.');

const db = new DatabaseSync(path.join(dataDir, 'redes-nordeste.sqlite'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
function transaction(callback) {
  return (...args) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = callback(...args);
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
}
db.exec(`
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE IF NOT EXISTS owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  creci TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'house',
  purpose TEXT NOT NULL DEFAULT 'sale',
  description TEXT NOT NULL DEFAULT '',
  publication_status TEXT NOT NULL DEFAULT 'draft',
  availability_status TEXT NOT NULL DEFAULT 'available',
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  approved INTEGER NOT NULL DEFAULT 0,
  sale_price REAL,
  rent_price REAL,
  condo_fee REAL,
  iptu REAL,
  iptu_period TEXT NOT NULL DEFAULT 'yearly',
  extra_fees TEXT NOT NULL DEFAULT '',
  commercial_notes TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'PE',
  city TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  complement TEXT NOT NULL DEFAULT '',
  reference_point TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  show_exact_address INTEGER NOT NULL DEFAULT 0,
  area_built REAL,
  area_land REAL,
  bedrooms INTEGER NOT NULL DEFAULT 0,
  suites INTEGER NOT NULL DEFAULT 0,
  bathrooms INTEGER NOT NULL DEFAULT 0,
  parking INTEGER NOT NULL DEFAULT 0,
  rooms INTEGER NOT NULL DEFAULT 0,
  floors INTEGER NOT NULL DEFAULT 0,
  year_built INTEGER,
  owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  exclusive INTEGER NOT NULL DEFAULT 0,
  advertise_start TEXT,
  advertise_until TEXT,
  internal_notes TEXT NOT NULL DEFAULT '',
  owner_contact_note TEXT NOT NULL DEFAULT '',
  virtual_tour_url TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS property_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS property_features (
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, feature_id)
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  budget_min REAL,
  budget_max REAL,
  message TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'website',
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new',
  first_contact_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_interaction_at TEXT,
  next_activity_at TEXT,
  consent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS lead_properties (
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, property_id)
);
CREATE TABLE IF NOT EXISTS lead_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'note',
  note TEXT NOT NULL DEFAULT '',
  from_status TEXT,
  to_status TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  scheduled_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  visitor_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (user_id IS NOT NULL OR visitor_key IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS property_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  note TEXT NOT NULL DEFAULT '',
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS content_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS owner_inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  property_type TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  consent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS privacy_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  request_type TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_properties_public ON properties(publication_status, approved, availability_status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city, neighborhood);
CREATE INDEX IF NOT EXISTS idx_properties_purpose ON properties(purpose, sale_price, rent_price);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
`);

const roleSeed = [
  ['administrator', 'Administrador'],
  ['manager', 'Gerente imobiliário'],
  ['agent', 'Corretor'],
  ['editor', 'Editor de anúncios'],
];
const permissionSeed = [
  ['properties.read', 'Consultar imóveis'], ['properties.write', 'Cadastrar e editar imóveis'],
  ['properties.publish', 'Publicar imóveis'], ['leads.read', 'Consultar leads'],
  ['leads.write', 'Gerenciar leads'], ['people.read', 'Consultar proprietários e corretores'],
  ['appointments.write', 'Gerenciar agendamentos'], ['reports.read', 'Consultar relatórios'],
  ['settings.write', 'Administrar configurações'], ['users.manage', 'Administrar usuários e permissões'],
  ['audit.read', 'Consultar auditoria'],
];
const seedAuth = transaction(() => {
  const addRole = db.prepare('INSERT OR IGNORE INTO roles (name, label) VALUES (?, ?)');
  roleSeed.forEach((row) => addRole.run(...row));
  const addPermission = db.prepare('INSERT OR IGNORE INTO permissions (name, description) VALUES (?, ?)');
  permissionSeed.forEach((row) => addPermission.run(...row));
  const allPermissions = db.prepare('SELECT id FROM permissions').all();
  const map = {
    administrator: allPermissions.map((row) => row.id),
    manager: allPermissions.filter((_, i) => i !== 9 && i !== 10).map((row) => row.id),
    agent: allPermissions.filter((_, i) => [0, 3, 4, 6].includes(i)).map((row) => row.id),
    editor: allPermissions.filter((_, i) => [0, 1].includes(i)).map((row) => row.id),
  };
  const addRolePermission = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  for (const [roleName, permissionIds] of Object.entries(map)) {
    const role = db.prepare('SELECT id FROM roles WHERE name = ?').get(roleName);
    permissionIds.forEach((permissionId) => addRolePermission.run(role.id, permissionId));
  }
});
seedAuth();

const siteDefaults = {
  businessName: 'Projeto Redes Nordeste',
  phone: '',
  email: '',
  instagram: '',
  facebook: '',
  institutionalText: 'Você investe. A REDES gere. A comunidade cresce. Todos ganham. O Projeto REDES conecta investidores, hóspedes e negócios locais por meio do turismo, de uma gestão humanizada e de experiências com identidade nordestina.',
  whatsapp: '558196289777',
  logoUrl: '',
};
for (const [key, value] of Object.entries(siteDefaults)) {
  db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)').run(key, String(value));
}
const defaultPages = [
  ['sobre', 'Sobre o Projeto Redes Nordeste', 'O Projeto REDES nasceu da união entre turismo, inovação, impacto social e visão de futuro. Conectamos investidores, hóspedes e negócios locais por meio da gestão humanizada de casas de temporada e de experiências selecionadas por quem conhece cada canto da região. Você investe. A REDES gere. A comunidade cresce. Todos ganham.\n\nEsta plataforma amplia essa conexão com uma curadoria de imóveis residenciais para compra e aluguel no Nordeste, mantendo o compromisso com atendimento próximo, desenvolvimento local e informação transparente.', 'Conheça o Projeto REDES, uma iniciativa que conecta turismo, imóveis, investidores, hóspedes e negócios locais no Nordeste.'],
  ['privacidade', 'Política de privacidade', 'Tratamos os dados enviados nos formulários exclusivamente para responder ao seu contato e atender à sua solicitação. O acesso é restrito à equipe responsável. Você pode solicitar acesso, correção ou exclusão dos dados pelos canais informados nesta página.', 'Saiba como o Projeto Redes Nordeste trata e protege seus dados pessoais.'],
  ['termos', 'Termos de uso', 'As informações dos anúncios são fornecidas para fins de consulta e podem ser atualizadas. A disponibilidade, os valores e as condições do imóvel devem ser confirmados com a equipe antes de qualquer decisão. Imagens identificadas como exemplo são demonstrativas e não representam anúncios reais.', 'Condições de uso do site Projeto Redes Nordeste.'],
];
const addPage = db.prepare('INSERT OR IGNORE INTO content_pages (slug, title, content, meta_description) VALUES (?, ?, ?, ?)');
defaultPages.forEach((row) => addPage.run(...row));

const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
if (!userCount) {
  const email = (process.env.ADMIN_EMAIL || 'admin@redesnordeste.local').trim().toLowerCase();
  const initialPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('base64url');
  const name = process.env.ADMIN_NAME || 'Administrador';
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL precisa conter um endereço válido.');
  if (process.env.ADMIN_PASSWORD && initialPassword.length < 12) throw new Error('ADMIN_PASSWORD precisa ter no mínimo 12 caracteres.');
  const createUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
  const result = createUser.run(name, email, bcrypt.hashSync(initialPassword, 12));
  const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('administrator');
  db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(result.lastInsertRowid, adminRole.id);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│  PRIMEIRO ACESSO — credencial temporária do ambiente   │');
    console.log(`│  E-mail: ${email.padEnd(44)}│`);
    console.log(`│  Senha:  ${initialPassword.padEnd(44)}│`);
    console.log('│  Defina ADMIN_PASSWORD antes de iniciar em produção.   │');
    console.log('└────────────────────────────────────────────────────────┘\n');
  }
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function cleanString(value, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function safeHttpUrl(value) {
  const input = cleanString(value, 500);
  try {
    const url = new URL(input);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.toString();
  } catch { return ''; }
}
function isLocalImagePath(value) {
  return /^\/(?:uploads|assets)\/[a-zA-Z0-9._/-]+$/.test(value) && !value.split('/').includes('..');
}
function roleForUser(userId) {
  return db.prepare(`SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? LIMIT 1`).get(userId)?.name || 'agent';
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
function audit(userId, action, entityType, entityId = null, details = '') {
  db.prepare(`INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
    .run(userId || null, action, entityType, entityId, String(details || '').slice(0, 1000));
}
function addHistory(propertyId, field, oldValue, newValue, userId, note = '') {
  db.prepare(`INSERT INTO property_status_history (property_id, field, old_value, new_value, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(propertyId, field, oldValue == null ? null : String(oldValue), newValue == null ? null : String(newValue), note, userId || null);
}
function propertyImages(propertyId) {
  return db.prepare('SELECT id, url, caption, sort_order, is_cover FROM property_images WHERE property_id = ? ORDER BY is_cover DESC, sort_order ASC, id ASC').all(propertyId);
}
function propertyFeatures(propertyId) {
  return db.prepare(`SELECT f.id, f.name, f.slug FROM features f JOIN property_features pf ON pf.feature_id = f.id WHERE pf.property_id = ? ORDER BY f.name`).all(propertyId);
}
function getPropertyById(id) {
  const property = db.prepare(`
    SELECT p.*, o.name AS owner_name, a.name AS agent_name
    FROM properties p LEFT JOIN owners o ON o.id = p.owner_id LEFT JOIN agents a ON a.id = p.agent_id
    WHERE p.id = ?
  `).get(id);
  if (!property) return null;
  property.images = propertyImages(id);
  property.features = propertyFeatures(id);
  return property;
}
function toRestrictedAdminProperty(property, role) {
  if (!property || ['administrator', 'manager'].includes(role)) return property;
  const result = { ...property };
  for (const key of ['owner_id', 'owner_name', 'owner_contact_note', 'internal_notes', 'commercial_notes', 'exclusive', 'street', 'number', 'complement', 'zip', 'latitude', 'longitude', 'reference_point']) delete result[key];
  return result;
}
function toPublicProperty(property) {
  if (!property) return null;
  const result = { ...property };
  for (const key of ['owner_id', 'owner_name', 'agent_id', 'internal_notes', 'owner_contact_note', 'commercial_notes', 'created_by', 'approved', 'advertise_until', 'exclusive']) delete result[key];
  if (!Number(result.show_exact_address)) {
    for (const key of ['latitude', 'longitude', 'reference_point', 'number', 'complement', 'street', 'zip']) delete result[key];
  }
  return result;
}
function getPublicPropertyByKey(key) {
  const property = db.prepare(`
    SELECT p.* FROM properties p
    WHERE (p.slug = ? OR p.code = ?)
      AND p.publication_status = 'published' AND p.approved = 1
      AND p.availability_status IN ('available', 'reserved', 'negotiation')
    LIMIT 1
  `).get(key, key);
  if (!property) return null;
  property.images = propertyImages(property.id);
  property.features = propertyFeatures(property.id);
  return toPublicProperty(property);
}

const featureDefaults = ['Piscina', 'Varanda', 'Jardim', 'Área gourmet', 'Academia', 'Portaria', 'Elevador', 'Ar-condicionado', 'Móveis planejados', 'Condomínio fechado', 'Acessibilidade', 'Energia solar'];
const addFeature = db.prepare('INSERT OR IGNORE INTO features (name, slug) VALUES (?, ?)');
featureDefaults.forEach((name) => addFeature.run(name, slugify(name)));

const propertyColumns = [
  'code', 'title', 'slug', 'type', 'purpose', 'description', 'publication_status', 'availability_status',
  'is_featured', 'is_demo', 'approved', 'sale_price', 'rent_price', 'condo_fee', 'iptu', 'iptu_period',
  'extra_fees', 'commercial_notes', 'state', 'city', 'neighborhood', 'zip', 'street', 'number', 'complement',
  'reference_point', 'latitude', 'longitude', 'show_exact_address', 'area_built', 'area_land', 'bedrooms', 'suites',
  'bathrooms', 'parking', 'rooms', 'floors', 'year_built', 'owner_id', 'agent_id', 'exclusive', 'advertise_start',
  'advertise_until', 'internal_notes', 'owner_contact_note', 'virtual_tour_url', 'created_by', 'published_at', 'created_at', 'updated_at',
];
const propertyInsert = db.prepare(`INSERT INTO properties (${propertyColumns.join(', ')}) VALUES (${propertyColumns.map((column) => `@${column}`).join(', ')})`);

if (!db.prepare('SELECT COUNT(*) AS count FROM properties').get().count) {
  const now = new Date().toISOString();
  const demoProperties = [
    {
      code: 'PRN-EX-001', title: 'Apartamento com luz natural e vista para o mar', slug: 'apartamento-vista-mar-recife-prn-ex-001', type: 'apartment', purpose: 'sale',
      description: 'Exemplo demonstrativo de anúncio. Ambientes integrados, varanda generosa e uma vista aberta para a cidade. Este conteúdo é ilustrativo e não representa um imóvel disponível para negociação.',
      publication_status: 'published', availability_status: 'available', is_featured: 1, is_demo: 1, approved: 1,
      sale_price: 645000, rent_price: null, condo_fee: 780, iptu: 2200, iptu_period: 'yearly', extra_fees: '', commercial_notes: '',
      state: 'PE', city: 'Recife', neighborhood: 'Boa Viagem', zip: '', street: '', number: '', complement: '', reference_point: '', latitude: null, longitude: null,
      show_exact_address: 0, area_built: 91, area_land: null, bedrooms: 3, suites: 1, bathrooms: 2, parking: 2, rooms: 1, floors: 1, year_built: 2019,
      owner_id: null, agent_id: null, exclusive: 0, advertise_start: null, advertise_until: null, internal_notes: '', created_by: 1,
      published_at: now, created_at: now, updated_at: now,
      images: [{ url: '/assets/property-apartment.jpg', caption: 'Sala integrada e iluminada', is_cover: 1 }],
      features: ['Varanda', 'Elevador', 'Ar-condicionado'],
    },
    {
      code: 'PRN-EX-002', title: 'Casa contemporânea com jardim acolhedor', slug: 'casa-jardim-camaragibe-prn-ex-002', type: 'house', purpose: 'sale',
      description: 'Exemplo demonstrativo de anúncio. Uma casa pensada para viver bons momentos, com ambientes confortáveis, área verde e espaço para reunir a família. Os dados são fictícios e servem apenas para apresentar a plataforma.',
      publication_status: 'published', availability_status: 'available', is_featured: 1, is_demo: 1, approved: 1,
      sale_price: 980000, rent_price: null, condo_fee: null, iptu: 1450, iptu_period: 'yearly', extra_fees: '', commercial_notes: '',
      state: 'PE', city: 'Camaragibe', neighborhood: 'Aldeia', zip: '', street: '', number: '', complement: '', reference_point: '', latitude: null, longitude: null,
      show_exact_address: 0, area_built: 228, area_land: 520, bedrooms: 4, suites: 2, bathrooms: 3, parking: 3, rooms: 2, floors: 2, year_built: 2021,
      owner_id: null, agent_id: null, exclusive: 0, advertise_start: null, advertise_until: null, internal_notes: '', created_by: 1,
      published_at: now, created_at: now, updated_at: now,
      images: [{ url: '/assets/property-house.jpg', caption: 'Fachada e jardim', is_cover: 1 }],
      features: ['Jardim', 'Área gourmet', 'Condomínio fechado'],
    },
    {
      code: 'PRN-EX-003', title: 'Duplex elegante perto de tudo', slug: 'duplex-elegante-recife-prn-ex-003', type: 'duplex', purpose: 'rent',
      description: 'Exemplo demonstrativo de anúncio. Um duplex de atmosfera contemporânea, com pé-direito alto e acabamentos em tons naturais. Informação ilustrativa, sem oferta imobiliária real.',
      publication_status: 'published', availability_status: 'available', is_featured: 1, is_demo: 1, approved: 1,
      sale_price: null, rent_price: 4500, condo_fee: 620, iptu: 180, iptu_period: 'monthly', extra_fees: '', commercial_notes: '',
      state: 'PE', city: 'Recife', neighborhood: 'Casa Forte', zip: '', street: '', number: '', complement: '', reference_point: '', latitude: null, longitude: null,
      show_exact_address: 0, area_built: 145, area_land: null, bedrooms: 3, suites: 2, bathrooms: 3, parking: 2, rooms: 2, floors: 2, year_built: 2020,
      owner_id: null, agent_id: null, exclusive: 0, advertise_start: null, advertise_until: null, internal_notes: '', created_by: 1,
      published_at: now, created_at: now, updated_at: now,
      images: [{ url: '/assets/property-duplex.jpg', caption: 'Sala com pé-direito duplo', is_cover: 1 }],
      features: ['Varanda', 'Móveis planejados', 'Ar-condicionado'],
    },
  ];
  const seedDemos = transaction(() => {
    for (const demo of demoProperties) {
      const { images, features, ...property } = demo;
      property.owner_contact_note = '';
      property.virtual_tour_url = '';
      propertyInsert.run(property);
      const propertyId = db.prepare('SELECT id FROM properties WHERE code = ?').get(property.code).id;
      const addImage = db.prepare('INSERT INTO property_images (property_id, url, caption, sort_order, is_cover) VALUES (?, ?, ?, ?, ?)');
      images.forEach((image, index) => addImage.run(propertyId, image.url, image.caption, index, image.is_cover ? 1 : 0));
      for (const name of features) {
        addFeature.run(name, slugify(name));
        const featureId = db.prepare('SELECT id FROM features WHERE name = ?').get(name).id;
        db.prepare('INSERT OR IGNORE INTO property_features (property_id, feature_id) VALUES (?, ?)').run(propertyId, featureId);
      }
      addHistory(propertyId, 'created', null, 'demo', 1, 'Registro demonstrativo da instalação inicial.');
    }
  });
  seedDemos();
}

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadsDir, { maxAge: '1d', immutable: false }));

function authRequired(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = db.prepare('SELECT id, name, email, active FROM users WHERE id = ?').get(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: 'Conta inativa ou não encontrada.' });
    req.user = { ...user, role: roleForUser(user.id) };
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });
  }
}
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Você não tem permissão para esta operação.' });
    return next();
  };
}
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' } });
const publicFormLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: 'draft-7', legacyHeaders: false });

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'sqlite', timestamp: new Date().toISOString() }));

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = db.prepare('SELECT id, name, email, password_hash, active FROM users WHERE email = ? COLLATE NOCASE').get(email);
  if (!user || !user.active || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  const role = roleForUser(user.id);
  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '8h', issuer: 'redes-nordeste' });
  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(new Date().toISOString(), new Date().toISOString(), user.id);
  audit(user.id, 'auth.login', 'user', user.id, 'Acesso ao painel administrativo.');
  return res.json({ token, user: publicUser({ ...user, role }) });
});
app.get('/api/auth/me', authRequired, (req, res) => res.json({ user: publicUser(req.user) }));
app.post('/api/auth/logout', authRequired, (req, res) => {
  audit(req.user.id, 'auth.logout', 'user', req.user.id, 'Encerramento da sessão.');
  res.json({ ok: true });
});

app.get('/api/public/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  res.json(settings);
});
app.get('/api/public/pages/:slug', (req, res) => {
  const page = db.prepare('SELECT slug, title, content, meta_description FROM content_pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Página não encontrada.' });
  res.json(page);
});

app.get('/api/public/properties', (req, res) => {
  const params = req.query;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page, 10) || 1));
  const limit = Math.max(1, Math.min(24, Number.parseInt(params.limit, 10) || 9));
  const where = ["p.publication_status = 'published'", 'p.approved = 1', "p.availability_status IN ('available', 'reserved', 'negotiation')"];
  const values = [];
  const purpose = cleanString(params.purpose, 20);
  if (purpose === 'sale' || purpose === 'rent') {
    where.push('(p.purpose = ? OR p.purpose = ?)'); values.push(purpose, 'both');
  }
  const type = cleanString(params.type, 40);
  if (type && type !== 'all') { where.push('p.type = ?'); values.push(type); }
  for (const [key, column] of [['city', 'p.city'], ['neighborhood', 'p.neighborhood']]) {
    const value = cleanString(params[key], 100);
    if (value) { where.push(`${column} LIKE ?`); values.push(`%${value}%`); }
  }
  const minPrice = toNumber(params.minPrice);
  const maxPrice = toNumber(params.maxPrice);
  const priceColumn = purpose === 'rent' ? 'p.rent_price' : purpose === 'sale' ? 'p.sale_price' : 'COALESCE(p.sale_price, p.rent_price)';
  if (minPrice !== null) { where.push(`${priceColumn} >= ?`); values.push(minPrice); }
  if (maxPrice !== null) { where.push(`${priceColumn} <= ?`); values.push(maxPrice); }
  const filters = [
    ['bedrooms', 'p.bedrooms'], ['bathrooms', 'p.bathrooms'], ['parking', 'p.parking'], ['minArea', 'p.area_built'],
  ];
  filters.forEach(([key, column]) => {
    const value = toNumber(params[key]);
    if (value !== null) { where.push(`${column} >= ?`); values.push(value); }
  });
  const orderBy = ({
    'price-asc': `${priceColumn} ASC`,
    'price-desc': `${priceColumn} DESC`,
    recent: 'p.created_at DESC',
    relevance: 'p.is_featured DESC, p.created_at DESC',
  })[cleanString(params.sort, 20)] || 'p.is_featured DESC, p.created_at DESC';
  const whereSql = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS total FROM properties p WHERE ${whereSql}`).get(...values).total;
  const rows = db.prepare(`SELECT p.* FROM properties p WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...values, limit, (page - 1) * limit);
  const properties = rows.map((property) => {
    property.images = propertyImages(property.id);
    property.features = propertyFeatures(property.id);
    return toPublicProperty(property);
  });
  return res.json({ properties, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});
app.get('/api/public/properties/:key', (req, res) => {
  const property = getPublicPropertyByKey(cleanString(req.params.key, 180));
  if (!property) return res.status(404).json({ error: 'Este imóvel não está disponível para consulta pública.' });
  return res.json(property);
});
app.post('/api/public/leads', publicFormLimiter, (req, res) => {
  const name = cleanString(req.body?.name, 120);
  const phone = cleanString(req.body?.phone, 40);
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const message = cleanString(req.body?.message, 2500);
  const consent = req.body?.consent === true;
  if (name.length < 2 || phone.replace(/\D/g, '').length < 8) return res.status(400).json({ error: 'Informe seu nome e um telefone válido.' });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Informe um e-mail válido ou deixe o campo em branco.' });
  const budgetMin = toNumber(req.body?.budgetMin); const budgetMax = toNumber(req.body?.budgetMax);
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) return res.status(400).json({ error: 'A faixa mínima não pode ser maior que a máxima.' });
  if (!consent) return res.status(400).json({ error: 'É necessário consentir com o tratamento dos dados para enviar sua solicitação.' });
  const propertyId = Number(req.body?.propertyId) || null;
  if (propertyId) {
    const property = db.prepare(`SELECT id FROM properties WHERE id = ? AND publication_status = 'published' AND approved = 1 AND availability_status IN ('available','reserved','negotiation')`).get(propertyId);
    if (!property) return res.status(404).json({ error: 'O imóvel selecionado não está disponível.' });
  }
  const createdAt = new Date().toISOString();
  const requestedSource = cleanString(req.body?.source, 40);
  const source = propertyId ? 'property-page' : (['contact-page', 'website'].includes(requestedSource) ? requestedSource : 'website');
  const insertLead = db.prepare(`INSERT INTO leads (name, phone, email, purpose, budget_min, budget_max, message, source, status, first_contact_at, consent_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?)`);
  const result = insertLead.run(
    name, phone, email, cleanString(req.body?.purpose, 20), toNumber(req.body?.budgetMin), toNumber(req.body?.budgetMax), message,
    source, createdAt, createdAt, createdAt, createdAt,
  );
  if (propertyId) db.prepare('INSERT INTO lead_properties (lead_id, property_id) VALUES (?, ?)').run(result.lastInsertRowid, propertyId);
  db.prepare('INSERT INTO lead_activities (lead_id, type, note) VALUES (?, ?, ?)').run(result.lastInsertRowid, 'created', 'Solicitação recebida pelo site.');
  return res.status(201).json({ ok: true, message: 'Recebemos sua solicitação. Nossa equipe poderá entrar em contato em breve.' });
});
app.post('/api/public/owner-inquiries', publicFormLimiter, (req, res) => {
  const name = cleanString(req.body?.name, 120);
  const phone = cleanString(req.body?.phone, 40);
  if (name.length < 2 || phone.replace(/\D/g, '').length < 8) return res.status(400).json({ error: 'Informe seu nome e um telefone válido.' });
  if (req.body?.consent !== true) return res.status(400).json({ error: 'É necessário consentir com o tratamento dos dados para enviar.' });
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO owner_inquiries (name, phone, email, property_type, city, neighborhood, purpose, message, consent_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(name, phone, cleanString(req.body?.email, 200), cleanString(req.body?.propertyType, 50), cleanString(req.body?.city, 100), cleanString(req.body?.neighborhood, 100), cleanString(req.body?.purpose, 20), cleanString(req.body?.message, 2500), now, now);
  return res.status(201).json({ ok: true, message: 'Recebemos os dados do imóvel para análise da equipe.' });
});
app.post('/api/public/privacy-requests', publicFormLimiter, (req, res) => {
  const name = cleanString(req.body?.name, 120);
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const phone = cleanString(req.body?.phone, 40);
  const requestType = cleanString(req.body?.requestType, 30);
  const details = cleanString(req.body?.details, 2000);
  if (name.length < 2 || (email && !/^\S+@\S+\.\S+$/.test(email)) || (!email && phone.replace(/\D/g, '').length < 8)) return res.status(400).json({ error: 'Informe seu nome e um e-mail ou telefone válido para retorno.' });
  if (!['access', 'correction', 'deletion'].includes(requestType)) return res.status(400).json({ error: 'Selecione o tipo de solicitação.' });
  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO privacy_requests (name,email,phone,request_type,details,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(name, email, phone, requestType, details, now, now);
  audit(null, 'privacy.request_received', 'privacy_request', result.lastInsertRowid, requestType);
  return res.status(201).json({ ok: true, message: 'Sua solicitação foi registrada para análise da equipe responsável.' });
});

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' })[file.mimetype];
    cb(null, `${crypto.randomUUID()}${ext || '.bin'}`);
  },
});
const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)) return cb(new Error('Formato não permitido. Use JPG, PNG, WebP ou AVIF.'));
    return cb(null, true);
  },
});
function validImageSignature(file) {
  const bytes = fs.readFileSync(file.path).subarray(0, 16);
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (file.mimetype === 'image/avif') return bytes.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(bytes.toString('ascii', 8, 12));
  return false;
}
app.post('/api/admin/uploads', authRequired, requireRoles('administrator', 'manager', 'editor'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Escolha uma imagem válida para enviar.' });
  if (!validImageSignature(req.file)) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: 'O conteúdo do arquivo não corresponde a uma imagem permitida.' }); }
  audit(req.user.id, 'media.uploaded', 'property_image', null, `Arquivo: ${req.file.filename}`);
  return res.status(201).json({ url: `/uploads/${req.file.filename}`, originalName: req.file.originalname, size: req.file.size });
});

function ownerView(owner) { return owner; }
app.get('/api/admin/overview', authRequired, requireRoles('administrator', 'manager', 'agent', 'editor'), (req, res) => {
  const propertyFilter = req.user.role === 'agent' ? ' WHERE agent_id = (SELECT id FROM agents WHERE user_id = ?)' : '';
  const propertyParams = req.user.role === 'agent' ? [req.user.id] : [];
  const propertyCount = db.prepare(`SELECT COUNT(*) AS count FROM properties${propertyFilter}`).get(...propertyParams).count;
  const published = db.prepare(`SELECT COUNT(*) AS count FROM properties${propertyFilter ? `${propertyFilter} AND` : ' WHERE'} publication_status = 'published' AND approved = 1`).get(...propertyParams).count;
  const available = db.prepare(`SELECT COUNT(*) AS count FROM properties${propertyFilter ? `${propertyFilter} AND` : ' WHERE'} availability_status = 'available'`).get(...propertyParams).count;
  const negotiation = db.prepare(`SELECT COUNT(*) AS count FROM properties${propertyFilter ? `${propertyFilter} AND` : ' WHERE'} availability_status IN ('reserved','negotiation')`).get(...propertyParams).count;
  const sold = db.prepare(`SELECT COUNT(*) AS count FROM properties${propertyFilter ? `${propertyFilter} AND` : ' WHERE'} availability_status = 'sold'`).get(...propertyParams).count;
  const rented = db.prepare(`SELECT COUNT(*) AS count FROM properties${propertyFilter ? `${propertyFilter} AND` : ' WHERE'} availability_status = 'rented'`).get(...propertyParams).count;
  const leadFilter = req.user.role === 'agent' ? ' WHERE l.agent_id = (SELECT id FROM agents WHERE user_id = ?)' : '';
  const leadParams = req.user.role === 'agent' ? [req.user.id] : [];
  const leadCount = db.prepare(`SELECT COUNT(*) AS count FROM leads l${leadFilter}`).get(...leadParams).count;
  const openLeads = db.prepare(`SELECT COUNT(*) AS count FROM leads l${leadFilter ? `${leadFilter} AND` : ' WHERE'} l.status IN ('new','awaiting','contacted','visit','proposal','negotiation')`).get(...leadParams).count;
  const monthlyProperties = db.prepare(`SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS total FROM properties ${propertyFilter ? 'WHERE agent_id = (SELECT id FROM agents WHERE user_id = ?) AND' : 'WHERE'} created_at >= date('now', '-5 months', 'start of month') GROUP BY month ORDER BY month`).all(...propertyParams);
  const propertiesByPurpose = db.prepare(`SELECT purpose AS name, COUNT(*) AS value FROM properties${propertyFilter} GROUP BY purpose`).all(...propertyParams);
  const propertiesByCity = db.prepare(`SELECT city AS name, COUNT(*) AS value FROM properties${propertyFilter} AND city != '' GROUP BY city ORDER BY value DESC LIMIT 6`.replace('properties AND', 'properties WHERE')).all(...propertyParams);
  const leadsByMonth = db.prepare(`SELECT substr(created_at,1,7) AS month, COUNT(*) AS total FROM leads ${leadFilter ? 'WHERE agent_id = (SELECT id FROM agents WHERE user_id = ?) AND' : 'WHERE'} created_at >= date('now', '-5 months', 'start of month') GROUP BY month ORDER BY month`).all(...leadParams);
  const recentActivity = req.user.role === 'agent'
    ? db.prepare(`SELECT l.id, l.name, l.status, l.created_at, 'lead' AS kind FROM leads l WHERE l.agent_id = (SELECT id FROM agents WHERE user_id = ?) ORDER BY l.created_at DESC LIMIT 6`).all(req.user.id)
    : db.prepare(`SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.created_at DESC LIMIT 8`).all();
  return res.json({
    metrics: { properties: propertyCount, published, available, negotiation, sold, rented, leads: leadCount, openLeads },
    monthlyProperties, propertiesByPurpose, propertiesByCity, leadsByMonth, recentActivity,
    demoCount: db.prepare('SELECT COUNT(*) AS count FROM properties WHERE is_demo = 1').get().count,
  });
});

app.get('/api/admin/properties', authRequired, requireRoles('administrator', 'manager', 'agent', 'editor'), (req, res) => {
  const where = [];
  const values = [];
  if (req.user.role === 'agent') { where.push('(p.agent_id = (SELECT id FROM agents WHERE user_id = ?) OR p.created_by = ?)'); values.push(req.user.id, req.user.id); }
  const search = cleanString(req.query.search, 150);
  if (search) { where.push('(p.code LIKE ? OR p.title LIKE ? OR p.city LIKE ? OR p.neighborhood LIKE ?)'); values.push(...Array(4).fill(`%${search}%`)); }
  for (const [key, column] of [['purpose', 'p.purpose'], ['type', 'p.type'], ['publication_status', 'p.publication_status'], ['availability_status', 'p.availability_status'], ['city', 'p.city']]) {
    const value = cleanString(req.query[key], 100);
    if (value) { where.push(`${column} = ?`); values.push(value); }
  }
  const query = `SELECT p.*, a.name AS agent_name FROM properties p LEFT JOIN agents a ON a.id = p.agent_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.updated_at DESC LIMIT 250`;
  const properties = db.prepare(query).all(...values).map((property) => toRestrictedAdminProperty({ ...property, images: propertyImages(property.id) }, req.user.role));
  res.json({ properties, total: properties.length });
});
app.get('/api/admin/properties/:id', authRequired, requireRoles('administrator', 'manager', 'agent', 'editor'), (req, res) => {
  const property = getPropertyById(Number(req.params.id));
  if (!property) return res.status(404).json({ error: 'Imóvel não encontrado.' });
  if (req.user.role === 'agent') {
    const agent = db.prepare('SELECT id FROM agents WHERE user_id = ?').get(req.user.id);
    if ((!agent || property.agent_id !== agent.id) && property.created_by !== req.user.id) return res.status(403).json({ error: 'Você não pode consultar este imóvel.' });
  }
  res.json({ property: toRestrictedAdminProperty(property, req.user.role) });
});

function normalizeProperty(body, userId, existing = null) {
  const title = cleanString(body.title, 180);
  const purpose = ['sale', 'rent', 'both'].includes(body.purpose) ? body.purpose : 'sale';
  const publicationStatus = ['draft', 'pending_review', 'published', 'archived'].includes(body.publication_status) ? body.publication_status : 'draft';
  const availabilityStatus = ['available', 'reserved', 'negotiation', 'sold', 'rented'].includes(body.availability_status) ? body.availability_status : 'available';
  const now = new Date().toISOString();
  const id = existing?.id;
  const sequence = id || (db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM properties').get().next_id);
  const code = existing?.code || `PRN-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;
  let slugBase = `${slugify(title) || 'imovel'}-${slugify(cleanString(body.neighborhood, 100)) || 'nordeste'}-${code.toLowerCase()}`;
  let slug = slugBase;
  let suffix = 1;
  while (db.prepare('SELECT id FROM properties WHERE slug = ? AND id != ?').get(slug, id || -1)) slug = `${slugBase}-${suffix++}`;
  return {
    code, title, slug,
    type: cleanString(body.type, 50) || 'house', purpose,
    description: cleanString(body.description, 12000), publication_status: publicationStatus,
    availability_status: availabilityStatus, is_featured: body.is_featured ? 1 : 0,
    is_demo: body.is_demo ? 1 : 0, approved: publicationStatus === 'published' ? 1 : 0,
    sale_price: toNumber(body.sale_price), rent_price: toNumber(body.rent_price), condo_fee: toNumber(body.condo_fee), iptu: toNumber(body.iptu),
    iptu_period: ['monthly', 'yearly'].includes(body.iptu_period) ? body.iptu_period : 'yearly',
    extra_fees: cleanString(body.extra_fees, 500), commercial_notes: cleanString(body.commercial_notes, 1500),
    state: cleanString(body.state, 2).toUpperCase() || 'PE', city: cleanString(body.city, 100), neighborhood: cleanString(body.neighborhood, 100),
    zip: cleanString(body.zip, 12), street: cleanString(body.street, 150), number: cleanString(body.number, 20), complement: cleanString(body.complement, 100),
    reference_point: cleanString(body.reference_point, 150), latitude: toNumber(body.latitude), longitude: toNumber(body.longitude),
    show_exact_address: body.show_exact_address ? 1 : 0,
    area_built: toNumber(body.area_built), area_land: toNumber(body.area_land),
    bedrooms: Math.max(0, Number.parseInt(body.bedrooms, 10) || 0), suites: Math.max(0, Number.parseInt(body.suites, 10) || 0),
    bathrooms: Math.max(0, Number.parseInt(body.bathrooms, 10) || 0), parking: Math.max(0, Number.parseInt(body.parking, 10) || 0),
    rooms: Math.max(0, Number.parseInt(body.rooms, 10) || 0), floors: Math.max(0, Number.parseInt(body.floors, 10) || 0),
    year_built: toNumber(body.year_built), owner_id: toNumber(body.owner_id), agent_id: toNumber(body.agent_id),
    exclusive: body.exclusive ? 1 : 0, advertise_start: cleanString(body.advertise_start, 30) || null,
    advertise_until: cleanString(body.advertise_until, 30) || null, internal_notes: cleanString(body.internal_notes, 2000),
    owner_contact_note: cleanString(body.owner_contact_note, 1500), virtual_tour_url: safeHttpUrl(body.virtual_tour_url),
    created_by: existing?.created_by || userId,
    published_at: publicationStatus === 'published' ? (existing?.published_at || now) : (existing?.published_at || null),
    created_at: existing?.created_at || now, updated_at: now,
  };
}
function replacePropertyRelations(propertyId, images, featureNames) {
  db.prepare('DELETE FROM property_images WHERE property_id = ?').run(propertyId);
  const addImage = db.prepare('INSERT INTO property_images (property_id, url, caption, sort_order, is_cover) VALUES (?, ?, ?, ?, ?)');
  (Array.isArray(images) ? images : []).slice(0, 30).forEach((image, index) => {
    const url = cleanString(image?.url, 500);
    if (!isLocalImagePath(url)) return;
    addImage.run(propertyId, url, cleanString(image?.caption, 250), Number(image?.sort_order ?? index) || 0, image?.is_cover ? 1 : 0);
  });
  db.prepare('DELETE FROM property_features WHERE property_id = ?').run(propertyId);
  const names = Array.isArray(featureNames) ? [...new Set(featureNames.map((feature) => cleanString(feature, 80)).filter(Boolean))] : [];
  for (const name of names.slice(0, 60)) {
    addFeature.run(name, slugify(name));
    const feature = db.prepare('SELECT id FROM features WHERE name = ?').get(name);
    if (feature) db.prepare('INSERT OR IGNORE INTO property_features (property_id, feature_id) VALUES (?, ?)').run(propertyId, feature.id);
  }
}
function persistProperty(req, res, existing = null) {
  const body = { ...(req.body || {}) };
  if (existing && !['administrator', 'manager'].includes(req.user.role)) {
    for (const key of ['owner_id', 'street', 'number', 'complement', 'zip', 'latitude', 'longitude', 'reference_point', 'internal_notes', 'owner_contact_note', 'commercial_notes', 'exclusive', 'is_demo']) body[key] = existing[key];
  }
  if (cleanString(body.title, 180).length < 4) return res.status(400).json({ error: 'Informe um título com pelo menos 4 caracteres.' });
  if (!cleanString(body.city, 100)) return res.status(400).json({ error: 'Informe a cidade do imóvel.' });
  if (body.publication_status === 'published' && !['administrator', 'manager'].includes(req.user.role)) return res.status(403).json({ error: 'Somente administração ou gerência pode publicar imóveis.' });
  const property = normalizeProperty(body, req.user.id, existing);
  try {
    const save = transaction(() => {
      let id;
      if (existing) {
        const updateColumns = propertyColumns.filter((column) => !['code', 'created_by', 'created_at'].includes(column));
        const updateValues = Object.fromEntries(updateColumns.map((column) => [column, property[column]]));
        db.prepare(`UPDATE properties SET ${updateColumns.map((column) => `${column} = @${column}`).join(', ')} WHERE id = @id`).run({ ...updateValues, id: existing.id });
        id = existing.id;
        for (const field of ['sale_price', 'rent_price', 'availability_status', 'publication_status']) {
          const oldValue = existing[field];
          const newValue = property[field];
          if (String(oldValue ?? '') !== String(newValue ?? '')) addHistory(id, field, oldValue, newValue, req.user.id, 'Alteração registrada no painel.');
        }
      } else {
        propertyInsert.run(property);
        id = Number(db.prepare('SELECT last_insert_rowid() AS id').get().id);
        addHistory(id, 'created', null, property.publication_status, req.user.id, 'Imóvel cadastrado.');
      }
      replacePropertyRelations(id, body.images, body.features);
      audit(req.user.id, existing ? 'property.updated' : 'property.created', 'property', id, `${property.code} — ${property.title}`);
      return getPropertyById(id);
    });
    const saved = save();
    return res.status(existing ? 200 : 201).json({ property: saved });
  } catch (error) {
    console.error('Could not save property:', error);
    return res.status(400).json({ error: 'Não foi possível salvar o imóvel. Verifique os dados e tente novamente.' });
  }
}
app.post('/api/admin/properties', authRequired, requireRoles('administrator', 'manager', 'agent', 'editor'), (req, res) => persistProperty(req, res));
app.put('/api/admin/properties/:id', authRequired, requireRoles('administrator', 'manager', 'agent', 'editor'), (req, res) => {
  const existing = getPropertyById(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Imóvel não encontrado.' });
  if (req.user.role === 'agent') {
    const agent = db.prepare('SELECT id FROM agents WHERE user_id = ?').get(req.user.id);
    if ((!agent || existing.agent_id !== agent.id) && existing.created_by !== req.user.id) return res.status(403).json({ error: 'Você não pode editar este imóvel.' });
  }
  if (req.user.role === 'editor' && existing.publication_status === 'published') return res.status(403).json({ error: 'Um editor não pode alterar um anúncio já publicado.' });
  return persistProperty(req, res, existing);
});
app.post('/api/admin/properties/:id/archive', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(Number(req.params.id));
  if (!property) return res.status(404).json({ error: 'Imóvel não encontrado.' });
  const now = new Date().toISOString();
  db.prepare("UPDATE properties SET publication_status = 'archived', updated_at = ? WHERE id = ?").run(now, property.id);
  addHistory(property.id, 'publication_status', property.publication_status, 'archived', req.user.id, 'Imóvel arquivado.');
  audit(req.user.id, 'property.archived', 'property', property.id, property.code);
  res.json({ ok: true });
});
app.post('/api/admin/properties/:id/publish', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(Number(req.params.id));
  if (!property) return res.status(404).json({ error: 'Imóvel não encontrado.' });
  const now = new Date().toISOString();
  db.prepare("UPDATE properties SET publication_status = 'published', approved = 1, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?").run(now, now, property.id);
  addHistory(property.id, 'publication_status', property.publication_status, 'published', req.user.id, 'Imóvel publicado.');
  audit(req.user.id, 'property.published', 'property', property.id, property.code);
  res.json({ ok: true });
});
app.post('/api/admin/properties/:id/feature', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(Number(req.params.id));
  if (!property) return res.status(404).json({ error: 'Imóvel não encontrado.' });
  const featured = req.body?.is_featured ? 1 : 0;
  db.prepare('UPDATE properties SET is_featured = ?, updated_at = ? WHERE id = ?').run(featured, new Date().toISOString(), property.id);
  audit(req.user.id, 'property.featured', 'property', property.id, String(featured));
  res.json({ ok: true, is_featured: featured });
});

app.get('/api/admin/leads', authRequired, requireRoles('administrator', 'manager', 'agent'), (req, res) => {
  const where = [];
  const values = [];
  if (req.user.role === 'agent') { where.push('l.agent_id = (SELECT id FROM agents WHERE user_id = ?)'); values.push(req.user.id); }
  const status = cleanString(req.query.status, 30);
  if (status) { where.push('l.status = ?'); values.push(status); }
  const search = cleanString(req.query.search, 100);
  if (search) { where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)'); values.push(...Array(3).fill(`%${search}%`)); }
  const rows = db.prepare(`
    SELECT l.*, a.name AS agent_name,
      (SELECT p.id FROM lead_properties lp JOIN properties p ON p.id = lp.property_id WHERE lp.lead_id = l.id ORDER BY lp.rowid LIMIT 1) AS property_id,
      (SELECT p.code FROM lead_properties lp JOIN properties p ON p.id = lp.property_id WHERE lp.lead_id = l.id ORDER BY lp.rowid LIMIT 1) AS property_code,
      (SELECT p.title FROM lead_properties lp JOIN properties p ON p.id = lp.property_id WHERE lp.lead_id = l.id ORDER BY lp.rowid LIMIT 1) AS property_title
    FROM leads l LEFT JOIN agents a ON a.id = l.agent_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY l.created_at DESC LIMIT 500
  `).all(...values);
  res.json({ leads: rows });
});
const leadStatuses = ['new', 'awaiting', 'contacted', 'visit', 'proposal', 'negotiation', 'converted', 'lost'];
app.patch('/api/admin/leads/:id', authRequired, requireRoles('administrator', 'manager', 'agent'), (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' });
  if (req.user.role === 'agent') {
    const agent = db.prepare('SELECT id FROM agents WHERE user_id = ?').get(req.user.id);
    if (!agent || lead.agent_id !== agent.id) return res.status(403).json({ error: 'Este lead não está atribuído à sua conta.' });
  }
  const status = cleanString(req.body?.status, 30);
  if (!leadStatuses.includes(status)) return res.status(400).json({ error: 'Etapa de atendimento inválida.' });
  const agentId = req.user.role === 'agent' ? lead.agent_id : (req.body?.agent_id !== undefined ? (toNumber(req.body.agent_id) || null) : lead.agent_id);
  const now = new Date().toISOString();
  db.prepare('UPDATE leads SET status = ?, agent_id = ?, updated_at = ?, last_interaction_at = ? WHERE id = ?').run(status, agentId, now, now, lead.id);
  db.prepare('INSERT INTO lead_activities (lead_id, user_id, type, note, from_status, to_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(lead.id, req.user.id, 'status', cleanString(req.body?.note, 500) || `Etapa alterada para ${status}.`, lead.status, status, now);
  audit(req.user.id, 'lead.status_changed', 'lead', lead.id, `${lead.status} → ${status}`);
  res.json({ ok: true, status });
});
app.get('/api/admin/leads/:id/activities', authRequired, requireRoles('administrator', 'manager', 'agent'), (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' });
  if (req.user.role === 'agent') {
    const agent = db.prepare('SELECT id FROM agents WHERE user_id = ?').get(req.user.id);
    if (!agent || lead.agent_id !== agent.id) return res.status(403).json({ error: 'Acesso não autorizado.' });
  }
  const activities = db.prepare(`SELECT la.*, u.name AS user_name FROM lead_activities la LEFT JOIN users u ON u.id = la.user_id WHERE la.lead_id = ? ORDER BY la.created_at DESC`).all(lead.id);
  res.json({ activities });
});
app.post('/api/admin/leads/:id/activities', authRequired, requireRoles('administrator', 'manager', 'agent'), (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' });
  if (req.user.role === 'agent') {
    const agent = db.prepare('SELECT id FROM agents WHERE user_id = ?').get(req.user.id);
    if (!agent || lead.agent_id !== agent.id) return res.status(403).json({ error: 'Acesso não autorizado.' });
  }
  const note = cleanString(req.body?.note, 1500);
  if (!note) return res.status(400).json({ error: 'Escreva uma nota para registrar a interação.' });
  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO lead_activities (lead_id, user_id, type, note, created_at) VALUES (?, ?, ?, ?, ?)').run(lead.id, req.user.id, 'note', note, now);
  db.prepare('UPDATE leads SET last_interaction_at = ?, updated_at = ? WHERE id = ?').run(now, now, lead.id);
  audit(req.user.id, 'lead.activity_added', 'lead', lead.id, note.slice(0, 200));
  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

app.get('/api/admin/owners', authRequired, requireRoles('administrator', 'manager'), (_req, res) => {
  const owners = db.prepare(`SELECT o.*, COUNT(p.id) AS properties_count FROM owners o LEFT JOIN properties p ON p.owner_id = o.id GROUP BY o.id ORDER BY o.name`).all();
  res.json({ owners });
});
app.post('/api/admin/owners', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const name = cleanString(req.body?.name, 120);
  if (name.length < 2) return res.status(400).json({ error: 'Informe o nome do proprietário.' });
  const result = db.prepare('INSERT INTO owners (name, phone, email, notes) VALUES (?, ?, ?, ?)').run(name, cleanString(req.body?.phone, 40), cleanString(req.body?.email, 200), cleanString(req.body?.notes, 1500));
  audit(req.user.id, 'owner.created', 'owner', result.lastInsertRowid, name);
  res.status(201).json({ owner: ownerView(db.prepare('SELECT * FROM owners WHERE id = ?').get(result.lastInsertRowid)) });
});
app.put('/api/admin/owners/:id', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const id = Number(req.params.id);
  const exists = db.prepare('SELECT id FROM owners WHERE id = ?').get(id);
  if (!exists) return res.status(404).json({ error: 'Proprietário não encontrado.' });
  const name = cleanString(req.body?.name, 120);
  if (name.length < 2) return res.status(400).json({ error: 'Informe o nome do proprietário.' });
  db.prepare('UPDATE owners SET name = ?, phone = ?, email = ?, notes = ?, updated_at = ? WHERE id = ?')
    .run(name, cleanString(req.body?.phone, 40), cleanString(req.body?.email, 200), cleanString(req.body?.notes, 1500), new Date().toISOString(), id);
  audit(req.user.id, 'owner.updated', 'owner', id, name);
  res.json({ owner: db.prepare('SELECT * FROM owners WHERE id = ?').get(id) });
});
app.get('/api/admin/agents', authRequired, requireRoles('administrator', 'manager'), (_req, res) => {
  const agents = db.prepare(`SELECT a.*, COUNT(DISTINCT p.id) AS properties_count, COUNT(DISTINCT l.id) AS leads_count FROM agents a LEFT JOIN properties p ON p.agent_id = a.id LEFT JOIN leads l ON l.agent_id = a.id GROUP BY a.id ORDER BY a.name`).all();
  res.json({ agents });
});
app.post('/api/admin/agents', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const name = cleanString(req.body?.name, 120);
  if (name.length < 2) return res.status(400).json({ error: 'Informe o nome do corretor.' });
  const result = db.prepare('INSERT INTO agents (name, phone, email, creci, photo_url, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, cleanString(req.body?.phone, 40), cleanString(req.body?.email, 200), cleanString(req.body?.creci, 50), cleanString(req.body?.photo_url, 400), req.body?.status === 'inactive' ? 'inactive' : 'active');
  audit(req.user.id, 'agent.created', 'agent', result.lastInsertRowid, name);
  res.status(201).json({ agent: db.prepare('SELECT * FROM agents WHERE id = ?').get(result.lastInsertRowid) });
});
app.put('/api/admin/agents/:id', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM agents WHERE id = ?').get(id)) return res.status(404).json({ error: 'Corretor não encontrado.' });
  const name = cleanString(req.body?.name, 120);
  if (name.length < 2) return res.status(400).json({ error: 'Informe o nome do corretor.' });
  db.prepare('UPDATE agents SET name = ?, phone = ?, email = ?, creci = ?, photo_url = ?, status = ?, updated_at = ? WHERE id = ?')
    .run(name, cleanString(req.body?.phone, 40), cleanString(req.body?.email, 200), cleanString(req.body?.creci, 50), cleanString(req.body?.photo_url, 400), req.body?.status === 'inactive' ? 'inactive' : 'active', new Date().toISOString(), id);
  audit(req.user.id, 'agent.updated', 'agent', id, name);
  res.json({ agent: db.prepare('SELECT * FROM agents WHERE id = ?').get(id) });
});
app.get('/api/admin/owner-inquiries', authRequired, requireRoles('administrator', 'manager'), (_req, res) => {
  const inquiries = db.prepare('SELECT * FROM owner_inquiries ORDER BY created_at DESC LIMIT 300').all();
  res.json({ inquiries });
});
app.patch('/api/admin/owner-inquiries/:id', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const status = cleanString(req.body?.status, 30);
  if (!['new', 'reviewing', 'contacted', 'converted', 'closed'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  const result = db.prepare('UPDATE owner_inquiries SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: 'Solicitação não encontrada.' });
  audit(req.user.id, 'owner_inquiry.updated', 'owner_inquiry', Number(req.params.id), status);
  res.json({ ok: true });
});
app.get('/api/admin/privacy-requests', authRequired, requireRoles('administrator'), (_req, res) => {
  const requests = db.prepare('SELECT id,name,email,phone,request_type,details,status,created_at,updated_at FROM privacy_requests ORDER BY created_at DESC LIMIT 300').all();
  res.json({ requests });
});
app.patch('/api/admin/privacy-requests/:id', authRequired, requireRoles('administrator'), (req, res) => {
  const status = cleanString(req.body?.status, 30);
  if (!['received', 'reviewing', 'completed', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  const id = Number(req.params.id);
  const result = db.prepare('UPDATE privacy_requests SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), id);
  if (!result.changes) return res.status(404).json({ error: 'Solicitação não encontrada.' });
  audit(req.user.id, 'privacy.request_updated', 'privacy_request', id, status);
  res.json({ ok: true });
});

app.get('/api/admin/appointments', authRequired, requireRoles('administrator', 'manager', 'agent'), (req, res) => {
  const where = [];
  const values = [];
  if (req.user.role === 'agent') { where.push('a.agent_id = (SELECT id FROM agents WHERE user_id = ?)'); values.push(req.user.id); }
  const appointments = db.prepare(`SELECT a.*, p.code AS property_code, p.title AS property_title, l.name AS lead_name, l.phone AS lead_phone, ag.name AS agent_name
    FROM appointments a JOIN properties p ON p.id = a.property_id JOIN leads l ON l.id = a.lead_id LEFT JOIN agents ag ON ag.id = a.agent_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY a.scheduled_at ASC LIMIT 300`).all(...values);
  res.json({ appointments });
});
app.post('/api/admin/appointments', authRequired, requireRoles('administrator', 'manager', 'agent'), (req, res) => {
  const propertyId = Number(req.body?.property_id);
  const leadId = Number(req.body?.lead_id);
  const scheduledAt = cleanString(req.body?.scheduled_at, 40);
  const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(propertyId);
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!property || !lead) return res.status(400).json({ error: 'Selecione um imóvel e um interessado válidos.' });
  const agentId = req.user.role === 'agent' ? db.prepare('SELECT id FROM agents WHERE user_id = ?').get(req.user.id)?.id : (Number(req.body?.agent_id) || null);
  if (req.user.role === 'agent' && (!agentId || lead.agent_id !== agentId)) return res.status(403).json({ error: 'O lead precisa estar atribuído a você.' });
  const timestamp = Date.parse(scheduledAt);
  if (!Number.isFinite(timestamp)) return res.status(400).json({ error: 'Informe uma data e um horário válidos.' });
  if (agentId) {
    const conflicts = db.prepare("SELECT scheduled_at FROM appointments WHERE agent_id = ? AND status NOT IN ('cancelled','completed')").all(agentId);
    if (conflicts.some((row) => Math.abs(Date.parse(row.scheduled_at) - timestamp) < 60 * 60 * 1000)) return res.status(409).json({ error: 'Este horário conflita com outro compromisso do corretor.' });
  }
  const result = db.prepare('INSERT INTO appointments (property_id, lead_id, agent_id, scheduled_at, notes, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(propertyId, leadId, agentId || null, new Date(timestamp).toISOString(), cleanString(req.body?.notes, 1000), 'requested');
  audit(req.user.id, 'appointment.created', 'appointment', result.lastInsertRowid, scheduledAt);
  res.status(201).json({ appointment: db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid) });
});
app.patch('/api/admin/appointments/:id', authRequired, requireRoles('administrator', 'manager', 'agent'), (req, res) => {
  const id = Number(req.params.id);
  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado.' });
  if (req.user.role === 'agent') {
    const agentId = db.prepare('SELECT id FROM agents WHERE user_id = ?').get(req.user.id)?.id;
    if (!agentId || appointment.agent_id !== agentId) return res.status(403).json({ error: 'Acesso não autorizado.' });
  }
  const status = cleanString(req.body?.status, 30);
  if (!['requested', 'confirmed', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  db.prepare('UPDATE appointments SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(status, cleanString(req.body?.notes ?? appointment.notes, 1000), new Date().toISOString(), id);
  audit(req.user.id, 'appointment.updated', 'appointment', id, status);
  res.json({ ok: true });
});

app.get('/api/admin/features', authRequired, requireRoles('administrator', 'manager', 'editor'), (_req, res) => {
  const features = db.prepare('SELECT id, name, slug FROM features ORDER BY name').all();
  res.json({ features });
});
app.post('/api/admin/features', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const name = cleanString(req.body?.name, 80);
  if (name.length < 2) return res.status(400).json({ error: 'Informe o nome da característica.' });
  try {
    addFeature.run(name, slugify(name));
    audit(req.user.id, 'feature.created', 'feature', null, name);
    res.status(201).json({ features: db.prepare('SELECT id, name, slug FROM features ORDER BY name').all() });
  } catch {
    res.status(409).json({ error: 'Essa característica já existe.' });
  }
});
app.get('/api/admin/content-pages', authRequired, requireRoles('administrator'), (_req, res) => {
  const pages = db.prepare('SELECT id,slug,title,content,meta_description,updated_at FROM content_pages ORDER BY slug').all();
  res.json({ pages });
});
app.put('/api/admin/content-pages/:slug', authRequired, requireRoles('administrator'), (req, res) => {
  const slug = cleanString(req.params.slug, 60);
  const page = db.prepare('SELECT id FROM content_pages WHERE slug = ?').get(slug);
  if (!page) return res.status(404).json({ error: 'Página não encontrada.' });
  const title = cleanString(req.body?.title, 180);
  const content = cleanString(req.body?.content, 12000);
  const metaDescription = cleanString(req.body?.meta_description, 320);
  if (title.length < 3 || content.length < 10) return res.status(400).json({ error: 'Informe um título e conteúdo válidos.' });
  db.prepare('UPDATE content_pages SET title = ?, content = ?, meta_description = ?, updated_at = ? WHERE slug = ?').run(title, content, metaDescription, new Date().toISOString(), slug);
  audit(req.user.id, 'content_page.updated', 'content_page', page.id, slug);
  res.json({ page: db.prepare('SELECT id,slug,title,content,meta_description,updated_at FROM content_pages WHERE slug = ?').get(slug) });
});
app.get('/api/admin/settings', authRequired, requireRoles('administrator', 'manager'), (_req, res) => {
  const settings = Object.fromEntries(db.prepare('SELECT key, value FROM site_settings').all().map((row) => [row.key, row.value]));
  res.json({ settings });
});
app.put('/api/admin/settings', authRequired, requireRoles('administrator'), (req, res) => {
  const allowed = ['businessName', 'phone', 'email', 'whatsapp', 'instagram', 'facebook', 'institutionalText', 'logoUrl'];
  const saveSetting = db.prepare('INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at');
  const now = new Date().toISOString();
  for (const key of allowed) {
    if (req.body?.[key] === undefined) continue;
    let value = cleanString(String(req.body[key]), 1000);
    if (['instagram', 'facebook'].includes(key)) value = value ? safeHttpUrl(value) : '';
    if (key === 'logoUrl' && value) { if (value.startsWith('/uploads/')) value = isLocalImagePath(value) ? value : ''; else { const safe = safeHttpUrl(value); value = safe.startsWith('https://') ? safe : ''; } }
    if (key === 'email' && value && !/^\S+@\S+\.\S+$/.test(value)) value = '';
    saveSetting.run(key, value, now);
  }
  audit(req.user.id, 'settings.updated', 'site_settings', null, 'Configurações do site atualizadas.');
  const settings = Object.fromEntries(db.prepare('SELECT key, value FROM site_settings').all().map((row) => [row.key, row.value]));
  res.json({ settings });
});
app.get('/api/admin/reports', authRequired, requireRoles('administrator', 'manager'), (req, res) => {
  const from = cleanString(req.query.from, 10);
  const to = cleanString(req.query.to, 10);
  const propertyWhere = [];
  const propertyValues = [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { propertyWhere.push('date(p.created_at) >= date(?)'); propertyValues.push(from); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { propertyWhere.push('date(p.created_at) <= date(?)'); propertyValues.push(to); }
  const pWhere = propertyWhere.length ? `WHERE ${propertyWhere.join(' AND ')}` : '';
  const byStatus = db.prepare(`SELECT availability_status AS name, COUNT(*) AS value FROM properties p ${pWhere} GROUP BY availability_status`).all(...propertyValues);
  const byPurpose = db.prepare(`SELECT purpose AS name, COUNT(*) AS value FROM properties p ${pWhere} GROUP BY purpose`).all(...propertyValues);
  const byCity = db.prepare(`SELECT city AS name, COUNT(*) AS value FROM properties p ${pWhere ? `${pWhere} AND` : 'WHERE'} city != '' GROUP BY city ORDER BY value DESC`).all(...propertyValues);
  const leadWhere = [];
  const leadValues = [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { leadWhere.push('date(l.created_at) >= date(?)'); leadValues.push(from); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { leadWhere.push('date(l.created_at) <= date(?)'); leadValues.push(to); }
  const lWhere = leadWhere.length ? `WHERE ${leadWhere.join(' AND ')}` : '';
  const leadsByMonth = db.prepare(`SELECT substr(l.created_at,1,7) AS month, COUNT(*) AS total FROM leads l ${lWhere} GROUP BY month ORDER BY month`).all(...leadValues);
  const leadSummary = db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN l.status = 'converted' THEN 1 ELSE 0 END), 0) AS converted FROM leads l ${lWhere}`).get(...leadValues);
  const leadsByAgent = db.prepare(`SELECT COALESCE(a.name, 'Sem responsável') AS name, COUNT(l.id) AS value FROM leads l LEFT JOIN agents a ON a.id = l.agent_id ${lWhere} GROUP BY a.id ORDER BY value DESC`).all(...leadValues);
  const leadsBySource = db.prepare(`SELECT source AS name, COUNT(l.id) AS value FROM leads l ${lWhere} GROUP BY source ORDER BY value DESC`).all(...leadValues);
  const appointments = db.prepare(`SELECT status AS name, COUNT(*) AS value FROM appointments GROUP BY status`).all();
  const staleProperties = db.prepare("SELECT id, code, title, city, updated_at FROM properties WHERE publication_status != 'archived' AND updated_at < datetime('now', '-30 days') ORDER BY updated_at ASC LIMIT 50").all();
  const demoCount = db.prepare('SELECT COUNT(*) AS count FROM properties WHERE is_demo = 1').get().count;
  res.json({ byStatus, byPurpose, byCity, leadsByMonth, leadSummary, leadsByAgent, leadsBySource, appointments, staleProperties, demoCount });
});
app.get('/api/admin/reports/properties.csv', authRequired, requireRoles('administrator', 'manager'), (_req, res) => {
  const rows = db.prepare('SELECT code,title,type,purpose,publication_status,availability_status,city,neighborhood,sale_price,rent_price,created_at,updated_at,is_demo FROM properties ORDER BY created_at DESC').all();
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = ['Código,Título,Tipo,Finalidade,Publicação,Disponibilidade,Cidade,Bairro,Preço de venda,Aluguel mensal,Cadastro,Atualização,Demonstrativo', ...rows.map((row) => Object.values(row).map(quote).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="relatorio-imoveis.csv"');
  res.send(`\uFEFF${csv}`);
});
app.get('/api/admin/audit', authRequired, requireRoles('administrator'), (_req, res) => {
  const logs = db.prepare(`SELECT a.*, u.name AS user_name, u.email AS user_email FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.created_at DESC LIMIT 500`).all();
  res.json({ logs });
});
app.get('/api/admin/users', authRequired, requireRoles('administrator'), (_req, res) => {
  const users = db.prepare(`SELECT u.id, u.name, u.email, u.active, u.last_login_at, u.created_at, r.name AS role, r.label AS role_label FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id ORDER BY u.name`).all();
  res.json({ users, roles: db.prepare('SELECT name, label FROM roles ORDER BY id').all() });
});
app.post('/api/admin/users', authRequired, requireRoles('administrator'), (req, res) => {
  const name = cleanString(req.body?.name, 120);
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const role = cleanString(req.body?.role, 30);
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12) return res.status(400).json({ error: 'Informe nome, e-mail válido e senha com no mínimo 12 caracteres.' });
  if (!['administrator', 'manager', 'agent', 'editor'].includes(role)) return res.status(400).json({ error: 'Perfil inválido.' });
  try {
    const result = db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)').run(name, email, bcrypt.hashSync(password, 12));
    const roleId = db.prepare('SELECT id FROM roles WHERE name = ?').get(role).id;
    db.prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)').run(result.lastInsertRowid, roleId);
    if (role === 'agent') db.prepare('INSERT INTO agents (user_id, name, email) VALUES (?, ?, ?)').run(result.lastInsertRowid, name, email);
    audit(req.user.id, 'user.created', 'user', result.lastInsertRowid, `${email} (${role})`);
    res.status(201).json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
  }
});
app.patch('/api/admin/users/:id', authRequired, requireRoles('administrator'), (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const active = req.body?.active === false ? 0 : 1;
  if (id === req.user.id && active === 0) return res.status(400).json({ error: 'Não é possível desativar a própria conta.' });
  db.prepare('UPDATE users SET active = ?, updated_at = ? WHERE id = ?').run(active, new Date().toISOString(), id);
  if (req.body?.role && ['administrator', 'manager', 'agent', 'editor'].includes(req.body.role)) {
    const roleId = db.prepare('SELECT id FROM roles WHERE name = ?').get(req.body.role).id;
    db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id);
    db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(id, roleId);
  }
  audit(req.user.id, 'user.updated', 'user', id, `Conta ${active ? 'ativa' : 'inativa'}.`);
  res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'A imagem precisa ter até 8 MB.' : 'Não foi possível enviar este arquivo.';
    return res.status(400).json({ error: message });
  }
  if (error) {
    console.error(error.message || error);
    return res.status(400).json({ error: error.message || 'Não foi possível concluir a solicitação.' });
  }
  return res.status(500).json({ error: 'Erro inesperado.' });
});

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(rootDir, 'dist');
  app.use(express.static(distDir, { maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(distDir, 'index.html'));
  });
}
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => {
  console.log(`API Projeto Redes Nordeste pronta em http://0.0.0.0:${port}`);
  if (!process.env.JWT_SECRET) console.log('JWT_SECRET não definido; usando chave persistente em DATA_DIR/jwt.secret (gerada na primeira inicialização, se necessário).');
});
