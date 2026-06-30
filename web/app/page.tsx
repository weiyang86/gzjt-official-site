import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-static';

const legacyHomePath = path.join(process.cwd(), 'public', 'legacy-static', 'index.html');

const extractLegacyHome = () => {
  const html = fs.readFileSync(legacyHomePath, 'utf8');
  const styles = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .join('\n');
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';

  return {
    styles,
    body,
  };
};

export default function HomePage() {
  const { styles, body } = extractLegacyHome();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <script
        dangerouslySetInnerHTML={{
          __html: 'window.CMS_API_BASE = window.CMS_API_BASE || window.location.origin;',
        }}
      />
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </>
  );
}
