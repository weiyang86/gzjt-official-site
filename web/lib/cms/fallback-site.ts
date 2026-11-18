import type { BusinessSector, Company, HistoryTimelineItem, PageContent } from '@/types/cms';

export const fallbackHistoryTimeline: HistoryTimelineItem[] = [
  {
    id: 'history-predecessor',
    year: '前身',
    title: '甘孜州交通基础设施建设领导小组办公室',
    description: '承担交通基础设施建设相关组织协调工作，为后续集团化运作奠定基础。',
    sort: 10,
  },
  {
    id: 'history-2018-05',
    year: '2018.05',
    title: '组建甘孜州交通投资建设集团有限公司',
    description: '根据改革发展需要，正式推进市场化、集团化、专业化建设。',
    sort: 20,
  },
  {
    id: 'history-2018-12',
    year: '2018.12',
    title: '更名为甘孜州交通和城乡建设投资集团有限公司',
    description: '甘孜州城投公司整体划入集团，交通与城乡建设职责进一步整合。',
    sort: 30,
  },
  {
    id: 'history-2025-05',
    year: '2025.05',
    title: '更名为甘孜州建设投资集团有限公司',
    description: '企业名称与发展定位更加统一，持续服务全州交通和城乡基础设施建设。',
    sort: 40,
  },
];

export const fallbackSinglePages: PageContent[] = [
  {
    id: 'about',
    title: '集团概况',
    slug: 'about',
    cover: '/img/318康定市过境段公路工程项目434互通工程.jpg',
    status: 'published',
    content: '<p>甘孜州建设投资集团有限公司为州属一级国有企业，是甘孜州交通和城乡基础设施建设的重要实施主体与国有资本运营平台。</p><p>集团主要承担全州政府性投资交通和城乡基础设施项目的投融资、建设、开发、资产经营等职责，经营范围涉及交通和城乡基础设施工程的建设、管理、测绘、勘察、监理、检测等业务。</p><p>集团以交通产业为引领，统筹基础设施建设、资产经营和产业协同发展，持续服务全州经济社会高质量发展。</p>',
  },
  {
    id: 'party',
    title: '党建群团',
    slug: 'party',
    cover: '/img/国道317线（川藏公路北线）雀儿山隧道工程.jpg',
    status: 'published',
    content: '<p>坚持党建引领，凝聚奋进力量，推动企业高质量发展。聚焦理论学习、基层党建、工会青年、统战工作等重点板块。</p>',
  },
  {
    id: 'business-dynamics',
    title: '业务动态',
    slug: 'businessDynamics',
    cover: '/img/318康定市过境段公路工程项目434互通工程.jpg',
    status: 'published',
    content: '<p>业务动态集中发布集团重点项目推进、经营管理、工程服务、协同发展等业务一线信息，展示建设运营与改革发展的最新成果。</p>',
  },
  {
    id: 'clean-gov',
    title: '廉洁建投',
    slug: 'cleanGov',
    cover: '/img/雀儿山隧道建成后.jpeg',
    status: 'published',
    content: '<p>廉洁建投围绕纪律监督、廉洁教育、作风建设和风险防控展示集团清廉国企建设成果，持续营造风清气正的发展环境。</p>',
  },
  {
    id: 'responsibility',
    title: '社会责任',
    slug: 'responsibility',
    cover: '/img/海螺沟路基建成后2.jpg',
    status: 'published',
    content: '<p>聚焦乡村振兴、公益活动、环保建设与社会贡献，形成可量化、可持续的责任体系与成果展示。</p>',
  },
  {
    id: 'contact',
    title: '联系我们',
    slug: 'contact',
    cover: '/img/雅砻江大桥.jpg',
    status: 'published',
    content: '<p>欢迎通过业务咨询、合作对接等方式与我们取得联系。联系方式由后台“联系我们配置”统一维护。</p>',
  },
  {
    id: 'projects',
    title: '重点项目',
    slug: 'projects',
    cover: '/img/map.png',
    status: 'published',
    content: '<p>重点项目集中呈现集团重点交通、城乡基础设施、产业与文旅项目，展现服务区域发展和民生改善的建设成果。</p>',
  },
];

// 官网业务板块按《宣传手册》"1344"四大产业布局统一为 4 个。
export const canonicalBusinessSectorSlugs = ['construction', 'construction-service', 'franchise-operation', 'emerging-industry'] as const;

