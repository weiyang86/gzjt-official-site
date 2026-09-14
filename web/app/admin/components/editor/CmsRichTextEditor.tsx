'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { looksLikeWordHtml, sanitizeRichTextHtml } from '@/lib/richtext/sanitize';

export type CmsRichTextEditorHandle = {
  getHtml: () => string;
  setHtml: (html: string) => void;
  insertHtml: (html: string) => void;
};

type UploadResult = { url: string; filename?: string };

type Props = {
  value: string;
  onChange: (html: string) => void;
  onReady?: (handle: CmsRichTextEditorHandle) => void;
  onError?: (message: string) => void;
  uploadImage: (file: File) => Promise<UploadResult>;
  minHeight?: number;
  placeholder?: string;
};

type LoadedEditor = {
  CKEditor: React.ComponentType<{
    editor: unknown;
    data: string;
    config?: unknown;
    onReady?: (editor: any) => void;
    onChange?: (event: unknown, editor: any) => void;
    onError?: (error: unknown, details?: unknown) => void;
  }>;
  EditorBuild: any;
};

const safeString = (value: unknown) => (typeof value === 'string' ? value : '');

const keepOfficeTextStyles = new Set([
  'text-align',
  'font-weight',
  'font-style',
  'text-decoration',
]);

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const buildParagraphHtmlFromText = (value: string) => {
  const lines = value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  if (!lines.length) return '';
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
};

const extractPlainTextLength = (value: string) => {
  if (!value || typeof window === 'undefined') return 0;
  const doc = new window.DOMParser().parseFromString(value, 'text/html');
  return normalizeWhitespace(doc.body.textContent || '').length;
};

const normalizeOfficePasteHtml = (html: string, plainText: string) => {
  if (typeof window === 'undefined') return html;

  const sanitized = sanitizeRichTextHtml(html).html;
  const doc = new window.DOMParser().parseFromString(sanitized || '', 'text/html');
  const tableHtml = Array.from(doc.body.querySelectorAll('table')).map((table) => table.outerHTML).join('');

  doc.body.querySelectorAll('*').forEach((el) => {
    el.removeAttribute('class');

    const style = el.getAttribute('style');
    if (!style) return;

    const tag = el.tagName.toLowerCase();
    if (['table', 'thead', 'tbody', 'tr', 'td', 'th', 'colgroup', 'col', 'img', 'figure', 'figcaption', 'a'].includes(tag)) {
      return;
    }

    const nextStyle = style
      .split(';')
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => {
        const idx = raw.indexOf(':');
        if (idx <= 0) return '';
        const prop = raw.slice(0, idx).trim().toLowerCase();
        const valuePart = raw.slice(idx + 1).trim();
        if (!keepOfficeTextStyles.has(prop) || !valuePart) return '';
        return `${prop}:${valuePart}`;
      })
      .filter(Boolean)
      .join(';');

    if (nextStyle) el.setAttribute('style', nextStyle);
    else el.removeAttribute('style');
  });

  const normalizedHtml = doc.body.innerHTML || '';
  const normalizedTextLength = extractPlainTextLength(normalizedHtml);
  const plainTextLength = normalizeWhitespace(plainText).length;

  if (plainTextLength > 20 && normalizedTextLength < plainTextLength * 0.45) {
    const plainHtml = buildParagraphHtmlFromText(plainText);
    return `${plainHtml}${tableHtml}` || normalizedHtml;
  }

  return normalizedHtml;
};

const buildToolbarItems = () => ([
  'undo',
  'redo',
  '|',
  'heading',
  '|',
  'fontFamily',
  'fontSize',
  '|',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'subscript',
  'superscript',
  '|',
  'fontColor',
  'fontBackgroundColor',
  '|',
  'alignment',
  '|',
  'outdent',
  'indent',
  '|',
  'numberedList',
  'bulletedList',
  '|',
  'link',
  'insertTable',
  'horizontalLine',
  '|',
  'imageUpload',
  'removeFormat',
]);

const buildFallbackToolbarItems = () => ([
  'undo',
  'redo',
  '|',
  'heading',
  '|',
  'bold',
  'italic',
  'underline',
  '|',
  'numberedList',
  'bulletedList',
  '|',
  'link',
  'insertTable',
  'imageUpload',
  'blockQuote',
  '|',
  'removeFormat',
]);

