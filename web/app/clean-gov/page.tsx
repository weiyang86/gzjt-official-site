import type { Metadata } from 'next';
import { GenericSinglePage } from '../site-pages';
import { buildSeoMetadata } from '@/lib/cms/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: '/clean-gov' });
}

export default function CleanGovPage() {
  return <GenericSinglePage slug="cleanGov" />;
}
