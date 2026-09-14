import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import Script from 'next/script';

export const dynamic = 'force-static';

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
  const sanitizedBody = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  return {
    styles,
    body: sanitizedBody,
    scripts,
  };
};

export default function HomePage() {
  const { styles, body, scripts } = extractLegacyHome();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <Script id="legacy-home-cms-api-base" strategy="beforeInteractive">
        {`window.CMS_API_BASE = window.CMS_API_BASE || window.location.origin;`}
      </Script>
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
