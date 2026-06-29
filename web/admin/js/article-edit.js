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

  const getPayload = (statusOverride) => ({
    title: titleInput.value.trim(),
    subtitle: subtitleInput.value.trim(),
    summary: summaryInput.value.trim(),
    main_channel: channelSelect.value,
    status: statusOverride || statusSelect.value,
    source: sourceInput.value.trim(),
    author: authorInput.value.trim(),
    publish_at: fromLocalDateTime(publishAtInput.value),
    content: contentInput.value
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

  draftButtons.forEach((button) => button.addEventListener('click', () => saveArticle('draft')));
  publishButtons.forEach((button) => button.addEventListener('click', () => saveArticle('published')));
  form.addEventListener('submit', (event) => event.preventDefault());
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
