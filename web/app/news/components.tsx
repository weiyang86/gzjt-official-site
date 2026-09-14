import Script from 'next/script';
import { Fragment } from 'react';
import { getPublicChannels } from '@/lib/cms';
import type { Channel } from '@/types/cms';

export type NavKey = 'home' | 'about' | 'disclosure' | 'news' | 'businessDynamics' | 'businessDev' | 'partyMasses' | 'cleanGov' | 'responsibility' | 'contact';

const navItems: Array<{ key: NavKey; href: string; label: string }> = [
  { key: 'home', href: '/', label: '首页' },
  { key: 'about', href: '/about', label: '集团概况' },
  { key: 'disclosure', href: '/disclosure', label: '公示公告' },
  { key: 'news', href: '/news', label: '新闻中心' },
  { key: 'businessDynamics', href: '/business-dynamics', label: '业务动态' },
  { key: 'businessDev', href: '/business-dev', label: '业务发展' },
  { key: 'partyMasses', href: '/party-masses', label: '党建群团' },
  { key: 'cleanGov', href: '/clean-gov', label: '廉洁建投' },
  { key: 'responsibility', href: '/social-responsibility', label: '社会责任' },
  { key: 'contact', href: '/contact-us', label: '联系我们' },
];

async function getChannelsForNav(scope: 'news' | 'notice', channels?: Channel[]) {
  if (channels?.length) return channels;
  try {
    return await getPublicChannels(scope);
  } catch {
    return [];
  }
}

export async function Header({ active = 'news', actionHref = 'https://gjy.gzjtjt.cn/', actionLabel = '甘建云', noticeChannels, newsChannels }: {
  active?: NavKey;
  actionHref?: string;
  actionLabel?: string;
  noticeChannels?: Channel[];
  newsChannels?: Channel[];
}) {
  const [resolvedNoticeChannels, resolvedNewsChannels] = await Promise.all([
    getChannelsForNav('notice', noticeChannels),
    getChannelsForNav('news', newsChannels),
  ]);

  const dropdownMap: Partial<Record<NavKey, Channel[]>> = {
    disclosure: resolvedNoticeChannels,
    news: resolvedNewsChannels,
  };

  const hrefMap: Partial<Record<NavKey, (slug: string) => string>> = {
    disclosure: (slug) => `/disclosure?channel=${encodeURIComponent(slug)}`,
    news: (slug) => `/news?channel=${encodeURIComponent(slug)}`,
  };

  return (
    <>
      <div className="page-transition" />
      <header className="site-header" aria-label="顶部导航">
        <div className="container">
          <div className="header-inner">
            <a className="brand" href="/" data-no-transition>
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-text">
                <b>甘孜州建设投资集团</b>
                <span>GANZI CONSTRUCTION INVESTMENT GROUP</span>
              </span>
            </a>
            <nav className="nav" aria-label="一级导航">
              {navItems.map((item) => {
                const dropdownItems = dropdownMap[item.key] || [];
                const buildHref = hrefMap[item.key];
                if (dropdownItems.length && buildHref) {
                  return (
                    <div className="nav-item nav-item--dropdown" data-cms-dropdown="server" key={item.key}>
                      <a href={item.href} aria-current={active === item.key ? 'page' : undefined} aria-haspopup="true" aria-expanded="false">
                        {item.label}
                      </a>
                      <div className="nav-dropdown" role="menu" data-source="server">
                        {dropdownItems.map((channel) => (
                          <a href={buildHref(channel.slug)} role="menuitem" key={channel.slug}>
                            {channel.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <a href={item.href} aria-current={active === item.key ? 'page' : undefined} data-no-transition={item.key === 'home' ? true : undefined} key={item.key}>
                    {item.label}
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
    </>
  );
}

export async function Drawer({ active = 'news', noticeChannels, newsChannels }: { active?: NavKey; noticeChannels?: Channel[]; newsChannels?: Channel[] }) {
  const [resolvedNoticeChannels, resolvedNewsChannels] = await Promise.all([
    getChannelsForNav('notice', noticeChannels),
    getChannelsForNav('news', newsChannels),
  ]);

  const dropdownMap: Partial<Record<NavKey, Channel[]>> = {
    disclosure: resolvedNoticeChannels,
    news: resolvedNewsChannels,
  };

  const hrefMap: Partial<Record<NavKey, (slug: string) => string>> = {
    disclosure: (slug) => `/disclosure?channel=${encodeURIComponent(slug)}`,
    news: (slug) => `/news?channel=${encodeURIComponent(slug)}`,
  };

  return (
    <div className="drawer" data-drawer aria-hidden="true">
      <div className="drawer-backdrop" data-drawer-close />
      <div className="drawer-panel" role="dialog" aria-label="移动端菜单">
        <div className="drawer-top">
          <b style={{ letterSpacing: '.6px' }}>导航</b>
          <button className="drawer-close" type="button" aria-label="关闭菜单" data-drawer-close>×</button>
        </div>
        <div className="drawer-links" aria-label="移动端导航链接">
          {navItems.map((item) => {
            const dropdownItems = dropdownMap[item.key] || [];
            const buildHref = hrefMap[item.key];
            return (
              <Fragment key={item.key}>
                <a href={item.href} aria-current={active === item.key ? 'page' : undefined} data-no-transition={item.key === 'home' ? true : undefined}>
                  {item.label}
                </a>
                {dropdownItems.length && buildHref ? (
                  <div className="drawer-submenu" data-source="server">
                    {dropdownItems.map((channel) => (
                      <a href={buildHref(channel.slug)} key={channel.slug}>{channel.name}</a>
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

export function Footer() {
  return (
    <footer className="footer" aria-label="页脚信息">
      <div className="content">
        <div className="footer-inner">
          <div>
            <h3>甘孜州建设投资集团有限公司</h3>
            <p>地址：四川省康定市榆林街道榆磨路60号<br />电话：0836-2876659</p>
          </div>
          <div>
            <dl>
              <dt>友情链接</dt>
              <dd>
                <a href="https://www.gzz.gov.cn/" target="_blank" rel="noopener noreferrer">甘孜藏族自治州人民政府</a><br />
                <a href="http://jtj.gzz.gov.cn/" target="_blank" rel="noopener noreferrer">甘孜藏族自治州交通运输局</a><br />
                <a href="http://jsj.gzz.gov.cn/" target="_blank" rel="noopener noreferrer">甘孜藏族自治州住房和城乡建设局</a>
              </dd>
            </dl>
          </div>
        </div>
        <div className="footbar">
          <span>甘孜州建设投资集团有限公司 2026 版权所有</span>
          <span><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">蜀ICP备2022013144号-2</a> · <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=51332102000065" target="_blank" rel="noopener noreferrer">川公网安备 51332102000065号</a></span>
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
