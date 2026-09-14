import { NextResponse } from 'next/server';
import { getPublicBusinessSectors } from '@/lib/cms';
import { fallbackBusinessSectors } from '@/lib/cms/fallback-site';

export async function GET() {
  try {
    const sectors = await getPublicBusinessSectors();
    return NextResponse.json(sectors.length ? sectors : fallbackBusinessSectors);
  } catch {
    return NextResponse.json(fallbackBusinessSectors);
  }
}
