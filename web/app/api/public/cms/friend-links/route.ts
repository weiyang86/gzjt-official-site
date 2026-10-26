import { NextResponse } from 'next/server';
import { getPublicFriendLinks } from '@/lib/cms';

export async function GET() {
  try {
    return NextResponse.json(await getPublicFriendLinks());
  } catch {
    return NextResponse.json([]);
  }
}
