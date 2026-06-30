(function () {
  const topbarUser = document.getElementById('topbar-user');
  const logoutButton = document.getElementById('logout-button');
  const form = document.getElementById('category-form');
  const formTitle = document.getElementById('category-form-title');
  const resetButton = document.getElementById('reset-category-form');
  const messageBox = document.getElementById('category-message');
  const filters = document.getElementById('category-filters');
  const keywordInput = document.getElementById('category-keyword');
  const statusFilter = document.getElementById('category-status-filter');
  const body = document.getElementById('categories-body');
  const idInput = document.getElementById('category-id');
  const nameInput = document.getElementById('category-name');
  const slugInput = document.getElementById('category-slug');
  const typeInput = document.getElementById('category-type');
  const pathInput = document.getElementById('category-path');
  const sortInput = document.getElementById('category-sort');
  const statusInput = document.getElementById('category-status');
  const descriptionInput = document.getElementById('category-description');
  const statusText = { enabled: '启用', disabled: '停用' };

  const showMessage = (message, type) => {
    messageBox.textContent = message;
    messageBox.className = `inline-message ${type || ''}`.trim();
    messageBox.hidden = false;
  };

  const hideMessage = () => {
    messageBox.textContent = '';
    messageBox.hidden = true;
  };

  const loadCurrentUser = async () => {
    const result = await window.AdminApi.me();
    const user = result.data || {};
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    topbarUser.textContent = fullName || user.email || '已登录用户';
  };

  const getPayload = () => ({
    name: nameInput.value.trim(),
    slug: slugInput.value.trim(),
    type: typeInput.value,
    path: pathInput.value.trim(),
    sort: Number(sortInput.value || 0),
    status: statusInput.value,
    visible: statusInput.value === 'enabled',
    description: descriptionInput.value.trim()
  });

  const validatePayload = (payload) => {
    if (!payload.name) return '请输入分类名称。';
    if (!payload.slug) return '请输入分类标识 slug。';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(payload.slug)) return 'slug 只能使用小写字母、数字和中横线。';
    return '';
  };

  const resetForm = () => {
    formTitle.textContent = '新增分类';
    idInput.value = '';
    nameInput.value = '';
    slugInput.value = '';
    typeInput.value = 'list';
    pathInput.value = '';
    sortInput.value = '0';
    statusInput.value = 'enabled';
    descriptionInput.value = '';
    hideMessage();
  };

  const fillForm = (category) => {
    formTitle.textContent = '编辑分类';
    idInput.value = category.id || '';
    nameInput.value = category.name || '';
    slugInput.value = category.slug || '';
    typeInput.value = category.type || 'list';
    pathInput.value = category.path || '';
    sortInput.value = Number.isFinite(Number(category.sort)) ? String(category.sort) : '0';
    statusInput.value = category.status || 'enabled';
    descriptionInput.value = category.description || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createStatusBadge = (status) => {
    const badge = document.createElement('span');
    badge.className = `status-badge ${status === 'enabled' ? 'status-published' : 'status-archived'}`;
    badge.textContent = statusText[status] || status || '—';
    return badge;
  };

  const appendAction = (wrap, label, action, id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.id = id;
    wrap.appendChild(button);
  };

  const renderRows = async (categories) => {
    body.textContent = '';
    if (!categories.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.textContent = '暂无分类。';
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    const usageMap = new Map();
    await Promise.all(categories.map(async (category) => {
      try {
        const result = await window.AdminApi.categoryUsage(category.id);
        usageMap.set(category.id, result.data ? result.data.article_count : 0);
      } catch (error) {
        usageMap.set(category.id, '后续支持');
      }
    }));

    categories.forEach((category) => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const slugCell = document.createElement('td');
      const statusCell = document.createElement('td');
      const sortCell = document.createElement('td');
      const usageCell = document.createElement('td');
      const descCell = document.createElement('td');
      const actionCell = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'table-actions';
      nameCell.textContent = category.name || '未命名';
      slugCell.textContent = category.slug || '—';
      statusCell.appendChild(createStatusBadge(category.status));
      sortCell.textContent = Number.isFinite(Number(category.sort)) ? String(category.sort) : '0';
      usageCell.textContent = String(usageMap.get(category.id) ?? 0);
      descCell.textContent = category.description || '—';
      appendAction(actions, '编辑', 'edit', category.id);
      appendAction(actions, category.status === 'enabled' ? '停用' : '启用', category.status === 'enabled' ? 'disable' : 'enable', category.id);
      appendAction(actions, '删除', 'delete', category.id);
      actionCell.appendChild(actions);
      row.append(nameCell, slugCell, statusCell, sortCell, usageCell, descCell, actionCell);
      body.appendChild(row);
    });
  };

  const loadCategories = async () => {
    body.innerHTML = '<tr><td colspan="7">正在加载…</td></tr>';
    const result = await window.AdminApi.categories({ keyword: keywordInput.value.trim(), status: statusFilter.value });
    await renderRows(result.data || []);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = getPayload();
    const error = validatePayload(payload);
    if (error) {
      showMessage(error, 'error');
      return;
    }
    try {
      if (idInput.value) {
        await window.AdminApi.updateCategory(idInput.value, payload);
        showMessage('分类已更新。', 'success');
      } else {
        await window.AdminApi.createCategory(payload);
        showMessage('分类已新增。', 'success');
      }
      await loadCategories();
      if (!idInput.value) resetForm();
    } catch (err) {
      showMessage(err.message || '保存分类失败。', 'error');
    }
  });

  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    loadCategories().catch((err) => showMessage(err.message || '分类加载失败。', 'error'));
  });

  body.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    try {
      if (action === 'edit') {
        const result = await window.AdminApi.category(id);
        if (result.data) fillForm(result.data);
        return;
      }
      if (action === 'delete') {
        const usage = await window.AdminApi.categoryUsage(id);
        const count = usage.data ? Number(usage.data.article_count || 0) : 0;
        if (count > 0) {
          showMessage(`该分类已有 ${count} 篇新闻，不能删除。建议改为“停用”。`, 'error');
          return;
        }
        if (!window.confirm('确认删除该分类？此操作不可恢复。')) return;
        await window.AdminApi.deleteCategory(id);
        if (idInput.value && idInput.value === id) resetForm();
        showMessage('分类已删除。', 'success');
        await loadCategories();
        return;
      }
      const enable = action === 'enable';
      const usage = await window.AdminApi.categoryUsage(id);
      const count = usage.data ? Number(usage.data.article_count || 0) : 0;
      const prompt = !enable && count > 0
        ? `该分类已有 ${count} 篇新闻，停用后不会删除新闻，但新增/编辑新闻时不再可选。确认停用？`
        : `确认${enable ? '启用' : '停用'}该分类？`;
      if (!window.confirm(prompt)) return;
      await window.AdminApi.setCategoryEnabled(id, enable);
      showMessage(`分类已${enable ? '启用' : '停用'}。`, 'success');
      await loadCategories();
    } catch (err) {
      const msg = err && err.message ? String(err.message) : '';
      if (msg.includes('Admin API endpoint not found')) {
        showMessage('后台接口未启用或服务未使用 web/server.js 启动，请确保使用 node web/server.js 启动本地 3010。', 'error');
        return;
      }
      if (msg.startsWith('Cannot delete category that has ')) {
        const count = msg.match(/\d+/)?.[0] || '0';
        showMessage(`该分类已有 ${count} 篇新闻，不能删除。建议改为“停用”。`, 'error');
        return;
      }
      showMessage(msg || '分类操作失败。', 'error');
    }
  });

  resetButton.addEventListener('click', resetForm);
  logoutButton.addEventListener('click', async () => {
    try { await window.AdminApi.logout(); } catch (error) {}
    window.location.href = '/admin/login.html';
  });

  Promise.resolve()
    .then(loadCurrentUser)
    .then(loadCategories)
    .catch((error) => {
      if (error.status === 401) return;
      const msg = error && error.message ? String(error.message) : '页面初始化失败。';
      if (msg.includes('Admin API endpoint not found')) {
        showMessage('后台接口未启用或服务未使用 web/server.js 启动，请确保使用 node web/server.js 启动本地 3010。', 'error');
        return;
      }
      showMessage(msg, 'error');
    });
})();
