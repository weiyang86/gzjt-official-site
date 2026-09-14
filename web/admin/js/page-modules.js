(function () {
  const topbarUser = document.getElementById('topbar-user');
  const logoutButton = document.getElementById('logout-button');
  const filters = document.getElementById('page-module-filters');
  const parentFilter = document.getElementById('parent-filter');
  const keywordInput = document.getElementById('module-keyword');
  const devStatusFilter = document.getElementById('dev-status-filter');
  const parentTabs = document.getElementById('parent-tabs');
  const moduleGroups = document.getElementById('module-groups');
  const messageBox = document.getElementById('page-module-message');
  const dialog = document.getElementById('module-edit-dialog');
  const dialogClose = document.getElementById('module-dialog-close');
  const dialogCancel = document.getElementById('module-dialog-cancel');
  const editForm = document.getElementById('module-edit-form');
  const editTitle = document.getElementById('module-edit-title');
  const idInput = document.getElementById('module-id');
  const placeholderInput = document.getElementById('module-placeholder');
  const remarkInput = document.getElementById('module-remark');
  const devStatusInput = document.getElementById('module-dev-status');
  const statusInput = document.getElementById('module-status');
  const sortInput = document.getElementById('module-sort');

  const devStatusText = { developing: '正在开发中', enabled: '已启用', disabled: '已停用' };
  const statusText = { enabled: '启用', disabled: '停用' };
  let currentGroups = [];
  let activeParentCode = '';

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

  const createStatusBadge = (status) => {
    const badge = document.createElement('span');
    const css = status === 'enabled' ? 'status-published' : status === 'developing' ? 'status-draft' : 'status-archived';
    badge.className = `status-badge ${css}`;
    badge.textContent = devStatusText[status] || status || '—';
    return badge;
  };

  const setActiveParent = (parentCode) => {
    activeParentCode = parentCode || '';
    parentFilter.value = activeParentCode;
    parentTabs.querySelectorAll('.parent-tab').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.parentCode === activeParentCode);
    });
  };

  const renderParentFilters = (groups) => {
    const previous = activeParentCode;
    parentFilter.innerHTML = '<option value="">全部栏目</option>';
    parentTabs.innerHTML = '';

    const allTab = document.createElement('button');
    allTab.type = 'button';
    allTab.className = 'parent-tab';
    allTab.dataset.parentCode = '';
    allTab.textContent = '全部栏目';
    parentTabs.appendChild(allTab);

    groups.forEach((group) => {
      const option = document.createElement('option');
      option.value = group.parent_code || '';
      option.textContent = `${group.parent_title || '未分组'}（${group.modules.length}）`;
      parentFilter.appendChild(option);

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'parent-tab';
      tab.dataset.parentCode = group.parent_code || '';
      tab.textContent = option.textContent;
      parentTabs.appendChild(tab);
    });

    const exists = groups.some((group) => group.parent_code === previous);
    setActiveParent(exists ? previous : '');
  };

  const openEditDialog = (module) => {
    editTitle.textContent = module.module_title || '页面模块';
    idInput.value = module.id || '';
    placeholderInput.value = module.placeholder_text || '正在开发中';
    remarkInput.value = module.remark || '';
    devStatusInput.value = module.dev_status || 'developing';
    statusInput.value = module.status || 'enabled';
    sortInput.value = Number.isFinite(Number(module.sort)) ? String(module.sort) : '0';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', 'open');
  };

  const closeDialog = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };

  const moduleCard = (module) => {
    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.id = module.id || '';

    const titleRow = document.createElement('div');
    titleRow.className = 'module-card-title-row';
    const titleWrap = document.createElement('div');
    const title = document.createElement('h3');
    const code = document.createElement('code');
    title.textContent = module.module_title || '未命名模块';
    code.textContent = module.module_code || '—';
    titleWrap.append(title, code);
    titleRow.append(titleWrap, createStatusBadge(module.dev_status));

    const meta = document.createElement('dl');
    meta.className = 'module-meta';
    const addMeta = (label, value) => {
      const item = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value || '—';
      item.append(dt, dd);
      meta.appendChild(item);
    };
    addMeta('前端路径', module.route_path);
    addMeta('占位说明', module.placeholder_text || '正在开发中');
    addMeta('备注', module.remark);
    addMeta('排序', Number.isFinite(Number(module.sort)) ? String(module.sort) : '0');
    addMeta('管理项状态', statusText[module.status] || module.status || '—');

    const actions = document.createElement('div');
    actions.className = 'table-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'text-button';
    edit.dataset.action = 'edit';
    edit.textContent = '编辑占位信息';
    const enter = document.createElement('button');
    enter.type = 'button';
    enter.className = 'text-button';
    enter.dataset.action = 'enter';
    enter.textContent = '进入管理';
    actions.append(edit, enter);

    card.append(titleRow, meta, actions);
    return card;
  };

  const renderGroups = () => {
    moduleGroups.textContent = '';
    const groups = activeParentCode ? currentGroups.filter((group) => group.parent_code === activeParentCode) : currentGroups;
    if (!groups.length) {
      moduleGroups.textContent = '暂无页面模块占位项。';
      return;
    }
    groups.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'module-group-card';
      const heading = document.createElement('div');
      heading.className = 'module-group-heading';
      const headingText = document.createElement('div');
      const eyebrow = document.createElement('p');
      const title = document.createElement('h2');
      const count = document.createElement('span');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = group.parent_code || 'uncategorized';
      title.textContent = group.parent_title || '未分组';
      count.textContent = `${group.modules.length} 项`;
      headingText.append(eyebrow, title);
      heading.append(headingText, count);
      const grid = document.createElement('div');
      grid.className = 'module-card-grid';
      group.modules.forEach((module) => grid.appendChild(moduleCard(module)));
      section.append(heading, grid);
      moduleGroups.appendChild(section);
    });
  };

  const loadPageModules = async () => {
    hideMessage();
    moduleGroups.textContent = '正在加载…';
    const result = await window.AdminApi.pageModulesGrouped({
      keyword: keywordInput.value.trim(),
      dev_status: devStatusFilter.value
    });
    currentGroups = result.data || [];
    renderParentFilters(currentGroups);
    renderGroups();
  };

  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    setActiveParent(parentFilter.value);
    loadPageModules().catch((error) => showMessage(error.message || '页面模块加载失败。', 'error'));
  });

  parentFilter.addEventListener('change', () => {
    setActiveParent(parentFilter.value);
    loadPageModules().catch((error) => showMessage(error.message || '页面模块加载失败。', 'error'));
  });

  parentTabs.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-parent-code]');
    if (!button) return;
    setActiveParent(button.dataset.parentCode || '');
    loadPageModules().catch((error) => showMessage(error.message || '页面模块加载失败。', 'error'));
  });

  moduleGroups.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('.module-card');
    if (!card) return;
    const module = currentGroups.flatMap((group) => group.modules).find((item) => String(item.id) === String(card.dataset.id));
    if (!module) return;
    if (button.dataset.action === 'edit') {
      openEditDialog(module);
      return;
    }
    if (module.dev_status === 'developing') {
      showMessage(`“${module.module_title}”该模块正在开发中。`, 'error');
      window.alert('该模块正在开发中');
      return;
    }
    showMessage(`“${module.module_title}”当前仅提供占位展示，具体编辑功能后续逐步接入。`, 'success');
  });

  editForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = idInput.value;
    if (!id) return;
    const payload = {
      placeholder_text: placeholderInput.value.trim() || '正在开发中',
      remark: remarkInput.value.trim(),
      dev_status: devStatusInput.value,
      status: statusInput.value,
      sort: Number(sortInput.value || 0)
    };
    try {
      await window.AdminApi.updatePageModule(id, payload);
      closeDialog();
      showMessage('页面模块占位信息已保存。', 'success');
      await loadPageModules();
    } catch (error) {
      showMessage(error.message || '保存占位信息失败。', 'error');
    }
  });

  dialogClose.addEventListener('click', closeDialog);
  dialogCancel.addEventListener('click', closeDialog);
  logoutButton.addEventListener('click', async () => {
    try { await window.AdminApi.logout(); } catch (error) {}
    window.location.href = '/admin/login.html';
  });

  Promise.resolve()
    .then(loadCurrentUser)
    .then(loadPageModules)
    .catch((error) => {
      if (error.status !== 401) showMessage(error.message || '页面初始化失败。', 'error');
    });
})();
