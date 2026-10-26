import { NextResponse } from 'next/server';
import { getPublicDownloadCenter } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getPublicDownloadCenter());
  } catch {
    return NextResponse.json({ categories: [], resources: [] }, { status: 503 });
  }
}
