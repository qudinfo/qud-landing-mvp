import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

test('personal portfolios are created once and existing balances and bindings are preserved', () => {
  const source = readFileSync(new URL('../QudOwnerPortfolio.gs', import.meta.url), 'utf8');
  const rows = [
    'portfolio_id subscriber_id status total_allocated_usd current_balance_usd peak_balance_usd portfolio_return_usd portfolio_return_pct current_drawdown_pct active_strategies_count created_at_utc last_recalc_utc'.split(' '),
    ['legacy', 'original', 'ACTIVE', 5000, 5125]
  ];
  const sheet = {getLastRow: () => rows.length, getRange(r, c, h, w) {
    return {
      getValues: () => rows.slice(r - 1, r - 1 + h).map(row => row.slice(c - 1, c - 1 + w)),
      setValues: ([row]) => {assert.equal(r, rows.length + 1); rows.push(Array.from(row));}
    };
  }};
  const owners = ['a', 'b', 'c'].map(letter => 'QUD-' + letter.repeat(32));
  const registry = {getDataRange: () => ({getValues: () => [
    ['Owner ID','Email','Подтверждено','Статус'], ...owners.map((id, index) => [id, '', '', index === 2 ? 'Закрыт' : 'Активен'])
  ]})};
  const env = vm.createContext({
    panel5QUD_CABINET_CONNECTION: {vp: 'test-book'},
    SpreadsheetApp: {openById(id) {assert.equal(id, 'test-book'); return {getSheetByName: () => sheet};}, flush() {}},
    qudOwnerApiError_: code => new Error(code)
  });
  vm.runInContext(source, env);
  const ensure = owner => env.qudEnsureOwnerPortfolio_(registry, owner);
  const a = ensure(owners[0]);
  assert.equal(rows.length, 3);
  assert.match(rows[2][3], /A3;/);
  rows[2][4] = 6111;
  assert.deepEqual(ensure(owners[0]), a);
  const b = ensure(owners[1]);
  assert.notEqual(a.portfolio_id, b.portfolio_id);
  assert.notEqual(a.subscriber_id, b.subscriber_id);
  assert.equal(rows[2][4], 6111);
  assert.equal(rows[1][4], 5125);
  assert.throws(() => ensure(owners[2]), /OWNER_UNAVAILABLE/);
  assert.throws(() => ensure('unknown'), /OWNER_UNAVAILABLE/);
  rows[3][1] = a.subscriber_id;
  assert.throws(() => ensure(owners[0]), /BINDING_CONFLICT/);
  assert.equal(rows.length, 4);
});
