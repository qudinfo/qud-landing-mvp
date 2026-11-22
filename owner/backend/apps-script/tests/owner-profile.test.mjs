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
