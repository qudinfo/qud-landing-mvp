// Shared by the authenticated Owner service and the spreadsheet administrator panel.
const QUD_SUPPORT_HEADERS_ = ['ID обращения','ID сообщения','Owner ID','Дата и время','Отправитель','Текст сообщения','Статус отправки','ID письма','ID почтовой цепочки'];

function qudSupportLog_(book) {
  const sheet = book.getSheetByName('Обращения и ответы');
  if (!sheet || sheet.getRange(1, 1, 1, 9).getValues()[0].some((v, i) => v !== QUD_SUPPORT_HEADERS_[i])) {
    throw Error('Проверьте заголовки листа «Обращения и ответы».');
  }
  return sheet;
}

function qudSupportRows_(log) {
  const count = log.getLastRow() - 1;
  return count > 0 ? log.getRange(2, 1, count, 7).getValues() : [];
}

function qudSupportText_(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > 4000) throw Error('Введите сообщение длиной до 4000 символов.');
  return text;
}

function qudSupportId_(id) {
  return typeof id === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id);
}

function qudSupportBody_(cell) {
  return String(cell).replace(/^\u200b/, '');
}

function qudSupportAppend_(log, rows, ticket, id, owner, sender, body) {
  if (!qudSupportId_(id)) throw Error('Обновите окно и повторите отправку.');
  const previous = rows.find(r => r[1] === id);
  if (previous) {
    if (previous[0] !== ticket || previous[2] !== owner || previous[4] !== sender || qudSupportBody_(previous[5]) !== body) {
      throw Error('Обновите переписку перед отправкой.');
    }
    return;
  }
  // Prevent Sheets from interpreting a message as a formula. Keep numeric text literal too.
  const cell = '\u200b' + body;
  log.appendRow([ticket, id, owner, new Date(), sender, cell, 'Доставлено', '', '']);
}

function qudOwnerSupport_(owners, input) {
  const owner = input.owner_id;
  const profile = qudOwnerProfileRow_(owners, {owner_id: owner, mode: 'read'});
  const email = profile.email_verified ? profile.email.trim() : '';
  const log = qudSupportLog_(owners.getParent());
  const rows = qudSupportRows_(log);
  const mine = rows.filter(r => r[2] === owner);
  if (input.mode === 'send') {
    if (!email) throw qudOwnerApiError_('EMAIL_NOT_VERIFIED', 403);
    qudSupportAppend_(log, rows, input.message_id, input.message_id, owner, 'Владелец', qudSupportText_(input.message));
    return {ok: true};
  }
  if (input.mode === 'mark_read') {
    const index = rows.findIndex(r => r[2] === owner && r[1] === input.message_id && r[4] === 'QUD');
    if (index < 0) throw qudOwnerApiError_('MESSAGE_NOT_FOUND', 404);
    if (rows[index][6] !== 'Прочитано') log.getRange(index + 2, 7).setValue('Прочитано');
    return {ok: true};
  }
  if (input.mode !== 'list') throw qudOwnerApiError_('INVALID_REQUEST', 400);
  const messages = mine.filter(r => r[4] === 'Владелец' || r[4] === 'QUD').map(r => ({
    id: r[1], direction: r[4] === 'QUD' ? 'qud' : 'owner', body: qudSupportBody_(r[5]),
    created_at: r[3] instanceof Date ? r[3].toISOString() : String(r[3]), read: r[6] === 'Прочитано'
  }));
  return {ok: true, owner_email: email, messages: messages,
    unread_count: messages.filter(m => m.direction === 'qud' && !m.read).length};
}
