import Script from 'next/script';

export function Header() {
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
              <a href="/pages/about/index.html">集团概况</a>
              <a href="/disclosure">公示公告</a>
              <a href="/news" aria-current="page">新闻中心</a>
              <a href="/pages/business/index.html">业务板块</a>
              <a href="/pages/projects/index.html">项目展示</a>
              <a href="/pages/party/index.html">党建工作</a>
              <a href="/pages/responsibility/index.html">社会责任</a>
              <a href="/pages/contact/index.html">联系我们</a>
            </nav>
            <div className="header-actions">
              <a className="btn btn--primary" href="/pages/contact/index.html">在线服务</a>
              <button className="menu-toggle" type="button" aria-label="打开菜单" data-menu-toggle aria-expanded="false"><i /></button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export function Drawer() {
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
          <a href="/pages/about/index.html">集团概况</a>
          <a href="/disclosure">公示公告</a>
          <a href="/news" aria-current="page">新闻中心</a>
          <a href="/pages/business/index.html">业务板块</a>
          <a href="/pages/projects/index.html">项目展示</a>
          <a href="/pages/party/index.html">党建工作</a>
          <a href="/pages/responsibility/index.html">社会责任</a>
          <a href="/pages/contact/index.html">联系我们</a>
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
          <span>甘孜州建设投资集团有限公司 2022 版权所有</span>
          <span><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">蜀ICP备2022013144号-1</a> · <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=51332102000065" target="_blank" rel="noopener noreferrer">川公网安备 51332102000065号</a></span>
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
