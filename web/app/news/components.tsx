import Script from 'next/script';
import { Fragment } from 'react';
import { getPublicChannels } from '@/lib/cms';
import type { Channel } from '@/types/cms';

export type NavKey = 'home' | 'about' | 'disclosure' | 'news' | 'businessDynamics' | 'businessDev' | 'partyMasses' | 'cleanGov' | 'responsibility' | 'contact';

const channelHref = (channel: Channel) => {
  if (channel.type === 'link' || channel.type === 'page' || channel.type === 'module') return channel.path || `/${channel.slug}`;
  if (channel.type === 'notice' || channel.path?.startsWith('/disclosure')) return `/disclosure?channel=${encodeURIComponent(channel.slug)}`;
  return `/news?channel=${encodeURIComponent(channel.slug)}`;
};

const getDynamicNavigation = async () => {
  try {
    const channels = (await getPublicChannels()).filter((channel) => channel.status === 'enabled' && channel.visible !== false);
    const ids = new Set(channels.map((channel) => channel.id));
    const roots = channels.filter((channel) => !channel.parent || !ids.has(channel.parent));
    const descendants = (rootId: string) => {
      const output: Array<{ channel: Channel; depth: number }> = [];
      const visited = new Set([rootId]);
      const visit = (id: string, depth: number) => channels.filter((item) => item.parent === id).forEach((item) => {
        if (visited.has(item.id)) return;
        visited.add(item.id);
        output.push({ channel: item, depth });
        visit(item.id, depth + 1);
      });
      visit(rootId, 1);
      return output;
    };
    return { roots, descendants };
  } catch {
    return { roots: [] as Channel[], descendants: (_id: string) => [] as Array<{ channel: Channel; depth: number }> };
  }
};

export async function Header({ actionHref = 'https://gjy.gzjtjt.cn/', actionLabel = '甘建云' }: {
  active?: NavKey;
  actionHref?: string;
  actionLabel?: string;
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
            <a className="brand" href="/" data-no-transition>
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-text">
                <b>甘孜州建设投资集团</b>
                <span>GANZI CONSTRUCTION INVESTMENT GROUP</span>
              </span>
            </a>
            <nav className="nav" aria-label="一级导航">
              <a href="/" data-no-transition>首页</a>
              {navigation.roots.map((item) => {
                const dropdownItems = navigation.descendants(item.id);
                if (dropdownItems.length) {
                  return (
                    <div className="nav-item nav-item--dropdown" data-cms-dropdown="server" key={item.id}>
                      <a href={channelHref(item)} aria-haspopup="true" aria-expanded="false">
                        {item.name}
                      </a>
                      <div className="nav-dropdown" role="menu" data-source="server">
                        {dropdownItems.map(({ channel, depth }) => (
                          <a href={channelHref(channel)} role="menuitem" key={channel.id} style={{ paddingLeft: 14 + (depth - 1) * 10 }}>
                            {channel.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <a href={channelHref(item)} key={item.id}>
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
    </>
  );
}

export async function Drawer(_props: { active?: NavKey; noticeChannels?: Channel[]; newsChannels?: Channel[] } = {}) {
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
          <a href="/" data-no-transition>首页</a>
          {navigation.roots.map((item) => {
            const dropdownItems = navigation.descendants(item.id);
            return (
              <Fragment key={item.id}>
                <a href={channelHref(item)}>
                  {item.name}
                </a>
                {dropdownItems.length ? (
                  <div className="drawer-submenu" data-source="server">
                    {dropdownItems.map(({ channel, depth }) => (
                      <a href={channelHref(channel)} key={channel.id} style={{ paddingLeft: 16 + (depth - 1) * 10 }}>{channel.name}</a>
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
