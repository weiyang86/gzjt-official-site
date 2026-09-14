(function () {
  const createModuleButton = (module) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'content-module-button';
    button.dataset.moduleCode = module.module_code;
    const title = document.createElement('span');
    const meta = document.createElement('small');
    title.textContent = module.module_title || module.module_code;
    meta.textContent = module.admin_enabled ? module.content_type : '正在开发中';
    button.append(title, meta);
    return button;
  };

  const renderTree = (root, tree, onSelect) => {
    root.textContent = '';
    if (!tree.length) {
      root.textContent = '暂无页面目录。';
      return;
    }
    tree.forEach((group, index) => {
      const details = document.createElement('details');
      details.className = 'content-tree-group';
      details.open = index === 0;
      const summary = document.createElement('summary');
      summary.textContent = group.parent_title || group.parent_code || '未分组';
      const list = document.createElement('div');
      list.className = 'content-tree-children';
      (group.children || []).forEach((module) => list.appendChild(createModuleButton(module)));
      details.append(summary, list);
      root.appendChild(details);
    });

    root.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-module-code]');
      if (!button) return;
      root.querySelectorAll('.content-module-button').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      onSelect(button.dataset.moduleCode);
    });
  };

  window.ContentSidebar = {
    init: async (root, onSelect) => {
      const result = await window.ContentApi.tree();
      renderTree(root, result.data || [], onSelect);
      return result.data || [];
    }
  };
})();
