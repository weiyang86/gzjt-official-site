import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import type { Metadata } from 'next';
import Script from 'next/script';
import { buildDirectusPath, cmsPublicFetch } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

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

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const extractLegacyHome = (icp: string) => {
  const html = fs.readFileSync(legacyHomePath, 'utf8');
  const styles = withStaticAssetVersions(Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .join('\n')) + `\n.landing-icp{position:absolute;z-index:6;right:16px;bottom:0;left:16px;text-align:center;font-size:12px;line-height:18px;color:rgba(255,255,255,.72)}.landing-icp a{color:inherit;text-decoration:none}.landing-icp a:hover{text-decoration:underline}`;
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
  }).filter((script) => script.src !== 'pages/assets/home-directus.js');
  const safeIcp = escapeHtml(icp.trim());
  const sanitizedBody = body
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/(<div class="home-banner-dots"[^>]*>)/i, safeIcp
      ? `<div class="landing-icp"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">${safeIcp}</a></div>\n    $1`
      : '$1')
    .replace(/<a href="https:\/\/beian\.miit\.gov\.cn\/"[^>]*>[\s\S]*?<\/a>\s*&nbsp;\|&nbsp;/i, safeIcp
      ? `<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">${safeIcp}</a> &nbsp;|&nbsp; `
      : '');

  return {
    styles,
    body: sanitizedBody,
    scripts,
  };
};

export default async function HomePage() {
  const siteSettings = await cmsPublicFetch<{ data?: Array<{ icp?: unknown }> }>(buildDirectusPath('/items/site_settings', {
    fields: 'icp',
    limit: 1,
  })).catch(() => null);
  const icp = typeof siteSettings?.data?.[0]?.icp === 'string' ? siteSettings.data[0].icp : '';
  const { styles, body, scripts } = extractLegacyHome(icp);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: body }} />
      {scripts.map((script) => (
        script.src ? (
          <Script
            key={script.id}
            src={script.src.startsWith('/') ? script.src : `/${script.src.replace(/^\/+/, '')}`}
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
