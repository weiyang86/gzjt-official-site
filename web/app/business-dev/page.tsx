import type { Metadata } from 'next';
import { BusinessPage } from '../site-pages';
import { buildSeoMetadata } from '@/lib/cms/seo';

export const dynamic = 'force-dynamic';

type BusinessDevPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BusinessDevPage({ searchParams }: BusinessDevPageProps) {
  const params = await searchParams;
  const rawSector = params.sector;
  const sector = Array.isArray(rawSector) ? rawSector[0] : rawSector;
  return <BusinessPage selectedSlug={sector} basePath="/business-dev" />;
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: '/business-dev' });
}
