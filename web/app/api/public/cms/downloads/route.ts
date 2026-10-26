import { NextResponse } from 'next/server';
import { getPublicDownloads } from '@/lib/cms';

export async function GET() {
  try {
    return NextResponse.json(await getPublicDownloads());
  } catch {
    return NextResponse.json({ content: null, items: [] });
  }
}
