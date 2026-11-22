import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const api = vm.createContext({});
for (const f of ['QudOwnerApiAdapter.gs', 'QudOwnerProfile.gs']) {
  vm.runInContext(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'), api);
}
function fixture() {
  const rows = [
    ['Owner ID','Email владельца','Почта подтверждена (дата)','Дата выдачи ключа','Имя для обращения','Дата выбора имени или пропуска'],
    ['A','a@example.com','','','',''], ['B','b@example.com','','','','']
  ];
  const sheet = {
    getLastColumn: () => rows[0].length, getLastRow: () => rows.length,
    getRange(row, col, height, width) {
      return {getValues: () => rows.slice(row-1,row-1+height).map(r => r.slice(col-1,col-1+width)),
        setValues: ([values]) => rows[row-1].splice(col-1,width,...values)};
    }
  };
  return {rows, run: (owner_id, mode, name) => api.qudOwnerProfileRow_(sheet,{owner_id,mode,name})};
}
test('row ownership, first choice, replay, edit and clear', () => {
  const {run,rows} = fixture();
  assert.equal(run('B','save','Анна').name,'Анна');
  assert.equal(run('A','read').chosen,false);
  assert.equal(run('B','skip','').name,'Анна');
  const date = rows[2][5];
  assert.equal(run('B','edit','Анна-Мария').name,'Анна-Мария');
  assert.equal(run('B','edit','').name,'');
  assert.equal(rows[2][5],date);
  assert.equal(run('A','skip','').chosen,true);
  assert.equal(run('A','read').name,'');
});
test('missing or duplicated owner and invalid name cannot write', () => {
  const {run,rows}=fixture();
  assert.throws(()=>run('C','save','Иван'));
  assert.throws(()=>run('A','edit','=1+1'));
  rows[2][0]='A';
  assert.throws(()=>run('A','save','Иван'));
  assert.deepEqual(rows.slice(1).map(r=>r.slice(-2)),[['',''],['','']]);
});

test('email confirmation binds the active link to one owner and address and preserves the date on replay', async () => {
  const {createHash} = await import('node:crypto');
  const digest = value => createHash('sha256').update(value).digest();
  api.Utilities = {DigestAlgorithm:{SHA_256:0},Charset:{UTF_8:0}, computeDigest:(_,v)=>Array.from(digest(v))};
  api.SpreadsheetApp = {flush() {}};
  const secret = 'a'.repeat(64);
  const issue = (owner,email,token,date) => ['EM-' + digest([owner,email,token].join('\n')).toString('hex'),
    owner,date,'Подтверждение почты','QUD','Ожидает подтверждения'];
  const entries = [['ID события','Owner ID','Дата и время','Действие','Кто выполнил','Результат'],
    issue('A','a@example.com',secret,new Date().toISOString())];
  const log = {getLastRow:()=>entries.length, getRange(r,c,h,w) {
    return {getValues:()=>entries.slice(r-1,r-1+h).map(a=>a.slice(c-1,c-1+w)),
      setValue:v=>{entries[r-1][c-1]=v;}};
  }};
  let date='', writes=0;
  const sheet={getParent:()=>({getSheetByName:()=>log}),
    getRange:(r,c)=>{assert.equal(r,2);assert.equal(c,3);return {setValue:v=>{writes++;date=v;}};}};
  const run=(id,email,key)=>api.qudVerifyOwnerEmail_(sheet,2,3,date,id,email,key);
  assert.throws(()=>run('B','a@example.com',secret));
  assert.throws(()=>run('A','b@example.com',secret));
  assert.throws(()=>run('A','a@example.com','b'.repeat(64)));
  const current=entries[1][2];
  entries[1][2]='2020-01-01T00:00:00Z'; assert.throws(()=>run('A','a@example.com',secret));
  entries[1][2]=current;
  const replacement='c'.repeat(64);
  entries.push(issue('A','a@example.com',replacement,current));
  assert.throws(()=>run('A','a@example.com',secret));
  assert.equal(writes,0);
  assert.equal(run('A','a@example.com',replacement),date);
  assert.equal(run('A','a@example.com',replacement),date);
  assert.equal(writes,1); assert.equal(entries[2][5],'Подтверждено');
});
