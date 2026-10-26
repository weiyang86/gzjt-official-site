import type { PageModule } from './types';

const mergedNewsChannelByKey: Record<string, string> = {
  party: 'party-mass',
  'party-mass': 'party-mass',
  'party-news': 'party-mass',
  '/party': 'party-mass',
  '/party-masses': 'party-mass',
  '党建群团': 'party-mass',
  // 群团工作及工会、青年分类：后台入口统一进入新闻管理对应栏目维护内容。
  'mass-work': 'party-mass',
  'union-work': 'party-union-work',
  'youth-work': 'party-youth-work',
  businessDynamics: 'business-news',
  'business-news': 'business-news',
  '/business-dynamics': 'business-news',
  '业务动态': 'business-news',
};

/**
 * 临时栏目归并：这两个原顶级页面改由新闻中心栏目维护。
 * 恢复独立页时，删除此映射及两个后台管理入口中的调用即可。
 */
export const getMergedNewsChannel = (module: PageModule) => {
  const keys = [module.module_code, module.route_path, module.module_title];
  for (const key of keys) {
    const normalized = String(key || '').trim();
    if (normalized && mergedNewsChannelByKey[normalized]) return mergedNewsChannelByKey[normalized];
  }
  return '';
};

export const getMergedNewsAdminHref = (module: PageModule) => {
  const channel = getMergedNewsChannel(module);
  return channel ? `/admin/articles?channel=${encodeURIComponent(channel)}` : '';
};

/**
 * 页面模块编码与新闻栏目 slug 不完全一致时，用显式映射保证“前往新闻管理”打开正确栏目。
 * 科技创新模块沿用历史编码 technology-innovation，门户实际栏目为 business-technology-innovation。
 */
const articleChannelSlugByModuleCode: Record<string, string> = {
  'technology-innovation': 'business-technology-innovation',
};

export const getArticleChannelSlug = (module: PageModule) => {
  const code = String(module.module_code || '').trim();
  return articleChannelSlugByModuleCode[code] || code;
};
