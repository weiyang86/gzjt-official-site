const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { hash, verify } = require('@node-rs/argon2');

const developmentDataApiUrl = 'http://localhost:8008/_plugins/gw/curd';
const productionDataApiUrl = 'http://192.168.0.221:8000/_plugins/gw/curd';
const apiUrl = () => process.env.CMS_DATA_API_URL
  || (process.env.NODE_ENV === 'production' ? productionDataApiUrl : developmentDataApiUrl);
const uploadDir = () => process.env.CMS_UPLOAD_DIR || path.resolve(process.cwd(), '.data/cms-uploads');
const sessions = globalThis.__gzjtApiSessions || new Map();
globalThis.__gzjtApiSessions = sessions;

async function call(table, method, data) {
  const response = await fetch(apiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, method, data }),
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok || payload.success !== true) {
    throw Object.assign(new Error(payload.error_msg || payload.err || `Data API ${method} failed`), { status: response.status || 502 });
  }
  return payload.data || {};
}

async function allRows(table) {
  const rows = [];
  for (let pageIndex = 1; ; pageIndex++) {
    const result = await call(table, 'read', { pageSize: 1000, pageIndex, includeTotalCount: true });
    const page = result.rows || [];
    rows.push(...page);
    if (page.length < 1000 || rows.length >= Number(result.total || 0)) return rows;
  }
}

const booleanFields = new Set(['visible', 'is_news_category', 'is_top', 'is_home_recommend', 'admin_enabled', 'email_notifications']);
const numericFields = new Set(['sort', 'limit', 'filesize', 'width', 'height', 'duration']);
const jsonFields = new Set(['attachments', 'extra_json', 'menu_keys', 'tags', 'metadata', 'data', 'delta', 'theme_light_overrides', 'theme_dark_overrides']);
function decodeValue(key, value) {
  if (value === '' || value === undefined) return value;
  if (booleanFields.has(key)) return value === true || value === 'true' || value === '1';
  if (numericFields.has(key) && value !== null) return Number(value);
  if (jsonFields.has(key) && typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}
function normalizeRow(raw) {
  const row = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('_')) continue;
    if (key === 'rowId') row.id = String(value);
    else if (key === 'status_') row.status = value;
    else row[key] = decodeValue(key, value);
  }
  return row;
}
function encodeField(key, value) {
  if (key === 'id' || key === 'rowId' || value === undefined) return null;
  const alias = key === 'status' ? 'status_' : key;
  if (value === null) return { id: alias, value: '' };
  if (typeof value === 'boolean' || typeof value === 'number') return { id: alias, value };
  if (typeof value === 'object') return { id: alias, value: JSON.stringify(value) };
  return { id: alias, value: String(value) };
}
function fieldsOf(body) {
  return Object.entries(body || {}).map(([key, value]) => encodeField(key, value)).filter(Boolean);
}

