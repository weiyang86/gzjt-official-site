import { NextResponse } from 'next/server';
import { fallbackNewsChannels } from '@/lib/cms/fallback-news';
import { getPublicChannels, type PublicScope } from '@/lib/cms';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || searchParams.get('scope') || '') as PublicScope;

  try {
    return NextResponse.json(await getPublicChannels(type));
  } catch {
    if (type === 'notice') return NextResponse.json([]);
    if (type === 'news') return NextResponse.json(fallbackNewsChannels.filter((item) => item.type === 'news' || item.isNewsCategory));
    return NextResponse.json(fallbackNewsChannels);
  }
}
