import { BusinessPage } from '../site-pages';

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
