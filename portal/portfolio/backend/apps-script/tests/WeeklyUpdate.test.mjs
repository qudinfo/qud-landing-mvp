import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'WeeklyUpdate.gs'), 'utf8');

const requestHeaders = [
  'request_id', 'portfolio_id', 'strategy_id', 'is_latest_strategy_request',
  'status', 'allocated_balance_usd', 'current_balance_usd', 'peak_balance_usd',
  'strategy_return_usd', 'strategy_return_pct', 'current_drawdown_pct',
  'max_drawdown_limit_pct', 'start_date_utc', 'end_date_utc',
  'last_applied_period_end_utc', 'completed_at_utc', 'created_at_utc'
];
const strategyHistoryHeaders = [
  'request_id', 'portfolio_id', 'strategy_id', 'period_start_utc',
  'period_end_utc', 'opening_balance_usd', 'period_return_pct',
  'profit_loss_usd', 'closing_balance_usd', 'peak_balance_usd',
  'drawdown_pct', 'status_after_update', 'applied_at_utc', 'qa_status'
];
const portfolioHistoryHeaders = [
  'portfolio_id', 'period_end_utc', 'total_allocated_usd',
  'opening_balance_usd', 'profit_loss_usd', 'closing_balance_usd',
  'peak_balance_usd', 'portfolio_return_usd', 'portfolio_return_pct',
  'drawdown_pct', 'active_strategies_count', 'status_after_update',
  'updated_at_utc', 'qa_status'
];

function sheet(name, headers, records) {
  const rows = records.map((record) => headers.map((header) => record[header] ?? ''));
  const values = (row, column, height, width) => Array.from({ length: height }, (_, i) =>
    Array.from({ length: width }, (_, j) => {
      const sourceRow = row + i === 1 ? headers : rows[row + i - 2] || [];
      return sourceRow[column + j - 1] ?? '';
    }));
  return {
    getName: () => name,
    getLastRow: () => rows.length + 1,
    getLastColumn: () => headers.length,
    getDataRange: () => ({ getValues: () => [headers, ...rows].map((row) => [...row]) }),
    getRange(row, column, height = 1, width = 1) {
      return {
        getValues: () => values(row, column, height, width),
        getDisplayValue: () => {
          if (headers[column - 1] === 'qa_status' && rows[row - 2]?.[0]) return 'OK';
          return String(values(row, column, 1, 1)[0][0]);
        },
        setValues(input) {
          for (let i = 0; i < height; i += 1) {
            while (rows.length < row + i - 1) rows.push([]);
            for (let j = 0; j < width; j += 1) rows[row + i - 2][column + j - 1] = input[i][j];
          }
        },
        setValue(input) {
          while (rows.length < row - 1) rows.push([]);
          rows[row - 2][column - 1] = input;
        },
        clearContent() {
          for (let i = 0; i < height; i += 1) {
            for (let j = 0; j < width; j += 1) rows[row + i - 2][column + j - 1] = '';
          }
        }
      };
    },
    records: () => rows.filter((row) => row[0] !== '').map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
  };
}

