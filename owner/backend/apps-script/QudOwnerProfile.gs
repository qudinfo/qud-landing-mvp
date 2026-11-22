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
  if (body.mode !== 'read') {
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
