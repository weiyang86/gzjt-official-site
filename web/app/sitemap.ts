import type { MetadataRoute } from 'next';
import { getPublicArticles } from '@/lib/cms/articles';
import { getPublicCompanies } from '@/lib/cms/site-content';
import { getSiteBaseUrl, seoManagedPages } from '@/lib/seo/pages';

export const dynamic = 'force-dynamic';

const maxSitemapArticles = 500;

async function getAllPublishedArticles() {
  const items: Array<{ id: string; publishAt: string }> = [];
  for (let page = 1; page <= 5; page += 1) {
    const payload = await getPublicArticles(new URLSearchParams({ page: String(page), pageSize: '100' }));
    payload.items.forEach((item) => {
      items.push({ id: item.id, publishAt: item.publishAt || item.publishDate || '' });
    });
    if (!payload.items.length || items.length >= payload.total || items.length >= maxSitemapArticles) break;
  }
  return items.slice(0, maxSitemapArticles);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();
  const staticPaths = Array.from(new Set(['/', ...seoManagedPages.map((page) => page.path)]));

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${baseUrl}${path === '/' ? '' : path}`,
    lastModified: new Date(),
    changeFrequency: path === '/' || path === '/home' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : path === '/home' ? 0.9 : 0.8,
  }));

  const [articles, companies] = await Promise.all([
    getAllPublishedArticles().catch(() => []),
    getPublicCompanies().catch(() => []),
  ]);

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/news/${encodeURIComponent(article.id)}`,
    lastModified: article.publishAt ? new Date(article.publishAt) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const companyEntries: MetadataRoute.Sitemap = companies
    .filter((company) => company.slug)
    .map((company) => ({
      url: `${baseUrl}/org/${encodeURIComponent(company.slug)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

  return [...staticEntries, ...articleEntries, ...companyEntries];
}
