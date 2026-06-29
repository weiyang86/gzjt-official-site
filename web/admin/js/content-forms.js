(function () {
  const statusOptions = '<option value="draft">草稿</option><option value="published">已发布</option><option value="archived">已归档</option>';
  const itemStatusOptions = '<option value="enabled">启用</option><option value="disabled">停用</option>';

  const setMessage = (box, message, type) => {
    if (!box) return;
    box.textContent = message;
    box.className = `inline-message ${type || ''}`.trim();
    box.hidden = false;
  };

  const clearMessage = (box) => {
    if (!box) return;
    box.textContent = '';
    box.hidden = true;
  };

  const field = (label, input) => `<label>${label}${input}</label>`;
  const escapeHtml = (value) => String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

  const renderDeveloping = (root, module) => {
    root.innerHTML = `
      <section class="notice-card developing-card">
        <p class="eyebrow">${escapeHtml(module.parent_title)}</p>
        <h2>${escapeHtml(module.module_title)}</h2>
        <p>${escapeHtml(module.placeholder_text || '该模块正在开发中')}</p>
      </section>`;
  };

  const renderSourceNotice = (root, module, title, text, href, buttonText) => {
    root.innerHTML = `
      <section class="notice-card">
        <p class="eyebrow">${escapeHtml(module.content_type)}</p>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(text)}</p>
        ${href ? `<a class="primary-link-button" href="${href}">${escapeHtml(buttonText || '前往管理')}</a>` : ''}
      </section>`;
  };

  const uploadCover = async (fileInput, coverInput, preview, messageBox) => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      setMessage(messageBox, '请选择图片文件。', 'error');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    const result = await window.ContentApi.uploadFile(formData);
    const data = result.data || {};
    coverInput.value = data.id || '';
    if (preview && data.preview_url) {
      preview.src = data.preview_url;
      preview.hidden = false;
    }
    setMessage(messageBox, '图片上传成功。', 'success');
  };

  const renderPageContentForm = async (root, module, options = {}) => {
    const result = await window.ContentApi.pageContent(module.module_code);
    const data = result.data || {};
    const showCover = options.showCover !== false;
    root.innerHTML = `
      <form id="content-page-form" class="editor-card content-form-card">
        <div class="section-title-row"><div><p class="eyebrow">${escapeHtml(module.parent_title)}</p><h2>${escapeHtml(module.module_title)}</h2></div><span class="status-badge status-published">${escapeHtml(module.content_type)}</span></div>
        <div id="content-form-message" class="inline-message" hidden></div>
        <div class="editor-grid">
          ${field('标题', `<input id="content-title" type="text" value="${escapeHtml(data.title)}">`)}
          ${field('副标题', `<input id="content-subtitle" type="text" value="${escapeHtml(data.subtitle)}">`)}
          ${showCover ? `<div class="cover-field span-2"><label for="content-cover-file">封面图 / 图片</label><div class="cover-upload-row"><input id="content-cover-file" type="file" accept="image/jpeg,image/png,image/webp"><button id="content-upload-cover" class="secondary-button" type="button">上传图片</button><input id="content-cover" type="hidden" value="${escapeHtml(data.cover)}"></div><img id="content-cover-preview" class="cover-preview" ${data.cover ? `src="/admin-api/assets/${encodeURIComponent(data.cover)}"` : 'hidden'} alt="图片预览"></div>` : ''}
          <label class="span-2">摘要<textarea id="content-summary" rows="3">${escapeHtml(data.summary)}</textarea></label>
          <label class="span-2">正文 / 说明<textarea id="content-body" class="content-editor" rows="10">${escapeHtml(data.content)}</textarea></label>
          <label>状态<select id="content-status">${statusOptions}</select></label>
        </div>
        <div class="form-actions"><button class="primary-link-button" type="submit">保存内容</button></div>
      </form>`;

    const form = document.getElementById('content-page-form');
    const messageBox = document.getElementById('content-form-message');
    const status = document.getElementById('content-status');
    status.value = data.status || 'draft';
    const coverInput = document.getElementById('content-cover');
    const coverFile = document.getElementById('content-cover-file');
    const coverPreview = document.getElementById('content-cover-preview');
    const uploadButton = document.getElementById('content-upload-cover');
    if (uploadButton) {
      uploadButton.addEventListener('click', () => uploadCover(coverFile, coverInput, coverPreview, messageBox).catch((error) => setMessage(messageBox, error.message || '图片上传失败。', 'error')));
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearMessage(messageBox);
      const payload = {
        title: document.getElementById('content-title').value.trim(),
        subtitle: document.getElementById('content-subtitle').value.trim(),
        cover: coverInput ? coverInput.value : null,
        summary: document.getElementById('content-summary').value.trim(),
        content: document.getElementById('content-body').value,
        extra_json: data.extra_json || {},
        status: status.value
      };
      try {
        await window.ContentApi.savePageContent(module.module_code, payload);
        setMessage(messageBox, '内容已保存。', 'success');
      } catch (error) {
        setMessage(messageBox, error.message || '保存失败。', 'error');
      }
    });
  };

  const itemPayload = (moduleCode, idPrefix) => ({
    module_code: moduleCode,
    item_type: 'timeline',
    date_label: document.getElementById(`${idPrefix}-date`).value.trim(),
    title: document.getElementById(`${idPrefix}-title`).value.trim(),
    content: document.getElementById(`${idPrefix}-content`).value,
    sort: Number(document.getElementById(`${idPrefix}-sort`).value || 0),
    status: document.getElementById(`${idPrefix}-status`).value,
    extra_json: {}
  });

  const renderTimelineItems = async (module, list, messageBox) => {
    const result = await window.ContentApi.items({ module_code: module.module_code });
    const items = result.data || [];
    list.textContent = '';
    if (!items.length) {
      list.textContent = '暂无时间轴条目。';
      return;
    }
    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'timeline-item-card';
      card.innerHTML = `
        <div><strong>${escapeHtml(item.date_label || '未填写时间')}</strong><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p><small>排序：${escapeHtml(item.sort)} / 状态：${escapeHtml(item.status)}</small></div>
        <div class="table-actions"><button class="text-button" data-action="edit" data-id="${item.id}" type="button">编辑</button><button class="text-button" data-action="disable" data-id="${item.id}" type="button">停用</button></div>`;
      card.querySelector('[data-action="edit"]').addEventListener('click', () => {
        document.getElementById('timeline-item-id').value = item.id;
        document.getElementById('timeline-date').value = item.date_label || '';
        document.getElementById('timeline-title').value = item.title || '';
        document.getElementById('timeline-content').value = item.content || '';
        document.getElementById('timeline-sort').value = Number.isFinite(Number(item.sort)) ? String(item.sort) : '0';
        document.getElementById('timeline-status').value = item.status || 'enabled';
      });
      card.querySelector('[data-action="disable"]').addEventListener('click', async () => {
        await window.ContentApi.disableItem(item.id);
        setMessage(messageBox, '条目已停用。', 'success');
        await renderTimelineItems(module, list, messageBox);
      });
      list.appendChild(card);
    });
  };

  const renderTimelineForm = async (root, module) => {
    await renderPageContentForm(root, module, { showCover: false });
    const wrapper = document.createElement('section');
    wrapper.className = 'editor-card timeline-editor-card';
    wrapper.innerHTML = `
      <div class="section-title-row"><div><p class="eyebrow">Timeline</p><h2>时间轴条目</h2></div><button id="timeline-reset" class="secondary-button" type="button">新增条目</button></div>
      <div id="timeline-message" class="inline-message" hidden></div>
      <form id="timeline-form" class="editor-grid">
        <input id="timeline-item-id" type="hidden">
        <label>时间 / 年份<input id="timeline-date" type="text" placeholder="例如 2024"></label>
        <label>标题<input id="timeline-title" type="text" required></label>
        <label class="span-2">内容<textarea id="timeline-content" rows="4"></textarea></label>
        <label>排序<input id="timeline-sort" type="number" value="0"></label>
        <label>状态<select id="timeline-status">${itemStatusOptions}</select></label>
        <div class="form-actions span-2"><button class="primary-link-button" type="submit">保存条目</button></div>
      </form>
      <div id="timeline-list" class="timeline-list">正在加载…</div>`;
    root.appendChild(wrapper);
    const list = document.getElementById('timeline-list');
    const messageBox = document.getElementById('timeline-message');
    const form = document.getElementById('timeline-form');
    const reset = () => {
      document.getElementById('timeline-item-id').value = '';
      form.reset();
      document.getElementById('timeline-sort').value = '0';
      document.getElementById('timeline-status').value = 'enabled';
    };
    document.getElementById('timeline-reset').addEventListener('click', reset);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const id = document.getElementById('timeline-item-id').value;
      const payload = itemPayload(module.module_code, 'timeline');
      try {
        if (id) await window.ContentApi.updateItem(id, payload);
        else await window.ContentApi.createItem(payload);
        setMessage(messageBox, '时间轴条目已保存。', 'success');
        reset();
        await renderTimelineItems(module, list, messageBox);
      } catch (error) {
        setMessage(messageBox, error.message || '保存时间轴条目失败。', 'error');
      }
    });
    await renderTimelineItems(module, list, messageBox);
  };

  window.ContentForms = {
    render: async (root, module) => {
      if (!module.admin_enabled) {
        renderDeveloping(root, module);
        return;
      }
      if (module.content_type === 'single_page' || module.content_type === 'contact_info') {
        await renderPageContentForm(root, module, { showCover: module.content_type !== 'contact_info' });
        return;
      }
      if (module.content_type === 'image_text' || module.content_type === 'org_chart') {
        await renderPageContentForm(root, module, { showCover: true });
        return;
      }
      if (module.content_type === 'timeline') {
        await renderTimelineForm(root, module);
        return;
      }
      if (module.content_type === 'article_list') {
        renderSourceNotice(root, module, '内容来源于新闻管理', `该模块使用新闻管理中的文章列表，建议使用栏目 slug：${module.module_code}。`, `/admin/articles.html?channel=${encodeURIComponent(module.module_code)}`, '前往新闻管理');
        return;
      }
      if (module.content_type === 'company_list') {
        renderSourceNotice(root, module, '下属公司数据预留', '该模块内容来源于下属公司数据，第一阶段保留入口，不影响新闻管理。');
        return;
      }
      if (module.content_type === 'sector_list') {
        renderSourceNotice(root, module, '业务板块数据预留', '该模块内容来源于业务板块数据，具体表单后续接入。');
        return;
      }
      renderDeveloping(root, module);
    }
  };
})();
