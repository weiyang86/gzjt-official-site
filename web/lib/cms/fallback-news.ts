import type { Article, Channel, PublicArticleListPayload } from '@/types/cms';

export const fallbackNewsChannels: Channel[] = [
  { id: 'gov-briefs', slug: 'gov-briefs', name: '政务简讯', type: 'news', isNewsCategory: true },
  { id: 'group-news', slug: 'group-news', name: '集团要闻', type: 'news', isNewsCategory: true },
  { id: 'industry-news', slug: 'industry-news', name: '行业聚焦', type: 'news', isNewsCategory: true },
  { id: 'media-focus', slug: 'media-focus', name: '媒体聚焦', type: 'news', isNewsCategory: true },
  { id: 'announcements', slug: 'announcements', name: '通知公告', type: 'notice' },
];

export const fallbackNewsArticles: Article[] = [
  {
    id: '1',
    title: '雅砻江大桥关键节点顺利贯通，区域通行能力持续提升',
    cover: '/img/雅砻江大桥.jpg',
    summary: '集团统筹推进重点交通工程建设，强化安全、质量与工期协同管理，持续提升区域路网韧性与民生出行保障能力（示意）。',
    publishAt: '2025-06-08',
    publishDate: '2025-06-08',
    status: 'published',
    mainChannel: { id: 'group-news', slug: 'group-news', name: '集团要闻' },
    content: '<p>集团统筹推进重点交通工程建设，强化安全、质量与工期协同管理，持续提升区域路网韧性与民生出行保障能力。</p><p>该条为本地 fallback 示例内容，Directus 可用后将自动读取 CMS 已发布文章。</p>',
  },
  {
    id: '2',
    title: '国道318线康定市过境段434互通工程施工组织优化，关键节点推进（示意）',
    cover: '/img/国道318线康定市过境段公路工程项目434互通工程（后北门）.jpg',
    summary: '围绕关键节点推进施工组织优化，保障项目建设有序开展。',
    publishAt: '2025-06-05',
    publishDate: '2025-06-05',
    status: 'published',
    mainChannel: { id: 'industry-news', slug: 'industry-news', name: '行业聚焦' },
    content: '<p>项目团队围绕节点目标优化施工组织，持续强化质量、安全和进度协同。</p>',
  },
  {
    id: '3',
    title: '雀儿山隧道工程关键工序安全管控到位，施工组织稳步推进（示意）',
    cover: '/img/雀儿山隧道建成前1.jpeg',
    summary: '持续完善现场标准化管理，确保关键工序稳步推进。',
    publishAt: '2025-06-02',
    publishDate: '2025-06-02',
    status: 'published',
    newsSubcategory: '省委、省政府',
    mainChannel: { id: 'gov-briefs', slug: 'gov-briefs', name: '政务简讯' },
    content: '<p>施工现场严格落实安全生产要求，关键工序推进平稳有序。</p>',
  },
  {
    id: '4',
    title: '雀儿山隧道建成前阶段性成果汇总，现场标准化持续提升（示意）',
    cover: '/img/国道318线康定市过境段公路工程项目434互通工程（后北门）.jpg',
    summary: '阶段性成果持续形成，项目现场标准化水平稳步提升。',
    publishAt: '2025-05-28',
    publishDate: '2025-05-28',
    status: 'published',
    newsSubcategory: '州委、州政府',
    mainChannel: { id: 'gov-briefs', slug: 'gov-briefs', name: '政务简讯' },
    content: '<p>项目建设围绕标准化、精细化要求持续推进，阶段性成果逐步显现。</p>',
  },
  {
    id: '5',
    title: '雀儿山隧道建成后运行态势良好，通行条件显著改善（示意）',
    cover: '/img/雅砻江大桥.jpg',
    summary: '项目建成后运行态势良好，区域通行条件得到改善。',
    publishAt: '2025-05-20',
    publishDate: '2025-05-20',
    status: 'published',
    mainChannel: { id: 'media-focus', slug: 'media-focus', name: '媒体聚焦' },
    content: '<p>项目投运后，沿线群众出行条件得到改善，区域交通保障能力进一步提升。</p>',
  },
];

export const getFallbackNewsPayload = (searchParams: URLSearchParams): PublicArticleListPayload => {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '10', 10) || 10));
  const channel = searchParams.get('channelSlug') || searchParams.get('channel') || 'all';
  const keyword = (searchParams.get('keyword') || '').trim().toLowerCase();
  const filtered = fallbackNewsArticles
    .filter((item) => channel === 'all' || !channel ? true : item.mainChannel?.slug === channel)
    .filter((item) => !keyword ? true : `${item.title} ${item.summary || ''} ${item.source || ''}`.toLowerCase().includes(keyword));

  return {
    page,
    pageSize,
    total: filtered.length,
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
  };
};