function filterTree(params) {
  const root = {};
  for (const [key, value] of params) {
    if (!key.startsWith('filter[')) continue;
    const parts = [...key.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] ||= {};
    node[parts.at(-1)] = value;
  }
  return root;
}
function equal(left, right) {
  if (typeof left === 'boolean') return left === (right === 'true' || right === '1');
  return String(left ?? '') === String(right ?? '');
}
function matchFilter(row, tree, relations = {}) {
  return Object.entries(tree).every(([field, node]) => {
    if (field === '_or') return Object.values(node).some(part => matchFilter(row, part, relations));
    if (field === '_and') return Object.values(node).every(part => matchFilter(row, part, relations));
    let value = row[field];
    if (node && typeof node === 'object') {
      const nested = Object.keys(node).filter(key => !key.startsWith('_'));
      if (nested.length) {
        value = relations[field]?.get(String(value)) || {};
        return matchFilter(value, node, relations);
      }
    }
    return Object.entries(node).every(([op, expected]) => {
      const options = String(expected).split(',');
      if (op === '_eq') return equal(value, expected);
      if (op === '_neq') return !equal(value, expected);
      if (op === '_in') return options.some(item => equal(value, item));
      if (op === '_nin') return !options.some(item => equal(value, item));
      if (op === '_contains') return String(value ?? '').toLowerCase().includes(String(expected).toLowerCase());
      if (op === '_starts_with') return String(value ?? '').startsWith(String(expected));
      if (op === '_empty') return expected === 'true' ? !value : Boolean(value);
      throw new Error(`Unsupported filter operator ${op}`);
    });
  });
}
const relationTables = { main_channel: 'channels', parent: 'channels', related_company: 'companies', related_sector: 'business_sectors', role: 'directus_roles' };
async function relatedMaps(fields, filter) {
  const result = {};
  for (const [field, table] of Object.entries(relationTables)) {
    if (!fields.includes(`${field}.`) && !fields.includes('*.*') && !filter.includes(`[${field}][`)) continue;
    result[field] = new Map((await allRows(table)).map(raw => {
      const row = normalizeRow(raw);
      return [row.id, row];
    }));
  }
  return result;
}
function project(row, fields, relations) {
  const selected = fields.split(',').filter(Boolean);
  if (!selected.length || selected.some(field => field.startsWith('*'))) {
    const result = { ...row };
    if (fields.includes('*.*')) {
      for (const [field, map] of Object.entries(relations)) {
        if (result[field]) result[field] = map.get(String(result[field])) || result[field];
      }
    }
    return result;
  }
  const result = {};
  for (const field of selected) {
    const [parent, child] = field.split('.');
    if (child) {
      const related = relations[parent]?.get(String(row[parent]));
      if (typeof result[parent] !== 'object' || result[parent] === null) result[parent] = {};
      if (related) result[parent][child] = related[child];
      else if (row[parent]) result[parent].id = row[parent];
    } else result[field] = row[field];
  }
  return result;
}
function compare(a, b, sort) {
  for (const part of sort.split(',').filter(Boolean)) {
    const reverse = part.startsWith('-');
    const key = reverse ? part.slice(1) : part;
    const left = a[key], right = b[key];
    const cmp = typeof left === 'number' && typeof right === 'number'
      ? left - right : String(left ?? '').localeCompare(String(right ?? ''), 'zh-CN');
    if (cmp) return reverse ? -cmp : cmp;
  }
  return 0;
}
async function list(table, params) {
  const fields = params.get('fields') || '*';
  const filter = [...params.keys()].join('&');
  const relations = await relatedMaps(fields, filter);
  let rows = (await allRows(table)).map(normalizeRow);
  const tree = filterTree(params);
  if (Object.keys(tree).length) rows = rows.filter(row => matchFilter(row, tree, relations));
  const search = params.get('search');
  if (search) rows = rows.filter(row => Object.values(row).some(value => typeof value === 'string' && value.toLowerCase().includes(search.toLowerCase())));
  const total = rows.length;
  const sort = params.get('sort');
  if (sort) rows.sort((a, b) => compare(a, b, sort));
  const limit = Number(params.get('limit') || 100);
  const page = Math.max(1, Number(params.get('page') || 1));
  const offset = Math.max(0, Number(params.get('offset') || 0)) + (page - 1) * Math.max(limit, 0);
  if (limit >= 0) rows = rows.slice(offset, offset + limit);
  return { data: rows.map(row => project(row, fields, relations)), meta: { filter_count: total, total_count: total } };
}
async function item(table, id, params = new URLSearchParams()) {
  const raw = (await allRows(table)).find(row => row.rowId === id);
  if (!raw) throw Object.assign(new Error('Record not found'), { status: 404 });
  const fields = params.get('fields') || '*';
  const relations = await relatedMaps(fields, '');
  return { data: project(normalizeRow(raw), fields, relations) };
}
async function create(table, body) {
  const result = await call(table, 'create', { rows: [{ fields: fieldsOf(body) }], triggerWorkflow: false });
  const id = result.rowIds?.[0];
  if (!id) throw new Error('Data API did not return rowId');
  return item(table, id);
}
async function update(table, id, body) {
  const result = await call(table, 'update', { rowIds: [id], fields: fieldsOf(body), triggerWorkflow: false });
  if (result.failedRowIds?.length || !(result.succeededRowIds || result.successfulRowIds || []).includes(id)) throw new Error('Data API update failed');
  return item(table, id);
}
async function remove(table, id) {
  await call(table, 'delete', { rowIds: [id], triggerWorkflow: false });
  return { data: null };
}

