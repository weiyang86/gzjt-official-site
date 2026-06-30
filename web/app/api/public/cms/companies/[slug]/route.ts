import { NextResponse } from 'next/server';
import { getPublicCompanyBySlug } from '@/lib/cms';
import { fallbackCompanyBySlug } from '@/lib/cms/fallback-site';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const company = await getPublicCompanyBySlug(slug);
    if (company) return NextResponse.json(company);
  } catch {}

  const fallback = fallbackCompanyBySlug(slug);
  if (!fallback) return NextResponse.json({ error: { code: 'PUBLIC_COMPANY_NOT_FOUND', message: 'Company not found' } }, { status: 404 });
  return NextResponse.json(fallback);
}
