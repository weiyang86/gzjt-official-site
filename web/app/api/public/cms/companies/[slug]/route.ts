import { NextResponse } from 'next/server';
import { getPublicCompanyBySlug } from '@/lib/cms';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const company = await getPublicCompanyBySlug(slug);
    if (company) return NextResponse.json(company);
  } catch {
    return NextResponse.json({ error: { code: 'PUBLIC_CMS_UNAVAILABLE', message: 'Company service unavailable' } }, { status: 503 });
  }
  return NextResponse.json({ error: { code: 'PUBLIC_COMPANY_NOT_FOUND', message: 'Company not found' } }, { status: 404 });
}
