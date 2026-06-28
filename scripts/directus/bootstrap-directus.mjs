#!/usr/bin/env node
/**
 * Bootstrap Directus collections, fields, relations, and local test data.
 * Uses Directus REST API only; does not run SQL and does not modify web pages.
 */

const DIRECTUS_URL = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const log = (msg) => console.log(`• ${msg}`);
const warn = (msg) => console.warn(`⚠️  ${msg}`);

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD. Please run `set -a; source .env.directus; set +a` and check .env.directus.');
  process.exit(1);
}

async function request(path, { method = 'GET', token, body, expected = [200, 201, 204] } = {}) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { raw: text }; }
  }
  if (!expected.includes(res.status)) {
    const message = data?.errors?.map((e) => e.message).join('; ') || text || res.statusText;
    const err = new Error(`${method} ${path} failed (${res.status}): ${message}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data?.data ?? data;
}

async function login() {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const token = data?.access_token;
  if (!token) throw new Error('Directus login succeeded but no access_token was returned.');
  log(`Logged in to ${DIRECTUS_URL}`);
  return token;
}

const selectOptions = (choices) => ({
  choices: choices.map((value) => ({ text: value, value })),
});

const collections = [
  ['channels', '栏目'],
  ['companies', '下属公司'],
  ['business_sectors', '业务板块'],
  ['pages', '单页'],
  ['banners', '轮播'],
  ['articles', '文章'],
  ['site_settings', '站点配置'],
];

const fields = {
  channels: [
    stringField('name', true), stringField('slug', true), selectField('type', ['nav', 'news', 'page', 'external']),
    stringField('path'), integerField('sort'), booleanField('visible', true), selectField('status', ['enabled', 'disabled'], 'enabled'),
  ],
  companies: [
    stringField('name', true), stringField('short_name'), stringField('slug', true), fileField('logo'), fileField('cover'),
    textField('intro', 'input-rich-text-html'), stringField('address'), textField('main_business'), stringField('registered_capital'),
    integerField('sort'), selectField('status', ['enabled', 'disabled'], 'enabled'),
  ],
  business_sectors: [
    stringField('name', true), stringField('slug', true), fileField('cover'), textField('intro', 'input-rich-text-html'),
    integerField('sort'), selectField('status', ['enabled', 'disabled'], 'enabled'),
  ],
  pages: [
    stringField('title', true), stringField('slug', true), fileField('cover'), textField('content', 'input-rich-text-html'),
    selectField('status', ['draft', 'published', 'archived'], 'draft'),
  ],
  banners: [
    stringField('title', true), stringField('subtitle'), fileField('image'), stringField('link_url'),
    selectField('position', ['home', 'news', 'business', 'party'], 'home'), integerField('sort'),
    selectField('status', ['draft', 'published', 'archived'], 'draft'),
  ],
  articles: [
    stringField('title', true), stringField('subtitle'), fileField('cover'), textField('summary'), textField('content', 'input-rich-text-html'),
    stringField('source'), stringField('author'), datetimeField('publish_at'), selectField('status', ['draft', 'published', 'archived'], 'draft'),
    booleanField('is_top', false), booleanField('is_home_recommend', false), integerField('sort'), filesField('attachments'),
    m2oField('main_channel'), m2oField('related_company'), m2oField('related_sector'),
  ],
  site_settings: [
    stringField('site_name', true), fileField('logo'), textField('footer_text'), stringField('address'), stringField('phone'),
    stringField('email'), stringField('icp'), stringField('copyright'),
  ],
};

const relations = [
  { collection: 'companies', field: 'logo', related_collection: 'directus_files' },
  { collection: 'companies', field: 'cover', related_collection: 'directus_files' },
  { collection: 'business_sectors', field: 'cover', related_collection: 'directus_files' },
  { collection: 'pages', field: 'cover', related_collection: 'directus_files' },
  { collection: 'banners', field: 'image', related_collection: 'directus_files' },
  { collection: 'articles', field: 'cover', related_collection: 'directus_files' },
  { collection: 'site_settings', field: 'logo', related_collection: 'directus_files' },
  { collection: 'articles', field: 'main_channel', related_collection: 'channels' },
  { collection: 'articles', field: 'related_company', related_collection: 'companies' },
  { collection: 'articles', field: 'related_sector', related_collection: 'business_sectors' },
];

function stringField(field, required = false) { return { field, type: 'string', meta: { interface: 'input', required }, schema: { is_nullable: !required } }; }
function textField(field, iface = 'input-multiline') { return { field, type: 'text', meta: { interface: iface }, schema: { is_nullable: true } }; }
function integerField(field) { return { field, type: 'integer', meta: { interface: 'input' }, schema: { is_nullable: true } }; }
function booleanField(field, defaultValue = false) { return { field, type: 'boolean', meta: { interface: 'boolean' }, schema: { default_value: defaultValue, is_nullable: false } }; }
function datetimeField(field) { return { field, type: 'dateTime', meta: { interface: 'datetime' }, schema: { is_nullable: true } }; }
function selectField(field, choices, defaultValue) { return { field, type: 'string', meta: { interface: 'select-dropdown', options: selectOptions(choices) }, schema: { default_value: defaultValue, is_nullable: false } }; }
function fileField(field) { return { field, type: 'uuid', meta: { interface: 'file-image', special: ['file'] }, schema: { is_nullable: true } }; }
function filesField(field) { return { field, type: 'json', meta: { interface: 'list', note: 'Store attachment file IDs for local bootstrap; can be converted to Directus Files UI later.' }, schema: { is_nullable: true } }; }
function m2oField(field) { return { field, type: 'integer', meta: { interface: 'select-dropdown-m2o', special: ['m2o'] }, schema: { is_nullable: true } }; }

async function ensureCollection(token, collection, note) {
  try {
    await request(`/collections/${collection}`, { token });
    log(`Collection exists: ${collection}`);
    return;
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  await request('/collections', {
    token,
    method: 'POST',
    body: { collection, meta: { collection, icon: 'article', note, display_template: '{{name}}{{title}}{{site_name}}' }, schema: {} },
  });
  log(`Created collection: ${collection}`);
}

async function ensureField(token, collection, fieldDef) {
  try {
    await request(`/fields/${collection}/${fieldDef.field}`, { token });
    log(`Field exists: ${collection}.${fieldDef.field}`);
    return;
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  await request(`/fields/${collection}`, { token, method: 'POST', body: fieldDef });
  log(`Created field: ${collection}.${fieldDef.field}`);
}

async function ensureRelation(token, relation) {
  const body = {
    many_collection: relation.collection,
    many_field: relation.field,
    one_collection: relation.related_collection,
  };
  try {
    await request('/relations', { token, method: 'POST', body });
    log(`Created relation: ${relation.collection}.${relation.field} -> ${relation.related_collection}`);
  } catch (err) {
    const msg = String(err.message || '');
    if (err.status === 400 || err.status === 409 || msg.includes('already') || msg.includes('exists')) {
      log(`Relation exists or was already linked: ${relation.collection}.${relation.field}`);
      return;
    }
    warn(`Could not create relation ${relation.collection}.${relation.field}: ${err.message}`);
  }
}

async function upsertBySlug(token, collection, slug, item) {
  const existing = await request(`/items/${collection}?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`, { token });
  const found = Array.isArray(existing) ? existing[0] : existing?.[0];
  if (found?.id) {
    await request(`/items/${collection}/${found.id}`, { token, method: 'PATCH', body: item });
    log(`Updated seed: ${collection}.${slug}`);
    return found.id;
  }
  const created = await request(`/items/${collection}`, { token, method: 'POST', body: { ...item, slug } });
  log(`Created seed: ${collection}.${slug}`);
  return created.id;
}

async function upsertByTitle(token, collection, title, item) {
  const existing = await request(`/items/${collection}?filter[title][_eq]=${encodeURIComponent(title)}&limit=1`, { token });
  const found = Array.isArray(existing) ? existing[0] : existing?.[0];
  if (found?.id) {
    await request(`/items/${collection}/${found.id}`, { token, method: 'PATCH', body: item });
    log(`Updated seed: ${collection}.${title}`);
    return found.id;
  }
  const created = await request(`/items/${collection}`, { token, method: 'POST', body: { ...item, title } });
  log(`Created seed: ${collection}.${title}`);
  return created.id;
}

async function seedData(token) {
  const channelSeeds = [
    ['集团新闻', 'group-news'], ['业务动态', 'business-news'], ['党建群团', 'party-mass'],
    ['公示公告', 'announcements'], ['行业要闻', 'industry-news'], ['媒体聚焦', 'media-focus'],
  ];
  const channelIds = new Map();
  for (const [name, slug] of channelSeeds) {
    const id = await upsertBySlug(token, 'channels', slug, { name, type: 'news', path: `/channels/${slug}`, sort: channelIds.size + 1, visible: true, status: 'enabled' });
    channelIds.set(slug, id);
  }

  for (let i = 1; i <= 3; i += 1) {
    await upsertByTitle(token, 'banners', `首页轮播示例 ${i}`, { subtitle: '本地 Directus 初始化测试轮播', position: 'home', sort: i, status: 'published', link_url: '/' });
  }

  await upsertBySlug(token, 'companies', 'gzjt-construction-test', { name: '甘孜建投测试建设有限公司', short_name: '测试建设', intro: '用于本地初始化验证的示例公司。', address: '示例地址', main_business: '项目建设、运营管理', registered_capital: '示例注册资本', sort: 1, status: 'enabled' });
  await upsertBySlug(token, 'companies', 'gzjt-operation-test', { name: '甘孜建投测试运营有限公司', short_name: '测试运营', intro: '用于本地初始化验证的示例公司。', address: '示例地址', main_business: '交旅融合、资产运营', registered_capital: '示例注册资本', sort: 2, status: 'enabled' });

  await upsertBySlug(token, 'business_sectors', 'project-construction', { name: '项目建设', intro: '项目建设示例业务板块。', sort: 1, status: 'enabled' });
  await upsertBySlug(token, 'business_sectors', 'operation-management', { name: '经营管理', intro: '经营管理示例业务板块。', sort: 2, status: 'enabled' });
  await upsertBySlug(token, 'business_sectors', 'transport-tourism', { name: '交旅融合', intro: '交旅融合示例业务板块。', sort: 3, status: 'enabled' });

  await upsertBySlug(token, 'pages', 'group-intro', { title: '集团简介', content: '<p>本内容为本地 Directus 初始化测试数据。</p>', status: 'published' });
  await upsertBySlug(token, 'pages', 'contact', { title: '联系我们', content: '<p>本内容为本地 Directus 初始化测试数据。</p>', status: 'published' });

  let articleSort = 1;
  for (const slug of ['group-news', 'business-news', 'party-mass', 'announcements']) {
    for (let i = 1; i <= 2; i += 1) {
      await upsertByTitle(token, 'articles', `${channelSeeds.find(([, s]) => s === slug)[0]}示例文章 ${i}`, {
        subtitle: '本地初始化测试文章', summary: '用于验证 Directus 内容模型和 Public 读取权限。',
        content: '<p>这是自动初始化脚本创建的测试文章，不是真实业务数据。</p>', source: '本地测试', author: 'Directus Bootstrap',
        publish_at: new Date(Date.now() - articleSort * 3600_000).toISOString(), status: 'published', is_top: i === 1,
        is_home_recommend: true, sort: articleSort, main_channel: channelIds.get(slug), attachments: [],
      });
      articleSort += 1;
    }
  }

  const existingSettings = await request('/items/site_settings?limit=1', { token });
  const payload = { site_name: '甘孜建设投资集团官方网站（本地测试）', footer_text: '本数据仅用于本地 Directus 初始化测试。', address: '示例地址', phone: '000-00000000', email: 'admin@example.com', icp: '示例备案号', copyright: 'Copyright 本地测试' };
  const settings = Array.isArray(existingSettings) ? existingSettings[0] : existingSettings?.[0];
  if (settings?.id) await request(`/items/site_settings/${settings.id}`, { token, method: 'PATCH', body: payload });
  else await request('/items/site_settings', { token, method: 'POST', body: payload });
  log('Upserted seed: site_settings');
}

async function tryConfigurePublicPermissions(token) {
  const permissions = [
    ['channels', { visible: { _eq: true }, status: { _eq: 'enabled' } }],
    ['articles', { status: { _eq: 'published' } }],
    ['companies', { status: { _eq: 'enabled' } }],
    ['business_sectors', { status: { _eq: 'enabled' } }],
    ['pages', { status: { _eq: 'published' } }],
    ['banners', { status: { _eq: 'published' } }],
    ['site_settings', {}],
  ];
  try {
    for (const [collection, permissionsFilter] of permissions) {
      await request('/permissions', {
        token,
        method: 'POST',
        body: { role: null, collection, action: 'read', permissions: permissionsFilter, validation: {}, presets: {}, fields: ['*'] },
      });
      log(`Configured or attempted Public read permission: ${collection}`);
    }
  } catch (err) {
    warn(`Public permission auto-configuration was not completed: ${err.message}`);
    warn('Collections and test data were created. Please confirm Public permissions manually in Directus 12: Settings → Access Policies / User Roles. See scripts/directus/README.md.');
  }
}

async function main() {
  const token = await login();
  for (const [collection, note] of collections) await ensureCollection(token, collection, note);
  for (const [collection, defs] of Object.entries(fields)) for (const field of defs) await ensureField(token, collection, field);
  for (const relation of relations) await ensureRelation(token, relation);
  await seedData(token);
  await tryConfigurePublicPermissions(token);
  log('Directus bootstrap finished. If public API returns 403, confirm Access Policies manually.');
}

main().catch((err) => {
  console.error(`\nBootstrap failed: ${err.message}`);
  process.exit(1);
});
