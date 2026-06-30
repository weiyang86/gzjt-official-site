export const legacySiteConfig = {
  baseUrl: 'https://www.gzzjct.cn',
  defaultDateFrom: '2026-06-01',
  defaultDateTo: '2026-06-30',
  defaultMaxPages: 5,
  defaultOutput: 'scripts/migrate/output/legacy-articles-2026-06-preview.json',
  defaultReport: 'scripts/migrate/output/legacy-import-2026-06-report.json',
  channels: [
    {
      name: '集团要闻',
      channel_slug: 'group-news',
      category_url: 'https://www.gzzjct.cn/category/22.html'
    },
    {
      name: '通知公告',
      channel_slug: 'announcements',
      category_url: 'https://www.gzzjct.cn/category/7.html'
    },
    {
      name: '招投标公示',
      channel_slug: 'bid-announcement',
      category_url: 'https://www.gzzjct.cn/category/62.html'
    }
  ]
};
