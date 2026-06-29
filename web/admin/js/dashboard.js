(function () {
  const topbarUser = document.getElementById('topbar-user');
  const userDetails = document.getElementById('user-details');
  const logoutButton = document.getElementById('logout-button');

  const valueOrDash = (value) => value || '—';

  const getDisplayName = (user) => {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return fullName || user.email || '已登录用户';
  };

  const appendDetail = (label, value) => {
    const item = document.createElement('div');
    const term = document.createElement('dt');
    const desc = document.createElement('dd');
    term.textContent = label;
    desc.textContent = valueOrDash(value);
    item.append(term, desc);
    userDetails.appendChild(item);
  };

  const renderUser = (user) => {
    const roleName = user.role && user.role.name ? user.role.name : '未返回角色';
    topbarUser.textContent = getDisplayName(user);
    userDetails.textContent = '';
    appendDetail('邮箱', user.email);
    appendDetail('姓名', getDisplayName(user));
    appendDetail('角色', roleName);
  };

  const renderLoadError = (message) => {
    topbarUser.textContent = '账号信息加载失败';
    userDetails.textContent = '';
    appendDetail('状态', message || '账号信息加载失败');
  };

  const loadCurrentUser = async () => {
    try {
      const result = await window.AdminApi.me();
      if (!result || !result.data) {
        window.AdminApi.redirectToLogin();
        return;
      }
      renderUser(result.data);
    } catch (error) {
      if (error.status !== 401) {
        renderLoadError(error.message);
      }
    }
  };

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = '正在退出…';
    try {
      await window.AdminApi.logout();
    } catch (error) {
      // 即使服务端退出请求失败，也清理当前页面状态并回到登录页，避免继续停留在后台。
    } finally {
      window.location.href = '/admin/login.html';
    }
  });

  loadCurrentUser();
})();
