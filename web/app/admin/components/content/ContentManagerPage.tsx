'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { MessageState, PageContent, PageContentItem, PageModule, PageModuleGroup, UploadPayload } from './types';
import { getArticleChannelSlug, getMergedNewsAdminHref } from './merged-news-channel';
import { contactInfoModuleCode, defaultContactInfo, defaultHomepageLayout, homepageLayoutModuleCode, normalizeHomepageLayout, type ContactInfoConfig, type HomepageBannerSlide, type HomepageLayoutConfig, type HomepageScreenId, type HomepageSectionId } from '@/lib/cms/homepage-layout';
import { defaultGroupIntroConfig, type GroupIntroAchievement, type GroupIntroConfig, type GroupIntroStat } from '@/lib/cms/group-intro';
import { LeadershipManager } from './LeadershipManager';
import { HonorManager } from './HonorManager';
import { BusinessSectorManager } from './BusinessSectorManager';
import { TrainingResourceManager } from './TrainingResourceManager';

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

const itemStatusOptions = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' },
];

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageBytes = 50 * 1024 * 1024;
const publicPlatformQrModuleCode = 'global-public-platform-qr';
const trainingResourceModuleCode = 'training-resources';
const trainingResourceModule: PageModule = {
  id: trainingResourceModuleCode,
  parent_title: '党建群团',
  parent_code: 'party-mass',
  module_title: '培训资源',
  module_code: trainingResourceModuleCode,
  route_path: '/party/training',
  content_type: 'resource_list',
  admin_enabled: true,
  dev_status: 'enabled',
  status: 'enabled',
  sort: 505,
};
const homepageLayoutModule: PageModule = {
  id: homepageLayoutModuleCode,
  parent_title: '首页配置',
  parent_code: 'homepage-settings',
  module_title: '首页界面配置',
  module_code: homepageLayoutModuleCode,
  content_type: 'homepage_layout',
  admin_enabled: true,
  dev_status: 'enabled',
  status: 'enabled',
  sort: 0,
};

const contactInfoModule: PageModule = {
  id: contactInfoModuleCode,
  parent_title: '全站配置',
  parent_code: 'global-settings',
  module_title: '联系我们配置',
  module_code: contactInfoModuleCode,
  content_type: 'contact_info',
  admin_enabled: true,
  dev_status: 'enabled',
  status: 'enabled',
  sort: 2,
};

const publicPlatformQrModule: PageModule = {
  id: publicPlatformQrModuleCode,
  parent_title: '全站配置',
  parent_code: 'global-settings',
  module_title: '公众平台二维码',
  module_code: publicPlatformQrModuleCode,
  content_type: 'image_list',
  admin_enabled: true,
  dev_status: 'enabled',
  status: 'enabled',
  sort: 1,
};

const honorsModuleCode = 'group-honors';
const honorsModule: PageModule = {
  id: honorsModuleCode,
  parent_title: '集团概况',
  parent_code: 'group-overview',
  module_title: '企业荣誉',
  module_code: honorsModuleCode,
  route_path: '/about/honors',
  content_type: 'honor_list',
  admin_enabled: true,
  dev_status: 'enabled',
  status: 'enabled',
  sort: 105,
};

const withHonorsModule = (groups: PageModuleGroup[]) => {
  if (groups.some((group) => (group.children || group.modules || []).some((module) => module.module_code === honorsModuleCode))) {
    return groups;
  }
  const groupIndex = groups.findIndex((group) => group.parent_code === 'group-overview');
  if (groupIndex < 0) {
    return [...groups, { parent_title: '集团概况', parent_code: 'group-overview', children: [honorsModule] }];
  }
  return groups.map((group, index) => index === groupIndex
    ? { ...group, children: [...(group.children || group.modules || []), honorsModule] }
    : group);
};

const emptyPageContent = (moduleCode = ''): PageContent => ({
  module_code: moduleCode,
  title: '',
  subtitle: '',
  cover: null,
  summary: '',
  content: '',
  extra_json: {},
  status: 'draft',
});

const emptyTimelineItem = (moduleCode = ''): PageContentItem => ({
  id: '',
  module_code: moduleCode,
  item_type: 'timeline',
  date_label: '',
  title: '',
  content: '',
  sort: 0,
  status: 'enabled',
  extra_json: {},
});

const moduleConfig = (module: PageModule) => {
  const base = {
    titleLabel: '页面标题',
    subtitleLabel: '副标题',
    coverLabel: '封面图',
    summaryLabel: '摘要',
    contentLabel: '正文 / 说明',
    submitText: '保存内容',
    showSubtitle: true,
    showSummary: true,
    showCover: true,
    bodyRows: 10,
    introText: '',
  };
  if (module.module_code === 'group-intro') {
    return {
      ...base,
      introText: '管理集团简介、经营指标、企业宗旨与使命。结构化配置保存在现有 page_contents.extra_json；初始值沿用当前官网文案，保存并发布后前台生效。',
      coverLabel: '企业简介封面图',
      contentLabel: '企业简介正文',
    };
  }
  if (module.module_code === 'group-history') {
    return {
      ...base,
      introText: '发展历程由页面基础信息和时间轴条目组成；条目保存到 page_content_items.module_code = group-history，item_type = timeline。',
      showSubtitle: false,
      showCover: false,
      summaryLabel: '页面说明',
      contentLabel: '补充说明',
      bodyRows: 5,
      submitText: '保存页面基础信息',
    };
  }
  if (module.module_code === 'org-chart') {
    return {
      ...base,
      introText: '组织架构图图片保存到 page_contents.cover，说明文字保存到 page_contents.content。',
      showSubtitle: false,
      showSummary: false,
      coverLabel: '组织架构图图片',
      contentLabel: '组织架构说明文字',
      bodyRows: 7,
    };
  }
  return base;
};

const validateImage = (file?: File | null) => {
  if (!file) return '请选择图片文件。';
  if (!allowedImageTypes.includes(file.type)) return '仅支持 JPG、PNG、WEBP 图片。';
  if (file.size > maxImageBytes) return '图片大小不能超过 50MB。';
  return '';
};

