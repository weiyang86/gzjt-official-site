import Script from 'next/script';
import { Fragment } from 'react';
import { getPublicChannels, getPublicSiteSettings, getPublicFriendLinks, getPublicContactInfo, getPublicPlatformQrs } from '@/lib/cms';
import type { Channel } from '@/types/cms';
import NavigationActiveState from './NavigationActiveState';
import FooterQr from './FooterQr';

export type NavKey = 'home' | 'about' | 'disclosure' | 'news' | 'businessDynamics' | 'businessDev' | 'partyMasses' | 'cleanGov' | 'responsibility' | 'contact' | 'downloads' | 'topics';

const recruitmentChannelHref: Record<string, string> = {
  'disclosure-recruitment': '/recruitment',
  'recruitment-social': '/recruitment?type=social',
  'recruitment-campus': '/recruitment?type=campus',
  'recruitment-internal-selection': '/recruitment?type=internal',
};

const groupProfileChannelHref: Record<string, string> = {
  'group-intro': '/about/profile',
  'group-history': '/about/history',
  'group-leadership': '/about/leadership',
  'group-organization': '/about/organization',
  'group-honors': '/about/honors',
  'corporate-culture': '/about/culture',
};

const channelHref = (channel: Channel, includeChildren = false) => {
  let href = '';
  if (groupProfileChannelHref[channel.slug]) href = groupProfileChannelHref[channel.slug];
  else if (recruitmentChannelHref[channel.slug]) href = recruitmentChannelHref[channel.slug];
  else if (channel.type === 'link' || channel.type === 'page' || channel.type === 'module') href = channel.path || `/${channel.slug}`;
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
  '业务领域': 'businessDev',
  '产业布局': 'businessDev',
  '业务发展': 'businessDev',
  '党建群团': 'partyMasses',
  '廉洁建设': 'cleanGov',
  '廉洁建投': 'cleanGov',
  '社会责任': 'responsibility',
  '资料下载': 'downloads',
  '联系我们': 'contact',
};

/**
 * 独立功能页不属于资讯栏目，但需要在既有栏目树下提供入口；
 * CMS 已存在相同 slug 或 path 的栏目时自动跳过，避免重复菜单。
 */
const supplementalNavItems = [
  { parentSlug: 'group-profile', name: '企业荣誉', slug: 'group-honors', path: '/about/honors' },
  { parentSlug: 'group-profile', name: '企业文化', slug: 'corporate-culture', path: '/about/culture' },
  { parentSlug: 'party-mass', name: '培训资源', slug: 'party-training', path: '/party/training' },
  { parentSlug: 'business-domain', name: '科技创新', slug: 'business-innovation', path: '/business/innovation' },
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

/**
 * 按首页修改意见，把一级栏目「业务领域」合并到「业务动态」：
 * 业务领域下的栏目转为业务动态的子项，业务领域本身不再出现在一级导航。
 */
/**
 * 一级栏目点击后直接进入第一个可见子栏目页面（参照蜀道官网的一级导航行为），
 * 不再落在栏目聚合页；没有子栏目时仍指向栏目自身。
 */
const firstChildHref = (item: Channel, children: Channel[]) => {
  if (!children.length) return channelHref(item);
  const first = [...children].sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0))[0];
  return channelHref(first, false);
};

const mergeBusinessDomainNav = (channels: Channel[]) => {
  const domain = channels.find((channel) => channel.slug === 'business-domain');
  const dynamics = channels.find((channel) => channel.slug === 'business-news');
  if (!domain || !dynamics) return channels;
  return channels
    .filter((channel) => channel.id !== domain.id)
    .map((channel) => channel.parent === domain.id
      ? { ...channel, parent: dynamics.id, sort: channel.slug === 'business-layout' ? 0 : (Number(channel.sort) || 0) + 100 }
      : channel);
};

