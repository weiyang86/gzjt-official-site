(function () {
  const topbarUser = document.getElementById('topbar-user');
  const logoutButton = document.getElementById('logout-button');
  const treeRoot = document.getElementById('content-sidebar-tree');
  const editorRoot = document.getElementById('content-editor-root');
  const messageBox = document.getElementById('content-editor-message');

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

  const selectModule = async (moduleCode) => {
    hideMessage();
    editorRoot.innerHTML = '<section class="notice-card"><p class="eyebrow">Loading</p><h2>正在加载页面模块…</h2></section>';
    try {
      const result = await window.ContentApi.module(moduleCode);
      if (!result.data) {
        showMessage('页面模块不存在或已停用。', 'error');
        return;
      }
      await window.ContentForms.render(editorRoot, result.data);
    } catch (error) {
      if (error.status !== 401) showMessage(error.message || '页面模块加载失败。', 'error');
    }
  };

  logoutButton.addEventListener('click', async () => {
    try { await window.AdminApi.logout(); } catch (error) {}
    window.location.href = '/admin/login.html';
  });

  Promise.resolve()
    .then(loadCurrentUser)
    .then(() => window.ContentSidebar.init(treeRoot, selectModule))
    .catch((error) => {
      if (error.status !== 401) showMessage(error.message || '页面内容管理初始化失败。', 'error');
    });
})();
