import { getPublicPageBySlug, getPublicResponsibilityContent, getPublicResponsibilityItems } from '@/lib/cms';
import { fallbackPageBySlug } from '@/lib/cms/fallback-site';
import type { PageContent, ResponsibilityCategory } from '@/types/cms';
import { ResponsibilityPage } from '../responsibility/responsibility-page';

export const dynamic = 'force-dynamic';

const validCategories: Array<'all' | ResponsibilityCategory> = ['all', 'report', 'case', 'activity'];

async function loadFallbackPage(): Promise<PageContent | null> {
  try {
    return await getPublicPageBySlug('responsibility') || fallbackPageBySlug('responsibility');
  } catch {
    return fallbackPageBySlug('responsibility');
  }
}

export default async function SocialResponsibilityRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawCategory = typeof params.category === 'string' ? params.category : 'all';
  const activeCategory = validCategories.includes(rawCategory as 'all' | ResponsibilityCategory)
    ? rawCategory as 'all' | ResponsibilityCategory
    : 'all';

  const [fallbackPage, content, items] = await Promise.all([
    loadFallbackPage(),
    getPublicResponsibilityContent().catch(() => null),
    getPublicResponsibilityItems().catch(() => []),
  ]);

  return (
    <ResponsibilityPage
      basePath="/social-responsibility"
      fallbackPage={fallbackPage}
      content={content}
      items={items}
      activeCategory={activeCategory}
    />
  );
}
