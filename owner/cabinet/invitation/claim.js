(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  let match;
  try { match = /^([a-zА-Яё0-9_.-]{1,80})\.([a-f0-9]{64})$/i.exec(decodeURIComponent(location.hash.slice(1))); }
  catch { /* A malformed link shows the same recovery message. */ }
  history.replaceState(null,'',location.pathname + location.search);
  el('demo').hidden = !preview;
  const invalid = 'Ссылка использована, истекла или недействительна. Обратитесь в QUD за новым приглашением.';
  if (!preview && !match) { el('instruction').textContent=invalid; el('claim').hidden=true; return; }

  function createKey() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%()/';
    for (;;) {
      const bytes = crypto.getRandomValues(new Uint8Array(10));
      const candidate = Array.from(bytes, byte => alphabet[byte & 63]).join('');
      if (/[a-z]/.test(candidate) && /[A-Z]/.test(candidate) && /[0-9]/.test(candidate) && /[^a-z0-9]/i.test(candidate)) return candidate;
    }
  }
  let key = '';
  el('claim').disabled=false;
  el('claim').onclick=async () => {
    el('claim').disabled=true;
    el('message').textContent='Получаем ключ…';
    try {
      if (!preview) {
        key ||= createKey();
        const res=await fetch('/owner/api/claim-invitation',{method:'POST',credentials:'omit',cache:'no-store',
          headers:{'Content-Type':'application/json'},body:JSON.stringify({id:match[1],token:match[2],key})});
        if (res.status===400 || res.status===409) {
          key='';match=null;el('claim').hidden=true;el('instruction').textContent=invalid;el('message').textContent='';return;
        }
        if (!res.ok || (await res.json()).claimed!==true) throw Error('retry');
      }
      match=null;
      el('title').textContent=preview?'Пример выданного ключа':'Почта подтверждена';
      el('instruction').hidden=el('claim').hidden=true;
      el('received').hidden=false;
      el('key').value=preview?'Demo!Key24':key;
      if (preview) el('next').textContent='Это пример. При настоящей выдаче здесь появится личный ключ владельца.';
      el('message').textContent='';
    } catch {
      el('message').textContent='Не удалось получить ответ. Повторите попытку в этой вкладке.';
      el('claim').disabled=false;
    }
  };
  el('copy').onclick=async () => {
    try { await navigator.clipboard.writeText(el('key').value); el('message').textContent='Ключ скопирован.'; }
    catch { el('key').focus();el('key').select();el('message').textContent='Ключ выделен. Скопируйте его.'; }
  };
  window.addEventListener('pagehide',()=>{key='';match=null;el('key').value='';el('received').hidden=true;});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
})();
