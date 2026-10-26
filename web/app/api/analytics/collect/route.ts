import { NextResponse, type NextRequest } from 'next/server';
import { appendEvent, hashVisitor, type AnalyticsEvent } from '@/lib/analytics/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

declare global {
  // eslint-disable-next-line no-var
  var __gzjtAnalyticsRecent: Map<string, number> | undefined;
}

const visitorPattern = /^[A-Za-z0-9_-]{8,64}$/;
const namePattern = /^[a-z0-9-]{2,40}$/;
const botPattern = /bot|spider|crawler|crawl|slurp|bingpreview|headless|lighthouse|python-requests|curl|wget|axios|httpclient/i;
const excludedPrefixes = ['/admin', '/admin-api', '/api', '/preview', '/_next'];

const recentPageViews = globalThis.__gzjtAnalyticsRecent || new Map<string, number>();
globalThis.__gzjtAnalyticsRecent = recentPageViews;

const text = (value: unknown, max: number) => (typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max)
  : '');

const deviceOf = (userAgent: string) => {
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) return 'mobile';
  return 'desktop';
};

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 4096) return noContent();

    const raw = await request.text();
    if (!raw || raw.length > 2048) return noContent();

    const userAgent = text(request.headers.get('user-agent'), 300);
    if (botPattern.test(userAgent)) return noContent();

    const body = JSON.parse(raw) as Record<string, unknown>;
    const kind: AnalyticsEvent['k'] | '' = body.type === 'pageview' ? 'pageview' : body.type === 'event' ? 'event' : '';
    if (!kind) return noContent();

    const visitorId = text(body.visitorId, 64);
    if (!visitorPattern.test(visitorId)) return noContent();

    const rawPath = text(body.path, 300);
    if (!rawPath.startsWith('/')) return noContent();
    const pagePath = rawPath.split('?')[0].split('#')[0] || '/';
    if (excludedPrefixes.some((prefix) => pagePath === prefix || pagePath.startsWith(`${prefix}/`))) return noContent();

    const name = kind === 'event' ? text(body.name, 40) : '';
    if (kind === 'event' && !namePattern.test(name)) return noContent();

    const detail = kind === 'event' ? text(body.detail, 120) : '';
    let referrer = '';
    const rawReferrer = text(body.referrer, 500);
    if (rawReferrer) {
      try {
        const parsed = new URL(rawReferrer);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') referrer = parsed.hostname.slice(0, 120);
      } catch {
        referrer = '';
      }
    }

    const now = Date.now();
    const visitor = hashVisitor(visitorId);
    if (kind === 'pageview') {
      const previous = recentPageViews.get(visitor) || 0;
      if (now - previous < 500) return noContent();
      recentPageViews.set(visitor, now);
      if (recentPageViews.size > 5000) {
        for (const [key, timestamp] of recentPageViews) {
          if (now - timestamp > 60_000) recentPageViews.delete(key);
        }
      }
    }

    const event: AnalyticsEvent = {
      t: new Date(now).toISOString(),
      k: kind,
      p: pagePath,
      v: visitor,
      r: referrer,
      d: deviceOf(userAgent),
    };
    if (name) event.n = name;
    if (detail) event.x = detail;

    await appendEvent(event);
  } catch {
    // 采集失败不影响页面，直接返回空响应
  }
  return noContent();
}
