const QUD_OWNER_PROFILE_DEFAULT_SHEET = ''; // Set privately at deployment or use the script property.
// The spreadsheet ID is configured only in the deployed Apps Script project.
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    qudOwnerApiAssertProxySecret_({parameter: {proxy_secret: body.proxy_secret}});
    if (body.action !== 'owner_profile') throw qudOwnerApiError_('NOT_FOUND', 404);
    const sheetId = PropertiesService.getScriptProperties().getProperty('QUD_OWNER_SERVICE_SHEET_ID') || QUD_OWNER_PROFILE_DEFAULT_SHEET;
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Владельцы');
    if (!sheet) throw qudOwnerApiError_('PROFILE_CONFIGURATION', 500);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const profile = qudOwnerProfileRow_(sheet, body);
      SpreadsheetApp.flush();
      return qudOwnerApiJson_({ok: true, profile: profile});
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return qudOwnerApiErrorResponse_(error);
  }
}

function qudOwnerProfileRow_(sheet, body) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  function column(label) {
    const n = headers.indexOf(label);
    if (n < 0 || headers.lastIndexOf(label) !== n) throw qudOwnerApiError_('PROFILE_CONFIGURATION', 500);
    return n;
  }
  const id = column('Owner ID');
  const name = column('Имя для обращения');
  const choice = column('Дата выбора имени или пропуска');
  const email = column('Email владельца');
  const verified = column('Почта подтверждена (дата)');
  const issued = column('Дата выдачи ключа');
  if (choice !== name + 1) throw qudOwnerApiError_('PROFILE_CONFIGURATION', 500);
  if (typeof body.owner_id !== 'string' || !body.owner_id.trim()) throw qudOwnerApiError_('PROFILE_UNAVAILABLE', 404);
  const count = sheet.getLastRow() - 1;
  const ids = count > 0 ? sheet.getRange(2, id + 1, count, 1).getValues() : [];
  const matches = [];
  ids.forEach((cell, index) => { if (String(cell[0]).trim() === body.owner_id) matches.push(index + 2); });
  if (matches.length !== 1) throw qudOwnerApiError_('PROFILE_UNAVAILABLE', matches.length ? 409 : 404);
  const row = matches[0];
  const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  let currentName = String(values[name] || '');
  let chosen = Boolean(values[choice]);
  if (body.mode === 'verify_email') {
    values[verified] = qudVerifyOwnerEmail_(sheet, row, verified + 1, values[verified],
      body.owner_id, String(values[email]).trim().toLowerCase(), body.token);
  } else if (body.mode !== 'read') {
    const edit = body.mode === 'edit';
    if (!edit && body.mode !== 'skip' && body.mode !== 'save') throw qudOwnerApiError_('INVALID_CHOICE', 400);
    const value = typeof body.name === 'string' ? body.name.trim() : null;
    if (value === null || (body.mode === 'save' && !value) || (body.mode === 'skip' && value) ||
        (value && !/^[\p{L}][\p{L}\p{M} ’'\-]{0,59}$/u.test(value))) throw qudOwnerApiError_('INVALID_NAME', 400);
    if (edit || !chosen) {
      // One operation for both fields. Preserve the first choice date on later edits.
      sheet.getRange(row, name + 1, 1, 2).setValues([[value, values[choice] || new Date()]]);
      currentName = value;
      chosen = true;
    }
  }
  return {name: currentName, chosen: chosen, email: String(values[email] || ''),
    email_verified: Boolean(values[verified]), key_issued: String(values[issued] instanceof Date ? values[issued].toISOString() : values[issued] || '')};
}


function qudVerifyOwnerEmail_(sheet, row, column, confirmed, ownerId, email, token) {
  function invalidLink() { return qudOwnerApiError_('INVALID_EMAIL_LINK', 400); }
  if (!email || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw invalidLink();
  const log = sheet.getParent().getSheetByName('История доступа');
  const headers = ['ID события','Owner ID','Дата и время','Действие','Кто выполнил','Результат'];
  if (!log || log.getRange(1, 1, 1, 6).getValues()[0].some((value, i) => value !== headers[i])) {
    throw qudOwnerApiError_('PROFILE_CONFIGURATION', 500);
  }
  const length = log.getLastRow() - 1;
  const entries = length > 0 ? log.getRange(2, 1, length, 6).getValues() : [];
  let index = entries.length - 1;
  while (index >= 0 && !(entries[index][1] === ownerId && entries[index][3] === 'Подтверждение почты')) index--;
  if (index < 0) throw invalidLink();
  const event = entries[index];
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    [ownerId, email, token].join('\n'), Utilities.Charset.UTF_8);
  const expected = 'EM-' + digest.map(byte => ('0' + (byte & 255).toString(16)).slice(-2)).join('');
  if (!qudOwnerApiConstantTimeEqual_(String(event[0]), expected)) throw invalidLink();
  if (event[5] === 'Подтверждено' && confirmed) return confirmed;
  const start = new Date(event[2]).getTime();
  const age = Date.now() - start;
  if (event[5] !== 'Ожидает подтверждения' || !Number.isFinite(age) || age < 0 || age > 86400000) throw invalidLink();
  const date = confirmed || new Date();
  if (!confirmed) {
    sheet.getRange(row, column).setValue(date);
    SpreadsheetApp.flush();
  }
  log.getRange(index + 2, 6).setValue('Подтверждено');
  return date;
}
