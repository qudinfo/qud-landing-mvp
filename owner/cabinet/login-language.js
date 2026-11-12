(() => {
 const ru = new URLSearchParams(location.search).get('lang') === 'ru';
 document.documentElement.lang = ru ? 'ru' : 'en';
 document.title = ru ? 'Вход — QUD Capital Owner' : 'Log in — QUD Capital Owner';
 if (ru) document.querySelector('label[for="owner-key"]').textContent = 'Ключ доступа';
 const set = (selector, en) => { const e = document.querySelector(selector); if (e && !ru) e.textContent = en; };
 set('#login-title', 'Log in to your account');
 set('label[for="owner-email"]', 'Email');
 set('#owner-login-submit', 'Log in');
 set('.auth-login-content a', 'About QUD access');
 set('#owner-loading p', 'Loading');
 set('#unavailable-title', 'Unable to check your session');
 set('#owner-unavailable p', 'The service is temporarily unavailable. Please try again.');
 set('#owner-retry', 'Try again');
 const link = document.querySelector('.auth-login-content a'); if (link) link.href = ru ? 'https://fx-qud.com/ru/owner/access/' : 'https://fx-qud.com/owner/access/';
 const note = document.querySelector('#owner-local-preview-note'); if (note) note.hidden = true;
})();
