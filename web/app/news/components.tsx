import Script from 'next/script';
import { Fragment } from 'react';
import { getPublicChannels, getPublicSiteSettings, getPublicFriendLinks } from '@/lib/cms';
import type { Channel } from '@/types/cms';
import NavigationActiveState from './NavigationActiveState';

export type NavKey = 'home' | 'about' | 'disclosure' | 'news' | 'businessDynamics' | 'businessDev' | 'partyMasses' | 'cleanGov' | 'responsibility' | 'contact';

const channelHref = (channel: Channel, includeChildren = false) => {
  let href = '';
  if (channel.type === 'link' || channel.type === 'page' || channel.type === 'module') href = channel.path || `/${channel.slug}`;
  else if (channel.type === 'notice' || channel.path?.startsWith('/disclosure')) href = `/disclosure?channel=${encodeURIComponent(channel.slug)}`;
  else href = `/news?channel=${encodeURIComponent(channel.slug)}`;
  return includeChildren && href.startsWith('/news?') ? `${href}&includeChildren=true` : href;
};

const navKeyByChannelName: Record<string, NavKey> = {
  '集团概况': 'about',
  '公示公告': 'disclosure',
  '信息公开': 'disclosure',
  '新闻中心': 'news',
  '业务动态': 'businessDynamics',
  '业务发展': 'businessDev',
  '党建群团': 'partyMasses',
  '廉洁建设': 'cleanGov',
  '廉洁建投': 'cleanGov',
  '社会责任': 'responsibility',
  '联系我们': 'contact',
};

/**
 * 独立功能页不属于资讯栏目，但需要在既有栏目树下提供入口。
 * 企业荣誉挂在“集团概况”下，不再从“集团历程”区块进入。
 * CMS 已存在相同 slug 或 path 的栏目时自动跳过，避免重复菜单。
 */
const supplementalNavItems = [
  { parentSlug: 'group-profile', name: '企业荣誉', slug: 'group-honors', path: '/about/honors' },
];

const mergeSupplementalNav = (channels: Channel[]) => {
  supplementalNavItems.forEach((item) => {
    const parent = channels.find((channel) => channel.slug === item.parentSlug);
    const exists = channels.some((channel) => channel.slug === item.slug || channel.path === item.path);
    if (!parent || exists) return;
    const siblingSorts = channels
      .filter((channel) => channel.parent === parent.id)
      .map((channel) => Number(channel.sort) || 0);
    channels.push({
      id: `supplemental-${item.slug}`,
      name: item.name,
      slug: item.slug,
      parent: parent.id,
      type: 'page',
      path: item.path,
      sort: siblingSorts.length ? Math.max(...siblingSorts) + 1 : 1,
      status: 'enabled',
      visible: true,
      isNewsCategory: false,
    });
  });
  return channels;
};

const getDynamicNavigation = async () => {
  try {
    const channels = mergeSupplementalNav((await getPublicChannels()).filter((channel) => channel.status === 'enabled' && channel.visible !== false));
    const ids = new Set(channels.map((channel) => channel.id));
    const roots = channels.filter((channel) => !channel.parent || !ids.has(channel.parent));
    const children = (parentId: string) => channels.filter((channel) => channel.parent === parentId);
    const descendantSlugs = (rootId: string) => {
      const output: string[] = [];
      const visited = new Set([rootId]);
      const visit = (id: string) => children(id).forEach((item) => {
        if (visited.has(item.id)) return;
        visited.add(item.id);
        output.push(item.slug);
        visit(item.id);
      });
      visit(rootId);
      return output;
    };
    return { roots, children, descendantSlugs };
  } catch {
    return { roots: [] as Channel[], children: (_id: string) => [] as Channel[], descendantSlugs: (_id: string) => [] as string[] };
  }
};

