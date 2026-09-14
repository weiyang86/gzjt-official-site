import { NextResponse } from 'next/server';
import { getPublicBanners } from '@/lib/cms';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    return NextResponse.json(await getPublicBanners(searchParams.get('position') || undefined));
  } catch {
    return NextResponse.json([]);
  }
}
