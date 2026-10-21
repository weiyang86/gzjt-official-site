import { NextResponse } from 'next/server';
import { getPublicChannels, type PublicScope } from '@/lib/cms';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || searchParams.get('scope') || '') as PublicScope;

  try {
    return NextResponse.json(await getPublicChannels(type));
  } catch {
    return NextResponse.json([], { status: 503 });
  }
}