function PageContentForm({ module, options = {} }: {
  module: PageModule;
  options?: Partial<ReturnType<typeof moduleConfig>>;
}) {
  const config = useMemo(() => ({ ...moduleConfig(module), ...options }), [module, options]);
  const moduleCode = module.module_code || '';
  const [form, setForm] = useState<PageContent>(() => emptyPageContent(moduleCode));
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadFailed(false);
    setMessage(null);
    AdminApi.pageContent(moduleCode)
      .then((result) => {
        if (!isMounted) return;
        const loaded = (result.data || {}) as PageContent;
        const extra = loaded.extra_json && typeof loaded.extra_json === 'object' && !Array.isArray(loaded.extra_json)
          ? loaded.extra_json
          : {};
        if (moduleCode === 'group-intro') {
          const savedConfig = extra.groupIntro && typeof extra.groupIntro === 'object' && !Array.isArray(extra.groupIntro)
            ? extra.groupIntro as Partial<GroupIntroConfig>
            : {};
          const groupIntro = {
            ...defaultGroupIntroConfig,
            ...savedConfig,
            profileBadges: savedConfig.profileBadges || defaultGroupIntroConfig.profileBadges,
            heroStats: savedConfig.heroStats || defaultGroupIntroConfig.heroStats,
            principleEnglish: savedConfig.principleEnglish || defaultGroupIntroConfig.principleEnglish,
            achievements: savedConfig.achievements || defaultGroupIntroConfig.achievements,
            performanceParagraphs: savedConfig.performanceParagraphs || defaultGroupIntroConfig.performanceParagraphs,
            missionParagraphs: savedConfig.missionParagraphs || defaultGroupIntroConfig.missionParagraphs,
          };
          setForm({
            ...emptyPageContent(moduleCode),
            ...loaded,
            title: loaded.title || '甘孜州建设投资集团有限公司',
            subtitle: loaded.subtitle || '州属一级国有企业，服务全州交通和城乡基础设施投融资、建设、开发与资产经营。',
            content: loaded.content || '<p>甘孜州建设投资集团有限公司为州属一级国有企业。前身为甘孜州交通基础设施建设领导小组办公室，2018年5月，根据改革发展需要，组建了甘孜州交通投资建设集团有限公司；2018年12月，甘孜州城投公司整体划入集团，更名为甘孜州交通和城乡建设投资集团有限公司；2025年5月更名为甘孜州建设投资集团有限公司。</p><p>集团主要承担全州政府性投资的交通和城乡基础设施项目的投融资、建设、开发、资产经营等职责，经营范围涉及交通和城乡基础设施工程的建设、管理、测绘、勘察、监理、检测等业务，注册资本10亿元，总资产85.56亿元。</p><p>集团下设二级子公司9家，其中全资5家、控股2家、参股2家；三级子公司3家，均为控股公司；下属规上、限上企业6家，具备公路工程、房建市政施工总承包等资质17个。</p>',
            extra_json: { ...extra, groupIntro },
          });
          return;
        }
        setForm({ ...emptyPageContent(moduleCode), ...loaded });
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadFailed(true);
        setMessage({ text: err instanceof Error ? err.message : '页面内容加载失败。', type: 'error' });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [moduleCode]);

  const setField = (field: keyof PageContent, value: string | Record<string, unknown> | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const groupIntro = (() => {
    const saved = form.extra_json?.groupIntro;
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaultGroupIntroConfig;
    const value = saved as Partial<GroupIntroConfig>;
    return {
      ...defaultGroupIntroConfig,
      ...value,
      profileBadges: value.profileBadges || defaultGroupIntroConfig.profileBadges,
      heroStats: value.heroStats || defaultGroupIntroConfig.heroStats,
      principleEnglish: value.principleEnglish || defaultGroupIntroConfig.principleEnglish,
      achievements: value.achievements || defaultGroupIntroConfig.achievements,
      performanceParagraphs: value.performanceParagraphs || defaultGroupIntroConfig.performanceParagraphs,
      missionParagraphs: value.missionParagraphs || defaultGroupIntroConfig.missionParagraphs,
    };
  })();
  const updateGroupIntro = (patch: Partial<GroupIntroConfig>) => setField('extra_json', {
    ...(form.extra_json || {}),
    groupIntro: { ...groupIntro, ...patch },
  });
  const updateGroupIntroList = <T,>(key: 'heroStats' | 'achievements', index: number, patch: Partial<T>) => {
    const current = groupIntro[key] as T[];
    updateGroupIntro({ [key]: current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  };

  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const error = validateImage(file);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await AdminApi.uploadFile(formData);
      const uploaded = (result.data || {}) as UploadPayload;
      if (!uploaded.id) throw new Error('上传成功但未返回文件 ID。');
      setField('cover', uploaded.id);
      setMessage({ text: '图片上传成功，保存内容后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '图片上传失败，请确认 Directus Files 权限和服务状态。', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await AdminApi.savePageContent(moduleCode, {
        title: String(form.title || '').trim(),
        subtitle: String(form.subtitle || '').trim(),
        cover: form.cover || null,
        summary: String(form.summary || '').trim(),
        content: String(form.content || ''),
        extra_json: form.extra_json || {},
        status: form.status || 'draft',
      });
      setMessage({ text: '内容已保存到 Directus。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存失败，请确认 Directus 服务可用且账号有 page_contents 权限。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const showCover = config.showCover !== false;
  const showSubtitle = config.showSubtitle !== false;
  const showSummary = config.showSummary !== false;

  return (
    <form className="editor-card content-form-card" onSubmit={handleSubmit}>
      <div className="section-title-row">
        <div>
          <p className="eyebrow">{module.parent_title} · {module.module_code}</p>
          <h2>{module.module_title}</h2>
        </div>
        <span className="status-badge status-published">{module.content_type}</span>
      </div>
      {config.introText ? <p className="form-help-text">{config.introText}</p> : null}
      {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
      <div className="editor-grid">
        <label>{config.titleLabel}
          <input type="text" required value={form.title || ''} onChange={(event) => setField('title', event.target.value)} />
        </label>
        {showSubtitle ? (
          <label>{config.subtitleLabel}
            <input type="text" value={form.subtitle || ''} onChange={(event) => setField('subtitle', event.target.value)} />
          </label>
        ) : null}
        {showCover ? (
          <div className="cover-field span-2">
            <label>{config.coverLabel}</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB；上传通过 /admin-api/files 代理到 Directus Files。</p>
            <div className="cover-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} disabled={isUploading} />
              <input type="hidden" value={form.cover || ''} readOnly />
            </div>
            {form.cover ? <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.cover)}`} alt="图片预览" /> : null}
          </div>
        ) : null}
        {showSummary ? (
          <label className="span-2">{config.summaryLabel}
            <textarea rows={3} value={form.summary || ''} onChange={(event) => setField('summary', event.target.value)} />
          </label>
        ) : null}
        <label className="span-2">{config.contentLabel}
          <textarea className="content-editor" rows={config.bodyRows} value={form.content || ''} onChange={(event) => setField('content', event.target.value)} />
        </label>
        {moduleCode === 'group-intro' ? (
          <div className="span-2">
            <section className="group-intro-settings">
              <h3>集团简介展示配置</h3>
              <p className="field-tip">以上正文及以下配置只在状态设为“已发布”后显示在官网 /about。数据使用现有 page_contents 字段，不新增表。</p>
              <div className="editor-grid">
                <label>简介标识<input value={groupIntro.profileMarker} onChange={(event) => updateGroupIntro({ profileMarker: event.target.value })} /></label>
                <label>职责关键词（每行一项）<textarea rows={3} value={groupIntro.profileBadges.join('\n')} onChange={(event) => updateGroupIntro({ profileBadges: event.target.value.split('\n') })} /></label>
                <div className="span-2 group-intro-repeaters">
                  <h4>首页速览指标</h4>
                  {groupIntro.heroStats.map((stat: GroupIntroStat, index) => <div className="group-intro-row" key={`hero-${index}`}>
                    <input aria-label={`速览指标${index + 1}`} placeholder="数值" value={stat.value} onChange={(event) => updateGroupIntroList<GroupIntroStat>('heroStats', index, { value: event.target.value })} />
                    <input aria-label={`速览指标${index + 1}名称`} placeholder="名称" value={stat.label} onChange={(event) => updateGroupIntroList<GroupIntroStat>('heroStats', index, { label: event.target.value })} />
                    <button className="secondary-button" type="button" onClick={() => updateGroupIntro({ heroStats: groupIntro.heroStats.filter((_, itemIndex) => itemIndex !== index) })}>删除</button>
                  </div>)}
                  <button className="secondary-button" type="button" onClick={() => updateGroupIntro({ heroStats: [...groupIntro.heroStats, { value: '', label: '' }] })}>添加速览指标</button>
                </div>
                <label>企业宗旨标签<input value={groupIntro.principleLabel} onChange={(event) => updateGroupIntro({ principleLabel: event.target.value })} /></label>
                <label>企业宗旨文案（换行分行）<textarea rows={3} value={groupIntro.principleTitle} onChange={(event) => updateGroupIntro({ principleTitle: event.target.value })} /></label>
                <label className="span-2">企业宗旨英文文案（每行一项）<textarea rows={2} value={groupIntro.principleEnglish.join('\n')} onChange={(event) => updateGroupIntro({ principleEnglish: event.target.value.split('\n') })} /></label>
                <label>成果板块标题<input value={groupIntro.performanceTitle} onChange={(event) => updateGroupIntro({ performanceTitle: event.target.value })} /></label>
                <label>成果板块引言<textarea rows={3} value={groupIntro.performanceLead} onChange={(event) => updateGroupIntro({ performanceLead: event.target.value })} /></label>
                <div className="span-2 group-intro-repeaters">
                  <h4>经营与建设指标</h4>
                  {groupIntro.achievements.map((item: GroupIntroAchievement, index) => <div className="group-intro-row group-intro-row--achievement" key={`achievement-${index}`}>
                    <input aria-label={`成果数值${index + 1}`} placeholder="数值" value={item.value} onChange={(event) => updateGroupIntroList<GroupIntroAchievement>('achievements', index, { value: event.target.value })} />
                    <input aria-label={`成果名称${index + 1}`} placeholder="说明" value={item.label} onChange={(event) => updateGroupIntroList<GroupIntroAchievement>('achievements', index, { label: event.target.value })} />
                    <input aria-label={`成果标签${index + 1}`} placeholder="强调标签" value={item.accent} onChange={(event) => updateGroupIntroList<GroupIntroAchievement>('achievements', index, { accent: event.target.value })} />
                    <button className="secondary-button" type="button" onClick={() => updateGroupIntro({ achievements: groupIntro.achievements.filter((_, itemIndex) => itemIndex !== index) })}>删除</button>
                  </div>)}
                  <button className="secondary-button" type="button" onClick={() => updateGroupIntro({ achievements: [...groupIntro.achievements, { value: '', label: '', accent: '' }] })}>添加成果指标</button>
                </div>
                <label className="span-2">成果补充说明（每行一段）<textarea rows={4} value={groupIntro.performanceParagraphs.join('\n')} onChange={(event) => updateGroupIntro({ performanceParagraphs: event.target.value.split('\n') })} /></label>
                <label className="span-2">企业使命标题<input value={groupIntro.missionTitle} onChange={(event) => updateGroupIntro({ missionTitle: event.target.value })} /></label>
                <label className="span-2">企业使命说明（每行一段）<textarea rows={5} value={groupIntro.missionParagraphs.join('\n')} onChange={(event) => updateGroupIntro({ missionParagraphs: event.target.value.split('\n') })} /></label>
              </div>
            </section>
          </div>
        ) : null}
        <label>发布状态
          <select value={form.status || 'draft'} onChange={(event) => setField('status', event.target.value)}>
            {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button className="primary-link-button" type="submit" disabled={isSaving || isLoading || (moduleCode === 'group-intro' && loadFailed)}>{isSaving ? '正在保存...' : config.submitText}</button>
        {moduleCode === 'group-intro' && loadFailed ? <span className="field-tip">数据加载失败，已禁用保存以避免覆盖原内容；请刷新页面重试。</span> : null}
      </div>
    </form>
  );
}

function TimelineManager({ module }: { module: PageModule }) {
  const moduleCode = module.module_code || '';
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<PageContentItem>(() => emptyTimelineItem(moduleCode));
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.pageContentItems({ module_code: moduleCode, item_type: 'timeline' });
      setItems((result.data || []) as PageContentItem[]);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '时间轴条目加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setForm(emptyTimelineItem(moduleCode));
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleCode]);

  const reset = () => {
    setForm(emptyTimelineItem(moduleCode));
  };

  const setField = (field: keyof PageContentItem, value: string | number | Record<string, unknown>) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        module_code: moduleCode,
        item_type: 'timeline',
        date_label: String(form.date_label || '').trim(),
        title: String(form.title || '').trim(),
        content: String(form.content || ''),
        sort: Number(form.sort || 0),
        status: form.status || 'enabled',
        extra_json: {},
      };
      if (form.id) await AdminApi.updatePageContentItem(form.id, payload);
      else await AdminApi.createPageContentItem(payload);
      setMessage({ text: '时间轴条目已保存。', type: 'success' });
      reset();
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存时间轴条目失败，请确认 Directus 服务可用且账号有 page_content_items 权限。', type: 'error' });
    }
  };

  const disableItem = async (id: string) => {
    try {
      await AdminApi.disablePageContentItem(id);
      setMessage({ text: '条目已停用。', type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '停用条目失败，请稍后重试。', type: 'error' });
    }
  };

  return (
    <section className="editor-card timeline-editor-card">
      <div className="section-title-row">
        <div><p className="eyebrow">page_content_items · timeline</p><h2>发展历程时间轴条目</h2></div>
        <button className="secondary-button" type="button" onClick={reset}>新增条目</button>
      </div>
      <p className="form-help-text">时间轴条目保存到 page_content_items，module_code 固定为 {moduleCode}，item_type 固定为 timeline。</p>
      {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
      <form className="editor-grid" onSubmit={handleSubmit}>
        <label>年份或时间<input type="text" placeholder="例如 2024 或 2024-06" value={form.date_label || ''} onChange={(event) => setField('date_label', event.target.value)} /></label>
        <label>标题<input type="text" required value={form.title || ''} onChange={(event) => setField('title', event.target.value)} /></label>
        <label className="span-2">内容<textarea rows={4} value={form.content || ''} onChange={(event) => setField('content', event.target.value)} /></label>
        <label>排序<input type="number" value={String(form.sort ?? 0)} onChange={(event) => setField('sort', Number(event.target.value || 0))} /></label>
        <label>状态
          <select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}>
            {itemStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className="form-actions span-2"><button className="primary-link-button" type="submit">保存条目</button></div>
      </form>
      <div className="timeline-list">
        {isLoading ? '正在加载...' : items.length ? items.map((item) => (
          <article className="timeline-item-card" key={item.id}>
            <div>
              <strong>{item.date_label || '未填写时间'}</strong>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
              <small>排序：{String(item.sort ?? 0)} / 状态：{item.status}</small>
            </div>
            <div className="table-actions">
              <button className="text-button" type="button" onClick={() => setForm({ ...emptyTimelineItem(moduleCode), ...item, sort: Number(item.sort || 0), status: item.status || 'enabled' })}>编辑</button>
              <button className="text-button" type="button" onClick={() => disableItem(item.id)}>停用</button>
            </div>
          </article>
        )) : '暂无时间轴条目，请先新增一条发展历程。'}
      </div>
    </section>
  );
}

function PublicPlatformQrManager() {
  const emptyItem = (): PageContentItem => ({
    id: '',
    module_code: publicPlatformQrModuleCode,
    item_type: 'image',
    title: '',
    image: null,
    sort: 0,
    status: 'enabled',
    extra_json: {},
  });
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<PageContentItem>(emptyItem);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.pageContentItems({ module_code: publicPlatformQrModuleCode, item_type: 'image' });
      setItems((result.data || []) as PageContentItem[]);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '二维码配置加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const error = validateImage(file);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await AdminApi.uploadFile(formData);
      const uploaded = (result.data || {}) as UploadPayload;
      if (!uploaded.id) throw new Error('上传成功但未返回文件 ID。');
      setForm((prev) => ({ ...prev, image: uploaded.id }));
      setMessage({ text: '图片上传成功，保存配置后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '图片上传失败。', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const saveItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.image) {
      setMessage({ text: '请先上传二维码图片。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const payload = {
      module_code: publicPlatformQrModuleCode,
      item_type: 'image',
      title: String(form.title || '').trim(),
      image: form.image,
      sort: Number(form.sort) || 0,
      status: form.status || 'enabled',
      extra_json: form.extra_json || {},
    };
    try {
      if (form.id) await AdminApi.updatePageContentItem(form.id, payload);
      else await AdminApi.createPageContentItem(payload);
      setForm(emptyItem());
      setMessage({ text: '二维码配置保存成功。', type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '二维码配置保存失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const disableItem = async (id: string) => {
    try {
      await AdminApi.disablePageContentItem(id);
      if (form.id === id) setForm(emptyItem());
      setMessage({ text: '二维码配置已停用。', type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '停用失败。', type: 'error' });
    }
  };

  return (
    <div className="content-editor-root">
      <form className="editor-card content-form-card" onSubmit={saveItem}>
        <div className="section-title-row">
          <div><p className="eyebrow">全站配置 · {publicPlatformQrModuleCode}</p><h2>公众平台二维码</h2></div>
          <span className="status-badge status-published">多图配置</span>
        </div>
        <p className="form-help-text">可添加多个公众平台二维码；前台浮动工具栏按排序值从小到大横向展示所有启用项。</p>
        {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
        <div className="editor-grid">
          <label>标题<input type="text" required value={form.title || ''} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} /></label>
          <label>排序<input type="number" value={String(form.sort ?? 0)} onChange={(event) => setForm((prev) => ({ ...prev, sort: Number(event.target.value) || 0 }))} /></label>
          <div className="cover-field span-2">
            <label>二维码图片</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB。</p>
            <div className="cover-upload-row"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={isUploading} /></div>
            {form.image ? <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.image)}`} alt="二维码预览" /> : null}
          </div>
          <label>状态<select value={form.status || 'enabled'} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>{itemStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        </div>
        <div className="form-actions">
          <button className="primary-link-button" type="submit" disabled={isSaving || isUploading}>{isSaving ? '正在保存...' : form.id ? '保存修改' : '添加二维码'}</button>
          {form.id ? <button type="button" className="secondary-button" onClick={() => setForm(emptyItem())}>取消编辑</button> : null}
        </div>
      </form>
      <section className="editor-card">
        <div className="section-title-row"><div><p className="eyebrow">已配置项目</p><h2>二维码列表</h2></div></div>
        {isLoading ? <p>正在加载...</p> : items.length ? (
          <div className="timeline-list">{items.map((item) => (
            <article className="timeline-item-card" key={item.id}>
              <div>{item.image ? <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(item.image)}`} alt={item.title || '二维码'} /> : null}<h3>{item.title}</h3><p>排序：{item.sort ?? 0} · 状态：{item.status === 'enabled' ? '启用' : '停用'}</p></div>
              <div className="table-actions"><button type="button" className="text-button" onClick={() => setForm({ ...emptyItem(), ...item })}>编辑</button>{item.status === 'enabled' ? <button type="button" className="text-button" onClick={() => disableItem(item.id)}>停用</button> : null}</div>
            </article>
          ))}</div>
        ) : <p>尚未配置二维码，前台继续使用现有静态二维码。</p>}
      </section>
    </div>
  );
}

const homepageSectionOptions: Array<{ id: HomepageSectionId; label: string }> = [
  { id: 'news', label: '新闻中心' },
  { id: 'culture', label: '企业文化、专题专栏' },
  { id: 'business', label: '业务板块' },
  { id: 'contact', label: '联系与关注' },
];

const homepageScreenOptions: Array<{ id: HomepageScreenId; label: string }> = [
  { id: 'hero', label: '首页顶部 Banner' },
  { id: 'news', label: '新闻中心分屏' },
  { id: 'culture', label: '企业文化、专题专栏分屏' },
  { id: 'business', label: '业务板块分屏' },
  { id: 'contact', label: '联系与关注分屏' },
];

const homepageSectionContentOptions: Array<{ id: HomepageSectionId; label: string }> = [
  { id: 'news', label: '新闻中心' },
  { id: 'culture', label: '企业文化、专题专栏' },
  { id: 'business', label: '业务板块' },
  { id: 'contact', label: '联系与关注' },
];

const homepageImagePreviewUrl = (image: string) => /^(https?:)?\/\//i.test(image) || image.startsWith('/')
  ? image
  : `/admin-api/assets/${encodeURIComponent(image)}`;

const importLatestHomepageArticles = async (): Promise<HomepageBannerSlide[]> => {
  const response = await fetch('/api/public/cms/articles?page=1&pageSize=5', { cache: 'no-store' });
  if (!response.ok) throw new Error('读取最新文章失败');
  const payload = await response.json() as { items?: Array<{ id?: string | number; title?: string; subtitle?: string; summary?: string; cover?: string; publish_at?: string; publishDate?: string }> };
  return (Array.isArray(payload.items) ? payload.items : [])
    .filter((article) => article.id !== undefined && article.id !== null)
    .slice(0, 5)
    .map((article, index) => ({
      id: `article-${String(article.id)}`,
      image: article.cover?.trim() || '/img/index_bg.png',
      title: article.title?.trim() || `首页推荐 ${index + 1}`,
      subtitle: article.subtitle?.trim() || article.summary?.trim() || article.publishDate?.trim() || article.publish_at?.slice(0, 10) || '',
      linkUrl: `/news/${encodeURIComponent(String(article.id))}`,
    }));
};

function ContactInfoManager() {
  const [contactInfo, setContactInfo] = useState<ContactInfoConfig>(defaultContactInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await AdminApi.pageContent(contactInfoModuleCode);
        const content = (result.data || {}) as PageContent;
        const extra = content.extra_json && typeof content.extra_json === 'object' ? content.extra_json : {};
        const saved = extra.contactInfo && typeof extra.contactInfo === 'object'
          ? extra.contactInfo as Partial<ContactInfoConfig>
          : null;
        if (saved) {
          if (mounted) {
            setContactInfo({
              email: typeof saved.email === 'string' ? saved.email : defaultContactInfo.email,
              phone: typeof saved.phone === 'string' ? saved.phone : defaultContactInfo.phone,
              address: typeof saved.address === 'string' ? saved.address : defaultContactInfo.address,
            });
            setHasSavedConfig(Boolean(content.id));
          }
          return;
        }

        const homepageResult = await AdminApi.pageContent(homepageLayoutModuleCode);
        const homepageContent = (homepageResult.data || {}) as PageContent;
        const homepageExtra = homepageContent.extra_json && typeof homepageContent.extra_json === 'object' ? homepageContent.extra_json : {};
        const storedLayout = 'homepageLayout' in homepageExtra ? homepageExtra.homepageLayout : homepageExtra;
        const homepage = normalizeHomepageLayout(storedLayout);
        if (mounted) setContactInfo({ ...defaultContactInfo, address: homepage.contactAddress, phone: homepage.contactPhone });
      } catch (error) {
        if (mounted) setMessage({ text: error instanceof Error ? error.message : '联系信息加载失败。', type: 'error' });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await AdminApi.savePageContent(contactInfoModuleCode, {
        title: '联系我们配置',
        subtitle: '官网联系方式',
        cover: null,
        summary: '维护官网联系邮箱、联系电话和联系地址。',
        content: '',
        extra_json: { contactInfo },
        status: 'published',
      });
      setHasSavedConfig(true);
      setMessage({ text: '联系信息已保存并发布。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存失败，请检查 page_contents 权限。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="editor-card content-form-card" onSubmit={save}>
      <div className="section-title-row"><div><p className="eyebrow">全站配置 · {contactInfoModuleCode}</p><h2>联系我们配置</h2></div><span className="status-badge status-published">复用 page_contents</span></div>
      <p className="form-help-text">维护前台“联系我们”页面及页脚显示的邮箱、电话和地址；配置保存到现有 page_contents.extra_json，不新增数据表。</p>
      {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
      {isLoading ? <p>正在读取联系信息...</p> : <>
        <div className="editor-grid">
          <label>联系邮箱<input type="email" value={contactInfo.email} onChange={(event) => setContactInfo((current) => ({ ...current, email: event.target.value }))} placeholder="请输入联系邮箱（可留空）" /></label>
          <label>联系电话<input type="tel" value={contactInfo.phone} onChange={(event) => setContactInfo((current) => ({ ...current, phone: event.target.value }))} placeholder="请输入联系电话" /></label>
          <label className="span-2">联系地址<input value={contactInfo.address} onChange={(event) => setContactInfo((current) => ({ ...current, address: event.target.value }))} placeholder="请输入联系地址" /></label>
        </div>
        {!hasSavedConfig ? <p className="field-tip">当前显示兼容默认值；首次保存后会创建并发布联系我们配置。</p> : null}
        <div className="form-actions"><button className="primary-link-button" type="submit" disabled={isSaving}>{isSaving ? '正在保存...' : '保存并发布'}</button></div>
      </>}
    </form>
  );
}

function HomepageLayoutManager() {
  const [activeConfigTab, setActiveConfigTab] = useState<'banner' | 'backgrounds' | 'content' | 'contact' | 'layout'>('banner');
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [previewBackgroundScreen, setPreviewBackgroundScreen] = useState<HomepageScreenId>('hero');
  const [config, setConfig] = useState<HomepageLayoutConfig>(defaultHomepageLayout);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState('');

  useEffect(() => {
    let mounted = true;
    AdminApi.pageContent(homepageLayoutModuleCode).then((result) => {
      if (!mounted) return;
      const content = (result.data || {}) as PageContent;
      const extra = content.extra_json && typeof content.extra_json === 'object' ? content.extra_json : {};
      const stored = 'homepageLayout' in extra ? extra.homepageLayout : null;
      if (stored) {
        const normalized = normalizeHomepageLayout(stored);
        setConfig(normalized);
        setHasSavedConfig(true);
        if (!stored || typeof stored !== 'object' || !('bannerSlides' in stored)) {
          importLatestHomepageArticles().then((importedSlides) => {
            if (!mounted || normalized.bannerSlides.length || !importedSlides.length) return;
            setConfig((current) => ({ ...current, bannerSlides: importedSlides }));
            setMessage({ text: `已将当前最新 ${importedSlides.length} 篇文章导入首页 Banner 初始配置；请检查后点击“保存并发布配置”写入配置。之后轮播将按已保存的 Banner 列表展示，不会自动替换。`, type: 'success' });
          }).catch(() => {
            if (mounted) setMessage({ text: '旧配置中没有 Banner 列表，但未能读取最新文章；可手动添加 Banner。', type: 'error' });
          });
        }
      } else {
        importLatestHomepageArticles().then((importedSlides) => {
          if (!mounted || !importedSlides.length) return;
          setConfig((current) => current.bannerSlides.length ? current : { ...current, bannerSlides: importedSlides });
          setMessage({ text: `已将当前最新 ${importedSlides.length} 篇文章导入首页 Banner 初始配置；请检查后点击“写入初始配置并发布”。之后轮播将按已保存的 Banner 列表展示，不会自动替换。`, type: 'success' });
        }).catch(() => {
          if (mounted) setMessage({ text: '未能读取最新文章；可手动添加 Banner。', type: 'error' });
        });
      }
    }).catch((error) => {
      if (mounted) setMessage({ text: error instanceof Error ? error.message : '首页配置加载失败。', type: 'error' });
    }).finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (config.bannerSlides.some((slide) => !slide.image)) {
      setMessage({ text: '请为每张新增的 Banner 上传图片，或移除未完成的项目后再保存。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      await AdminApi.savePageContent(homepageLayoutModuleCode, {
        title: '首页界面配置', subtitle: '首页分屏布局与展示选项', cover: null,
        summary: '管理首页首屏轮播标语、分屏顺序及展示状态。', content: '',
        extra_json: { homepageLayout: normalizeHomepageLayout(config) }, status: 'published',
      });
      setConfig(normalizeHomepageLayout(config));
      setHasSavedConfig(true);
      setMessage({ text: '首页界面配置已保存并发布。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存失败，请检查 page_contents 权限。', type: 'error' });
    } finally { setIsSaving(false); }
  };

  const moveSection = (id: HomepageSectionId, direction: -1 | 1) => {
    const index = config.sectionOrder.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= config.sectionOrder.length) return;
    const sectionOrder = [...config.sectionOrder];
    [sectionOrder[index], sectionOrder[nextIndex]] = [sectionOrder[nextIndex], sectionOrder[index]];
    setConfig((current) => ({ ...current, sectionOrder }));
  };

  const toggleSection = (id: HomepageSectionId) => {
    setConfig((current) => ({ ...current, hiddenSections: current.hiddenSections.includes(id)
      ? current.hiddenSections.filter((item) => item !== id)
      : [...current.hiddenSections, id] }));
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>, target: string, onUploaded: (id: string) => void) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const validationMessage = validateImage(file);
    if (validationMessage) {
      setMessage({ text: validationMessage, type: 'error' });
      return;
    }
    setUploadingTarget(target);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await AdminApi.uploadFile(formData);
      const uploaded = (result.data || {}) as UploadPayload;
      if (!uploaded.id) throw new Error('上传成功但未返回文件 ID。');
      onUploaded(uploaded.id);
      setMessage({ text: '图片已上传；保存首页配置后才会在前台生效。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '图片上传失败，请确认文件服务可用。', type: 'error' });
    } finally {
      setUploadingTarget('');
    }
  };

  const updateSlide = (id: string, patch: Partial<HomepageBannerSlide>) => {
    setConfig((current) => ({ ...current, bannerSlides: current.bannerSlides.map((slide) => slide.id === id ? { ...slide, ...patch } : slide) }));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= config.bannerSlides.length) return;
    const bannerSlides = [...config.bannerSlides];
    [bannerSlides[index], bannerSlides[targetIndex]] = [bannerSlides[targetIndex], bannerSlides[index]];
    setConfig((current) => ({ ...current, bannerSlides }));
  };

  const updateSectionContent = (id: HomepageSectionId, patch: Partial<HomepageLayoutConfig['sectionContent'][HomepageSectionId]>) => {
    setConfig((current) => ({ ...current, sectionContent: { ...current.sectionContent, [id]: { ...current.sectionContent[id], ...patch } } }));
  };

  const selectedBannerIndex = Math.min(activeBannerIndex, Math.max(0, config.bannerSlides.length - 1));
  const selectedBanner = config.bannerSlides[selectedBannerIndex];
  const previewImage = activeConfigTab === 'backgrounds'
    ? config.backgrounds[previewBackgroundScreen]
    : selectedBanner?.image || config.backgrounds.hero;
  const previewTitle = activeConfigTab === 'backgrounds'
    ? homepageScreenOptions.find((screen) => screen.id === previewBackgroundScreen)?.label || '首页预览'
    : selectedBanner?.title || config.heroTitle;
  const previewSubtitle = activeConfigTab === 'backgrounds'
    ? '背景图预览'
    : selectedBanner?.subtitle || config.heroSubtitle;

  return (
    <form className="editor-card content-form-card homepage-config-form" onSubmit={save}>
      <div className="section-title-row homepage-config-heading"><div><p className="eyebrow">首页配置 · {homepageLayoutModuleCode}</p><h2>首页界面配置</h2></div><span className="status-badge status-published">复用 page_contents</span></div>
      <p className="form-help-text">首页配置已分区收纳；编辑内容会同步显示在右侧小窗，保存发布后生效。{!hasSavedConfig ? ' 当前尚无已保存配置，下面显示可直接保存的初始配置。' : ''}</p>
      {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
      {isLoading ? <p>正在读取配置...</p> : <>
        <nav className="homepage-config-tabs" aria-label="首页配置分区">
          {([
            ['banner', '首屏 Banner'], ['backgrounds', '分屏背景'], ['content', '文字与数量'], ['contact', '联系与关注'], ['layout', '分屏布局'],
          ] as const).map(([id, label]) => <button type="button" key={id} className={activeConfigTab === id ? 'is-active' : ''} onClick={() => setActiveConfigTab(id)}>{label}</button>)}
        </nav>
        <div className="homepage-admin-layout">
          <div className="homepage-admin-editor">
            {activeConfigTab === 'banner' ? <>
              <section className="homepage-section-settings homepage-compact-section">
                <div className="section-title-row"><div><h3>首页顶部 Banner 与跳转</h3><p className="field-tip">保存后按此列表轮播，不会随新文章自动替换。</p></div>
                  <button className="secondary-button" type="button" onClick={() => { setConfig((current) => ({ ...current, bannerSlides: [...current.bannerSlides, { id: `banner-${Date.now()}-${current.bannerSlides.length}`, image: '', title: '', subtitle: '', linkUrl: '' }] })); setActiveBannerIndex(config.bannerSlides.length); }}>添加</button>
                </div>
                {config.bannerSlides.length ? <>
                  <div className="homepage-banner-picker" role="tablist" aria-label="选择 Banner">{config.bannerSlides.map((slide, index) => <button type="button" role="tab" aria-selected={selectedBannerIndex === index} className={selectedBannerIndex === index ? 'is-active' : ''} key={slide.id} onClick={() => setActiveBannerIndex(index)}><span>{index + 1}</span>{slide.title || '未命名 Banner'}</button>)}</div>
                  {selectedBanner ? <article className="homepage-banner-editor homepage-selected-banner">
                    <div className="homepage-banner-order"><strong>Banner {selectedBannerIndex + 1}</strong><button className="secondary-button" type="button" disabled={selectedBannerIndex === 0} onClick={() => moveSlide(selectedBannerIndex, -1)}>上移</button><button className="secondary-button" type="button" disabled={selectedBannerIndex === config.bannerSlides.length - 1} onClick={() => moveSlide(selectedBannerIndex, 1)}>下移</button><button className="text-button" type="button" onClick={() => { setConfig((current) => ({ ...current, bannerSlides: current.bannerSlides.filter((item) => item.id !== selectedBanner.id) })); setActiveBannerIndex(Math.max(0, selectedBannerIndex - 1)); }}>移除</button></div>
                    <div className="homepage-banner-fields">
                      <div className="homepage-banner-image">{selectedBanner.image ? <img src={homepageImagePreviewUrl(selectedBanner.image)} alt="Banner 预览" /> : <div className="homepage-background-empty">请上传图片</div>}
                        <label className="secondary-button">{uploadingTarget === `banner:${selectedBanner.id}` ? '正在上传…' : selectedBanner.image ? '更换图片' : '上传图片'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={Boolean(uploadingTarget)} onChange={(event) => uploadImage(event, `banner:${selectedBanner.id}`, (id) => updateSlide(selectedBanner.id, { image: id }))} /></label>
                      </div>
                      <div className="editor-grid"><label>标题<input value={selectedBanner.title} onChange={(event) => updateSlide(selectedBanner.id, { title: event.target.value })} /></label><label>副标题<input value={selectedBanner.subtitle} onChange={(event) => updateSlide(selectedBanner.id, { subtitle: event.target.value })} /></label><label className="span-2">跳转地址<input type="text" placeholder="/news/文章ID 或 https://example.com" value={selectedBanner.linkUrl} onChange={(event) => updateSlide(selectedBanner.id, { linkUrl: event.target.value })} /><small>支持站内路径或 http/https 链接。</small></label></div>
                    </div>
                  </article> : null}
                </> : <p className="home-empty">暂无 Banner。首次进入配置时如能读取到最新文章，会先预填在这里。</p>}
              </section>
              <section className="homepage-section-settings homepage-compact-section"><h3>首屏文案与轮播</h3><div className="editor-grid homepage-compact-grid">
                <label>英文标识<input value={config.heroEyebrow} onChange={(event) => setConfig((current) => ({ ...current, heroEyebrow: event.target.value }))} /></label>
                <label>轮播间隔（毫秒）<input type="number" min={2000} max={20000} step={500} value={config.carouselInterval} onChange={(event) => setConfig((current) => ({ ...current, carouselInterval: Number(event.target.value) || 6000 }))} /></label>
                <label>首屏主标题<input value={config.heroTitle} onChange={(event) => setConfig((current) => ({ ...current, heroTitle: event.target.value }))} /></label>
                <label>首屏副标题<input value={config.heroSubtitle} onChange={(event) => setConfig((current) => ({ ...current, heroSubtitle: event.target.value }))} /></label>
              </div></section>
            </> : null}

            {activeConfigTab === 'backgrounds' ? <section className="homepage-section-settings homepage-compact-section"><h3>各分屏背景图片</h3><p className="field-tip">选择一项可在右侧预览；上传后保存配置即可生效。</p><div className="homepage-background-grid homepage-background-grid--compact">{homepageScreenOptions.map((screen) => {
              const imageId = config.backgrounds[screen.id];
              const target = `background:${screen.id}`;
              return <article className={`homepage-background-card${previewBackgroundScreen === screen.id ? ' is-selected' : ''}`} key={screen.id}>
                <button type="button" className="homepage-background-select" onClick={() => setPreviewBackgroundScreen(screen.id)}>{imageId ? <img src={homepageImagePreviewUrl(imageId)} alt="" /> : <span className="homepage-background-empty">未设置</span>}<strong>{screen.label}</strong></button>
                <div className="homepage-background-actions"><label className="secondary-button">{uploadingTarget === target ? '上传中…' : imageId ? '更换' : '上传'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={Boolean(uploadingTarget)} onChange={(event) => uploadImage(event, target, (id) => setConfig((current) => ({ ...current, backgrounds: { ...current.backgrounds, [screen.id]: id } })))} /></label>{imageId ? <button className="text-button" type="button" onClick={() => setConfig((current) => ({ ...current, backgrounds: { ...current.backgrounds, [screen.id]: '' } }))}>清除</button> : null}</div>
              </article>;
            })}</div></section> : null}

            {activeConfigTab === 'content' ? <section className="homepage-section-settings homepage-compact-section"><h3>首页分屏文字与展示数量</h3><p className="field-tip">文案应用到对应分屏；文章和板块仍由现有 API 提供。</p><div className="homepage-copy-settings homepage-copy-settings--compact">{homepageSectionContentOptions.map((section) => <article className="homepage-banner-editor" key={section.id}>
              <strong>{section.label}</strong><div className="homepage-copy-fields"><label>英文标识<input value={config.sectionContent[section.id].eyebrow} onChange={(event) => updateSectionContent(section.id, { eyebrow: event.target.value })} /></label><label>标题<input value={config.sectionContent[section.id].title} onChange={(event) => updateSectionContent(section.id, { title: event.target.value })} /></label><label className="span-2">副标题<input value={config.sectionContent[section.id].subtitle} onChange={(event) => updateSectionContent(section.id, { subtitle: event.target.value })} /></label></div>
            </article>)}</div><div className="editor-grid homepage-display-counts homepage-compact-grid">
              <label>新闻条数<input type="number" min={1} max={12} value={config.newsItemCount} onChange={(event) => setConfig((current) => ({ ...current, newsItemCount: Number(event.target.value) || 5 }))} /></label><label>专题条数<input type="number" min={1} max={12} value={config.cultureItemCount} onChange={(event) => setConfig((current) => ({ ...current, cultureItemCount: Number(event.target.value) || 6 }))} /></label><label>业务板块数<input type="number" min={1} max={12} value={config.businessItemCount} onChange={(event) => setConfig((current) => ({ ...current, businessItemCount: Number(event.target.value) || 6 }))} /></label>
            </div></section> : null}

            {activeConfigTab === 'contact' ? <section className="homepage-section-settings homepage-compact-section"><h3>首页联系与关注展示</h3><div className="editor-grid homepage-compact-grid">
              <label className="span-2">网站备案号<input value={config.icpRecordNumber} onChange={(event) => setConfig((current) => ({ ...current, icpRecordNumber: event.target.value }))} /><small>留空则不显示备案链接。</small></label>
              <label className="homepage-switch"><input type="checkbox" checked={config.showQuickLinks} onChange={(event) => setConfig((current) => ({ ...current, showQuickLinks: event.target.checked }))} />显示友情链接</label><label className="homepage-switch"><input type="checkbox" checked={config.showQrs} onChange={(event) => setConfig((current) => ({ ...current, showQrs: event.target.checked }))} />显示二维码列表</label>
            </div><p className="field-tip">邮箱、电话和地址统一在“全站配置 → 联系我们配置”维护；友情链接与二维码仍在“全站配置”维护。</p></section> : null}

            {activeConfigTab === 'layout' ? <section className="homepage-section-settings homepage-compact-section"><h3>分屏顺序与显示</h3>{config.sectionOrder.map((id, index) => <div className="homepage-section-row" key={id}>
              <label><input type="checkbox" checked={!config.hiddenSections.includes(id)} onChange={() => toggleSection(id)} />{homepageSectionOptions.find((item) => item.id === id)?.label}</label><div><button type="button" className="secondary-button" disabled={index === 0} onClick={() => moveSection(id, -1)}>上移</button><button type="button" className="secondary-button" disabled={index === config.sectionOrder.length - 1} onClick={() => moveSection(id, 1)}>下移</button></div>
            </div>)}</section> : null}

            <div className="form-actions homepage-save-actions"><button className="primary-link-button" type="submit" disabled={isSaving || isLoading || Boolean(uploadingTarget)}>{isSaving ? '正在保存...' : hasSavedConfig ? '保存并发布配置' : '写入初始配置并发布'}</button></div>
          </div>
          <aside className="homepage-preview-panel"><div className="homepage-preview-heading"><strong>实时小窗预览</strong><span>未保存</span></div><div className="homepage-preview-window" style={previewImage ? { backgroundImage: `linear-gradient(90deg,rgba(3,18,37,.78),rgba(3,18,37,.18)),url("${homepageImagePreviewUrl(previewImage)}")` } : undefined}><span>{activeConfigTab === 'backgrounds' ? previewTitle : config.heroEyebrow}</span><h3>{activeConfigTab === 'backgrounds' ? '背景效果' : previewTitle}</h3><p>{previewSubtitle}</p><b>首页　新闻中心　业务板块　→</b></div><p className="field-tip">预览反映当前编辑值，保存后前台生效。正式比例与滚动效果请在首页查看。</p></aside>
        </div>
      </>}
    </form>
  );
}

function ContentModuleEditor({ module }: { module: PageModule | null }) {
  if (!module) {
    return (
      <section className="notice-card">
        <p className="eyebrow">请选择页面</p>
        <h2>从左侧选择一个二级页面</h2>
        <p>后台会根据该模块的 <code>content_type</code> 显示对应维护表单；尚未开放的模块会显示“正在开发中”。</p>
      </section>
    );
  }

  if (module.module_code === publicPlatformQrModuleCode) return <PublicPlatformQrManager />;
  if (module.module_code === homepageLayoutModuleCode) return <HomepageLayoutManager />;
  if (module.module_code === contactInfoModuleCode) return <ContactInfoManager />;
  if (module.module_code === trainingResourceModuleCode) return <TrainingResourceManager />;

  if (!module.admin_enabled) {
    return (
      <section className="notice-card developing-card">
        <p className="eyebrow">{module.parent_title}</p>
        <h2>{module.module_title}</h2>
        <p>{module.placeholder_text || '该模块正在开发中'}</p>
      </section>
    );
  }

  if (module.module_code === 'group-history' || module.content_type === 'timeline') {
    return (
      <>
        <PageContentForm module={module} />
        <TimelineManager module={module} />
      </>
    );
  }

  if (module.module_code === 'leaders' && module.content_type === 'leader_list') {
    return <LeadershipManager />;
  }

  if (module.module_code === honorsModuleCode || module.content_type === 'honor_list') {
    return <HonorManager />;
  }

  if (module.module_code === 'org-chart' || module.content_type === 'image_text' || module.content_type === 'org_chart') {
    return <PageContentForm module={module} options={{ showCover: true, showSubtitle: false, showSummary: module.module_code !== 'org-chart' }} />;
  }

  if (module.module_code === 'group-intro' || module.content_type === 'single_page' || module.content_type === 'contact_info') {
    return <PageContentForm module={module} options={{ showCover: module.content_type !== 'contact_info' }} />;
  }

  if (module.content_type === 'article_list') {
    return (
      <section className="notice-card">
        <p className="eyebrow">{module.content_type}</p>
        <h2>内容来源于新闻管理</h2>
        <p>该模块使用新闻管理中的文章列表，对应栏目 slug：{getArticleChannelSlug(module) || '未配置'}。</p>
        <a className="primary-link-button" href={`/admin/articles?channel=${encodeURIComponent(getArticleChannelSlug(module))}`}>前往新闻管理</a>
      </section>
    );
  }

  if (module.content_type === 'company_list') {
    return <section className="notice-card"><p className="eyebrow">{module.content_type}</p><h2>下属公司数据预留</h2><p>该模块内容来源于下属公司数据，第一阶段保留入口，不影响新闻管理。</p></section>;
  }

  if (module.content_type === 'sector_list') {
    return <BusinessSectorManager />;
  }

  return (
    <section className="notice-card developing-card">
      <p className="eyebrow">{module.parent_title}</p>
      <h2>{module.module_title}</h2>
      <p>{module.placeholder_text || '该模块正在开发中'}</p>
    </section>
  );
}

export function ContentManagerPage() {
  const [tree, setTree] = useState<PageModuleGroup[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [selectedModule, setSelectedModule] = useState<PageModule | null>(null);
  const [message, setMessage] = useState<MessageState | null>(null);

  const selectModule = async (moduleCode: string) => {
    setSelectedCode(moduleCode);
    setMessage(null);
    setSelectedModule(null);
    if (moduleCode === honorsModuleCode) {
      setSelectedModule(honorsModule);
      return;
    }
    if ([publicPlatformQrModuleCode, homepageLayoutModuleCode, contactInfoModuleCode, trainingResourceModuleCode].includes(moduleCode)) {
      const module = moduleCode === homepageLayoutModuleCode
        ? homepageLayoutModule
        : moduleCode === contactInfoModuleCode
          ? contactInfoModule
          : moduleCode === trainingResourceModuleCode
            ? trainingResourceModule
            : publicPlatformQrModule;
      setSelectedModule(module);
      return;
    }
    try {
      const result = await AdminApi.contentModule(moduleCode);
      const module = (result.data || null) as PageModule | null;
      if (module) {
        const mergedNewsHref = getMergedNewsAdminHref(module);
        if (mergedNewsHref) {
          window.location.href = mergedNewsHref;
          return;
        }
      }
      setSelectedModule(module);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '页面模块加载失败。', type: 'error' });
    }
  };

  useEffect(() => {
    let isMounted = true;
    AdminApi.contentModuleTree()
      .then((result) => {
        if (!isMounted) return;
        const rows = withHonorsModule((result.data || []) as PageModuleGroup[]);
        const partyMassIndex = rows.findIndex((group) => group.parent_code === 'party-mass');
        const nextRows = rows.map((group) => ({ ...group, children: [...(group.children || group.modules || [])] }));
        if (partyMassIndex >= 0) {
          const group = nextRows[partyMassIndex];
          if (!group.children?.some((module) => module.module_code === trainingResourceModuleCode)) {
            group.children = [...(group.children || []), trainingResourceModule];
          }
        } else {
          nextRows.push({
            parent_title: trainingResourceModule.parent_title,
            parent_code: trainingResourceModule.parent_code,
            children: [trainingResourceModule],
          });
        }
        setTree([...nextRows, {
          parent_title: '首页配置',
          parent_code: 'homepage-settings',
          children: [homepageLayoutModule],
        }, {
          parent_title: '全站配置',
          parent_code: 'global-settings',
          children: [publicPlatformQrModule, contactInfoModule],
        }]);
        const moduleCode = new URLSearchParams(window.location.search).get('module') || '';
        if (moduleCode) selectModule(moduleCode);
      })
      .catch((err) => {
        if (!isMounted) return;
        setMessage({ text: err instanceof Error ? err.message : '页面内容管理初始化失败。', type: 'error' });
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="content-admin-content">
      <aside className="content-module-sidebar" aria-label="官网一级目录和二级页面">
        <div className="content-sidebar-head">
          <p className="eyebrow">官网目录</p>
          <h2>页面目录</h2>
        </div>
        <div className="content-sidebar-tree">
          {tree.length ? tree.map((group, index) => (
            <details className="content-tree-group" open={index === 0 || Boolean(group.children?.some((module) => module.module_code === selectedCode))} key={group.parent_code || index}>
              <summary>{group.parent_title || group.parent_code || '未分组'}</summary>
              <div className="content-tree-children">
                {(group.children || []).map((module) => (
                  <button
                    className={`content-module-button${selectedCode === module.module_code ? ' is-active' : ''}`}
                    type="button"
                    key={module.module_code || module.id}
                    onClick={() => module.module_code && selectModule(module.module_code)}
                  >
                    <span>{module.module_title || module.module_code}</span>
                    <small>{module.admin_enabled ? module.content_type : '正在开发中'}</small>
                  </button>
                ))}
              </div>
            </details>
          )) : '正在加载目录...'}
        </div>
      </aside>

      <section className="content-editor-panel" aria-live="polite">
        {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
        <div className="content-editor-root">
          <ContentModuleEditor module={selectedModule} />
        </div>
      </section>
    </main>
  );
}
