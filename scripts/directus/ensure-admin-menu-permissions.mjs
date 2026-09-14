#!/usr/bin/env node
/**
 * Create only the admin_menu_permissions collection used by the simple admin.
 *
 * This script intentionally does not touch news, categories, articles, pages,
 * seed data, uploads, or public permissions. It is safe to run after content
 * has already been maintained in Directus.
 */

const DIRECTUS_URL = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const log = (message) => console.log(`• ${message}`);
const warn = (message) => console.warn(`⚠️  ${message}`);

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD. Run `set -a; source .env.directus; set +a` first.');
  process.exit(1);
}

async function request(path, { method = 'GET', token, body, expected = [200, 201, 204] } = {}) {
  const response = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!expected.includes(response.status)) {
    const message = payload?.errors?.map((error) => error.message).join('; ') || text || response.statusText;
    const error = new Error(`${method} ${path} failed (${response.status}): ${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload?.data ?? payload;
}

async function login() {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!data?.access_token) throw new Error('Directus login succeeded but no access_token was returned.');
  log(`Logged in to ${DIRECTUS_URL}`);
  return data.access_token;
}

const selectOptions = (choices) => ({
  choices: choices.map((value) => ({ text: value, value })),
});

const uuidM2oField = (field) => ({
  field,
  type: 'uuid',
  meta: { interface: 'select-dropdown-m2o', special: ['m2o'] },
  schema: { is_nullable: true },
});

const jsonField = (field) => ({
  field,
  type: 'json',
  meta: { interface: 'input-code', options: { language: 'json' } },
  schema: { is_nullable: true },
});

const selectField = (field, choices, defaultValue) => ({
  field,
  type: 'string',
  meta: { interface: 'select-dropdown', options: selectOptions(choices) },
  schema: { default_value: defaultValue, is_nullable: false },
});

const textField = (field) => ({
  field,
  type: 'text',
  meta: { interface: 'input-multiline' },
  schema: { is_nullable: true },
});

async function ensureCollection(token) {
  const collections = await request('/collections', { token });
  const exists = Array.isArray(collections) && collections.some((item) => item?.collection === 'admin_menu_permissions');
  if (exists) {
    log('Collection exists: admin_menu_permissions');
    return;
  }
  await request('/collections', {
    token,
    method: 'POST',
    body: {
      collection: 'admin_menu_permissions',
      meta: {
        collection: 'admin_menu_permissions',
        icon: 'admin_panel_settings',
        note: '后台用户菜单权限，仅用于官网简单后台。',
        display_template: '{{user.email}}',
      },
      schema: {},
    },
  });
  log('Created collection: admin_menu_permissions');
}

async function ensureField(token, fieldDef) {
  const fields = await request('/fields/admin_menu_permissions', { token });
  const exists = Array.isArray(fields) && fields.some((item) => item?.field === fieldDef.field);
  if (exists) {
    log(`Field exists: admin_menu_permissions.${fieldDef.field}`);
    return;
  }
  await request('/fields/admin_menu_permissions', { token, method: 'POST', body: fieldDef });
  log(`Created field: admin_menu_permissions.${fieldDef.field}`);
}

async function ensureRelation(token) {
  try {
    await request('/relations', {
      token,
      method: 'POST',
      body: {
        many_collection: 'admin_menu_permissions',
        many_field: 'user',
        one_collection: 'directus_users',
      },
    });
    log('Created relation: admin_menu_permissions.user -> directus_users');
  } catch (error) {
    const message = String(error.message || '');
    if (error.status === 400 || error.status === 409 || message.includes('already') || message.includes('exists')) {
      log('Relation exists or was already linked: admin_menu_permissions.user');
      return;
    }
    warn(`Could not create relation admin_menu_permissions.user: ${error.message}`);
  }
}

async function main() {
  const token = await login();
  await ensureCollection(token);
  await ensureField(token, uuidM2oField('user'));
  await ensureField(token, jsonField('menu_keys'));
  await ensureField(token, selectField('status', ['enabled', 'disabled'], 'enabled'));
  await ensureField(token, textField('remark'));
  await ensureRelation(token);
  log('admin_menu_permissions setup finished. No content collections were changed.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
