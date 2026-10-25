'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminApi, type SeoConfigPayload, type SeoPageSetting } from '@/lib/admin/admin-api';
import { defaultSeoConfig, seoManagedPages } from '@/lib/seo/pages';

type Message = { text: string; type: 'success' | 'error' } | null;

const emptyConfig = (): SeoConfigPayload => ({
  siteName: defaultSeoConfig.siteName,
  defaultTitle: defaultSeoConfig.defaultTitle,
  defaultDescription: defaultSeoConfig.defaultDescription,
  pages: {},
});

export default function SeoManagerPage() {
  const [config, setConfig] = useState<SeoConfigPayload>(emptyConfig);
  const [status, setStatus] = useState('published');
  const [message, setMessage] = useState<Message>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await AdminApi.seoSettings();
        if (!active) return;
        const loaded = result.data?.config;
        setConfig(loaded ? { ...emptyConfig(), ...loaded, pages: { ...loaded.pages } } : emptyConfig());
        setStatus(result.data?.status === 'published' ? 'published' : (result.data?.status || 'draft'));
        setHasContent(Boolean(result.data?.has_content));
      } catch (err) {
        if (!active) return;
        setMessage({ text: err instanceof Error ? err.message : 'SEO 配置加载失败。', type: 'error' });
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const updateField = (field: 'siteName' | 'defaultTitle' | 'defaultDescription', value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updatePageField = (path: string, field: keyof SeoPageSetting, value: string) => {
    setConfig((prev) => {
      const current = prev.pages[path] || { title: '', keywords: '', description: '' };
      return { ...prev, pages: { ...prev.pages, [path]: { ...current, [field]: value } } };
    });
  };

  const pageValue = (path: string, field: keyof SeoPageSetting) => config.pages[path]?.[field] || '';

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await AdminApi.updateSeoSettings({ config, status });
      setMessage({ text: 'SEO 配置已保存，前台主要页面的标题与描述将在刷新后生效。', type: 'success' });
      setHasContent(true);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'SEO 配置保存失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="dashboard-content seo-settings-page">
      <section className="notice-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">SEO SETTINGS</p>
            <h2>站点 SEO 设置</h2>
          </div>
          <a className="secondary-button" href="/admin/dashboard">返回工作台</a>
        </div>
        <p>统一维护站点默认标题、描述以及主要页面级标题、关键词和描述。前台仅读取已发布配置，未配置的页面自动使用内置默认值。</p>
        <p>
          站点地图：<a href="/sitemap.xml" target="_blank" rel="noreferrer">/sitemap.xml</a>
          　搜索引擎规则：<a href="/robots.txt" target="_blank" rel="noreferrer">/robots.txt</a>
        </p>
      </section>

      {isLoading ? <p className="form-message">正在加载 SEO 配置...</p> : null}
      {message ? <p className={`form-message ${message.type}`}>{message.text}</p> : null}

      <form onSubmit={save}>
        <section className="editor-card">
          <div className="section-title-row">
            <h2>全站默认配置</h2>
            <span className={`status-badge ${hasContent ? 'status-published' : 'status-draft'}`}>{hasContent ? '已配置' : '未配置'}</span>
          </div>
          <div className="editor-grid">
            <label>网站名称<input value={config.siteName} onChange={(event) => updateField('siteName', event.target.value)} placeholder={defaultSeoConfig.siteName} /></label>
            <label>默认标题<input value={config.defaultTitle} onChange={(event) => updateField('defaultTitle', event.target.value)} placeholder={defaultSeoConfig.defaultTitle} /></label>
            <label>配置状态
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
              </select>
            </label>
            <label className="editor-field-wide">默认描述
              <textarea rows={3} value={config.defaultDescription} onChange={(event) => updateField('defaultDescription', event.target.value)} placeholder={defaultSeoConfig.defaultDescription} />
            </label>
          </div>
        </section>

        {seoManagedPages.map((page) => (
          <section className="editor-card" key={page.path}>
            <div className="section-title-row">
              <h2>{page.label}</h2>
              <span className="meta">{page.path}</span>
            </div>
            <div className="editor-grid">
              <label>页面标题
                <input value={pageValue(page.path, 'title')} onChange={(event) => updatePageField(page.path, 'title', event.target.value)} placeholder={page.defaultTitle} />
              </label>
              <label>关键词
                <input value={pageValue(page.path, 'keywords')} onChange={(event) => updatePageField(page.path, 'keywords', event.target.value)} placeholder="多个关键词使用英文逗号分隔" />
              </label>
              <label className="editor-field-wide">页面描述
                <textarea rows={3} value={pageValue(page.path, 'description')} onChange={(event) => updatePageField(page.path, 'description', event.target.value)} placeholder={page.defaultDescription} />
              </label>
            </div>
          </section>
        ))}

        <div className="editor-actions">
          <button className="primary-button" type="submit" disabled={isSaving || isLoading}>
            {isSaving ? '正在保存...' : '保存 SEO 配置'}
          </button>
        </div>
      </form>
    </main>
  );
}
