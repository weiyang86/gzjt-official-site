import { NextResponse } from 'next/server';
import { getPublicArticles, getPublicCompanyBySlug } from '@/lib/cms';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const company = await getPublicCompanyBySlug(slug);
    if (!company) return NextResponse.json({ error: { code: 'PUBLIC_COMPANY_NOT_FOUND', message: 'Company not found' } }, { status: 404 });
    const result = await getPublicArticles(new URL(request.url).searchParams, company.id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: { code: 'PUBLIC_CMS_UNAVAILABLE', message: 'Company articles unavailable' } }, { status: 503 });
  }
}
