// Called under the profile service's script lock, after Worker authentication.
function qudInvitationDigest_(value) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    value, Utilities.Charset.UTF_8));
}

function qudInvitationVerifier_(props, email, key, create) {
  let pepper = props.getProperty('owner.invitation.pepper');
  if (!pepper && create) {
    pepper = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('owner.invitation.pepper', pepper);
  }
  if (!pepper) throw qudOwnerApiError_('PROFILE_CONFIGURATION',500);
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(
    JSON.stringify([email,key]),pepper,Utilities.Charset.UTF_8));
}

function qudInvitationLogin_(email,key) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('owner.credential.' + qudInvitationDigest_(email));
  if (!raw) return QudCabinetKeys.verifyPilotLogin(email,key);
  const stored = JSON.parse(raw);
  if (!stored.active || !qudOwnerApiConstantTimeEqual_(stored.verifier,
      qudInvitationVerifier_(props,email,key,false))) return null;
  return {owner:stored.owner,request:stored.request};
}

function qudClaimInvitation_(owners, input) {
  const invalid = () => { throw qudOwnerApiError_('INVALID_INVITATION',400); };
  const {id,token,key} = input;
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9_.-]{1,80}$/.test(id || '') || !/^[a-f0-9]{64}$/.test(token || '') ||
      typeof key !== 'string' || !/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%()/]{10}$/.test(key) ||
      !/[a-z]/.test(key) || !/[A-Z]/.test(key) || !/[0-9]/.test(key) || !/[^a-z0-9]/i.test(key)) invalid();
  const book = owners.getParent(), issue = book.getSheetByName('Выдача доступа'),
    history = book.getSheetByName('История доступа'), periods = book.getSheetByName('Периоды доступа');
  function records(sheet, headers) {
    const all = sheet.getDataRange().getValues();
    if (headers.some((h,i)=>all[0][i]!==h)) throw qudOwnerApiError_('PROFILE_CONFIGURATION',500);
    return all.slice(1).map((values,i)=>({values,row:i+2}));
  }
  const issueRows = records(issue,['ID заявки','Email из заявки','Заявка','Основание','Доступ с','Доступ по\nвключительно',
    'Приглашение','Отметка отправки','Owner ID','Ключ получен','Первый вход']);
  const matches = issueRows.filter(x=>x.values[0]===id);
  if (matches.length!==1) invalid();
  const {values,row} = matches[0];
  const [,email,status,basis,start,end,mailStatus,,owner,received] = values;
  if (status!=='Одобрена' || !['Отправляется','Отправлено','Проверить отправку'].includes(mailStatus) ||
      !/^(TEST-OWNER-002|QUD-[a-f0-9]{32})$/.test(owner) || !email) invalid();
  if (issueRows.some(x=>x.row!==row && x.values[8] && (x.values[8]===owner || x.values[1]===email))) invalid();
  const date = d => d instanceof Date ? Utilities.formatDate(d,book.getSpreadsheetTimeZone(),'yyyy-MM-dd') : '';
  if (!date(start) || !date(end) || Utilities.formatDate(new Date(),'Europe/Kirov','yyyy-MM-dd')>date(end)) invalid();
  const period = records(periods,['Owner ID','Основание','Доступ с','Доступ по\nвключительно','ID заявки']).filter(x=>x.values[4]===id);
  if (period.length!==1 || period[0].values[0]!==owner || period[0].values[1]!==basis ||
      date(period[0].values[2])!==date(start) || date(period[0].values[3])!==date(end)) invalid();
  const events = records(history,['ID события','Owner ID','Дата и время','Действие','Кто выполнил','Результат'])
    .filter(x=>x.values[1]===owner && x.values[3]==='Приглашение');
  const event = events[events.length-1];
  const ref = 'INV-' + qudInvitationDigest_(JSON.stringify([id,owner,email,basis,date(start),date(end),token]));
  if (!event || !qudOwnerApiConstantTimeEqual_(event.values[0],ref) ||
      !(event.values[2] instanceof Date) || !['Ожидает получения','Ключ получен'].includes(event.values[5])) invalid();
  const age = Date.now()-event.values[2].getTime();
  if (age<0 || age>=86400000) invalid();
  const people = records(owners,['Owner ID','Email владельца','Почта подтверждена (дата)','Статус доступа','Дата выдачи ключа'])
    .filter(x=>x.values[0]===owner || x.values[1]===email);
  if (people.length>1 || (people.length && (people[0].values[0]!==owner ||
      people[0].values[1]!==email || people[0].values[3]!=='Активен'))) invalid();
  if (owner==='TEST-OWNER-002' && !people.length) invalid();
  const props=PropertiesService.getScriptProperties(), slot='owner.credential.'+qudInvitationDigest_(email);
  const verifier=qudInvitationVerifier_(props,email,key,true);
  const stored=JSON.parse(props.getProperty(slot)||'null');
  // Only the same in-memory browser key can finish an interrupted response.
  if (stored && (stored.ref!==ref || stored.owner!==owner || stored.request!==id ||
      !qudOwnerApiConstantTimeEqual_(stored.verifier,verifier) || Date.now()-stored.at>300000)) invalid();
  if (stored?.active) return {claimed:true};
  if (!stored && (received || event.values[5]!=='Ожидает получения')) invalid();
  const credential=stored || {ref,owner,request:id,at:Date.now(),verifier,active:false};
  if (!stored) props.setProperty(slot,JSON.stringify(credential));
  const when=new Date(credential.at);
  if (!people.length) owners.getRange(owners.getLastRow()+1,1,1,5).setValues([[owner,email,when,'Активен',when]]);
  else owners.getRange(people[0].row,3,1,3).setValues([[people[0].values[2] || when,'Активен',when]]);
  issue.getRange(row,10).setValue(when);
  history.getRange(event.row,6).setValue('Ключ получен');
  SpreadsheetApp.flush();
  credential.active=true;
  props.setProperty(slot,JSON.stringify(credential));
  return {claimed:true};
}
