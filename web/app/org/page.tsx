import type { Metadata } from 'next';
import { OrgListPage } from '../site-pages';
import { buildSeoMetadata } from '@/lib/cms/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: '/org' });
}

export default function Page() {
  return <OrgListPage />;
}