export const fallbackBusinessSectors: BusinessSector[] = [
  { id: 'construction', name: '建设施工', title: '建设施工', slug: 'construction', cover: '/img/国道317线（川藏公路北线）雀儿山隧道工程.jpg', intro: '巩固公路、房建、市政工程施工传统优势，向城市更新、乡村振兴、铁路、养护、大中修等多领域业务拓展。', undertaker: '建设公司及其他合资施工企业', status: 'published' },
  { id: 'construction-service', name: '建设服务', title: '建设服务', slug: 'construction-service', cover: '/img/雅砻江大桥.jpg', intro: '以代建管理为核心，带动工程检测、咨询、监理、勘察设计、招标代理、数智管理、建材生产与供应等业务发展，打造覆盖工程策划、建设、运维全周期的综合建设服务体系。', undertaker: '项管公司、咨询公司、勘察设计公司、供应链公司', status: 'published' },
  { id: 'franchise-operation', name: '特许经营', title: '特许经营', slug: 'franchise-operation', cover: '/img/318康定市过境段公路工程项目434互通工程.jpg', intro: '以砂石资源、路衍经济、物流园区、城镇公共基础设施等特许经营为重点，构建具有集团特色的投建运一体化模式。', undertaker: '企管公司、供应链公司、建设公司和各项目公司', status: 'published' },
  { id: 'emerging-industry', name: '新兴产业', title: '新兴产业', slug: 'emerging-industry', cover: '/img/index_bg.png', intro: '紧跟国家发展新质生产力导向，立足甘孜高原特色场景，布局低空经济、循环经济、新能源等新兴赛道。', undertaker: '集团总部、低飞公司、供应链公司、企管公司等相关新兴产业专业公司', status: 'published' },
];

/** 始终按“建设施工 / 建设服务 / 特许经营 / 新兴产业”的顺序返回 4 个板块，后台有同 slug 数据时覆盖文案与配图。 */
export function withCanonicalBusinessSectors(sectors: BusinessSector[]) {
  const bySlug = new Map(sectors.map((sector) => [sector.slug, sector]));
  return fallbackBusinessSectors.map((base) => {
    const remote = bySlug.get(base.slug);
    return remote ? { ...base, ...remote, undertaker: remote.undertaker || base.undertaker } : base;
  });
}

export const fallbackCompanies: Company[] = [
  { id: 'traffic', name: '交通建设公司', shortName: '交通建设', slug: 'traffic', cover: '/img/雅砻江大桥.jpg', intro: '承担交通基础设施项目建设、管理与实施保障。', address: '四川省康定市', mainBusiness: '交通工程建设、项目管理', registeredCapital: '以工商登记为准', status: 'enabled' },
  { id: 'urban', name: '城乡建设公司', shortName: '城乡建设', slug: 'urban', cover: '/img/318康定市过境段公路工程项目434互通工程.jpg', intro: '服务城乡基础设施建设和城市更新项目实施。', address: '四川省康定市', mainBusiness: '城乡建设、市政工程', registeredCapital: '以工商登记为准', status: 'enabled' },
  { id: 'investment', name: '产业投资公司', shortName: '产业投资', slug: 'investment', cover: '/img/海螺沟路基建成后2.jpg', intro: '围绕区域产业资源开展投资运营与项目培育。', address: '四川省康定市', mainBusiness: '产业投资、资产运营', registeredCapital: '以工商登记为准', status: 'enabled' },
  { id: 'consulting', name: '工程咨询公司', shortName: '工程咨询', slug: 'consulting', cover: '/img/雀儿山隧道建成后.jpeg', intro: '提供工程咨询、技术服务和全过程管理支持。', address: '四川省康定市', mainBusiness: '工程咨询、项目管理', registeredCapital: '以工商登记为准', status: 'enabled' },
  { id: 'digital', name: '数字科技公司', shortName: '数字科技', slug: 'digital', cover: '/img/map.png', intro: '探索数字化管理、智慧工地和信息化平台建设。', address: '四川省康定市', mainBusiness: '数字化平台、信息服务', registeredCapital: '以工商登记为准', status: 'enabled' },
  { id: 'project-company', name: '项目管理公司', shortName: '项目管理', slug: 'project-company', cover: '/img/青冈坪隧道建成后.jpg', intro: '承担重点项目统筹协调、现场管理与综合保障。', address: '四川省康定市', mainBusiness: '项目管理、综合保障', registeredCapital: '以工商登记为准', status: 'enabled' },
];

export const fallbackPageBySlug = (slug: string) => fallbackSinglePages.find((item) => item.slug === slug) || null;
export const fallbackCompanyBySlug = (slug: string) => fallbackCompanies.find((item) => item.slug === slug) || null;
