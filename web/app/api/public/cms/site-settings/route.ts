import { NextResponse } from 'next/server';
import { getPublicSiteSettings } from '@/lib/cms';

export async function GET() {
  try {
    return NextResponse.json(await getPublicSiteSettings());
  } catch {
    return NextResponse.json({});
  }
}
