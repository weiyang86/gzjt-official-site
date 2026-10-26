import type { Metadata } from 'next';
import NewsPage from '../news/page';
import { buildSeoMetadata } from '@/lib/cms/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: '/news' });
}

export default NewsPage;
