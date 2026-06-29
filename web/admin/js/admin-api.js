(function () {
  const loginPath = '/admin/login.html';

  const redirectToLogin = () => {
    const currentPath = window.location.pathname;
    if (currentPath !== loginPath) {
      window.location.href = loginPath;
    }
  };

  const parseJson = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      return { error: { code: 'INVALID_JSON', message: text } };
    }
  };

  const getErrorMessage = (payload, fallback) => {
    if (payload && payload.error && payload.error.message) return payload.error.message;
    if (payload && payload.errors && payload.errors[0] && payload.errors[0].message) return payload.errors[0].message;
    return fallback;
  };

  const adminFetch = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    const hasFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (options.body && !hasFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers
    });
    const payload = await parseJson(response);
    if (payload && payload.error && payload.error.code === 'INVALID_JSON') {
      const error = new Error('后台接口未就绪：/admin-api 返回了非 JSON 响应。请确认使用 web/server.js 启动本地站点服务。');
      error.status = 502;
      error.payload = payload;
      throw error;
    }

    if (response.status === 401) {
      redirectToLogin();
      const error = new Error('登录已失效，请重新登录');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(getErrorMessage(payload, '请求失败，请稍后重试'));
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  };

  window.AdminApi = {
    adminFetch,
    redirectToLogin,
    login: (email, password) => adminFetch('/admin-api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    logout: () => adminFetch('/admin-api/logout', { method: 'POST' }),
    me: () => adminFetch('/admin-api/me')
  };
})();
