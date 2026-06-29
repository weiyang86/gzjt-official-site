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
  const toolbarContainer = document.getElementById('wang-toolbar');
  const editorContainer = document.getElementById('wang-editor');
  const draftButtons = [document.getElementById('save-draft'), document.getElementById('save-draft-bottom')];
  const publishButtons = [document.getElementById('publish-article'), document.getElementById('publish-article-bottom')];
  let richEditor = null;
  let richToolbar = null;

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

  const getEditorContent = () => {
    if (richEditor) {
      contentInput.value = richEditor.getHtml().trim();
    }
    return contentInput.value;
  };

  const setEditorContent = (value) => {
    const html = value || '';
    contentInput.value = html;
    if (richEditor) {
      richEditor.setHtml(html || '<p><br></p>');
    }
  };

  const initRichEditor = async () => {
    if (!window.wangEditor || !toolbarContainer || !editorContainer) {
      contentInput.hidden = false;
      showMessage('富文本编辑器加载失败，已切换为基础文本模式。', 'error');
      return;
    }
    const E = window.wangEditor;
    if (typeof E.i18nChangeLanguage === 'function') {
      E.i18nChangeLanguage('zh-CN');
    }
    const editorConfig = {
      placeholder: '请输入正文内容',
      scroll: false,
      autoFocus: false,
      onChange(editor) {
        contentInput.value = editor.getHtml().trim();
      },
      MENU_CONF: {
        color: {
          colors: ['#101828', '#344054', '#475467', '#667085', '#b42318', '#175cd3', '#027a48', '#f79009']
        },
        bgColor: {
          colors: ['#ffffff', '#fff7f5', '#eff8ff', '#ecfdf3', '#fffaeb', '#f9fafb']
        },
        fontSize: {
          fontSizeList: ['12px', '14px', '15px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', '36px']
        },
        fontFamily: {
          fontFamilyList: [
            { name: '微软雅黑', value: 'Microsoft YaHei, PingFang SC, sans-serif' },
            { name: '宋体', value: 'SimSun, serif' },
            { name: '黑体', value: 'SimHei, sans-serif' },
            { name: '仿宋', value: 'FangSong, serif' },
            { name: '楷体', value: 'KaiTi, serif' },
            { name: 'Arial', value: 'Arial, Helvetica, sans-serif' }
          ]
        },
        lineHeight: {
          lineHeightList: ['1', '1.5', '1.75', '2', '2.5']
        }
      }
    };
    richEditor = E.createEditor({
      selector: '#wang-editor',
      html: contentInput.value || '<p><br></p>',
      config: editorConfig,
      mode: 'default'
    });
    richToolbar = E.createToolbar({
      editor: richEditor,
      selector: '#wang-toolbar',
      config: {
        modalAppendToBody: true
      },
      mode: 'default'
    });
    contentInput.value = richEditor.getHtml().trim();
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
    content: getEditorContent()
  });

  const validatePayload = (payload, statusOverride) => {
    const targetStatus = statusOverride || payload.status
    if (!payload.title) return '请输入标题。';
    if (targetStatus === 'published' && !payload.main_channel) return '发布前请选择栏目。';
    if (targetStatus === 'published' && !payload.content.trim()) return '发布前请输入正文。';
    return '';
  };

  const saveArticle = async (statusOverride) => {
    const payload = getPayload(statusOverride);
    const error = validatePayload(payload, statusOverride);
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
    setEditorContent(article.content || '');
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
  window.addEventListener('beforeunload', () => {
    if (richToolbar && typeof richToolbar.destroy === 'function') richToolbar.destroy();
    if (richEditor && typeof richEditor.destroy === 'function') richEditor.destroy();
  });

  Promise.resolve()
    .then(() => initRichEditor())
    .then(loadCurrentUser)
    .then(loadChannels)
    .then(loadArticle)
    .catch((error) => {
      if (error.status !== 401) showMessage(error.message || '页面初始化失败', 'error');
    });
})();
