import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const target = id ? `/news/${encodeURIComponent(id)}` : '/news';
  return new NextResponse(null, {
    status: 302,
    headers: { Location: target },
  });
}