const getDynamicNavigation = async () => {
  try {
    const channels = mergeBusinessDomainNav(mergeSupplementalNav((await getPublicChannels()).filter((channel) => channel.status === 'enabled' && channel.visible !== false)));
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
        <a className="header-logo" href={homeHref} data-no-transition aria-label="甘孜州建设投资集团首页">
          <img src="/img/logo.png" alt="甘孜州建设投资集团有限公司" width={2480} height={504} />
        </a>
        <div className="container">
          <div className="header-inner">
            <nav className="nav" aria-label="一级导航" data-nav-tree-source="api">
              <a href={homeHref} className={active === 'home' ? 'is-active' : undefined} aria-current={active === 'home' ? 'page' : undefined} data-nav-key="home" data-no-transition>首页</a>
              {navigation.roots.map((item) => {
                const dropdownItems = item.slug === 'contact-us-nav' ? [] : navigation.children(item.id);
                const itemNavKey = navKeyByChannelName[item.name];
                const descendantSlugs = navigation.descendantSlugs(item.id).join(',');
                const hasNewsTopic = item.slug === 'news-center';
                if (dropdownItems.length || hasNewsTopic) {
                  return (
                    <div className="nav-item nav-item--dropdown" data-cms-dropdown="server" key={item.id}>
                      <a href={firstChildHref(item, dropdownItems)} className={active === itemNavKey ? 'is-active' : undefined} data-nav-key={itemNavKey} data-channel-slug={item.slug} data-descendant-slugs={descendantSlugs} aria-haspopup="true" aria-expanded="false">
                        {item.name}
                      </a>
                      <div className="nav-dropdown" role="menu" data-source="server">
                        {dropdownItems.map((channel) => {
                          const href = channelHref(channel, navigation.children(channel.id).length > 0);
                          return (
                            <a href={href} data-no-transition={href.includes('#') ? true : undefined} data-channel-slug={channel.slug} data-descendant-slugs={navigation.descendantSlugs(channel.id).join(',')} role="menuitem" key={channel.id}>
                              {channel.name}
                            </a>
                          );
                        })}
                        {hasNewsTopic ? <a href="/topics" className={active === 'topics' ? 'is-active' : undefined} aria-current={active === 'topics' ? 'page' : undefined} role="menuitem" style={{ paddingLeft: 14 }}>专题专栏</a> : null}
                        {itemNavKey === 'cleanGov' ? (
                          <a href="/clean-gov#report-entry" role="menuitem" key="report-entry">举报入口</a>
                        ) : null}
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
              <a className="btn" href="/search" aria-label="站内搜索">搜索</a>
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
          <a href="/search">站内搜索</a>
          {navigation.roots.map((item) => {
            const dropdownItems = item.slug === 'contact-us-nav' ? [] : navigation.children(item.id);
            const hasNewsTopic = item.slug === 'news-center';
            return (
              <Fragment key={item.id}>
                <a href={firstChildHref(item, dropdownItems)} className={_props.active === navKeyByChannelName[item.name] ? 'is-active' : undefined} data-nav-key={navKeyByChannelName[item.name]} data-channel-slug={item.slug} data-descendant-slugs={navigation.descendantSlugs(item.id).join(',')}>
                  {item.name}
                </a>
                {dropdownItems.length || hasNewsTopic ? (
                  <div className="drawer-submenu" data-source="server">
                    {dropdownItems.map((channel) => {
                      const href = channelHref(channel, navigation.children(channel.id).length > 0);
                      return <a href={href} data-no-transition={href.includes('#') ? true : undefined} data-channel-slug={channel.slug} data-descendant-slugs={navigation.descendantSlugs(channel.id).join(',')} key={channel.id}>{channel.name}</a>;
                    })}
                    {hasNewsTopic ? <a href="/topics" className={_props.active === 'topics' ? 'is-active' : undefined} aria-current={_props.active === 'topics' ? 'page' : undefined} style={{ paddingLeft: 16 }}>专题专栏</a> : null}
                    {navKeyByChannelName[item.name] === 'cleanGov' ? <a href="/clean-gov#report-entry" key="report-entry">举报入口</a> : null}
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
  const [siteSettings, friendLinks, contactInfo, platformQrs] = await Promise.all([
    getPublicSiteSettings().catch(() => ({ siteName: '', footerText: '', logo: '', address: '', phone: '', email: '', icp: '', copyright: '' })),
    getPublicFriendLinks('footer').catch(() => []),
    getPublicContactInfo().catch(() => ({ email: '', phone: '', address: '', mapEmbedUrl: '' })),
    getPublicPlatformQrs().catch(() => []),
  ]);
  const safeName = siteSettings.siteName || '网站';
  const wechatQr = platformQrs.find((qr) => /公众号/.test(qr.title)) || platformQrs[0];
  const channelsQr = platformQrs.find((qr) => /视频号/.test(qr.title));
  const douyinQr = platformQrs.find((qr) => /抖音/.test(qr.title));
  const toutiaoQr = platformQrs.find((qr) => /头条/.test(qr.title));
  const qrSlots = [
    { key: 'wechat', title: '微信公众号', qr: wechatQr },
    { key: 'channels', title: '微信视频号', qr: channelsQr },
    { key: 'douyin', title: '抖音号', qr: douyinQr },
    { key: 'toutiao', title: '今日头条号', qr: toutiaoQr },
  ];
  const mailboxHref = contactInfo.email ? `mailto:${contactInfo.email}` : '/contact-us#message';

  return (
    <footer className="footer" aria-label="页脚信息">
      <div className="content">
        <div className="footer-main">
          <div className="footer-info">
            <div className="footer-mailboxes">
              <a className="footer-mailbox" href={mailboxHref}>
                <span className="footer-mailbox-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="5" width="19" height="14" /><path d="m3 6 9 7 9-7" /></svg>
                </span>
                <span className="footer-mailbox-body">
                  <span className="footer-mailbox-label">董事长信箱</span>
                  <strong>{contactInfo.email || '点击进入在线留言'}</strong>
                </span>
              </a>
              <a className="footer-mailbox" href="/contact-us#message">
                <span className="footer-mailbox-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="5" width="19" height="14" /><path d="m3 6 9 7 9-7" /></svg>
                </span>
                <span className="footer-mailbox-body">
                  <span className="footer-mailbox-label">总经理信箱</span>
                  <strong>点击进入在线留言</strong>
                </span>
              </a>
            </div>
            <p className="footer-contact-line">联系地址：{contactInfo.address || '地址暂未配置'}</p>
            <p className="footer-contact-line">联系电话：{contactInfo.phone || '电话暂未配置'}</p>
            {friendLinks.length ? (
              <details className="footer-friend-select">
                <summary>友情链接</summary>
                <div className="footer-friend-options">
                  {friendLinks.map((link) => <a href={link.url} target="_blank" rel="noopener noreferrer" key={link.id}>{link.title}</a>)}
                </div>
              </details>
            ) : null}
          </div>
          <div className="footer-qrs">
            {qrSlots.map((slot) => (
              <figure className="footer-qr-card" key={slot.key}>
                <FooterQr
                  src={slot.qr?.image || ''}
                  alt={`${slot.title}二维码`}
                  fallbackSrc={slot.key === 'wechat' ? '/img/public-platform-qr.png' : ''}
                />
                <figcaption>{slot.title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <p>{siteSettings.copyright || siteSettings.footerText || safeName}</p>
          <p>
            {contactInfo.phone ? `电话：${contactInfo.phone}` : ''}
            {siteSettings.icp ? <>{contactInfo.phone ? '　' : ''}<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{siteSettings.icp}</a></> : null}
          </p>
          <p>本网站支持IPv6访问　技术支持</p>
        </div>
        <a className="footer-top" href="#" aria-label="返回顶部">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 15 7-7 7 7" /></svg>
          <span>TOP</span>
        </a>
      </div>
    </footer>
  );
}

export function NewsAssets() {
  // 全站优化层由 global-ui.css 统一引入，同时覆盖 Next 页面与兼容的旧静态 URL。
  return (
    <>
      <link rel="stylesheet" href="/legacy-static/pages/assets/theme.css" />
      <link rel="stylesheet" href="/legacy-static/pages/assets/pages.css" />
      <link rel="stylesheet" href="/legacy-static/pages/assets/global-ui.css" />
      <link rel="stylesheet" href="/legacy-static/pages/assets/mobile.css" />
      <Script src="/legacy-static/pages/assets/app.js" strategy="afterInteractive" />
      <Script src="/legacy-static/pages/assets/global-ui.js" strategy="afterInteractive" />
      <Script src="/legacy-static/site-motion.js" strategy="afterInteractive" />
    </>
  );
}
