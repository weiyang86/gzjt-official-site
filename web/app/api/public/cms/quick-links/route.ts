import { NextResponse } from 'next/server';
import { getPublicQuickLinks } from '@/lib/cms';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    return NextResponse.json(await getPublicQuickLinks(searchParams.get('position') || undefined));
  } catch {
    return NextResponse.json([]);
  }
}
