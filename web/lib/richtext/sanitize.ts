export type RichTextSanitizeResult = {
  html: string;
  removedImages: number;
  removedScripts: number;
};

const allowedTags = new Set([
  'p',
  'div',
  'span',
  'br',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'sup',
  'sub',
  'blockquote',
  'ol',
  'ul',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'colgroup',
  'col',
  'img',
  'a',
  'figure',
  'figcaption',
]);

const forbiddenTags = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'meta',
  'link',
  'style',
  'base',
]);

const allowedAttributes = new Set([
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'colspan',
  'rowspan',
  'style',
  'class',
  'data-align',
]);

const allowedStyleProps = new Set([
  'text-align',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
  'color',
  'background-color',
  'line-height',
  'text-indent',
  'margin',
  'margin-left',
  'margin-right',
  'margin-top',
  'margin-bottom',
  'padding',
  'padding-left',
  'padding-right',
  'padding-top',
  'padding-bottom',
  'border',
  'border-left',
  'border-right',
  'border-top',
  'border-bottom',
  'border-collapse',
  'width',
  'height',
  'max-width',
  'vertical-align',
  'display',
]);

const normalizeCssText = (value: string) => value.replace(/\s+/g, ' ').trim();

const sanitizeStyleValue = (style: string) => {
  if (!style) return '';
  const entries = style
    .split(';')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const idx = raw.indexOf(':');
      if (idx <= 0) return null;
      const prop = raw.slice(0, idx).trim().toLowerCase();
      const value = raw.slice(idx + 1).trim();
      if (!prop || !value) return null;
      if (prop.startsWith('mso-')) return null;
      if (!allowedStyleProps.has(prop)) return null;
      if (/expression\s*\(|url\s*\(\s*javascript:/i.test(value)) return null;
      return `${prop}:${normalizeCssText(value)}`;
    })
    .filter((item): item is string => Boolean(item));
  return entries.join(';');
};

const isWordGarbageSpan = (el: Element) => {
  if (el.tagName.toLowerCase() !== 'span') return false;
  const text = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
  const attrs = Array.from(el.attributes);
  if (!text && el.querySelector('img,table,br')) return false;
  const meaningfulAttrs = attrs.filter((attr) => {
    const name = attr.name.toLowerCase();
    if (name === 'style' && sanitizeStyleValue(attr.value)) return true;
    if (name === 'class' && attr.value.trim()) return true;
    if (name.startsWith('data-')) return true;
    return false;
  });
  return meaningfulAttrs.length === 0;
};

const sanitizeUrl = (value: string, type: 'href' | 'src') => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^javascript:/i.test(trimmed)) return '';
  if (type === 'href') return trimmed;
  if (/^data:/i.test(trimmed)) return trimmed;
  return trimmed;
};

export const looksLikeWordHtml = (html: string) => (
  /class=["']?Mso|mso-|w:WordDocument|urn:schemas-microsoft-com:office|<\/o:p>|<!--\s*\[if\s+/i.test(html)
);

export function sanitizeRichTextHtml(input: string): RichTextSanitizeResult {
  if (typeof window === 'undefined') {
    return { html: input || '', removedImages: 0, removedScripts: 0 };
  }
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(input || '', 'text/html');

  let removedScripts = 0;
  let removedImages = 0;

  const commentWalker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (commentWalker.nextNode()) comments.push(commentWalker.currentNode as Comment);
  comments.forEach((node) => node.parentNode?.removeChild(node));

  const removeNodesBySelector = (selector: string) => {
    doc.querySelectorAll(selector).forEach((node) => {
      if (node.tagName.toLowerCase() === 'script') removedScripts += 1;
      node.remove();
    });
  };

  removeNodesBySelector(Array.from(forbiddenTags).join(','));
  removeNodesBySelector('o\\:p');

  const walk = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (forbiddenTags.has(tag)) {
      if (tag === 'script') removedScripts += 1;
      el.remove();
      return;
    }

    if (!allowedTags.has(tag)) {
      const parent = el.parentNode;
      if (!parent) return;
      const fragment = doc.createDocumentFragment();
      while (el.firstChild) fragment.appendChild(el.firstChild);
      parent.replaceChild(fragment, el);
      return;
    }

    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }

      if (name.startsWith('data-')) return;
      if (allowedAttributes.has(name)) return;

      el.removeAttribute(attr.name);
    });

    const style = el.getAttribute('style') || '';
    if (style) {
      const next = sanitizeStyleValue(style);
      if (next) el.setAttribute('style', next);
      else el.removeAttribute('style');
    }

    if (tag === 'a') {
      const href = sanitizeUrl(el.getAttribute('href') || '', 'href');
      if (!href) el.removeAttribute('href');
      else el.setAttribute('href', href);
      const target = (el.getAttribute('target') || '').toLowerCase();
      if (target) el.setAttribute('target', target === '_blank' ? '_blank' : '_self');
      if (el.getAttribute('target') === '_blank') {
        const rel = (el.getAttribute('rel') || '').toLowerCase();
        const parts = new Set(rel.split(/\s+/).filter(Boolean));
        parts.add('noopener');
        parts.add('noreferrer');
        el.setAttribute('rel', Array.from(parts).join(' '));
      }
    }

    if (tag === 'img') {
      const src = sanitizeUrl(el.getAttribute('src') || '', 'src');
      if (!src) {
        removedImages += 1;
        el.remove();
        return;
      }
      el.setAttribute('src', src);
      el.removeAttribute('srcset');
    }

    if (isWordGarbageSpan(el)) {
      const parent = el.parentNode;
      if (!parent) return;
      const fragment = doc.createDocumentFragment();
      while (el.firstChild) fragment.appendChild(el.firstChild);
      parent.replaceChild(fragment, el);
      return;
    }

    Array.from(el.childNodes).forEach(walk);
  };

  Array.from(doc.body.childNodes).forEach(walk);

  return { html: doc.body.innerHTML || '', removedImages, removedScripts };
}
