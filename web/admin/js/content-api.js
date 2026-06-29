(function () {
  const query = (params = {}) => {
    const search = new URLSearchParams(params).toString();
    return search ? `?${search}` : '';
  };

  window.ContentApi = {
    tree: () => window.AdminApi.adminFetch('/admin-api/content-modules/tree'),
    module: (moduleCode) => window.AdminApi.adminFetch(`/admin-api/content-modules/${encodeURIComponent(moduleCode)}`),
    pageContent: (moduleCode) => window.AdminApi.adminFetch(`/admin-api/page-contents/${encodeURIComponent(moduleCode)}`),
    savePageContent: (moduleCode, payload) => window.AdminApi.adminFetch(`/admin-api/page-contents/${encodeURIComponent(moduleCode)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
    items: (params = {}) => window.AdminApi.adminFetch(`/admin-api/page-content-items${query(params)}`),
    createItem: (payload) => window.AdminApi.adminFetch('/admin-api/page-content-items', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    updateItem: (id, payload) => window.AdminApi.adminFetch(`/admin-api/page-content-items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
    disableItem: (id) => window.AdminApi.adminFetch(`/admin-api/page-content-items/${encodeURIComponent(id)}/disable`, { method: 'PATCH' }),
    uploadFile: (formData) => window.AdminApi.uploadFile(formData)
  };
})();
