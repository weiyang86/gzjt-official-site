import { CompanyDetailPage } from '../../site-pages';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CompanyDetailPage slug={slug} />;
}
