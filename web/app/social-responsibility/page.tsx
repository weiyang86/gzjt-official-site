import type { Metadata } from 'next';
import { GenericSinglePage } from '../site-pages';
import { buildSeoMetadata } from '@/lib/cms/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: '/social-responsibility' });
}

export default function SocialResponsibilityPage() {
  return <GenericSinglePage slug="responsibility" />;
}
