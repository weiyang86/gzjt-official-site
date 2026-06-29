(function () {
  const params = new URLSearchParams(window.location.search);
  const articleId = params.get('id');
  const isEdit = Boolean(articleId);
  const topbarUser = document.getElementById('topbar-user');
  const logoutButton = document.getElementById('logout-button');
  const pageTitle = document.getElementById('page-title');
  const form = document.getElementById('article-form');
  const messageBox = document.getElementById('form-message');
  const titleInput = document.getElementById('title');
  const subtitleInput = document.getElementById('subtitle');
  const summaryInput = document.getElementById('summary');
  const channelSelect = document.getElementById('main-channel');
  const statusSelect = document.getElementById('status');
  const sourceInput = document.getElementById('source');
  const authorInput = document.getElementById('author');
  const publishAtInput = document.getElementById('publish-at');
  const contentInput = document.getElementById('content');
  const coverFileInput = document.getElementById('cover-file');
  const uploadCoverButton = document.getElementById('upload-cover');
  const coverIdInput = document.getElementById('cover-id');
  const coverPreviewWrap = document.getElementById('cover-preview-wrap');
  const coverPreview = document.getElementById('cover-preview');
  const clearCoverButton = document.getElementById('clear-cover');
  const draftButtons = [document.getElementById('save-draft'), document.getElementById('save-draft-bottom')];
  const publishButtons = [document.getElementById('publish-article'), document.getElementById('publish-article-bottom')];

  const showMessage = (message, type) => {
    messageBox.textContent = message;
    messageBox.className = `inline-message ${type || ''}`.trim();
    messageBox.hidden = false;
  };

  const toLocalDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const fromLocalDateTime = (value) => {
    if (!value) return new Date().toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  };

  const setBusy = (busy) => {
    [...draftButtons, ...publishButtons].forEach((button) => { button.disabled = busy; });
  };

  const setCoverPreview = (fileId, previewUrl) => {
    coverIdInput.value = fileId || '';
    if (fileId) {
      coverPreview.src = previewUrl || `/admin-api/assets/${encodeURIComponent(fileId)}`;
      coverPreviewWrap.hidden = false;
    } else {
      coverPreview.removeAttribute('src');
      coverPreviewWrap.hidden = true;
    }
  };

  const validateCoverFile = (file) => {
    if (!file) return '请选择封面图片。';
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return '封面图仅支持 JPG、PNG、WEBP。';
    if (file.size > 10 * 1024 * 1024) return '封面图不能超过 10MB。';
    return '';
  };

  const getPayload = (statusOverride) => ({
    title: titleInput.value.trim(),
    subtitle: subtitleInput.value.trim(),
    summary: summaryInput.value.trim(),
    main_channel: channelSelect.value,
    status: statusOverride || statusSelect.value,
    source: sourceInput.value.trim(),
    author: authorInput.value.trim(),
    publish_at: fromLocalDateTime(publishAtInput.value),
    content: contentInput.value,
    cover: coverIdInput.value || null
  });

  const validatePayload = (payload) => {
    if (!payload.title) return '请输入标题。';
    if (!payload.main_channel) return '请选择栏目。';
    if (!payload.content.trim()) return '请输入正文。';
    return '';
  };

  const saveArticle = async (statusOverride) => {
    const payload = getPayload(statusOverride);
    const error = validatePayload(payload);
    if (error) {
      showMessage(error, 'error');
      return;
    }
    setBusy(true);
    try {
      const result = isEdit
        ? await window.AdminApi.updateArticle(articleId, payload)
        : await window.AdminApi.createArticle(payload);
      const savedId = result && result.data ? result.data.id : articleId;
      showMessage(statusOverride === 'published' ? '新闻已发布。' : '新闻已保存。', 'success');
      if (!isEdit && savedId) {
        window.history.replaceState(null, '', `/admin/article-edit.html?id=${encodeURIComponent(savedId)}`);
      }
      setTimeout(() => { window.location.href = '/admin/articles.html'; }, 500);
    } catch (err) {
      showMessage(err.message || '保存失败，请稍后重试。', 'error');
    } finally {
      setBusy(false);
    }
  };

  const loadChannels = async () => {
    const result = await window.AdminApi.channels();
    (result.data || []).forEach((channel) => {
      const option = document.createElement('option');
      option.value = channel.id;
      option.textContent = channel.name;
      option.dataset.slug = channel.slug;
      channelSelect.appendChild(option);
    });
  };

  const fillArticle = (article) => {
    titleInput.value = article.title || '';
    subtitleInput.value = article.subtitle || '';
    summaryInput.value = article.summary || '';
    channelSelect.value = article.main_channel && article.main_channel.id ? article.main_channel.id : '';
    statusSelect.value = article.status || 'draft';
    sourceInput.value = article.source || '';
    authorInput.value = article.author || '';
    publishAtInput.value = toLocalDateTime(article.publish_at);
    contentInput.value = article.content || '';
    const coverId = typeof article.cover === 'object' && article.cover ? article.cover.id : article.cover;
    setCoverPreview(coverId || '', coverId ? `/admin-api/assets/${encodeURIComponent(coverId)}` : '');
  };

  const loadArticle = async () => {
    if (!isEdit) return;
    pageTitle.textContent = '编辑新闻';
    const result = await window.AdminApi.article(articleId);
    if (result && result.data) fillArticle(result.data);
  };

  const loadCurrentUser = async () => {
    const result = await window.AdminApi.me();
    const user = result.data || {};
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    topbarUser.textContent = fullName || user.email || '已登录用户';
  };


  const uploadCover = async () => {
    const file = coverFileInput.files && coverFileInput.files[0];
    const error = validateCoverFile(file);
    if (error) {
      showMessage(error, 'error');
      return;
    }
    uploadCoverButton.disabled = true;
    uploadCoverButton.textContent = '正在上传…';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await window.AdminApi.uploadFile(formData);
      const uploaded = result && result.data ? result.data : null;
      if (!uploaded || !uploaded.id) throw new Error('上传成功但未返回文件 ID。');
      setCoverPreview(uploaded.id, uploaded.preview_url);
      showMessage('封面图上传成功。', 'success');
    } catch (err) {
      showMessage(err.message || '封面图上传失败，请稍后重试。', 'error');
    } finally {
      uploadCoverButton.disabled = false;
      uploadCoverButton.textContent = '上传封面';
    }
  };

  draftButtons.forEach((button) => button.addEventListener('click', () => saveArticle('draft')));
  publishButtons.forEach((button) => button.addEventListener('click', () => saveArticle('published')));
  form.addEventListener('submit', (event) => event.preventDefault());
  uploadCoverButton.addEventListener('click', uploadCover);
  clearCoverButton.addEventListener('click', () => {
    coverFileInput.value = '';
    setCoverPreview('', '');
  });
  logoutButton.addEventListener('click', async () => {
    try { await window.AdminApi.logout(); } catch (error) {}
    window.location.href = '/admin/login.html';
  });

  Promise.resolve()
    .then(loadCurrentUser)
    .then(loadChannels)
    .then(loadArticle)
    .catch((error) => {
      if (error.status !== 401) showMessage(error.message || '页面初始化失败', 'error');
    });
})();
