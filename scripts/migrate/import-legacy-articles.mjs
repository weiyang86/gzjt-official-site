#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { legacySiteConfig } from './legacy-site.config.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const normalized = arg.replace(/^--/, '');
  if (!normalized.includes('=')) return [normalized, true];
  const [key, ...rest] = normalized.split('=');
  return [key, rest.join('=')];
}));

const DIRECTUS_URL = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const input = String(args.input || legacySiteConfig.defaultOutput);
const reportPath = String(args.report || legacySiteConfig.defaultReport);
const targetStatus = String(args.status || 'draft');
const commit = Boolean(args.commit);
const skipImages = Boolean(args['skip-images']);
const forceUpdate = String(args['force-update'] ?? 'false') === 'true';
const assetsBaseUrl = String(args['assets-base-url'] || DIRECTUS_URL).replace(/\/$/, '');

const request = async (apiPath, { method = 'GET', token, body, headers = {}, expected = [200, 201, 204] } = {}) => {
  const res = await fetch(`${DIRECTUS_URL}${apiPath}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }
  if (!expected.includes(res.status)) {
    const message = data?.errors?.map((err) => err.message).join('; ') || text || res.statusText;
    throw new Error(`${method} ${apiPath} failed (${res.status}): ${message}`);
  }
  return data?.data ?? data;
};

const login = async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD. Dry-run still validates Directus only when --commit is used.');
  const data = await request('/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  if (!data?.access_token) throw new Error('Directus login succeeded but no access_token was returned.');
  return data.access_token;
};

const loadJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const normalizeItems = (payload) => Array.isArray(payload) ? payload : payload.items || [];

const findChannelId = async (token, slug) => {
  const data = await request(`/items/channels?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id,slug&limit=1`, { token });
  return Array.isArray(data) && data[0] ? data[0].id : null;
};

const findExistingArticle = async (token, item) => {
  const sourceUrl = item.external_source_url || '';
  if (!sourceUrl) return null;
  const data = await request(`/items/articles?filter[source_file][_eq]=${encodeURIComponent(sourceUrl)}&fields=id,title,source_file&limit=1`, { token });
  return Array.isArray(data) && data[0] ? data[0] : null;
};

const normalizeImageList = (item) => {
  const fromImages = Array.isArray(item.images) ? item.images : [];
  const normalized = fromImages.map((image) => {
    if (typeof image === 'string') return { url: image, alt: '', filename: path.basename(new URL(image).pathname) || 'legacy-image.jpg' };
    return { url: image.url, alt: image.alt || '', filename: image.filename || (image.url ? path.basename(new URL(image.url).pathname) : 'legacy-image.jpg') };
  }).filter((image) => image.url);
  if (item.cover_image_url && !normalized.some((image) => image.url === item.cover_image_url)) {
    normalized.unshift({ url: item.cover_image_url, alt: '', filename: path.basename(new URL(item.cover_image_url).pathname) || 'legacy-cover.jpg' });
  }
  return Array.from(new Map(normalized.map((image) => [image.url, image])).values());
};

const uploadImage = async (token, image, warnings, imageCache, imageReport) => {
  const imageUrl = typeof image === 'string' ? image : image?.url;
  if (!imageUrl || skipImages) return null;
  if (imageCache.has(imageUrl)) {
    const cached = imageCache.get(imageUrl);
    imageReport.reused.push({ url: imageUrl, file_id: cached.id, asset_url: cached.assetUrl });
    return cached;
  }
  try {
    const imageRes = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 gzjt-legacy-image-import/1.0' } });
    if (!imageRes.ok) throw new Error(`download failed ${imageRes.status}`);
    const blob = await imageRes.blob();
    const form = new FormData();
    const filename = image?.filename || path.basename(new URL(imageUrl).pathname) || 'legacy-image.jpg';
    form.append('file', blob, filename);
    const file = await request('/files', { method: 'POST', token, body: form, expected: [200, 201] });
    const uploaded = { id: file?.id || null, assetUrl: file?.id ? `${assetsBaseUrl}/assets/${file.id}` : null, filename };
    imageCache.set(imageUrl, uploaded);
    imageReport.uploaded.push({ url: imageUrl, file_id: uploaded.id, asset_url: uploaded.assetUrl, filename });
    return uploaded;
  } catch (error) {
    const message = `Image skipped: ${imageUrl} (${error.message})`;
    warnings.push(message);
    imageReport.failed.push({ url: imageUrl, message: error.message });
    return null;
  }
};

const replaceContentImageUrls = (contentHtml, replacements) => {
  let html = contentHtml || '';
  for (const [oldUrl, uploaded] of replacements.entries()) {
    if (!uploaded?.assetUrl) continue;
    html = html.split(oldUrl).join(uploaded.assetUrl);
  }
  return html;
};

const prepareImages = async (token, item, warnings, imageCache, imageReport) => {
  const images = normalizeImageList(item);
  const replacements = new Map();
  if (skipImages || !images.length) return { cover: null, content: item.content_html || item.content_text || '', replacements };
  for (const image of images) {
    const uploaded = await uploadImage(token, image, warnings, imageCache, imageReport);
    if (uploaded?.assetUrl) replacements.set(image.url, uploaded);
  }
  const coverSource = item.cover_image_url || images[0]?.url;
  const cover = coverSource && replacements.has(coverSource) ? replacements.get(coverSource).id : (replacements.values().next().value?.id || null);
  return { cover, content: replaceContentImageUrls(item.content_html || item.content_text || '', replacements), replacements };
};

const toArticlePayload = async (token, item, channelId, warnings, imageCache, imageReport) => {
  const imageResult = await prepareImages(token, item, warnings, imageCache, imageReport);
  return {
    title: item.title,
    subtitle: '',
    summary: item.summary || item.content_text?.slice(0, 160) || '',
    content: imageResult.content,
    source: '旧官网迁移',
    author: item.author || '旧官网',
    publish_at: item.publish_at,
    status: targetStatus,
    main_channel: channelId,
    cover: imageResult.cover,
    cover_url: item.cover_image_url || '',
    source_file: item.external_source_url || item.legacy_id || ''
  };
};

const main = async () => {
  const payload = await loadJson(input);
  const items = normalizeItems(payload).filter((item) => !item.skipped_reason);
  const report = {
    input,
    generated_at: new Date().toISOString(),
    commit,
    status: targetStatus,
    skip_images: skipImages,
    force_update: forceUpdate,
    assets_base_url: assetsBaseUrl,
    created: [],
    updated: [],
    skipped: [],
    warnings: [],
    errors: [],
    images: { uploaded: [], reused: [], failed: [] }
  };

  let token = null;
  const channelCache = new Map();
  const imageCache = new Map();
  if (commit) token = await login();

  for (const item of items) {
    try {
      if (!item.publish_at) {
        report.skipped.push({ legacy_id: item.legacy_id, title: item.title, reason: 'missing_publish_at' });
        continue;
      }
      if (!commit) {
        report.skipped.push({ legacy_id: item.legacy_id, title: item.title, reason: 'dry_run', channel_slug: item.channel_slug });
        continue;
      }
      if (!channelCache.has(item.channel_slug)) channelCache.set(item.channel_slug, await findChannelId(token, item.channel_slug));
      const channelId = channelCache.get(item.channel_slug);
      if (!channelId) {
        report.errors.push({ legacy_id: item.legacy_id, title: item.title, reason: `channel_not_found:${item.channel_slug}` });
        continue;
      }
      const existing = await findExistingArticle(token, item);
      if (existing && !forceUpdate) {
        report.skipped.push({ legacy_id: item.legacy_id, title: item.title, reason: 'duplicate_source_file', existing_id: existing.id });
        continue;
      }
      const warnings = [];
      const articlePayload = await toArticlePayload(token, item, channelId, warnings, imageCache, report.images);
      report.warnings.push(...warnings.map((message) => ({ legacy_id: item.legacy_id, title: item.title, message })));
      if (existing && forceUpdate) {
        const updated = await request(`/items/articles/${encodeURIComponent(existing.id)}`, { method: 'PATCH', token, body: articlePayload });
        report.updated.push({ id: updated?.id || existing.id, legacy_id: item.legacy_id, title: item.title });
      } else {
        const created = await request('/items/articles', { method: 'POST', token, body: articlePayload });
        report.created.push({ id: created?.id, legacy_id: item.legacy_id, title: item.title });
      }
    } catch (error) {
      report.errors.push({ legacy_id: item.legacy_id, title: item.title, message: error.message });
    }
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`${commit ? 'Import' : 'Dry-run'} report written: ${reportPath}`);
  console.log(`created=${report.created.length}, updated=${report.updated.length}, skipped=${report.skipped.length}, warnings=${report.warnings.length}, errors=${report.errors.length}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
