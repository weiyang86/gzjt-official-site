import type { Metadata } from 'next';
import { CompanyDetailPage } from '../../site-pages';
import { getPublicCompanyBySlug } from '@/lib/cms/site-content';
import { buildSeoMetadata } from '@/lib/cms/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getPublicCompanyBySlug(slug).catch(() => null);
  if (!company) {
    return buildSeoMetadata({ path: `/org/${slug}`, title: '公司未找到', noIndex: true });
  }
  return buildSeoMetadata({
    path: `/org/${slug}`,
    title: company.name,
    description: company.intro,
    keywords: [company.name, company.shortName, '下属公司', '甘孜州建设投资集团'].filter(Boolean).join(','),
    image: company.cover || company.logo,
  });
}

export default async function Page({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const pageValue = Array.isArray(query.page) ? query.page[0] : query.page;
  const page = Math.max(1, Number.parseInt(pageValue || '1', 10) || 1);
  return <CompanyDetailPage slug={slug} page={page} />;
}