function fixture({ returns = [2, 3], limit = 10, endDate = '2099-01-01' } = {}) {
  const request = {
    request_id: 'QSR-TEST-001', portfolio_id: 'QVP-TEST-001',
    strategy_id: 'QST-TEST-001', is_latest_strategy_request: true,
    status: 'ACTIVE', allocated_balance_usd: 1000,
    current_balance_usd: 1000, peak_balance_usd: 1000,
    strategy_return_usd: 0, strategy_return_pct: 0,
    current_drawdown_pct: 0, max_drawdown_limit_pct: limit,
    start_date_utc: '2020-01-06', end_date_utc: endDate,
    created_at_utc: '2020-01-06T00:00:00Z'
  };
  const periods = returns.map((value, index) => ({
    strategy_id: request.strategy_id, period_type: 'WEEK',
    period_start_utc: index === 0 ? '2020-01-06' : '2020-01-13',
    period_end_utc: index === 0 ? '2020-01-10' : '2020-01-17',
    period_return_pct: value
  }));
  const sheets = {
    portfolios: sheet('portfolios', ['portfolio_id', 'status', 'last_recalc_utc'],
      [{ portfolio_id: request.portfolio_id, status: 'ACTIVE' }]),
    portfolio_strategy_requests: sheet('portfolio_strategy_requests', requestHeaders, [request]),
    strategy_period_history: sheet('strategy_period_history',
      ['strategy_id', 'period_type', 'period_start_utc', 'period_end_utc', 'period_return_pct'], periods),
    portfolio_strategy_history: sheet('portfolio_strategy_history', strategyHistoryHeaders, []),
    portfolio_history: sheet('portfolio_history', portfolioHistoryHeaders, [])
  };
  const context = vm.createContext({
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: (name) => sheets[name] || null }),
      flush: () => {}
    },
    Utilities: { formatDate: (date) => date.toISOString().slice(0, 10), sleep: () => {} }
  });
  vm.runInContext(source, context);
  return { context, sheets };
}

test('a prepared week compounds from the observation balance once and persists matching history', () => {
  const { context, sheets } = fixture();
  const first = context.vpw_run_();
  assert.equal(first.applied_strategy_periods, 2);
  const request = sheets.portfolio_strategy_requests.records()[0];
  const strategy = sheets.portfolio_strategy_history.records();
  const portfolio = sheets.portfolio_history.records();
  assert.equal(request.current_balance_usd, 1050.6);
  assert.ok(Math.abs(request.strategy_return_pct - 5.06) < 1e-9);
  assert.deepEqual(strategy.map((row) => row.opening_balance_usd), [1000, 1020]);
  assert.deepEqual(strategy.map((row) => row.closing_balance_usd), [1020, 1050.6]);
  assert.deepEqual(portfolio.map((row) => row.closing_balance_usd), [1020, 1050.6]);
  assert.equal(portfolio.at(-1).portfolio_return_usd, request.strategy_return_usd);
  assert.equal(request.last_applied_period_end_utc, '2020-01-17');

  const again = context.vpw_run_();
  assert.equal(again.applied_strategy_periods, 0);
  assert.equal(sheets.portfolio_strategy_history.records().length, 2);
  assert.equal(sheets.portfolio_history.records().length, 2);
  assert.equal(sheets.portfolio_strategy_requests.records()[0].current_balance_usd, 1050.6);
});

test('the first completed week reaching the drawdown limit stops the observation', () => {
  const { context, sheets } = fixture({ returns: [-6, 10], limit: 5 });
  const result = context.vpw_run_();
  assert.equal(result.applied_strategy_periods, 1);
  assert.equal(result.stopped_by_drawdown, 1);
  assert.equal(sheets.portfolio_strategy_requests.records()[0].status, 'STOPPED_DD');
  assert.equal(sheets.portfolio_strategy_requests.records()[0].current_balance_usd, 940);
  assert.equal(sheets.portfolio_strategy_history.records()[0].status_after_update, 'STOPPED_DD');
});

test('the end date completes an observation and excludes later periods', () => {
  const { context, sheets } = fixture({ endDate: '2020-01-10' });
  const result = context.vpw_run_();
  assert.equal(result.applied_strategy_periods, 1);
  assert.equal(result.completed_requests, 1);
  assert.equal(sheets.portfolio_strategy_requests.records()[0].status, 'COMPLETED');
  assert.equal(sheets.portfolio_strategy_history.records()[0].period_end_utc, '2020-01-10');
});

test('expiration without a completed week does not invent financial history', () => {
  const { context, sheets } = fixture({ returns: [], endDate: '2020-01-10' });
  const result = context.vpw_run_();
  assert.equal(result.applied_strategy_periods, 0);
  assert.equal(result.completed_requests, 1);
  assert.equal(sheets.portfolio_strategy_requests.records()[0].status, 'COMPLETED');
  assert.equal(sheets.portfolio_strategy_history.records().length, 0);
  assert.equal(sheets.portfolio_history.records().length, 0);
});