const hashPassword = (password) => hash(password, { memoryCost: 65536, timeCost: 3, parallelism: 4 });
const verifyPassword = (password, encoded) => verify(encoded, password);
function safeUser(row) {
  const { password, token, tfa_secret, auth_data, ...user } = row;
  return user;
}
async function login(body) {
  const user = (await allRows('directus_users')).map(normalizeRow).find(row => row.email === body.email && row.status === 'active');
  if (!user || !await verifyPassword(body.password || '', user.password)) throw Object.assign(new Error('账号或密码错误'), { status: 401 });
  return issueUserAccessToken(user);
}
function issueUserAccessToken(user) {
  const accessToken = crypto.randomUUID();
  sessions.set(accessToken, { userId: user.id, expiresAt: Date.now() + 8 * 3600_000 });
  return { data: { access_token: accessToken, refresh_token: accessToken, expires: 8 * 3600 } };
}
async function loginTrustedUser(identifier) {
  const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
  const activeUsers = (await allRows('directus_users')).map(normalizeRow).filter(row => row.status === 'active');
  const exactMatches = activeUsers.filter(row => (
    String(row.email || '').trim().toLowerCase() === normalizedIdentifier
    || String(row.external_identifier || '').trim().toLowerCase() === normalizedIdentifier
  ));
  const localPartMatches = normalizedIdentifier.includes('@') ? [] : activeUsers.filter(row => (
    String(row.email || '').trim().toLowerCase().split('@')[0] === normalizedIdentifier
  ));
  const matches = exactMatches.length ? exactMatches : localPartMatches;
  if (matches.length !== 1) throw Object.assign(new Error('单点登录账号不存在、已停用或标识不唯一'), { status: 401 });
  return issueUserAccessToken(matches[0]);
}
async function userForToken(token) {
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) throw Object.assign(new Error('Admin login required'), { status: 401 });
  const raw = (await allRows('directus_users')).find(row => row.rowId === session.userId);
  if (!raw) throw Object.assign(new Error('Admin user not found'), { status: 401 });
  return safeUser(normalizeRow(raw));
}
async function request(pathname, options = {}) {
  const url = new URL(pathname, 'http://local');
  const parts = url.pathname.split('/').filter(Boolean);
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  if (url.pathname === '/auth/login' && method === 'POST') return login(body);
  if (url.pathname === '/users/me') {
    const token = new Headers(options.headers).get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
    return { data: await userForToken(token) };
  }
  if (!['items', 'users', 'roles'].includes(parts[0])) throw Object.assign(new Error(`Unsupported CMS path ${url.pathname}`), { status: 404 });
  const table = parts[0] === 'items' ? parts[1] : parts[0] === 'users' ? 'directus_users' : 'directus_roles';
  const id = parts[0] === 'items' ? parts[2] : parts[1];
  if (!table) throw Object.assign(new Error('Table is required'), { status: 400 });
  if (table === 'directus_users' && body.password) body.password = await hashPassword(body.password);
  if (method === 'GET') {
    const result = id ? await item(table, decodeURIComponent(id), url.searchParams) : await list(table, url.searchParams);
    if (table === 'directus_users') result.data = Array.isArray(result.data) ? result.data.map(safeUser) : safeUser(result.data);
    return result;
  }
  if (method === 'POST' && !id) {
    const result = await create(table, body);
    return table === 'directus_users' ? { data: safeUser(result.data) } : result;
  }
  if (method === 'PATCH' && id) {
    const result = await update(table, decodeURIComponent(id), body);
    return table === 'directus_users' ? { data: safeUser(result.data) } : result;
  }
  if (method === 'DELETE' && id) return remove(table, decodeURIComponent(id));
  throw Object.assign(new Error(`Unsupported CMS method ${method}`), { status: 405 });
}

async function upload(file) {
  const id = crypto.randomUUID();
  const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const filename_disk = `${id}${extension}`;
  await fs.mkdir(uploadDir(), { recursive: true });
  await fs.writeFile(path.join(uploadDir(), filename_disk), Buffer.from(await file.arrayBuffer()));
  try {
    return await create('directus_files', {
      storage: 'local', filename_disk, filename_download: file.name,
      title: path.basename(file.name, extension), type: file.type || 'application/octet-stream',
      filesize: file.size, uploaded_on: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
  } catch (error) {
    await fs.unlink(path.join(uploadDir(), filename_disk));
    throw error;
  }
}
async function asset(id) {
  const assetId = String(id || '').trim();
  const files = (await allRows('directus_files')).map(normalizeRow);
  // Rich-text HTML imported from Directus stores the old filename_disk base,
  // while the data API assigns a new rowId to every directus_files record.
  const metadata = files.find(row => row.id === assetId)
    || files.find(row => path.basename(String(row.filename_disk || ''), path.extname(String(row.filename_disk || ''))) === assetId);
  if (!metadata) throw Object.assign(new Error('Asset not found'), { status: 404 });
  const filename = path.basename(metadata.filename_disk || '');
  if (!filename || filename !== metadata.filename_disk) throw Object.assign(new Error('Invalid asset filename'), { status: 400 });
  const bytes = await fs.readFile(path.join(uploadDir(), filename));
  return new Response(bytes, { headers: { 'content-type': metadata.type || 'application/octet-stream', 'content-length': String(bytes.length), 'cache-control': 'public, max-age=3600' } });
}
module.exports = { call, allRows, request, upload, asset, hashPassword, verifyPassword, loginTrustedUser, apiUrl };
