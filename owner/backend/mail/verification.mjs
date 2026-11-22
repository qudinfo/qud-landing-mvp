import { createHash, randomBytes } from 'node:crypto';

// Admin-side preparation for the existing access log and Gmail delivery.
// Save accessEvent before sending message. Keep the rendered message private.
export function prepareVerificationEmail({ ownerId, email, name = '' }) {
  const address = email.trim().toLowerCase();
  if (!ownerId?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    throw new Error('Укажите владельца и адрес из его профиля.');
  }
  const token = randomBytes(32).toString('hex');
  const reference = createHash('sha256').update([ownerId, address, token].join('\n')).digest('hex');
  const url = 'https://fx-qud.com/owner/cabinet/?lang=ru#verify-email=' + reference + '.' + token;
  const displayName = name.trim();
  const greeting = displayName ? 'Здравствуйте, ' + displayName + '!' : 'Здравствуйте!';
  const escaped = greeting.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const html = `<div lang="ru" style="font:16px/1.5 Arial,sans-serif;color:#202124">
<p>${escaped}</p>
<p>Пожалуйста, подтвердите почту для связи с QUD.</p>
<a href="${url}" style="display:inline-block;background:#202129;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Подтвердить почту</a>
<p style="margin:6px 0 24px;font-size:13px;color:#595e66">Кнопка действует 24 часа</p>
<p>С уважением,<br>QUD <a href="https://fx-qud.com/">https://fx-qud.com/</a></p>
</div>`;
  return {
    accessEvent: ['EM-' + reference, ownerId, new Date().toISOString(), 'Подтверждение почты', 'QUD', 'Ожидает подтверждения'],
    message: {to: address, subject: 'QUD — подтверждение электронной почты',
      payload: {mime_type: 'text/html', charset: 'UTF-8', body: {content: html}}}
  };
}
