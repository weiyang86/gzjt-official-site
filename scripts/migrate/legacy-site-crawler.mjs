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

const BASE_URL = legacySiteConfig.baseUrl.replace(/\/$/, '');
const dateFrom = String(args['date-from'] || legacySiteConfig.defaultDateFrom);
const dateTo = String(args['date-to'] || legacySiteConfig.defaultDateTo);
const maxPages = Number(args['max-pages'] || legacySiteConfig.defaultMaxPages);
const output = String(args.output || legacySiteConfig.defaultOutput);
const stopWhenBeforeDate = Boolean(args['stop-when-before-date']);
const selectedChannels = new Set(String(args.channels || legacySiteConfig.channels.map((item) => item.channel_slug).join(',')).split(',').map((item) => item.trim()).filter(Boolean));
const fromTime = new Date(`${dateFrom}T00:00:00+08:00`).getTime();
const toTime = new Date(`${dateTo}T23:59:59+08:00`).getTime();

const decodeHtml = (value = '') => String(value)
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const stripTags = (html = '') => decodeHtml(String(html).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '));
const absoluteUrl = (url) => new URL(url, BASE_URL).toString();
const legacyIdFromUrl = (url) => (String(url).match(/\/view\/(\d+)\.html/) || [])[1] || '';

const normalizeDateTime = (raw) => {
  if (!raw) return null;
  const value = decodeHtml(raw).replace(/[年月\.]/g, '-').replace(/[日]/g, ' ').replace(/\//g, '-').trim();
  const match = value.match(/(20\d{2})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!match) return null;
  const [, y, m, d, hh = '00', mm = '00', ss = '00'] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
};

const dateState = (dateValue) => {
  if (!dateValue) return 'missing';
  const time = new Date(dateValue.replace(' ', 'T') + '+08:00').getTime();
  if (!Number.isFinite(time)) return 'missing';
  if (time < fromTime) return 'before';
  if (time > toTime) return 'after';
  return 'inside';
};

const buildCategoryPageUrl = (categoryUrl, pageNo) => {
  if (pageNo === 1) return categoryUrl;
  const url = new URL(categoryUrl);
  url.searchParams.set('page', String(pageNo));
  return url.toString();
};

const fetchText = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'gzjt-migration-preview/1.0' } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.text();
};

const extractListEntries = (html) => {
  const entries = [];
  const linkRe = /<a\b[^>]*href=["']([^"']*\/view\/(\d+)\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(html))) {
    const [full, href, legacyId, titleHtml] = match;
    const context = html.slice(Math.max(0, match.index - 260), Math.min(html.length, match.index + full.length + 260));
    const publishDate = normalizeDateTime(context);
    const title = stripTags(titleHtml);
    if (!title) continue;
    entries.push({ legacy_id: legacyId, url: absoluteUrl(href), title, list_publish_at: publishDate });
  }
  return Array.from(new Map(entries.map((item) => [item.legacy_id, item])).values());
};

const extractDetail = (html, fallbackTitle) => {
  const title = stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || fallbackTitle || '');
  const dateCandidates = [
    (html.match(/发布时间[:：\s]*([0-9]{4}[\-\/年\.][0-9]{1,2}[\-\/月\.][0-9]{1,2}(?:[日\s]+[0-9:]{4,8})?)/i) || [])[1],
    (html.match(/发布日期[:：\s]*([0-9]{4}[\-\/年\.][0-9]{1,2}[\-\/月\.][0-9]{1,2}(?:[日\s]+[0-9:]{4,8})?)/i) || [])[1],
    normalizeDateTime(html)
  ];
  const publish_at = dateCandidates.map(normalizeDateTime).find(Boolean) || null;
  const author = decodeHtml((html.match(/作者[:：\s]*([^<\s]{1,40})/) || [])[1] || '');
  const source = decodeHtml((html.match(/来源[:：\s]*([^<]{1,80})/) || [])[1] || '旧官网');
  const bodyMatch = html.match(/<div[^>]+class=["'][^"']*(?:content|article|detail|news)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div|<\/body>)/i);
  const content_html = (bodyMatch ? bodyMatch[1] : html).trim();
  const content_text = stripTags(content_html);
  const summary = content_text.slice(0, 160);
  const images = Array.from(content_html.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)).map((m) => absoluteUrl(m[1]));
  return { title, publish_at, author, source, summary, content_html, content_text, cover_image_url: images[0] || '', images, uncertain: !bodyMatch };
};

const emptyRecord = (entry, channel, reason) => ({
  legacy_id: entry?.legacy_id || legacyIdFromUrl(entry?.url || ''),
  channel_slug: channel.channel_slug,
  title: entry?.title || '',
  summary: '',
  content_html: '',
  content_text: '',
  author: '',
  publish_at: entry?.list_publish_at || null,
  external_source_url: entry?.url || '',
  cover_image_url: '',
  images: [],
  status: 'draft',
  skipped_reason: reason,
  uncertain: true
});

const main = async () => {
  const items = [];
  const skipped = [];
  const errors = [];
  const channels = legacySiteConfig.channels.filter((channel) => selectedChannels.has(channel.channel_slug));

  for (const channel of channels) {
    let shouldStopChannel = false;
    for (let pageNo = 1; pageNo <= maxPages && !shouldStopChannel; pageNo += 1) {
      const pageUrl = buildCategoryPageUrl(channel.category_url, pageNo);
      try {
        const listHtml = await fetchText(pageUrl);
        const entries = extractListEntries(listHtml);
        if (!entries.length) break;
        let pageHasBeforeDate = false;
        for (const entry of entries) {
          if (dateState(entry.list_publish_at) === 'before') pageHasBeforeDate = true;
          try {
            const detailHtml = await fetchText(entry.url);
            const detail = extractDetail(detailHtml, entry.title);
            const publish_at = detail.publish_at || entry.list_publish_at;
            const state = dateState(publish_at);
            const record = {
              legacy_id: entry.legacy_id,
              channel_slug: channel.channel_slug,
              title: detail.title || entry.title,
              summary: detail.summary,
              content_html: detail.content_html,
              content_text: detail.content_text,
              author: detail.author || detail.source || '',
              publish_at,
              external_source_url: entry.url,
              cover_image_url: detail.cover_image_url,
              images: detail.images,
              status: 'draft',
              skipped_reason: null,
              uncertain: detail.uncertain
            };
            if (state === 'inside') items.push(record);
            else skipped.push({ ...record, skipped_reason: state === 'missing' ? 'publish_at_unrecognized' : `publish_at_${state}_range` });
          } catch (error) {
            errors.push({ channel_slug: channel.channel_slug, page_url: pageUrl, detail_url: entry.url, message: error.message });
            skipped.push(emptyRecord(entry, channel, 'detail_fetch_or_parse_failed'));
          }
        }
        if (stopWhenBeforeDate && pageHasBeforeDate) shouldStopChannel = true;
      } catch (error) {
        errors.push({ channel_slug: channel.channel_slug, page_url: pageUrl, message: error.message });
      }
    }
  }

  const payload = {
    meta: {
      source: BASE_URL,
      generated_at: new Date().toISOString(),
      date_from: dateFrom,
      date_to: dateTo,
      channels: channels.map((item) => item.channel_slug),
      max_pages: maxPages,
      stop_when_before_date: stopWhenBeforeDate,
      dry_run: true
    },
    items,
    skipped,
    errors
  };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Preview written: ${output}`);
  console.log(`items=${items.length}, skipped=${skipped.length}, errors=${errors.length}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
