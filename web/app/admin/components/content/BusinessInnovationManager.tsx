'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { MessageState, PageContentItem, UploadPayload } from './types';

const moduleCode = 'business-innovation';
const innovationItemType = 'innovation';
const categoryItemType = 'innovation_category';
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageBytes = 50 * 1024 * 1024;
const slugPattern = /^[a-z0-9][a-z0-9-]*$/;

const emptyInnovation = (): PageContentItem => ({
  id: '',
  module_code: moduleCode,
  item_type: innovationItemType,
  title: '',
  subtitle: '',
  date_label: '',
  image: null,
  content: '',
  link_url: '',
  sort: 0,
  status: 'enabled',
  extra_json: {},
});

const emptyCategory = (): PageContentItem => ({
  id: '',
  module_code: moduleCode,
  item_type: categoryItemType,
  title: '',
  subtitle: '',
  date_label: '',
  image: null,
  content: '',
  link_url: '',
  sort: 0,
  status: 'enabled',
  extra_json: {},
});

const extraOf = (value: PageContentItem['extra_json']): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return {};
};

const textOf = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
const plainText = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const coverSrc = (cover?: string | null) => {
  const value = String(cover || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|\/)/i.test(value)) return value;
  return `/admin-api/assets/${encodeURIComponent(value)}`;
};

const categoryOf = (item: PageContentItem, categories: PageContentItem[]) => {
  const extra = extraOf(item.extra_json);
  const rawSlug = textOf(extra.category_slug);
  const legacyName = textOf(extra.category);
  const matched = categories.find((category) => textOf(category.subtitle) === rawSlug)
    || categories.find((category) => textOf(category.title) === legacyName);
  return {
    slug: textOf(matched?.subtitle) || rawSlug,
    name: textOf(matched?.title) || legacyName || '未分类',
  };
};

