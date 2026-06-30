#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { legacySiteConfig } from './legacy-site.config.mjs';

const DATE_RE = /(20\d{2})[-\/年](\d{1,2})[-\/月](\d{1,2})日?(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
const VIEW_RE = /\/view\/(\d+)\.html/;

export const parseArgs = (argv = process.argv.slice(2)) => Object.fromEntries(argv.map((arg) => {
  const normalized = arg.replace(/^--/, '');
  if (!normalized.includes('=')) return [normalized, true];
  const [key, ...rest] = normalized.split('=');
  return [key, rest.join('=')];
}));

export const decodeHtml = (value = '') => String(value)
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

export const stripTags = (html = '') => decodeHtml(String(html)
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' '));

export const parseLegacyDate = (text) => {
  if (!text) return null;
  const rawText = decodeHtml(text);
  const match = rawText.match(DATE_RE);
  if (!match) return null;
  const [, y, m, d, hh = '00', mm = '00', ss = '00'] = match;
  const dateOnly = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const dateTime = `${dateOnly} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
  const timestamp = new Date(`${dateTime.replace(' ', 'T')}+08:00`).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return { raw: match[0].trim(), dateOnly, dateTime, timestamp };
};

const isMain = () => process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
const absoluteUrl = (url, baseUrl) => new URL(url, baseUrl).toString();
const legacyIdFromUrl = (url) => (String(url).match(VIEW_RE) || [])[1] || '';

const makeRange = (dateFrom, dateTo) => ({
  from: parseLegacyDate(`${dateFrom} 00:00:00`),
  to: parseLegacyDate(`${dateTo} 23:59:59`)
});

const dateState = (dateInfo, range) => {
  if (!dateInfo) return 'invalid-date';
  if (dateInfo.timestamp < range.from.timestamp) return 'before-range';
  if (dateInfo.timestamp > range.to.timestamp) return 'after-range';
  return 'in-range';
};

const collapseDuplicateTitle = (text) => {
  let title = decodeHtml(text).replace(DATE_RE, '').replace(/[\s·•｜|_-]+$/g, '').trim();
  if (!title) return '';
  const half = Math.floor(title.length / 2);
  if (title.length % 2 === 0 && title.slice(0, half) === title.slice(half)) return title.slice(0, half).trim();
  const spaceParts = title.split(/\s+/).map((item) => item.trim()).filter(Boolean);
  if (spaceParts.length % 2 === 0 && spaceParts.length > 1) {
    const mid = spaceParts.length / 2;
    if (spaceParts.slice(0, mid).join(' ') === spaceParts.slice(mid).join(' ')) return spaceParts.slice(0, mid).join(' ');
  }
  const parts = title.split(/\s{2,}|\s+\/\s+|\s+\|\s+/).map((item) => item.trim()).filter(Boolean);
  if (parts.length >= 2 && parts[0] === parts[1]) return parts[0];
  return title;
};

const buildCategoryPageUrl = (categoryUrl, pageNo) => {
  if (pageNo === 1) return categoryUrl;
  const url = new URL(categoryUrl);
  url.searchParams.set('page', String(pageNo));
  return url.toString();
};

const fetchText = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 gzjt-migration-preview/2.0' } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.text();
};

const nearestContainer = (html, index, full) => {
  const before = html.slice(0, index);
  const after = html.slice(index + full.length);
  const startCandidates = ['<li', '<tr', '<article', '<div'].map((tag) => before.toLowerCase().lastIndexOf(tag)).filter((pos) => pos >= 0);
  const start = startCandidates.length ? Math.max(...startCandidates) : Math.max(0, index - 240);
  const endMatches = ['</li>', '</tr>', '</article>', '</div>'].map((tag) => {
    const pos = after.toLowerCase().indexOf(tag);
    return pos >= 0 ? index + full.length + pos + tag.length : -1;
  }).filter((pos) => pos >= 0);
  const end = endMatches.length ? Math.min(...endMatches) : Math.min(html.length, index + full.length + 320);
  return html.slice(start, end);
};

export const extractListEntries = (html, channel, baseUrl = legacySiteConfig.baseUrl) => {
  const entries = [];
  const linkRe = /<a\b[^>]*href=["']([^"']*\/view\/(\d+)\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(html))) {
    const [full, href, legacyId, titleHtml] = match;
    const container = nearestContainer(html, match.index, full);
    const rawText = stripTags(container);
    const tailDate = parseLegacyDate(rawText.match(new RegExp(`${DATE_RE.source}\\s*$`))?.[0] || rawText);
    const titleFromContainer = collapseDuplicateTitle(rawText);
    const titleFromAnchor = collapseDuplicateTitle(stripTags(titleHtml));
    const title = titleFromAnchor || titleFromContainer;
    if (!title) continue;
    entries.push({
      legacy_id: legacyId,
      channel_slug: channel.channel_slug,
      title,
      detail_url: absoluteUrl(href, baseUrl),
      list_date: tailDate?.dateTime || null,
      list_date_raw: tailDate?.raw || '',
      raw_text: rawText.slice(0, 300)
    });
  }
  return Array.from(new Map(entries.map((item) => [item.legacy_id, item])).values());
};

const extractTitle = (html, fallbackTitle) => {
  const h1 = stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
  return h1 || fallbackTitle || '';
};

const extractDetailDate = (html) => {
  const titleMatch = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/i);
  const titleEnd = titleMatch ? titleMatch.index + titleMatch[0].length : 0;
  const afterTitle = stripTags(html.slice(titleEnd, titleEnd + 1800));
  const labelPatterns = [
    /(?:发布时间|发布日期|时间|日期)[:：\s]*((?:20\d{2})[-\/年]\d{1,2}[-\/月]\d{1,2}日?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/,
    /((?:20\d{2})[-\/年]\d{1,2}[-\/月]\d{1,2}日?(?:\s+\d{1,2}:\d{2}(?::\d{2})?))/
  ];
  for (const pattern of labelPatterns) {
    const match = afterTitle.match(pattern);
    const parsed = parseLegacyDate(match?.[1]);
    if (parsed) return { ...parsed, scope: 'after-title-meta', raw_text: afterTitle.slice(0, 300) };
  }
  return null;
};

const extractDetailBody = (html) => {
  const candidates = [
    /<div[^>]+class=["'][^"']*(?:article-content|news-content|detail-content|content|article|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div|<\/main>|<\/body>)/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i
  ];
  for (const pattern of candidates) {
    const match = html.match(pattern);
    if (match?.[1]) return { html: match[1].trim(), uncertain: false };
  }
  return { html: html.trim(), uncertain: true };
};

const extractDetail = (html, fallbackTitle) => {
  const title = extractTitle(html, fallbackTitle);
  const detailDate = extractDetailDate(html);
  const author = decodeHtml((stripTags(html.slice(0, 3000)).match(/作者[:：\s]*([^\s来源发布时间发布日期]{1,40})/) || [])[1] || '');
  const source = decodeHtml((stripTags(html.slice(0, 3000)).match(/来源[:：\s]*([^\s发布时间发布日期]{1,80})/) || [])[1] || '旧官网');
  const body = extractDetailBody(html);
  const contentText = stripTags(body.html);
  const images = Array.from(body.html.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)).map((m) => absoluteUrl(m[1], legacySiteConfig.baseUrl));
  return {
    title,
    detail_date: detailDate?.dateTime || null,
    detail_date_raw: detailDate?.raw || '',
    detail_date_scope: detailDate?.scope || '',
    detail_date_raw_text: detailDate?.raw_text || '',
    author: author || source,
    summary: contentText.slice(0, 160),
    content_html: body.html,
    content_text: contentText,
    cover_image_url: images[0] || '',
    images,
    uncertain: body.uncertain
  };
};

const baseSkippedRecord = (entry, channel, skippedReason, extra = {}) => ({
  legacy_id: entry?.legacy_id || legacyIdFromUrl(entry?.detail_url || ''),
  channel_slug: channel.channel_slug,
  title: entry?.title || '',
  detail_url: entry?.detail_url || '',
  list_date: entry?.list_date || null,
  detail_date: extra.detail_date || null,
  parsed_date: extra.parsed_date || entry?.list_date || null,
  skipped_reason: skippedReason,
  raw_text: entry?.raw_text || '',
  warnings: extra.warnings || []
});

const createStats = (channels) => ({
  items: 0,
  skipped: 0,
  errors: 0,
  by_channel: Object.fromEntries(channels.map((channel) => [channel.channel_slug, { items: 0, skipped: 0, errors: 0, pages: 0, list_entries: 0 }]))
});

const debugLog = (debug, ...parts) => {
  if (debug) console.log('[legacy-crawler]', ...parts);
};

export const crawlLegacySite = async (options = {}) => {
  const baseUrl = legacySiteConfig.baseUrl.replace(/\/$/, '');
  const dateFrom = String(options.dateFrom || legacySiteConfig.defaultDateFrom);
  const dateTo = String(options.dateTo || legacySiteConfig.defaultDateTo);
  const range = makeRange(dateFrom, dateTo);
  const maxPages = Number(options.maxPages || legacySiteConfig.defaultMaxPages);
  const stopWhenBeforeDate = Boolean(options.stopWhenBeforeDate);
  const selectedChannels = new Set(String(options.channels || legacySiteConfig.channels.map((item) => item.channel_slug).join(',')).split(',').map((item) => item.trim()).filter(Boolean));
  const channels = legacySiteConfig.channels.filter((channel) => selectedChannels.has(channel.channel_slug));
  const debug = Boolean(options.debug);
  const items = [];
  const skipped = [];
  const errors = [];
  const stats = createStats(channels);

  for (const channel of channels) {
    debugLog(debug, `channel=${channel.name} slug=${channel.channel_slug} url=${channel.category_url}`);
    let shouldStopChannel = false;
    for (let pageNo = 1; pageNo <= maxPages && !shouldStopChannel; pageNo += 1) {
      const pageUrl = buildCategoryPageUrl(channel.category_url, pageNo);
      debugLog(debug, `page=${pageNo} url=${pageUrl}`);
      stats.by_channel[channel.channel_slug].pages += 1;
      try {
        const listHtml = await fetchText(pageUrl);
        const entries = extractListEntries(listHtml, channel, baseUrl);
        stats.by_channel[channel.channel_slug].list_entries += entries.length;
        debugLog(debug, `list entries=${entries.length}`);
        if (!entries.length) break;
        const parsedListDates = entries.map((entry) => parseLegacyDate(entry.list_date)).filter(Boolean);
        const hasUnknownListDate = parsedListDates.length !== entries.length;
        for (const entry of entries) {
          debugLog(debug, `list item title=${entry.title} legacy_id=${entry.legacy_id} list_date=${entry.list_date || 'N/A'} detail_url=${entry.detail_url}`);
          try {
            const detailHtml = await fetchText(entry.detail_url);
            const detail = extractDetail(detailHtml, entry.title);
            const warnings = [];
            if (entry.list_date && detail.detail_date && entry.list_date.slice(0, 10) !== detail.detail_date.slice(0, 10)) warnings.push('date-mismatch');
            const finalDate = parseLegacyDate(detail.detail_date) || parseLegacyDate(entry.list_date);
            const state = dateState(finalDate, range);
            debugLog(debug, `detail legacy_id=${entry.legacy_id} detail_date=${detail.detail_date || 'N/A'} final=${finalDate?.dateTime || 'N/A'} state=${state}`);
            const record = {
              legacy_id: entry.legacy_id,
              channel_slug: channel.channel_slug,
              title: detail.title || entry.title,
              summary: detail.summary,
              content_html: detail.content_html,
              content_text: detail.content_text,
              author: detail.author,
              publish_at: finalDate?.dateTime || null,
              list_date: entry.list_date,
              detail_date: detail.detail_date,
              external_source_url: entry.detail_url,
              cover_image_url: detail.cover_image_url,
              images: detail.images,
              status: 'draft',
              warnings,
              skipped_reason: null,
              uncertain: detail.uncertain
            };
            if (state === 'in-range') {
              items.push(record);
              stats.items += 1;
              stats.by_channel[channel.channel_slug].items += 1;
            } else {
              skipped.push({
                ...baseSkippedRecord(entry, channel, state, { detail_date: detail.detail_date, parsed_date: finalDate?.dateTime || null, warnings }),
                summary: detail.summary,
                publish_at: finalDate?.dateTime || null
              });
              stats.skipped += 1;
              stats.by_channel[channel.channel_slug].skipped += 1;
            }
          } catch (error) {
            const errorPayload = { channel_slug: channel.channel_slug, page_url: pageUrl, detail_url: entry.detail_url, message: error.message };
            errors.push(errorPayload);
            skipped.push(baseSkippedRecord(entry, channel, 'detail-error', { warnings: [error.message] }));
            stats.errors += 1;
            stats.skipped += 1;
            stats.by_channel[channel.channel_slug].errors += 1;
            stats.by_channel[channel.channel_slug].skipped += 1;
            debugLog(debug, `detail error legacy_id=${entry.legacy_id} ${error.message}`);
          }
        }
        const allParsedBeforeRange = parsedListDates.length > 0 && !hasUnknownListDate && parsedListDates.every((dateInfo) => dateInfo.timestamp < range.from.timestamp);
        if (stopWhenBeforeDate && allParsedBeforeRange) {
          shouldStopChannel = true;
          debugLog(debug, `stop channel=${channel.channel_slug}: all ${parsedListDates.length} parsed list dates before ${dateFrom}`);
        } else if (stopWhenBeforeDate && hasUnknownListDate) {
          debugLog(debug, `continue channel=${channel.channel_slug}: page has unparsed list dates, not safe to stop`);
        }
      } catch (error) {
        errors.push({ channel_slug: channel.channel_slug, page_url: pageUrl, message: error.message });
        stats.errors += 1;
        stats.by_channel[channel.channel_slug].errors += 1;
        debugLog(debug, `page error channel=${channel.channel_slug} page=${pageNo} ${error.message}`);
      }
    }
  }

  return {
    generated_at: new Date().toISOString(),
    source: baseUrl,
    date_from: dateFrom,
    date_to: dateTo,
    channels: channels.map((item) => item.channel_slug),
    stats,
    items,
    skipped,
    errors,
    meta: {
      source: baseUrl,
      generated_at: new Date().toISOString(),
      date_from: dateFrom,
      date_to: dateTo,
      channels: channels.map((item) => item.channel_slug),
      max_pages: maxPages,
      stop_when_before_date: stopWhenBeforeDate,
      dry_run: true
    }
  };
};

const main = async () => {
  const args = parseArgs();
  const output = String(args.output || legacySiteConfig.defaultOutput);
  const payload = await crawlLegacySite({
    dateFrom: args['date-from'],
    dateTo: args['date-to'],
    channels: args.channels,
    maxPages: args['max-pages'],
    stopWhenBeforeDate: args['stop-when-before-date'],
    debug: args.debug
  });
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Preview written: ${output}`);
  console.log(`items=${payload.items.length}, skipped=${payload.skipped.length}, errors=${payload.errors.length}`);
};

if (isMain()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
