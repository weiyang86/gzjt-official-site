import type { Metadata } from 'next';
import { Drawer, Header } from '../news/components';
import HomepageExperience from '../homepage/HomepageExperience';
import { getPublicArticles, getPublicBusinessSectors, getPublicContactInfo, getPublicFriendLinks, getPublicHomepageLayout, getPublicHomeStats, getPublicPageModuleItems, getPublicPlatformQrs, getPublicQuickLinks, getPublicSiteSettings, getPublicTopics } from '@/lib/cms';
import { buildSeoMetadata } from '@/lib/cms/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    path: '/home',
    keywords: '甘孜州建设投资集团,甘孜建投,官网首页,交通建设,城乡建设',
  });
}

export default async function HomePage() {
  const [articlePayload, topics, cultureItems, sectors, qrs, quickLinks, homeStats, friendLinks, siteSettings, layout, contactInfo] = await Promise.all([
    getPublicArticles(new URLSearchParams({ page: '1', pageSize: '12' })).catch(() => ({ page: 1, pageSize: 12, total: 0, items: [] })),
    getPublicTopics().catch(() => []),
    getPublicPageModuleItems('corporate-culture', 'culture').catch(() => []),
    getPublicBusinessSectors().catch(() => []),
    getPublicPlatformQrs().catch(() => []),
    getPublicQuickLinks().catch(() => []),
    getPublicHomeStats().catch(() => []),
    getPublicFriendLinks('footer').catch(() => []),
    getPublicSiteSettings().catch(() => ({ siteName: '', footerText: '', logo: '', address: '', phone: '', email: '', icp: '', copyright: '' })),
    getPublicHomepageLayout(),
    getPublicContactInfo(),
  ]);
  const cleanSiteText = (value: string) => /本地.{0,8}测试|directus|初始化测试/i.test(value) ? '' : value;
  const cleanedSiteName = cleanSiteText(siteSettings.siteName) || '甘孜州建设投资集团有限公司';
  const cleanedSiteSettings = {
    ...siteSettings,
    siteName: cleanedSiteName,
    footerText: cleanSiteText(siteSettings.footerText) || cleanedSiteName,
  };

  return (
    <>
      <link rel="stylesheet" href="/legacy-static/pages/assets/theme.css" />
      <link rel="stylesheet" href="/legacy-static/pages/assets/pages.css" />
      <link rel="stylesheet" href="/legacy-static/pages/assets/global-ui.css" />
      <link rel="stylesheet" href="/legacy-static/homepage-experience.css" />
      <HomepageExperience
        articles={articlePayload.items}
        cultureArticles={topics}
        cultureItems={cultureItems}
        sectors={sectors}
        qrs={qrs}
        quickLinks={quickLinks}
        homeStats={homeStats}
        friendLinks={friendLinks}
        siteSettings={cleanedSiteSettings}
        layout={layout}
        contactInfo={contactInfo}
      >
        <Header active="home" homeHref="/home" />
        <Drawer active="home" homeHref="/home" />
      </HomepageExperience>
    </>
  );
}
