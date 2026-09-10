(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const screens = { loading: byId('owner-loading'), login: byId('owner-login'), unavailable: byId('owner-unavailable'), shell: byId('owner-shell') };
  const form = byId('owner-login-form');
  const key = byId('owner-key');
  const submit = byId('owner-login-submit');
  const message = byId('owner-login-message');
  let busy = false;
  let authenticated = false;
  let expiryTimer;

  function show(name, text = '') {
    Object.entries(screens).forEach(([id, element]) => { element.hidden = id !== name; });
    document.querySelector('.skip-link').hidden = name !== 'shell';
    if (name !== 'shell') {
      byId('demo-toast').hidden = true;
      authenticated = false;
      clearTimeout(expiryTimer);
    }
    if (name !== 'unavailable') {
      byId('unavailable-title').textContent = 'Не удалось проверить сессию';
      byId('owner-retry').textContent = 'Повторить';
      delete byId('owner-retry').dataset.action;
    }
    message.textContent = text;
    if (name === 'login') { key.value = ''; key.focus(); }
  }

  async function request(method, accessKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/owner/api/session', {
        method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
        ...(method === 'POST' ? { body: JSON.stringify({ access_key: accessKey }) } : {})
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true || typeof data.authenticated !== 'boolean') {
        const error = new Error('SESSION_REQUEST_FAILED');
        error.code = data.error;
        throw error;
      }
      return data;
    } finally { clearTimeout(timeout); }
  }

  function accept(data, wasAuthenticated = false) {
    if (!data.authenticated) {
      show('login', wasAuthenticated ? 'Сессия завершена. Введите ключ доступа снова.' : '');
      return;
    }
    show('shell');
    authenticated = true;
    key.value = '';
    clearTimeout(expiryTimer);
    if (Number.isFinite(data.expires_at)) {
      expiryTimer = setTimeout(() => checkSession(true), Math.max(0, data.expires_at * 1000 - Date.now()));
    }
  }

  async function checkSession(wasAuthenticated = authenticated) {
    if (busy) return;
    busy = true;
    show('loading');
    try { accept(await request('GET'), wasAuthenticated); }
    catch { show('unavailable'); }
    finally { busy = false; }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const accessKey = key.value.trim();
    if (!accessKey) { message.textContent = 'Введите ключ доступа.'; key.focus(); return; }
    busy = true;
    submit.disabled = true;
    key.disabled = true;
    submit.textContent = 'Вход…';
    message.textContent = '';
    try { accept(await request('POST', accessKey)); }
    catch (error) {
      message.textContent = error.code === 'INVALID_ACCESS_KEY'
        ? 'Неверный ключ доступа. Проверьте ключ и попробуйте снова.'
        : error.code === 'TOO_MANY_ATTEMPTS'
          ? 'Слишком много попыток входа. Попробуйте позже.'
          : 'Не удалось выполнить вход. Сервис временно недоступен. Попробуйте ещё раз.';
    } finally {
      key.value = '';
      key.disabled = false;
      submit.disabled = false;
      submit.textContent = 'Войти';
      busy = false;
      if (!screens.login.hidden) key.focus();
    }
  });

  byId('logout-button').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    show('loading');
    try {
      const data = await request('DELETE');
      if (data.authenticated) throw new Error('LOGOUT_FAILED');
      show('login');
    } catch {
      // Do not claim logout succeeded while the server cookie may still exist.
      show('unavailable');
      byId('unavailable-title').textContent = 'Не удалось завершить сессию';
      byId('owner-retry').textContent = 'Повторить выход';
      byId('owner-retry').dataset.action = 'logout';
    } finally { busy = false; }
  });

  byId('owner-retry').addEventListener('click', () => {
    if (byId('owner-retry').dataset.action === 'logout') byId('logout-button').click();
    else checkSession();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && authenticated) checkSession(true);
  });
  window.addEventListener('pageshow', (event) => { if (event.persisted) checkSession(authenticated); });
  checkSession();
})();
