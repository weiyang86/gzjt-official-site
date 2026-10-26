import type { Metadata } from 'next';
import { BusinessInnovationPage } from '../../site-pages';
import { buildSeoMetadata } from '@/lib/cms/seo';

export const dynamic = 'force-dynamic';

type BusinessInnovationRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: BusinessInnovationRouteProps) {
  const params = await searchParams;
  const rawSlug = params.innovation;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const rawCategory = params.category;
  const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
  return <BusinessInnovationPage selectedSlug={slug} selectedCategory={category} />;
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: '/business/innovation' });
}
