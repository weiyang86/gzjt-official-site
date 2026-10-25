'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminApi, type ReportConfigPayload } from '@/lib/admin/admin-api';
import { defaultReportConfig } from '@/lib/report/config';

type Message = { text: string; type: 'success' | 'error' } | null;

const emptyConfig = (): ReportConfigPayload => ({ ...defaultReportConfig });

export default function ReportManagerPage() {
  const [config, setConfig] = useState<ReportConfigPayload>(emptyConfig);
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
        const result = await AdminApi.reportSettings();
        if (!active) return;
        const loaded = result.data?.config;
        setConfig(loaded ? { ...emptyConfig(), ...loaded } : emptyConfig());
        setStatus(result.data?.status === 'published' ? 'published' : (result.data?.status || 'draft'));
        setHasContent(Boolean(result.data?.has_content));
      } catch (err) {
        if (!active) return;
        setMessage({ text: err instanceof Error ? err.message : '举报入口配置加载失败。', type: 'error' });
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const updateField = <K extends keyof ReportConfigPayload>(field: K, value: ReportConfigPayload[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await AdminApi.updateReportSettings({ config, status });
      setMessage({ text: '举报入口配置已保存，前台“廉洁建投”页面刷新后生效。', type: 'success' });
      setHasContent(true);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '举报入口配置保存失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="dashboard-content seo-settings-page">
      <section className="notice-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">REPORT ENTRY SETTINGS</p>
            <h2>举报入口设置</h2>
          </div>
          <a className="secondary-button" href="/admin/dashboard">返回工作台</a>
        </div>
        <p>维护前台“廉洁建投”页面的举报电话、举报邮箱、来信来访地址与在线举报外链，并配置纪检监察内容列表读取的栏目。前台仅读取已发布配置，未配置的字段自动隐藏对应卡片。</p>
        <p>纪检监察内容请在<a href="/admin/articles" target="_blank" rel="noreferrer">新闻管理</a>中选择对应栏目发布；在线举报外链仅支持 http/https 地址，举报邮箱需为有效邮箱格式，否则前台不展示对应入口。</p>
      </section>

      {isLoading ? <p className="form-message">正在加载举报入口配置...</p> : null}
      {message ? <p className={`form-message ${message.type}`}>{message.text}</p> : null}

      <form onSubmit={save}>
        <section className="editor-card">
          <div className="section-title-row">
            <h2>举报入口</h2>
            <span className={`status-badge ${hasContent ? 'status-published' : 'status-draft'}`}>{hasContent ? '已配置' : '未配置'}</span>
          </div>
          <div className="editor-grid">
            <label>入口显示
              <select value={config.enabled ? 'show' : 'hide'} onChange={(event) => updateField('enabled', event.target.value === 'show')}>
                <option value="show">显示举报入口</option>
                <option value="hide">隐藏举报入口</option>
              </select>
            </label>
            <label>区块标题
              <input value={config.title} onChange={(event) => updateField('title', event.target.value)} placeholder={defaultReportConfig.title} />
            </label>
            <label>举报电话
              <input value={config.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="例如 0836-1234567" />
            </label>
            <label>举报邮箱
              <input value={config.email} onChange={(event) => updateField('email', event.target.value)} placeholder="例如 jubao@example.com" />
            </label>
            <label>在线举报链接
              <input value={config.onlineUrl} onChange={(event) => updateField('onlineUrl', event.target.value)} placeholder="https://..." />
            </label>
            <label>在线举报链接文字
              <input value={config.onlineLabel} onChange={(event) => updateField('onlineLabel', event.target.value)} placeholder={defaultReportConfig.onlineLabel} />
            </label>
            <label className="editor-field-wide">来信来访地址
              <input value={config.address} onChange={(event) => updateField('address', event.target.value)} placeholder="例如 四川省甘孜藏族自治州康定市…" />
            </label>
            <label className="editor-field-wide">入口说明
              <textarea rows={3} value={config.intro} onChange={(event) => updateField('intro', event.target.value)} placeholder={defaultReportConfig.intro} />
            </label>
            <label className="editor-field-wide">举报须知
              <textarea rows={5} value={config.notice} onChange={(event) => updateField('notice', event.target.value)} placeholder="可填写举报受理范围、办理流程与保密承诺，支持换行。" />
            </label>
          </div>
        </section>

        <section className="editor-card">
          <div className="section-title-row">
            <h2>纪检监察内容</h2>
            <span className="meta">来源：新闻管理</span>
          </div>
          <div className="editor-grid">
            <label>内容栏目 slug
              <input value={config.articleChannelSlug} onChange={(event) => updateField('articleChannelSlug', event.target.value)} placeholder={defaultReportConfig.articleChannelSlug} />
            </label>
            <label>列表展示条数
              <select value={String(config.articlePageSize)} onChange={(event) => updateField('articlePageSize', Number(event.target.value))}>
                {[3, 4, 6, 8, 12].map((size) => <option key={size} value={String(size)}>{size} 条</option>)}
              </select>
            </label>
            <label>配置状态
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
              </select>
            </label>
          </div>
          <p className="form-message">栏目 slug 对应新闻管理中的栏目英文标识（默认 clean-governance）。前台按发布时间倒序展示该栏目及其子栏目最新内容，点击进入文章详情并提供“查看全部”链接。</p>
        </section>

        <div className="editor-actions">
          <button className="primary-button" type="submit" disabled={isSaving || isLoading}>
            {isSaving ? '正在保存...' : '保存举报入口配置'}
          </button>
        </div>
      </form>
    </main>
  );
}
