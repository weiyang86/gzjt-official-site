(function () {
  const topbarUser = document.getElementById('topbar-user');
  const logoutButton = document.getElementById('logout-button');
  const filterForm = document.getElementById('article-filters');
  const keywordInput = document.getElementById('keyword');
  const channelFilter = document.getElementById('channel-filter');
  const statusFilter = document.getElementById('status-filter');
  const articlesBody = document.getElementById('articles-body');
  const messageBox = document.getElementById('article-message');
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  const state = { page: 1, limit: 10, total: 0 };
  const statusText = { draft: '草稿', published: '已发布', archived: '已归档' };

  const showMessage = (message, type) => {
    messageBox.textContent = message;
    messageBox.className = `inline-message ${type || ''}`.trim();
    messageBox.hidden = false;
  };

  const hideMessage = () => {
    messageBox.textContent = '';
    messageBox.hidden = true;
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', { hour12: false });
  };

  const getChannelName = (article) => {
    if (article.main_channel && article.main_channel.name) return article.main_channel.name;
    return '—';
  };

  const createActionButton = (label, action, articleId) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.id = articleId;
    return button;
  };

  const renderRows = (articles) => {
    articlesBody.textContent = '';
    if (!articles.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.textContent = '暂无新闻，请点击“新增新闻”创建。';
      row.appendChild(cell);
      articlesBody.appendChild(row);
      return;
    }

    articles.forEach((article) => {
      const row = document.createElement('tr');
      const titleCell = document.createElement('td');
      const channelCell = document.createElement('td');
      const statusCell = document.createElement('td');
      const dateCell = document.createElement('td');
      const actionCell = document.createElement('td');
      const actionWrap = document.createElement('div');
      const editLink = document.createElement('a');
      const badge = document.createElement('span');

      titleCell.textContent = article.title || '未命名新闻';
      channelCell.textContent = getChannelName(article);
      badge.className = `status-badge status-${article.status || 'draft'}`;
      badge.textContent = statusText[article.status] || article.status || '—';
      statusCell.appendChild(badge);
      dateCell.textContent = formatDate(article.publish_at);

      actionWrap.className = 'table-actions';
      editLink.className = 'text-link';
      editLink.href = `/admin/article-edit.html?id=${encodeURIComponent(article.id)}`;
      editLink.textContent = '编辑';
      actionWrap.appendChild(editLink);
      if (article.status !== 'published') actionWrap.appendChild(createActionButton('发布', 'publish', article.id));
      if (article.status !== 'draft') actionWrap.appendChild(createActionButton('转草稿', 'draft', article.id));
      if (article.status !== 'archived') actionWrap.appendChild(createActionButton('归档', 'archive', article.id));
      actionCell.appendChild(actionWrap);

      row.append(titleCell, channelCell, statusCell, dateCell, actionCell);
      articlesBody.appendChild(row);
    });
  };

  const updatePagination = () => {
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    pageInfo.textContent = `第 ${state.page} / ${totalPages} 页，共 ${state.total} 条`;
    prevButton.disabled = state.page <= 1;
    nextButton.disabled = state.page >= totalPages;
  };

  const loadChannels = async () => {
    const result = await window.AdminApi.channels();
    const channels = result.data || [];
    channels.forEach((channel) => {
      const option = document.createElement('option');
      option.value = channel.slug;
      option.textContent = channel.name;
      channelFilter.appendChild(option);
    });
  };

  const loadArticles = async () => {
    hideMessage();
    articlesBody.innerHTML = '<tr><td colspan="5">正在加载…</td></tr>';
    try {
      const result = await window.AdminApi.articles({
        keyword: keywordInput.value.trim(),
        channel: channelFilter.value,
        status: statusFilter.value,
        page: state.page,
        limit: state.limit
      });
      state.total = Number(result.meta && result.meta.filter_count ? result.meta.filter_count : (result.data || []).length);
      renderRows(result.data || []);
      updatePagination();
    } catch (error) {
      showMessage(error.message || '新闻列表加载失败', 'error');
      articlesBody.innerHTML = '<tr><td colspan="5">加载失败，请稍后重试。</td></tr>';
    }
  };

  const loadCurrentUser = async () => {
    const result = await window.AdminApi.me();
    const user = result.data || {};
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    topbarUser.textContent = fullName || user.email || '已登录用户';
  };

  filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.page = 1;
    loadArticles();
  });

  prevButton.addEventListener('click', () => {
    if (state.page > 1) {
      state.page -= 1;
      loadArticles();
    }
  });

  nextButton.addEventListener('click', () => {
    state.page += 1;
    loadArticles();
  });

  articlesBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    const confirmText = action === 'archive' ? '确认归档这条新闻？' : '确认修改新闻状态？';
    if (!window.confirm(confirmText)) return;
    button.disabled = true;
    try {
      await window.AdminApi.setArticleStatus(id, action);
      showMessage('状态已更新。', 'success');
      await loadArticles();
    } catch (error) {
      showMessage(error.message || '状态更新失败', 'error');
    } finally {
      button.disabled = false;
    }
  });

  logoutButton.addEventListener('click', async () => {
    try { await window.AdminApi.logout(); } catch (error) {}
    window.location.href = '/admin/login.html';
  });

  Promise.resolve()
    .then(loadCurrentUser)
    .then(loadChannels)
    .then(loadArticles)
    .catch((error) => {
      if (error.status !== 401) showMessage(error.message || '页面初始化失败', 'error');
    });
})();
