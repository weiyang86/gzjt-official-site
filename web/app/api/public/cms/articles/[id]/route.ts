import { NextResponse } from 'next/server';
import { getPublicArticleById } from '@/lib/cms';
import { fallbackNewsArticles } from '@/lib/cms/fallback-news';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const article = await getPublicArticleById(id);
    if (!article) return NextResponse.json({ error: { code: 'PUBLIC_ARTICLE_NOT_FOUND', message: 'Article not found' } }, { status: 404 });
    return NextResponse.json(article);
  } catch {
    const fallback = fallbackNewsArticles.find((item) => item.id === id);
    if (!fallback) return NextResponse.json({ error: { code: 'PUBLIC_ARTICLE_NOT_FOUND', message: 'Article not found' } }, { status: 404 });
    return NextResponse.json(fallback);
  }
}
