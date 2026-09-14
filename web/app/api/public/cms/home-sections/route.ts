import { NextResponse } from 'next/server';
import { getPublicHomeSections } from '@/lib/cms';

export async function GET() {
  try {
    return NextResponse.json(await getPublicHomeSections());
  } catch {
    return NextResponse.json([]);
  }
}