export function BusinessInnovationManager() {
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [categories, setCategories] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<PageContentItem>(emptyInnovation);
  const [categoryForm, setCategoryForm] = useState<PageContentItem>(emptyCategory);
  const [categorySlug, setCategorySlug] = useState('');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [itemResult, categoryResult] = await Promise.all([
        AdminApi.pageContentItems({ module_code: moduleCode, item_type: innovationItemType, limit: 500 }),
        AdminApi.pageContentItems({ module_code: moduleCode, item_type: categoryItemType, limit: 500 }),
      ]);
      const nextCategories = (categoryResult.data || []) as PageContentItem[];
      setItems((itemResult.data || []) as PageContentItem[]);
      setCategories(nextCategories);
      setCategorySlug((current) => current || textOf(nextCategories.find((category) => category.status !== 'disabled')?.subtitle));
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '科技创新内容加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, []);

  const setField = (field: keyof PageContentItem, value: string | number | null) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setCategoryField = (field: keyof PageContentItem, value: string | number) => {
    setCategoryForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyInnovation());
    setCategorySlug(textOf(categories.find((category) => category.status !== 'disabled')?.subtitle));
    setSlug('');
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategory());
  };

  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!imageTypes.includes(file.type)) {
      setMessage({ text: '创新成果图片仅支持 JPG、PNG、WEBP 格式。', type: 'error' });
      input.value = '';
      return;
    }
    if (file.size > maxImageBytes) {
      setMessage({ text: '创新成果图片大小不能超过 50MB。', type: 'error' });
      input.value = '';
      return;
    }
    setIsUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await AdminApi.uploadFile(body);
      const payload = (result.data || {}) as UploadPayload;
      if (!payload.id) throw new Error('图片上传成功但未返回文件 ID。');
      setField('image', payload.id);
      setMessage({ text: '创新成果图片已上传，保存后生效。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '创新成果图片上传失败，请确认文件服务和当前账号权限。', type: 'error' });
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    const name = textOf(categoryForm.title).trim();
    const categorySlugValue = textOf(categoryForm.subtitle).trim();
    if (!name) {
      setMessage({ text: '请填写分类名称。', type: 'error' });
      return;
    }
    if (!categorySlugValue) {
      setMessage({ text: '请填写分类标识。', type: 'error' });
      return;
    }
    if (!slugPattern.test(categorySlugValue)) {
      setMessage({ text: '分类标识只能使用小写字母、数字和连字符。', type: 'error' });
      return;
    }
    const duplicated = categories.some((category) => (
      textOf(category.subtitle) === categorySlugValue && category.id !== categoryForm.id
    ));
    if (duplicated) {
      setMessage({ text: '分类标识已存在，请更换后再保存。', type: 'error' });
      return;
    }

    setIsSavingCategory(true);
    setMessage(null);
    const payload = {
      module_code: moduleCode,
      item_type: categoryItemType,
      title: name,
      subtitle: categorySlugValue,
      content: textOf(categoryForm.content),
      sort: Number(categoryForm.sort || 0),
      status: categoryForm.status || 'enabled',
      extra_json: {},
    };
    try {
      if (categoryForm.id) await AdminApi.updatePageContentItem(categoryForm.id, payload);
      else await AdminApi.createPageContentItem(payload);
      setMessage({ text: categoryForm.id ? '成果分类已保存。' : '成果分类已新增。', type: 'success' });
      resetCategoryForm();
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存成果分类失败，请稍后重试。', type: 'error' });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const editCategory = (item: PageContentItem) => {
    setCategoryForm({
      ...emptyCategory(),
      ...item,
      sort: Number(item.sort || 0),
      status: item.status || 'enabled',
    });
    setMessage(null);
  };

  const categoryPayloadOf = (item: PageContentItem, overrides: Partial<PageContentItem> = {}) => {
    const next = { ...item, ...overrides };
    return {
      module_code: moduleCode,
      item_type: categoryItemType,
      title: textOf(next.title).trim(),
      subtitle: textOf(next.subtitle).trim(),
      content: textOf(next.content),
      sort: Number(next.sort || 0),
      status: next.status || 'enabled',
      extra_json: {},
    };
  };

  const toggleCategory = async (item: PageContentItem) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    if (nextStatus === 'disabled' && !window.confirm('确认停用该成果分类？停用后前台分类筛选将不再显示该分类。')) return;
    setMessage(null);
    try {
      if (nextStatus === 'disabled') {
        await AdminApi.disablePageContentItem(item.id);
      } else {
        await AdminApi.updatePageContentItem(item.id, categoryPayloadOf(item, { status: 'enabled' }));
      }
      setMessage({ text: nextStatus === 'enabled' ? '该成果分类已启用。' : '该成果分类已停用。', type: 'success' });
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '更新成果分类状态失败，请稍后重试。', type: 'error' });
    }
  };

  const removeCategory = async (item: PageContentItem) => {
    const count = items.filter((achievement) => categoryOf(achievement, categories).slug === textOf(item.subtitle)).length;
    if (count) {
      setMessage({ text: `该分类下仍有 ${count} 条成果，请先调整成果分类后再删除。`, type: 'error' });
      return;
    }
    if (!window.confirm(`确认删除分类“${item.title || '该成果分类'}”？删除后不可恢复，只想在前台隐藏请改用停用。`)) return;
    setMessage(null);
    try {
      await AdminApi.deletePageContentItem(item.id);
      if (categoryForm.id === item.id) resetCategoryForm();
      if (categorySlug === textOf(item.subtitle)) setCategorySlug('');
      setMessage({ text: '该成果分类已删除。', type: 'success' });
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '删除成果分类失败。', type: 'error' });
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const title = textOf(form.title).trim();
    const slugValue = slug.trim();
    const selectedCategory = categories.find((category) => textOf(category.subtitle) === categorySlug);
    if (!title) {
      setMessage({ text: '请填写创新成果名称。', type: 'error' });
      return;
    }
    if (!selectedCategory) {
      setMessage({ text: '请先选择成果分类；如无分类，请先在“成果分类”中新增。', type: 'error' });
      return;
    }
    if (!slugValue) {
      setMessage({ text: '请填写创新标识。', type: 'error' });
      return;
    }
    if (!slugPattern.test(slugValue)) {
      setMessage({ text: '创新标识只能使用小写字母、数字和连字符。', type: 'error' });
      return;
    }
    const duplicated = items.some((item) => {
      const itemSlug = textOf(extraOf(item.extra_json).slug);
      return itemSlug === slugValue && item.id !== form.id;
    });
    if (duplicated) {
      setMessage({ text: '创新标识已存在，请更换后再保存。', type: 'error' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const payload = {
      module_code: moduleCode,
      item_type: innovationItemType,
      title,
      subtitle: textOf(form.subtitle).trim(),
      image: form.image || null,
      content: textOf(form.content),
      sort: Number(form.sort || 0),
      status: form.status || 'enabled',
      extra_json: {
        category_slug: categorySlug,
        category: textOf(selectedCategory.title).trim(),
        slug: slugValue,
      },
    };
    try {
      if (form.id) await AdminApi.updatePageContentItem(form.id, payload);
      else await AdminApi.createPageContentItem(payload);
      setMessage({ text: form.id ? '创新成果已保存。' : '创新成果已新增。', type: 'success' });
      resetForm();
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存创新成果失败，请稍后重试。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (item: PageContentItem) => {
    const extra = extraOf(item.extra_json);
    const category = categoryOf(item, categories);
    setForm({
      ...emptyInnovation(),
      ...item,
      sort: Number(item.sort || 0),
      status: item.status || 'enabled',
      extra_json: extra,
    });
    setCategorySlug(category.slug);
    setSlug(textOf(extra.slug));
    setMessage(null);
  };

  const payloadOf = (item: PageContentItem, overrides: Partial<PageContentItem> = {}) => {
    const next = { ...item, ...overrides };
    const extra = extraOf(next.extra_json);
    const category = categoryOf(item, categories);
    return {
      module_code: moduleCode,
      item_type: innovationItemType,
      title: textOf(next.title).trim(),
      subtitle: textOf(next.subtitle).trim(),
      image: next.image || null,
      content: textOf(next.content),
      sort: Number(next.sort || 0),
      status: next.status || 'enabled',
      extra_json: {
        category_slug: category.slug,
        category: category.name === '未分类' ? '' : category.name,
        slug: textOf(extra.slug),
      },
    };
  };

  const removeAchievement = async (item: PageContentItem) => {
    if (!window.confirm(`确认删除“${item.title || '该创新成果'}”？删除后不可恢复，只想在前台隐藏请改用停用。`)) return;
    setMessage(null);
    try {
      await AdminApi.deletePageContentItem(item.id);
      if (form.id === item.id) resetForm();
      setMessage({ text: '该创新成果已删除。', type: 'success' });
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '删除创新成果失败。', type: 'error' });
    }
  };

  const toggleStatus = async (item: PageContentItem) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    if (nextStatus === 'disabled' && !window.confirm('确认停用这条创新成果？停用后将不再显示在前台。')) return;
    setMessage(null);
    try {
      if (nextStatus === 'disabled') {
        await AdminApi.disablePageContentItem(item.id);
      } else {
        await AdminApi.updatePageContentItem(item.id, payloadOf(item, { status: 'enabled' }));
      }
      setMessage({ text: nextStatus === 'enabled' ? '该创新成果已启用。' : '该创新成果已停用。', type: 'success' });
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '更新创新成果状态失败，请稍后重试。', type: 'error' });
    }
  };

  return (
    <div className="leadership-admin">
      {message ? <div className={`inline-message ${message.type || ''}`.trim()} role={message.type === 'error' ? 'alert' : undefined}>{message.text}</div> : null}

      <section className="editor-card">
        <div className="section-title-row">
          <div><p className="eyebrow">INNOVATION CATEGORY · page_content_items</p><h2>{categoryForm.id ? '编辑成果分类' : '新增成果分类'}</h2></div>
          {categoryForm.id ? <span className="status-badge status-draft">正在编辑</span> : null}
        </div>
        <p className="form-help-text">先维护创新成果分类，再在成果发布时选择分类。分类与成果均复用页面内容条目，不新增数据库表；停用分类后前台不再显示该分类入口。</p>
        <form className="editor-grid" onSubmit={saveCategory}>
          <label>分类名称<input required maxLength={100} value={categoryForm.title || ''} onChange={(event) => setCategoryField('title', event.target.value)} /></label>
          <label>分类标识<input required readOnly={Boolean(categoryForm.id)} maxLength={100} pattern="[a-z0-9][a-z0-9-]*" placeholder="例如：technical-innovation" value={categoryForm.subtitle || ''} onChange={(event) => setCategoryField('subtitle', event.target.value)} /></label>
          <label>排序<input type="number" step="1" value={String(categoryForm.sort ?? 0)} onChange={(event) => setCategoryField('sort', Number(event.target.value || 0))} /></label>
          <label>状态<select value={categoryForm.status || 'enabled'} onChange={(event) => setCategoryField('status', event.target.value)}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
          <label className="span-2">分类说明<textarea rows={3} maxLength={500} value={categoryForm.content || ''} onChange={(event) => setCategoryField('content', event.target.value)} /></label>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSavingCategory}>{isSavingCategory ? '正在保存…' : categoryForm.id ? '保存分类' : '新增分类'}</button>
            {categoryForm.id ? <button className="secondary-button" type="button" disabled={isSavingCategory} onClick={() => { resetCategoryForm(); setMessage(null); }}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="table-card leadership-list-card">
        <div className="section-title-row"><div><p className="eyebrow">INNOVATION CATEGORIES</p><h2>成果分类列表</h2></div><span className="leadership-list-count">共 {categories.length} 个分类</span></div>
        {isLoading ? <p className="muted-text">正在加载成果分类…</p> : categories.length ? <div className="leadership-admin-list">{categories.map((item) => {
          const categorySlugValue = textOf(item.subtitle);
          const count = items.filter((achievement) => categoryOf(achievement, categories).slug === categorySlugValue).length;
          return (
            <article className="timeline-item-card leadership-admin-item" key={item.id}>
              <div className="leadership-admin-item-copy">
                <div className="leadership-admin-item-heading"><div><h3>{item.title || '未命名分类'}</h3><strong>{categorySlugValue || '未设置标识'} · {count} 条成果</strong></div><span className={`status-badge ${item.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{item.status === 'enabled' ? '启用' : '停用'}</span></div>
                <p>{plainText(String(item.content || '')) || '暂无分类说明。'}</p>
                <small>排序：{Number(item.sort || 0)}</small>
              </div>
              <div className="table-actions leadership-admin-actions">
                <button className="text-button" type="button" onClick={() => editCategory(item)}>编辑</button>
                <button className={`text-button${item.status === 'enabled' ? ' is-danger' : ''}`.trim()} type="button" onClick={() => void toggleCategory(item)}>{item.status === 'enabled' ? '停用' : '启用'}</button>
                <button className="text-button is-danger" type="button" onClick={() => void removeCategory(item)}>删除</button>
              </div>
            </article>
          );
        })}</div> : <div className="navigation-empty"><span>✦</span><strong>暂无成果分类</strong><small>先新增分类，再发布创新成果。</small></div>}
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <div><p className="eyebrow">TECHNOLOGY INNOVATION · page_content_items</p><h2>{form.id ? '编辑创新成果' : '发布创新成果'}</h2></div>
          {form.id ? <span className="status-badge status-draft">正在编辑</span> : null}
        </div>
        <p className="form-help-text">发布业务领域下的企业科技创新成果。请选择已维护的成果分类；名称、标识、简介、图片、详情、排序和启停状态保存在页面内容条目中，前台按分类和排序展示启用成果。</p>
        <form className="editor-grid" onSubmit={save}>
          <label>创新名称<input required maxLength={255} value={form.title || ''} onChange={(event) => setField('title', event.target.value)} /></label>
          <label>成果分类<select required value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)}><option value="">{categories.length ? '请选择成果分类' : '请先新增成果分类'}</option>{categories.map((category) => <option value={textOf(category.subtitle)} key={category.id}>{textOf(category.title)}{category.status === 'disabled' ? '（已停用）' : ''}</option>)}</select></label>
          <label>创新标识<input required maxLength={255} pattern="[a-z0-9][a-z0-9-]*" placeholder="例如：smart-construction" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
          <label>排序<input type="number" step="1" value={String(form.sort ?? 0)} onChange={(event) => setField('sort', Number(event.target.value || 0))} /></label>
          <label>状态<select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
          <div className="span-2 leadership-photo-field">
            <label htmlFor="business-innovation-cover">创新成果图片</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB。未上传时前台显示默认图片。</p>
            <input id="business-innovation-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} disabled={isUploading} />
            {form.image ? (
              <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
                <img src={coverSrc(form.image)} alt="创新成果图片预览" style={{ width: 240, height: 135, objectFit: 'cover', borderRadius: 10, background: 'var(--admin-panel-soft)' }} />
                <button className="text-button is-danger" type="button" onClick={() => setField('image', null)}>清除图片</button>
              </div>
            ) : null}
          </div>
          <label className="span-2">创新简介<textarea rows={4} maxLength={500} value={form.subtitle || ''} onChange={(event) => setField('subtitle', event.target.value)} /></label>
          <label className="span-2">成果详情<textarea rows={8} value={form.content || ''} onChange={(event) => setField('content', event.target.value)} /></label>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving || isUploading || !categories.length}>{isSaving ? '正在保存…' : form.id ? '保存修改' : '发布成果'}</button>
            {form.id ? <button className="secondary-button" type="button" disabled={isSaving} onClick={() => { resetForm(); setMessage(null); }}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="table-card leadership-list-card">
        <div className="section-title-row"><div><p className="eyebrow">TECHNOLOGY INNOVATION</p><h2>创新成果列表</h2></div><span className="leadership-list-count">共 {items.length} 条</span></div>
        {isLoading ? <p className="muted-text">正在加载创新成果…</p> : items.length ? <div className="leadership-admin-list">{items.map((item) => {
          const extra = extraOf(item.extra_json);
          const category = categoryOf(item, categories);
          return (
            <article className="timeline-item-card leadership-admin-item" key={item.id}>
              {coverSrc(item.image)
                ? <img className="leadership-admin-list-photo" src={coverSrc(item.image)} alt="" style={{ flex: '0 0 120px', width: 120, height: 76 }} />
                : <div className="leadership-admin-list-photo is-missing" style={{ flex: '0 0 120px', width: 120, height: 76 }}>◇</div>}
              <div className="leadership-admin-item-copy">
                <div className="leadership-admin-item-heading"><div><h3>{item.title || '未命名创新成果'}</h3><strong>{category.name} · {textOf(extra.slug) || '未设置标识'}</strong></div><span className={`status-badge ${item.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{item.status === 'enabled' ? '启用' : '停用'}</span></div>
                <p>{plainText(String(item.subtitle || item.content || '')) || '暂无创新成果简介。'}</p>
                <small>排序：{Number(item.sort || 0)}</small>
              </div>
              <div className="table-actions leadership-admin-actions">
                <button className="text-button" type="button" onClick={() => edit(item)}>编辑</button>
                <button className={`text-button${item.status === 'enabled' ? ' is-danger' : ''}`.trim()} type="button" onClick={() => void toggleStatus(item)}>{item.status === 'enabled' ? '停用' : '启用'}</button>
                <button className="text-button is-danger" type="button" onClick={() => void removeAchievement(item)}>删除</button>
              </div>
            </article>
          );
        })}</div> : <div className="navigation-empty"><span>✦</span><strong>暂无创新成果</strong><small>新增并启用后，内容会显示在官网“业务领域 / 科技创新”页面。</small></div>}
      </section>
    </div>
  );
}
