import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import Script from 'next/script';
import { Drawer, Header } from './news/components';

export const dynamic = 'force-dynamic';

const legacyHomePath = path.join(process.cwd(), 'public', 'legacy-static', 'index.html');
const homeHeroImagePath = path.join(process.cwd(), 'public', 'img', 'index_bg.png');

const getFileVersion = (filePath: string) => {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha1').update(content).digest('hex').slice(0, 12);
  } catch {
    return '';
  }
};

const withStaticAssetVersions = (styles: string) => {
  const heroImageVersion = getFileVersion(homeHeroImagePath);
  if (!heroImageVersion) return styles;

  return styles.replaceAll('/img/index_bg.png', `/img/index_bg.png?v=${heroImageVersion}`);
};

const extractLegacyHome = () => {
  const html = fs.readFileSync(legacyHomePath, 'utf8');
  const styles = withStaticAssetVersions(Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .join('\n'));
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
  const scriptMatches = Array.from(body.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi));
  const scripts = scriptMatches.map((match, index) => {
    const attrs = match[1] || '';
    const src = attrs.match(/\ssrc=(['"])(.*?)\1/i)?.[2] || '';
    const content = match[2] || '';
    return {
      id: `legacy-home-script-${index}`,
      src,
      content,
    };
  });
  let visibleBody = body
    .replace(/<template\s+data-home-single-screen\s*>/i, '')
    .replace(/<\/template>/i, '');

  // 首页只保留轮播、新闻和联系信息；
  // 旧版中其余硬编码统计、项目及历程内容不是 CMS 数据，避免误展示。
  for (const sectionId of ['data', 'business', 'projects', 'timeline']) {
    const sectionStart = new RegExp(`<section\\b(?=[^>]*\\bid=["']${sectionId}["'])[^>]*>`, 'i').exec(visibleBody);
    if (!sectionStart || sectionStart.index === undefined) continue;
    const sectionEnd = visibleBody.indexOf('</section>', sectionStart.index + sectionStart[0].length);
    if (sectionEnd >= 0) visibleBody = `${visibleBody.slice(0, sectionStart.index)}${visibleBody.slice(sectionEnd + '</section>'.length)}`;
  }
  visibleBody = visibleBody.replace(/<nav\b(?=[^>]*\bid=["']sideNav["'])[^>]*>[\s\S]*?<\/nav>/i, '');
  visibleBody = visibleBody.replace(/<a\b(?=[^>]*\bclass=["'][^"']*\bnav-logo\b)[^>]*>[\s\S]*?<\/a>/i, '');
  visibleBody = visibleBody.replace(/<nav\b(?=[^>]*\bid=["']navbar["'])[^>]*>[\s\S]*?<\/nav>/i, '');
  const sanitizedBody = visibleBody.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  return {
    styles: `${styles}\n.site-header .brand-mark{background-image:url('/img/logo.png');}`,
    body: sanitizedBody,
    scripts,
  };
};

export default function HomePage() {
  const { styles, body, scripts } = extractLegacyHome();

  return (
    <>
      <link rel="stylesheet" href="/legacy-static/pages/assets/theme.css" />
      <link rel="stylesheet" href="/legacy-static/pages/assets/pages.css" />
      <link rel="stylesheet" href="/legacy-static/pages/assets/global-ui.css" />
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <Script id="legacy-home-cms-api-base" strategy="beforeInteractive">
        {`window.CMS_API_BASE = window.CMS_API_BASE || window.location.origin;`}
      </Script>
      <Header />
      <Drawer />
      <Script id="home-navigation-drawer" strategy="afterInteractive">
        {`(() => { const drawer = document.querySelector('[data-drawer]'); const toggle = document.querySelector('[data-menu-toggle]'); if (!drawer || !toggle) return; const close = () => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); toggle.setAttribute('aria-expanded', 'false'); }; toggle.addEventListener('click', () => { const open = !drawer.classList.contains('is-open'); drawer.classList.toggle('is-open', open); drawer.setAttribute('aria-hidden', String(!open)); toggle.setAttribute('aria-expanded', String(open)); }); drawer.querySelectorAll('[data-drawer-close], .drawer-links a').forEach((item) => item.addEventListener('click', close)); window.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); }); })();`}
      </Script>
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: body }} />
      {scripts.map((script) => (
        script.src ? (
          <Script
            key={script.id}
            src={script.src.startsWith('/') ? script.src : `/legacy-static/${script.src.replace(/^\/+/, '')}`}
            strategy="afterInteractive"
          />
        ) : (
          <Script id={script.id} key={script.id} strategy="afterInteractive">
            {script.content}
          </Script>
        )
      ))}
    </>
  );
}
