import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const target = new URL(id ? `/news/${encodeURIComponent(id)}` : '/news', url.origin);
  return NextResponse.redirect(target, 302);
}
