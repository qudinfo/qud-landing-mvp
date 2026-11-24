(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  let match;
  try {
    match = /^([a-zА-Яё0-9_.-]{1,80})\.([a-f0-9]{64})$/i.exec(decodeURIComponent(location.hash.slice(1)));
  } catch { /* Invalid and missing links share the same recovery screen. */ }

  let key = '';
  let busy = false;
  let closed = false;

  function createKey() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%()/';
    for (;;) {
      const bytes = crypto.getRandomValues(new Uint8Array(10));
      const candidate = Array.from(bytes, byte => alphabet[byte & 63]).join('');
      if (/[a-z]/.test(candidate) && /[A-Z]/.test(candidate) && /[0-9]/.test(candidate) && /[^a-z0-9]/i.test(candidate)) return candidate;
    }
  }

  function unavailable() {
    match = null;
    key = '';
    el('title').textContent = 'Приглашение недоступно';
    el('message').textContent = 'Ссылка использована, истекла или недействительна. Если у вас нет ключа, запросите новое приглашение у QUD.';
    el('login').hidden = false;
  }

  function showKey(value) {
    el('key').value = value;
    el('title').textContent = 'Ваш ключ доступа';
    el('status').textContent = preview ? 'Предпросмотр' : 'Почта подтверждена';
    el('status').classList.toggle('confirmed', !preview);
    el('status').hidden = false;
    el('received').hidden = false;
    el('message').textContent = preview ? 'Пример ключа для предпросмотра.' : 'Сохраните ключ в безопасном месте.';
    el('login').hidden = false;
  }

  async function claim() {
    if (closed || busy || !match) return;
    busy = true;
    el('retry').hidden = true;
    el('title').textContent = 'Получаем ключ…';
    el('message').textContent = '';
    try {
      key ||= createKey();
      const response = await fetch('/owner/api/claim-invitation', {
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: match[1], token: match[2], key })
      });
      if (closed) return;
      if (response.status === 400 || response.status === 409) {
        unavailable();
        return;
      }
      if (!response.ok || (await response.json()).claimed !== true) throw Error('Claim failed');
      if (closed) return;
      showKey(key);
      key = '';
      match = null;
    } catch {
      if (closed) return;
      el('title').textContent = 'Не удалось получить ключ';
      el('message').textContent = 'Повторите попытку в этой вкладке.';
      el('retry').hidden = false;
    } finally {
      busy = false;
    }
  }

  function openInvitation() {
    if (document.prerendering || document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', openInvitation);
    document.removeEventListener('prerenderingchange', openInvitation);
    history.replaceState(null, '', location.pathname + location.search);
    if (preview) showKey('Demo!Key24');
    else if (match) claim();
    else unavailable();
  }

  el('retry').addEventListener('click', claim);
  el('copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(el('key').value);
      el('copy-label').textContent = 'Скопировано';
      el('message').textContent = 'Ключ скопирован.';
    } catch {
      el('key').focus();
      el('key').select();
      el('message').textContent = 'Ключ выделен. Скопируйте его вручную.';
    }
  });
  window.addEventListener('pagehide', () => {
    closed = true;
    match = null;
    key = '';
    el('key').value = '';
    el('received').hidden = true;
  });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  document.addEventListener('visibilitychange', openInvitation);
  document.addEventListener('prerenderingchange', openInvitation);
  openInvitation();
})();
