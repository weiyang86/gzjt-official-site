export const homepageLayoutModuleCode = 'homepage-layout';

export type HomepageSectionId = 'news' | 'culture' | 'business' | 'contact';
export type HomepageScreenId = 'hero' | HomepageSectionId;

export type HomepageBannerSlide = {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  linkUrl: string;
};

export type HomepageSectionContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type HomepageLayoutConfig = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  carouselInterval: number;
  sectionOrder: HomepageSectionId[];
  hiddenSections: HomepageSectionId[];
  backgrounds: Record<HomepageScreenId, string>;
  bannerSlides: HomepageBannerSlide[];
  sectionContent: Record<HomepageSectionId, HomepageSectionContent>;
  newsItemCount: number;
  cultureItemCount: number;
  businessItemCount: number;
  contactAddress: string;
  contactPhone: string;
  icpRecordNumber: string;
  showQuickLinks: boolean;
  showQrs: boolean;
};

export const defaultHomepageLayout: HomepageLayoutConfig = {
  heroEyebrow: 'GANZI PREFECTURE · CONSTRUCTION INVESTMENT GROUP',
  heroTitle: '铺筑人民幸福之路',
  heroSubtitle: '建设甘孜发展之基',
  carouselInterval: 6000,
  sectionOrder: ['news', 'culture', 'business', 'contact'],
  hiddenSections: [],
  backgrounds: { hero: '', news: '', culture: '', business: '', contact: '' },
  bannerSlides: [],
  sectionContent: {
    news: { eyebrow: 'NEWS CENTER', title: '新闻中心', subtitle: '关注集团动态，了解最新资讯与发展成果' },
    culture: { eyebrow: 'CULTURE & TOPICS', title: '企业文化、专题专栏', subtitle: '企业文化与专题内容' },
    business: { eyebrow: 'BUSINESS SECTORS', title: '业务板块', subtitle: '立足甘孜、服务全州，构建多元化产业格局' },
    contact: { eyebrow: 'CONTACT & FOLLOW', title: '联系与关注', subtitle: '欢迎关注甘孜州建设投资集团' },
  },
  newsItemCount: 5,
  cultureItemCount: 6,
  businessItemCount: 6,
  contactAddress: '四川省康定市榆林街道榆磨路60号',
  contactPhone: '0836-2876659',
  icpRecordNumber: '蜀ICP备2022013144号-2',
  showQuickLinks: true,
  showQrs: true,
};

const sectionIds: HomepageSectionId[] = ['news', 'culture', 'business', 'contact'];

export const normalizeHomepageLayout = (value: unknown): HomepageLayoutConfig => {
  const config = value && typeof value === 'object' ? value as Partial<HomepageLayoutConfig> : {};
  const providedOrder = Array.isArray(config.sectionOrder)
    ? config.sectionOrder.filter((section): section is HomepageSectionId => sectionIds.includes(section as HomepageSectionId))
    : [];
  const sectionOrder = [...providedOrder, ...sectionIds.filter((section) => !providedOrder.includes(section))];
  const hiddenSections = Array.isArray(config.hiddenSections)
    ? config.hiddenSections.filter((section): section is HomepageSectionId => sectionIds.includes(section as HomepageSectionId))
    : [];
  const rawBackgrounds = config.backgrounds && typeof config.backgrounds === 'object'
    ? config.backgrounds as Partial<Record<HomepageScreenId, unknown>>
    : {};
  const rawBannerSlides = Array.isArray(config.bannerSlides) ? config.bannerSlides : [];
  const bannerSlides = rawBannerSlides.flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const slide = raw as Partial<HomepageBannerSlide>;
    return [{
      id: typeof slide.id === 'string' && slide.id ? slide.id : `banner-${index + 1}`,
      image: typeof slide.image === 'string' ? slide.image : '',
      title: typeof slide.title === 'string' ? slide.title : '',
      subtitle: typeof slide.subtitle === 'string' ? slide.subtitle : '',
      linkUrl: typeof slide.linkUrl === 'string' ? slide.linkUrl : '',
    }];
  });
  const rawSectionContent = config.sectionContent && typeof config.sectionContent === 'object'
    ? config.sectionContent as Partial<Record<HomepageSectionId, unknown>>
    : {};
  const sectionContent = Object.fromEntries(sectionIds.map((section) => {
    const raw = rawSectionContent[section] && typeof rawSectionContent[section] === 'object'
      ? rawSectionContent[section] as Partial<HomepageSectionContent>
      : {};
    const defaults = defaultHomepageLayout.sectionContent[section];
    return [section, {
      eyebrow: typeof raw.eyebrow === 'string' ? raw.eyebrow : defaults.eyebrow,
      title: typeof raw.title === 'string' ? raw.title : defaults.title,
      subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : defaults.subtitle,
    }];
  })) as Record<HomepageSectionId, HomepageSectionContent>;
  return {
    heroEyebrow: typeof config.heroEyebrow === 'string' ? config.heroEyebrow : defaultHomepageLayout.heroEyebrow,
    heroTitle: typeof config.heroTitle === 'string' ? config.heroTitle : defaultHomepageLayout.heroTitle,
    heroSubtitle: typeof config.heroSubtitle === 'string' ? config.heroSubtitle : defaultHomepageLayout.heroSubtitle,
    carouselInterval: Math.min(20000, Math.max(2000, Number(config.carouselInterval) || defaultHomepageLayout.carouselInterval)),
    sectionOrder,
    hiddenSections,
    backgrounds: {
      hero: typeof rawBackgrounds.hero === 'string' ? rawBackgrounds.hero : '',
      news: typeof rawBackgrounds.news === 'string' ? rawBackgrounds.news : '',
      culture: typeof rawBackgrounds.culture === 'string' ? rawBackgrounds.culture : '',
      business: typeof rawBackgrounds.business === 'string' ? rawBackgrounds.business : '',
      contact: typeof rawBackgrounds.contact === 'string' ? rawBackgrounds.contact : '',
    },
    bannerSlides,
    sectionContent,
    newsItemCount: Math.min(12, Math.max(1, Number(config.newsItemCount) || defaultHomepageLayout.newsItemCount)),
    cultureItemCount: Math.min(12, Math.max(1, Number(config.cultureItemCount) || defaultHomepageLayout.cultureItemCount)),
    businessItemCount: Math.min(12, Math.max(1, Number(config.businessItemCount) || defaultHomepageLayout.businessItemCount)),
    contactAddress: typeof config.contactAddress === 'string' ? config.contactAddress : defaultHomepageLayout.contactAddress,
    contactPhone: typeof config.contactPhone === 'string' ? config.contactPhone : defaultHomepageLayout.contactPhone,
    icpRecordNumber: typeof config.icpRecordNumber === 'string' ? config.icpRecordNumber : defaultHomepageLayout.icpRecordNumber,
    showQuickLinks: typeof config.showQuickLinks === 'boolean' ? config.showQuickLinks : defaultHomepageLayout.showQuickLinks,
    showQrs: typeof config.showQrs === 'boolean' ? config.showQrs : defaultHomepageLayout.showQrs,
  };
};
