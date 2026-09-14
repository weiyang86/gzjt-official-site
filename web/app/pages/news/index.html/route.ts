import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL('/news', url.origin);
  const channel = url.searchParams.get('channel');
  const keyword = url.searchParams.get('keyword');
  if (channel) target.searchParams.set('channel', channel);
  if (keyword) target.searchParams.set('keyword', keyword);
  return NextResponse.redirect(target, 302);
}
