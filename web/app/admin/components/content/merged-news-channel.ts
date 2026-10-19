import type { PageModule } from './types';

const mergedNewsChannelByKey: Record<string, string> = {
  party: 'party-mass',
  'party-mass': 'party-mass',
  'party-news': 'party-mass',
  '/party': 'party-mass',
  '/party-masses': 'party-mass',
  '党建群团': 'party-mass',
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
