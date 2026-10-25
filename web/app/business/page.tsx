import type { Metadata } from 'next';
import { BusinessPage } from '../site-pages';
import { buildSeoMetadata } from '@/lib/cms/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: '/business-dev' });
}

export default function Page() {
  return <BusinessPage />;
}
