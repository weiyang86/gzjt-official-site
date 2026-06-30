import { NextResponse } from 'next/server';
import { getPublicPageBySlug } from '@/lib/cms';
import { fallbackPageBySlug } from '@/lib/cms/fallback-site';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const page = await getPublicPageBySlug(slug);
    if (page) return NextResponse.json(page);
  } catch {}

  const fallback = fallbackPageBySlug(slug);
  if (!fallback) return NextResponse.json({ error: { code: 'PUBLIC_PAGE_NOT_FOUND', message: 'Page not found' } }, { status: 404 });
  return NextResponse.json(fallback);
}
