import { CompanyDetailPage } from '../../site-pages';

export const dynamic = 'force-dynamic';

export default async function Page({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const pageValue = Array.isArray(query.page) ? query.page[0] : query.page;
  const page = Math.max(1, Number.parseInt(pageValue || '1', 10) || 1);
  return <CompanyDetailPage slug={slug} page={page} />;
}