export async function Header({ actionHref = 'https://gjy.gzjtjt.cn/', actionLabel = '甘建云', homeHref = '/home', active }: {
  active?: NavKey;
  actionHref?: string;
  actionLabel?: string;
  homeHref?: string;
  noticeChannels?: Channel[];
  newsChannels?: Channel[];
}) {
  const navigation = await getDynamicNavigation();

  return (
    <>
      <div className="page-transition" />
      <header className="site-header" aria-label="顶部导航">
        <div className="container">
          <div className="header-inner">
            <a className="brand" href={homeHref} data-no-transition>
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-text">
                <b>甘孜州建设投资集团</b>
                <span>GANZI CONSTRUCTION INVESTMENT GROUP</span>
              </span>
            </a>
            <nav className="nav" aria-label="一级导航" data-nav-tree-source="api">
              <a href={homeHref} className={active === 'home' ? 'is-active' : undefined} aria-current={active === 'home' ? 'page' : undefined} data-nav-key="home" data-no-transition>首页</a>
              {navigation.roots.map((item) => {
                const dropdownItems = item.slug === 'contact-us-nav' ? [] : navigation.children(item.id);
                const itemNavKey = navKeyByChannelName[item.name];
                const descendantSlugs = navigation.descendantSlugs(item.id).join(',');
                if (dropdownItems.length) {
                  return (
                    <div className="nav-item nav-item--dropdown" data-cms-dropdown="server" key={item.id}>
                      <a href={channelHref(item, dropdownItems.length > 0)} className={active === itemNavKey ? 'is-active' : undefined} data-nav-key={itemNavKey} data-channel-slug={item.slug} data-descendant-slugs={descendantSlugs} aria-haspopup="true" aria-expanded="false">
                        {item.name}
                      </a>
                      <div className="nav-dropdown" role="menu" data-source="server">
                        {dropdownItems.map((channel) => (
                          <a href={channelHref(channel, navigation.children(channel.id).length > 0)} data-channel-slug={channel.slug} data-descendant-slugs={navigation.descendantSlugs(channel.id).join(',')} role="menuitem" key={channel.id}>
                            {channel.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <a href={channelHref(item)} className={active === itemNavKey ? 'is-active' : undefined} data-nav-key={itemNavKey} data-channel-slug={item.slug} data-descendant-slugs={descendantSlugs} key={item.id}>
                    {item.name}
                  </a>
                );
              })}
            </nav>
            <div className="header-actions">
              <a
                className="btn btn--primary"
                href={actionHref}
                target={actionHref.startsWith('http') ? '_blank' : undefined}
                rel={actionHref.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {actionLabel}
              </a>
              <button className="menu-toggle" type="button" aria-label="打开菜单" data-menu-toggle aria-expanded="false"><i /></button>
            </div>
          </div>
        </div>
      </header>
      <NavigationActiveState active={active} />
    </>
  );
}

export async function Drawer(_props: { active?: NavKey; noticeChannels?: Channel[]; newsChannels?: Channel[]; homeHref?: string } = {}) {
  const navigation = await getDynamicNavigation();

  return (
    <div className="drawer" data-drawer aria-hidden="true">
      <div className="drawer-backdrop" data-drawer-close />
      <div className="drawer-panel" role="dialog" aria-label="移动端菜单">
        <div className="drawer-top">
          <b style={{ letterSpacing: '.6px' }}>导航</b>
          <button className="drawer-close" type="button" aria-label="关闭菜单" data-drawer-close>×</button>
        </div>
        <div className="drawer-links" aria-label="移动端导航链接">
          <a href={_props.homeHref || '/home'} className={_props.active === 'home' ? 'is-active' : undefined} aria-current={_props.active === 'home' ? 'page' : undefined} data-nav-key="home" data-no-transition>首页</a>
          {navigation.roots.map((item) => {
            const dropdownItems = item.slug === 'contact-us-nav' ? [] : navigation.children(item.id);
            return (
              <Fragment key={item.id}>
                <a href={channelHref(item, dropdownItems.length > 0)} className={_props.active === navKeyByChannelName[item.name] ? 'is-active' : undefined} data-nav-key={navKeyByChannelName[item.name]} data-channel-slug={item.slug} data-descendant-slugs={navigation.descendantSlugs(item.id).join(',')}>
                  {item.name}
                </a>
                {dropdownItems.length ? (
                  <div className="drawer-submenu" data-source="server">
                    {dropdownItems.map((channel) => (
                      <a href={channelHref(channel, navigation.children(channel.id).length > 0)} data-channel-slug={channel.slug} data-descendant-slugs={navigation.descendantSlugs(channel.id).join(',')} key={channel.id}>{channel.name}</a>
                    ))}
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export async function Footer() {
  const [siteSettings, friendLinks] = await Promise.all([
    getPublicSiteSettings().catch(() => ({ siteName: '', footerText: '', logo: '', address: '', phone: '', email: '', icp: '', copyright: '' })),
    getPublicFriendLinks('footer').catch(() => []),
  ]);
  const safeName = siteSettings.siteName || '网站';
  return (
    <footer className="footer" aria-label="页脚信息">
      <div className="content">
        <div className="footer-inner">
          <div>
            <h3>{safeName}</h3>
            <p>{siteSettings.address ? `地址：${siteSettings.address}` : '地址暂未配置'}<br />{siteSettings.phone ? `电话：${siteSettings.phone}` : '电话暂未配置'}{siteSettings.email ? <><br />邮箱：<a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a></> : null}</p>
          </div>
          <div>
            <dl><dt>友情链接</dt><dd className="footer-friend-links">{friendLinks.length ? friendLinks.map((link) => <a href={link.url} target="_blank" rel="noopener noreferrer" key={link.id}>{link.title}</a>) : <span>暂无友情链接</span>}</dd></dl>
          </div>
        </div>
        <div className="footbar">
          <span>{siteSettings.copyright || siteSettings.footerText || safeName}</span>
          {siteSettings.icp ? <span><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{siteSettings.icp}</a></span> : null}
        </div>
      </div>
    </footer>
  );
}

export function NewsAssets() {
  return (
    <>
      <link rel="stylesheet" href="/legacy-static/pages/assets/theme.css" />
      <link rel="stylesheet" href="/legacy-static/pages/assets/pages.css" />
      <link rel="stylesheet" href="/legacy-static/pages/assets/global-ui.css" />
      <Script src="/legacy-static/pages/assets/app.js" strategy="afterInteractive" />
      <Script src="/legacy-static/pages/assets/global-ui.js" strategy="afterInteractive" />
    </>
  );
}
