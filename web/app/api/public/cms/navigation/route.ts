import { NextResponse } from 'next/server';
import { getPublicChannels } from '@/lib/cms';

export async function GET() {
  try {
    const channels = await getPublicChannels();
    return NextResponse.json(channels.filter((channel) => channel.visible !== false && channel.status === 'enabled'));
  } catch {
    return NextResponse.json([], { status: 503 });
  }
}
