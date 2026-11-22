(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const form = el('owner-name-form');
  const input = el('owner-name');
  const save = el('owner-name-save');
  const skip = el('owner-name-skip');
  const status = el('owner-name-status');
  const retry = el('owner-profile-retry');
  let owner = '';
  let generation = 0;
  let profile;
  let busy = false;

  function maskedEmail(address) {
    const at = address.lastIndexOf('@');
    return at > 0 ? address.slice(0, 1) + '…' + address.slice(at) : '';
  }

  function render() {
    const email = profile?.email || '';
    el('header-owner-id').textContent = profile?.name || 'Мой профиль';
    el('header-owner-email').textContent = maskedEmail(email);
    el('profile-email').textContent = email || '—';
    el('profile-email-status').textContent = profile
      ? (profile.email_verified ? 'Подтверждена' : 'Ожидает подтверждения') : '—';
    el('profile-key-issued').textContent = profile?.key_issued || '—';
    const first = profile && !profile.chosen;
    (first ? el('owner-first-choice') : el('owner-profile-editor')).appendChild(form);
    form.hidden = !profile;
    skip.hidden = !first;
    input.required = Boolean(first);
    input.value = profile?.name || '';
    el('owner-name-label').textContent = first ? 'Укажите пожалуйста имя' : 'Имя для обращения';
  }

  async function request(method, body) {
    const response = await fetch('/owner/api/profile', {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: {'X-QUD-Profile-Owner': owner, ...(body ? {'Content-Type': 'application/json'} : {})},
      ...(body ? {body: JSON.stringify(body)} : {})
    });
    const data = await response.json();
    if (!response.ok || !data.ok || !data.profile) throw new Error(data.error || 'PROFILE_UNAVAILABLE');
    return data.profile;
  }

  async function load() {
    const token = ++generation;
    retry.hidden = true;
    el('owner-profile-state').textContent = 'Загружаем профиль…';
    try {
      const data = await request('GET');
      if (generation !== token) return;
      profile = data;
      render();
      el('owner-profile-state').textContent = '';
    } catch {
      if (generation !== token) return;
      el('owner-profile-state').textContent = 'Не удалось загрузить профиль.';
      retry.hidden = false;
    }
  }

  async function submit(mode) {
    if (busy || !profile) return;
    const token = generation;
    busy = true;
    save.disabled = skip.disabled = input.disabled = true;
    status.textContent = 'Сохраняем…';
    try {
      const data = await request('POST', {mode, name: mode === 'skip' ? '' : input.value.trim()});
      if (token !== generation) return;
      profile = data;
      render();
      status.textContent = 'Выбор сохранён.';
    } catch (error) {
      if (token !== generation) return;
      status.textContent = error.message === 'INVALID_NAME' ? 'Введите имя длиной до 60 знаков. Допустимы буквы, пробел, дефис и апостроф.'
        : 'Не удалось подтвердить сохранение. Обновите профиль и проверьте результат.';
    } finally {
      if (token === generation) {
        busy = false;
        save.disabled = skip.disabled = input.disabled = false;
      }
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    submit(profile?.chosen ? 'edit' : 'save');
  });
  skip.addEventListener('click', () => submit('skip'));
  retry.addEventListener('click', load);
  window.addEventListener('owner:session', event => {
    const id = event.detail.authenticated ? event.detail.owner_id : '';
    if (id && id === owner) return;
    ++generation;
    owner = id;
    profile = null;
    busy = false;
    save.disabled = skip.disabled = input.disabled = false;
    status.textContent = el('owner-profile-state').textContent = '';
    retry.hidden = true;
    render();
    if (owner) load();
  });
})();
