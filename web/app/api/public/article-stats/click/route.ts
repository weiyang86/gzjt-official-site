import { NextResponse, type NextRequest } from 'next/server';
import { recordArticleStat } from '@/lib/article-stats/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const botPattern = /bot|spider|crawler|crawl|slurp|bingpreview|headless|lighthouse|python-requests|curl|wget|axios|httpclient/i;

const noContent = () => new NextResponse(null, { status: 204 });

/** 前台点击新闻/公告链接时由浏览器埋点上报，用于统计点击量。 */
export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || '';
    if (botPattern.test(userAgent)) return noContent();
    const id = (request.nextUrl.searchParams.get('id') || '').trim();
    await recordArticleStat(id, 'clicks');
  } catch {
    // 统计失败不影响前台页面
  }
  return noContent();
}