export function CmsRichTextEditor({
  value,
  onChange,
  onReady,
  onError,
  uploadImage,
  minHeight = 520,
  placeholder = '请输入正文内容',
}: Props) {
  const [loaded, setLoaded] = useState<LoadedEditor | null>(null);
  const [bootError, setBootError] = useState('');
  const [useFallbackToolbar, setUseFallbackToolbar] = useState(false);
  const toolbarHostRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const latestValueRef = useRef(value);
  const initialDataRef = useRef(value || '<p></p>');

  useEffect(() => {
    latestValueRef.current = value;
    if (!editorInstanceRef.current) {
      initialDataRef.current = value || '<p></p>';
    }
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('@ckeditor/ckeditor5-react'),
      import('@ckeditor/ckeditor5-build-decoupled-document'),
    ])
      .then(([reactMod, buildMod]) => {
        if (cancelled) return;
        const CKEditor = (reactMod as any).CKEditor;
        const EditorBuild = (buildMod as any).default || buildMod;
        if (!CKEditor || !EditorBuild) throw new Error('CKEditor 初始化失败。');
        setLoaded({ CKEditor, EditorBuild });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'CKEditor 加载失败。';
        setBootError(message);
        onError?.(message);
      });
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const config = useMemo(() => {
    const toolbar = useFallbackToolbar ? buildFallbackToolbarItems() : buildToolbarItems();
    return {
      licenseKey: 'GPL',
      language: 'zh-cn',
      placeholder,
      toolbar: { items: toolbar, shouldNotGroupWhenFull: true },
      image: {
        styles: ['alignLeft', 'alignCenter', 'alignRight'],
        toolbar: [
          'imageStyle:alignLeft',
          'imageStyle:alignCenter',
          'imageStyle:alignRight',
          '|',
          'toggleImageCaption',
          'imageTextAlternative',
        ],
      },
      table: {
        contentToolbar: [
          'tableColumn',
          'tableRow',
          'mergeTableCells',
          'splitTableCell',
          'toggleTableCaption',
          'tableProperties',
          'tableCellProperties',
        ],
      },
      typing: {
        transformations: {
          remove: ['horizontalEllipsis', 'threeDots', 'arrowLeft', 'arrowRight'],
        },
      },
    };
  }, [placeholder, useFallbackToolbar]);

  const attachUploadAdapter = (editor: any) => {
    try {
      const repository = editor.plugins.get('FileRepository');
      repository.createUploadAdapter = (loader: any) => ({
        upload: async () => {
          const file: File | null = await loader.file;
          if (!file) throw new Error('未读取到图片文件。');
          const uploaded = await uploadImage(file);
          if (!uploaded.url) throw new Error('图片上传失败。');
          return { default: uploaded.url };
        },
        abort: () => {},
      });
    } catch {}
  };

  const insertHtmlAtSelection = (editor: any, html: string) => {
    if (!html || !editor?.data?.processor || !editor?.data?.toModel || !editor?.model?.insertContent) return;
    const viewFragment = editor.data.processor.toView(html);
    const modelFragment = editor.data.toModel(viewFragment);
    editor.model.insertContent(modelFragment, editor.model.document.selection);
  };

  const attachOfficePasteFallback = (editor: any) => {
    try {
      const domRoot = editor.editing?.view?.getDomRoot?.();
      if (!domRoot || !(domRoot instanceof HTMLElement)) return;

      const handlePaste = (event: ClipboardEvent) => {
        const html = event.clipboardData?.getData('text/html') || '';
        const plainText = event.clipboardData?.getData('text/plain') || '';
        if (!html || !looksLikeWordHtml(html)) return;

        const normalizedHtml = normalizeOfficePasteHtml(html, plainText);
        if (!normalizedHtml) return;

        event.preventDefault();
        editor.model.change(() => {
          insertHtmlAtSelection(editor, normalizedHtml);
        });
      };

      domRoot.addEventListener('paste', handlePaste, true);
    } catch {}
  };

  const buildHandle = (): CmsRichTextEditorHandle => ({
    getHtml: () => safeString(editorInstanceRef.current?.getData?.()) || latestValueRef.current || '',
    setHtml: (html: string) => {
      const editor = editorInstanceRef.current;
      if (!editor?.setData) return;
      editor.setData(html || '<p></p>');
    },
    insertHtml: (html: string) => {
      const editor = editorInstanceRef.current;
      if (!editor?.setData || !editor?.getData) return;
      const current = safeString(editor.getData()) || '';
      editor.setData(`${current}${html}`);
    },
  });

  if (bootError) {
    return <div className="rich-editor-error">{bootError}</div>;
  }

  if (!loaded) {
    return <div className="rich-editor-loading" style={{ minHeight }} />;
  }

  const { CKEditor, EditorBuild } = loaded;

  return (
    <div className="rich-editor-shell" style={{ ['--rich-editor-min-height' as any]: `${minHeight}px` }}>
      <div className="rich-editor-toolbar" ref={toolbarHostRef} />
      <div className="rich-editor-body">
        <CKEditor
          editor={EditorBuild}
          data={initialDataRef.current}
          config={config}
          onReady={(editor) => {
            editorInstanceRef.current = editor;
            attachUploadAdapter(editor);
            attachOfficePasteFallback(editor);

            const toolbarEl = editor.ui?.view?.toolbar?.element;
            if (toolbarEl && toolbarHostRef.current && !toolbarHostRef.current.contains(toolbarEl)) {
              toolbarHostRef.current.innerHTML = '';
              toolbarHostRef.current.appendChild(toolbarEl);
            }

            onReady?.(buildHandle());
          }}
          onChange={(_event, editor) => {
            const html = safeString(editor?.getData?.()) || '';
            onChange(html);
          }}
          onError={(error) => {
            const message = error instanceof Error ? error.message : '富文本编辑器运行异常。';
            if (!useFallbackToolbar) {
              setUseFallbackToolbar(true);
              return;
            }
            onError?.(message);
          }}
        />
      </div>
    </div>
  );
}
