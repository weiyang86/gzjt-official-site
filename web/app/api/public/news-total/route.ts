import { NextResponse } from 'next/server';
import { getPublicNewsTotal } from '@/lib/cms';
import { fallbackNewsArticles } from '@/lib/cms/fallback-news';

export async function GET() {
  try {
    return NextResponse.json({ total: await getPublicNewsTotal() });
  } catch {
    return NextResponse.json({ total: fallbackNewsArticles.length });
  }
}
