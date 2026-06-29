(function () {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitButton = document.getElementById('login-submit');
  const errorBox = document.getElementById('login-error');

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  const clearError = () => {
    errorBox.textContent = '';
    errorBox.hidden = true;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('请输入邮箱和密码。');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = '正在登录…';

    try {
      await window.AdminApi.login(email, password);
      window.location.href = '/admin/dashboard.html';
    } catch (error) {
      showError(error.message || '登录失败，请检查账号密码。');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = '登录';
    }
  });
})();
