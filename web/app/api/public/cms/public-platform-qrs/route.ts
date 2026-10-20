import { NextResponse } from 'next/server';
import { getPublicPlatformQrs } from '@/lib/cms';

export async function GET() {
  try {
    return NextResponse.json(await getPublicPlatformQrs());
  } catch {
    return NextResponse.json([]);
  }
}
