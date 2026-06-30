import type { BusinessSector, Company, PageContent } from '@/types/cms';

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
    content: '<p>地址：四川省康定市榆林街道榆磨路60号</p><p>电话：0836-2876659</p><p>欢迎通过在线服务、业务咨询、合作对接等方式与我们取得联系。</p>',
  },
  {
    id: 'projects',
    title: '项目展示',
    slug: 'projects',
    cover: '/img/map.png',
    status: 'published',
    content: '<p>项目展示集中呈现集团重点交通、城乡基础设施、产业与文旅项目，展现服务区域发展和民生改善的建设成果。</p>',
  },
];

export const fallbackBusinessSectors: BusinessSector[] = [
  { id: 'traffic', name: '交通建设', title: '交通建设', slug: 'traffic', cover: '/img/雅砻江大桥.jpg', intro: '承建国省干线、农村公路、桥梁隧道等重大交通基础设施项目。', status: 'published' },
  { id: 'urban', name: '城乡建设', title: '城乡建设', slug: 'urban', cover: '/img/318康定市过境段公路工程项目434互通工程.jpg', intro: '服务城市更新、市政基础设施、公共服务建筑与城乡融合发展。', status: 'published' },
  { id: 'investment', name: '产业投资', title: '产业投资', slug: 'investment', cover: '/img/海螺沟路基建成后2.jpg', intro: '围绕清洁能源、生态农业、数字经济等方向培育新增长点。', status: 'published' },
  { id: 'operation', name: '运营服务', title: '运营服务', slug: 'operation', cover: '/img/青冈坪隧道建成后.jpg', intro: '推动项目投融建运一体化落地，提升公共服务和资产运营效率。', status: 'published' },
  { id: 'consulting', name: '工程服务', title: '工程服务', slug: 'consulting', cover: '/img/雀儿山隧道建成后.jpeg', intro: '提供工程全过程管理、技术支持与综合保障服务。', status: 'published' },
  { id: 'tourism', name: '文旅开发', title: '文旅开发', slug: 'tourism', cover: '/img/海螺沟路基建成前1.JPG', intro: '依托区域文旅资源，推动交旅融合和特色项目开发。', status: 'published' },
];

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
