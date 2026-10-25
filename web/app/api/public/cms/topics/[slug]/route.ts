import { NextResponse } from 'next/server';
import { getPublicTopicBySlug, getPublicTopicArticles } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const topic = await getPublicTopicBySlug(slug);
    if (!topic) {
      return NextResponse.json({ error: { code: 'PUBLIC_TOPIC_NOT_FOUND', message: 'Topic not found' } }, { status: 404 });
    }
    const articles = await getPublicTopicArticles(topic.moduleCode);
    return NextResponse.json({ ...topic, articles });
  } catch {
    return NextResponse.json({ error: { code: 'PUBLIC_CMS_UNAVAILABLE', message: 'Topic service unavailable' } }, { status: 503 });
  }
}
