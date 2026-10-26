import { NextResponse } from 'next/server';
import { getPublicTopics } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const topics = await getPublicTopics();
    return NextResponse.json(topics);
  } catch {
    return NextResponse.json([], { status: 503 });
  }
}
