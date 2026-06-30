import { NextResponse } from 'next/server';
import { getPublicArticles } from '@/lib/cms';
import { getFallbackNewsPayload } from '@/lib/cms/fallback-news';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    return NextResponse.json(await getPublicArticles(searchParams));
  } catch {
    return NextResponse.json(getFallbackNewsPayload(searchParams));
  }
}
