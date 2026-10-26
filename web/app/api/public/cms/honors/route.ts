import { NextResponse } from 'next/server';
import { getPublicHonors } from '@/lib/cms';

export async function GET() {
  try {
    return NextResponse.json(await getPublicHonors());
  } catch {
    return NextResponse.json({ content: null, items: [] });
  }
}
