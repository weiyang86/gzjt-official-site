#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const DIRECTUS_URL = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '')
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const FORCE_UPDATE = process.env.FORCE_UPDATE === 'true'
const seedFile = path.join(process.cwd(), 'scripts/directus/seed-from-web.generated.json')

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD. Run `set -a; source .env.directus; set +a` first.')
  process.exit(1)
}
if (!fs.existsSync(seedFile)) {
  console.error(`Missing ${seedFile}. Run scripts/directus/extract-static-content.mjs first.`)
  process.exit(1)
}

async function request(pathname, { method = 'GET', token, body, expected = [200, 201, 204] } = {}) {
  const res = await fetch(`${DIRECTUS_URL}${pathname}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  if (text) { try { data = JSON.parse(text) } catch { data = { raw: text } } }
  if (!expected.includes(res.status)) throw new Error(`${method} ${pathname} failed (${res.status}): ${data?.errors?.map(e => e.message).join('; ') || text}`)
  return data?.data ?? data
}

async function login() {
  const data = await request('/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
  if (!data?.access_token) throw new Error('No access_token returned by Directus.')
  return data.access_token
}

async function findOne(token, collection, filters) {
  const params = new URLSearchParams({ limit: '1' })
  Object.entries(filters).forEach(([key, value]) => params.set(`filter[${key}][_eq]`, String(value)))
  const data = await request(`/items/${collection}?${params.toString()}`, { token })
  return Array.isArray(data) ? data[0] : null
}

async function upsert(token, collection, identity, payload) {
  try {
    const existing = await findOne(token, collection, identity)
    if (existing?.id) {
      if (!FORCE_UPDATE) {
        console.log(`Skip existing ${collection}: ${Object.values(identity).join(' / ')}`)
        return existing.id
      }
      await request(`/items/${collection}/${existing.id}`, { token, method: 'PATCH', body: payload })
      console.log(`Updated ${collection}: ${Object.values(identity).join(' / ')}`)
      return existing.id
    }
    const created = await request(`/items/${collection}`, { token, method: 'POST', body: { ...payload, ...identity } })
    console.log(`Created ${collection}: ${Object.values(identity).join(' / ')}`)
    return created.id
  } catch (error) {
    console.warn(`Skip ${collection}: ${error.message}`)
    return null
  }
}

function normalizeAssetPath(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw
  return `/${raw.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '').replace(/^web\//, '')}`
}

function normalizeBannerPosition(item) {
  const source = String(item?.source_file || '')
  if (source.includes('/pages/news/')) return 'news'
  if (source.includes('/pages/business/')) return 'business'
  if (source.includes('/pages/party/')) return 'party'
  return 'home'
}

const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'))
const token = await login()

const channelIds = new Map()
for (const item of seed.channels || []) {
  const id = await upsert(token, 'channels', { slug: item.slug }, { name: item.name, type: item.type || 'page', path: item.path, sort: item.sort || 0, visible: item.visible !== false, status: item.status || 'enabled', source_file: item.source_file })
  if (id) channelIds.set(item.slug, id)
}
for (const item of seed.pages || []) {
  await upsert(token, 'pages', { slug: item.slug }, { title: item.title, content: item.content || '', status: item.status || 'published', source_file: item.source_file })
}
for (const item of seed.banners || []) {
  await upsert(token, 'banners', { title: item.title, source_file: item.source_file }, {
    subtitle: item.subtitle || '',
    image_url: normalizeAssetPath(item.image_url || item.image_path || ''),
    link_url: item.link_url || '',
    position: normalizeBannerPosition(item),
    sort: item.sort || 0,
    status: item.status || 'published',
    source_file: item.source_file,
  })
}
for (const item of seed.articles || []) {
  const channelId = channelIds.get(item.channel_slug) || null
  await upsert(token, 'articles', { title: item.title, source_file: item.source_file }, {
    cover_url: normalizeAssetPath(item.cover_url || item.cover_path || ''),
    summary: item.summary || '',
    content: item.content || '',
    status: item.status || 'published',
    main_channel: channelId,
    news_subcategory: item.news_subcategory || '',
    source: 'web static extract',
    author: 'web extract',
    publish_at: new Date().toISOString(),
    source_file: item.source_file,
  })
}
for (const item of seed.companies || []) {
  await upsert(token, 'companies', { slug: item.slug }, { name: item.name, intro: item.intro || '', status: item.status || 'enabled', source_file: item.source_file })
}
for (const item of seed.business_sectors || []) {
  await upsert(token, 'business_sectors', { slug: item.slug }, { name: item.name, intro: item.intro || '', status: item.status || 'enabled', source_file: item.source_file })
}
for (const item of seed.quick_links || []) {
  await upsert(token, 'quick_links', { slug: item.slug }, { title: item.title, url: item.url, position: item.position || 'page', summary: item.summary || '', status: item.status || 'enabled', source_file: item.source_file })
}
for (const item of seed.friend_links || []) {
  await upsert(token, 'friend_links', { title: item.title, source_file: item.source_file }, { url: item.url, position: item.position || 'footer', status: item.status || 'enabled', source_file: item.source_file })
}

console.log(`Import finished. FORCE_UPDATE=${FORCE_UPDATE}`)
