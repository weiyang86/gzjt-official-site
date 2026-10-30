export type SeoPageConfig = {
  title: string;
  keywords: string;
  description: string;
};

export type SeoConfig = {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  pages: Record<string, SeoPageConfig>;
};

export type SeoPageDefinition = {
  path: string;
  label: string;
  defaultTitle: string;
  defaultDescription: string;
};

export const seoConfigModuleCode = 'seo-settings';

export const seoManagedPages: SeoPageDefinition[] = [
  {
    path: '/home',
    label: '首页',
    defaultTitle: '甘孜州建设投资集团有限公司',
    defaultDescription: '甘孜州建设投资集团有限公司官方网站，展示集团概况、新闻动态、业务板块与重点项目建设成果。',
  },
  {
    path: '/about',
    label: '集团概况',
    defaultTitle: '集团概况',
    defaultDescription: '了解甘孜州建设投资集团有限公司的企业简介、发展历程、组织架构与集团领导信息。',
  },
  {
    path: '/news',
    label: '新闻中心',
    defaultTitle: '新闻中心',
    defaultDescription: '浏览甘孜州建设投资集团有限公司的最新新闻、行业资讯与业务动态。',
  },
  {
    path: '/disclosure',
    label: '公示公告',
    defaultTitle: '公示公告',
    defaultDescription: '发布甘孜州建设投资集团有限公司的公告、公示、招采与信息公开内容。',
  },
  {
    path: '/business-dev',
    label: '业务发展',
    defaultTitle: '业务发展',
    defaultDescription: '查看甘孜州建设投资集团有限公司的业务板块与产业布局。',
  },
  {
    path: '/business/innovation',
    label: '科技创新',
    defaultTitle: '科技创新',
    defaultDescription: '展示甘孜州建设投资集团有限公司在工程建设、数字建造与绿色低碳等领域的技术创新成果。',
  },
  {
    path: '/projects',
    label: '重点项目',
    defaultTitle: '重点项目',
    defaultDescription: '集中展示甘孜州建设投资集团有限公司的重点交通、城乡基础设施与产业项目。',
  },
  {
    path: '/org',
    label: '下属公司',
    defaultTitle: '下属公司',
    defaultDescription: '了解甘孜州建设投资集团有限公司下属企业的职责、业务范围与动态。',
  },
  {
    path: '/clean-gov',
    label: '廉洁建投',
    defaultTitle: '廉洁建投',
    defaultDescription: '展示甘孜州建设投资集团有限公司廉洁建设、纪律监督与警示教育内容。',
  },
  {
    path: '/social-responsibility',
    label: '社会责任',
    defaultTitle: '社会责任',
    defaultDescription: '展示甘孜州建设投资集团有限公司在乡村振兴、社会公益与志愿服务方面的履责实践。',
  },
  {
    path: '/contact-us',
    label: '联系我们',
    defaultTitle: '联系我们',
    defaultDescription: '获取甘孜州建设投资集团有限公司的联系地址、联系电话与邮箱信息。',
  },
];

export const defaultSeoConfig: SeoConfig = {
  siteName: '甘孜州建设投资集团有限公司',
  defaultTitle: '甘孜州建设投资集团有限公司',
  defaultDescription: '甘孜州建设投资集团有限公司官方网站，发布集团概况、新闻中心、公示公告、业务发展、项目展示、社会责任与联系信息。',
  pages: {},
};

export const getSiteBaseUrl = () => {
  const explicit = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  return process.env.NODE_ENV === 'production' ? 'https://www.gzjtjt.cn' : 'http://localhost:3000';
};

const toText = (value: unknown, maxLength: number) => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

export const normalizeSeoConfig = (value: unknown): SeoConfig => {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const source = raw.seo && typeof raw.seo === 'object' && !Array.isArray(raw.seo)
    ? raw.seo as Record<string, unknown>
    : raw;
  const rawPages = source.pages && typeof source.pages === 'object' && !Array.isArray(source.pages)
    ? source.pages as Record<string, unknown>
    : {};

  const pages: Record<string, SeoPageConfig> = {};
  seoManagedPages.forEach((definition) => {
    const rawPage = rawPages[definition.path];
    const page = rawPage && typeof rawPage === 'object' && !Array.isArray(rawPage)
      ? rawPage as Record<string, unknown>
      : {};
    const title = toText(page.title, 120);
    const keywords = toText(page.keywords, 300);
    const description = toText(page.description, 300);
    if (title || keywords || description) {
      pages[definition.path] = { title, keywords, description };
    }
  });

  return {
    siteName: toText(source.siteName, 100) || defaultSeoConfig.siteName,
    defaultTitle: toText(source.defaultTitle, 120) || defaultSeoConfig.defaultTitle,
    defaultDescription: toText(source.defaultDescription, 300) || defaultSeoConfig.defaultDescription,
    pages,
  };
};

export const getSeoPageDefinition = (path: string) => seoManagedPages.find((item) => item.path === path) || null;
