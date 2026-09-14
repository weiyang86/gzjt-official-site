import { NextResponse } from 'next/server';
import { getPublicArticles } from '@/lib/cms';
import { getFallbackNewsPayload } from '@/lib/cms/fallback-news';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    return NextResponse.json(await getPublicArticles(searchParams));
  } catch {
    if ((searchParams.get('type') || searchParams.get('scope')) === 'notice') {
      const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
      const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '10', 10) || 10));
      return NextResponse.json({ page, pageSize, total: 0, items: [] });
    }
    return NextResponse.json(getFallbackNewsPayload(searchParams));
  }
}
