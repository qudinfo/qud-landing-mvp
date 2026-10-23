const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeRange {
  constructor(sheet) {
    this.sheet = sheet;
  }

  getValues() {
    return this.sheet.values.map((row) => row.slice());
  }

  getDisplayValues() {
    return this.sheet.values.map((row) => row.map(displayValue));
  }
}

class FakeSheet {
  constructor(name, values) {
    this.name = name;
    this.values = values.map((row) => row.slice());
  }

  getName() { return this.name; }
  getDataRange() { return new FakeRange(this); }
}

class FakeSpreadsheet {
  constructor(id, sheets) {
    this.id = id;
    this.sheets = new Map(sheets.map((sheet) => [sheet.getName(), sheet]));
  }

  getId() { return this.id; }
  getSheetByName(name) { return this.sheets.get(name) || null; }
}

class FakeTextOutput {
  constructor(text) {
    this.text = text;
    this.mimeType = '';
  }

  setMimeType(value) {
    this.mimeType = value;
    return this;
  }

  getContent() { return this.text; }
}

function displayValue(value) {
  if (value === true) return 'TRUE';
  if (value === false) return 'FALSE';
  if (value && typeof value.getUTCFullYear === 'function') {
    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, '0'),
      String(value.getUTCDate()).padStart(2, '0')
    ].join('-');
  }
  return value === null || value === undefined ? '' : String(value);
}

function formatDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function parseOutput(output) {
  return JSON.parse(output.getContent());
}

function assertExactKeys(object, expected) {
  assert.deepEqual(Object.keys(object).sort(), expected.slice().sort());
}

function assertNoPrivateFields(value) {
  const serialized = JSON.stringify(value);
  for (const field of [
    'audit_id',
    'trader_id',
    'account_login',
    'email',
    'published_at',
    'proxy_secret'
  ]) {
    assert.equal(serialized.includes(`"${field}"`), false, field);
  }
}

const registry = new FakeSheet('owner_strategy_registry', [
  [
    'audit_id',
    'trader_id',
    'strategy_id',
    'trust_history_start',
    'eligibility_mode',
    'owner_visible',
    'strategy_status',
    'manual_admission_at',
    'manual_admission_reason'
  ],
  [
    'aud_00003', 'trd_private_1', 'QST-CAUZ-MPE9', '2026-05-03',
    'MANUAL', true, 'ACTIVE', '2026-09-08T12:00:00Z', 'Allowed'
  ],
  [
    'aud_00013', 'trd_private_2', 'QST-BCR2-FXY8', '2026-05-09',
    'MANUAL', false, 'SUSPENDED', '2026-09-08T12:00:00Z', 'Hidden'
  ]
]);

const snapshot = new FakeSheet('owner_strategy_snapshot', [
  [
    'strategy_id',
    'audit_id',
    'trust_score',
    'trust_zone',
    'history_weeks_count',
    'closed_trades_total',
    'strategy_return_since_start_pct',
    'max_drawdown_since_start_pct',
    'win_ratio_pct',
    'profit_factor',
    'average_risk_pct',
    'sl_safe_pct',
    'risk_cv_pct',
    'data_period_end',
    'published_at',
    'data_status'
  ],
  [
    'QST-CAUZ-MPE9', 'aud_00003', 60, 'QUD Room', 2, 7,
    4.575463732020002, '', 85.71428571428571, 5.2646337188923935,
    1.5671133333333331, '', 0.3431520984375707,
    new Date('2026-05-16T00:00:00Z'), '2026-09-08T12:00:00Z', 'CONFIRMED'
  ],
  [
    'QST-BCR2-FXY8', 'aud_00013', 50, 'QUD Room', 1, 2,
    1, '', 50, 1, 1, '', 0.2,
    new Date('2026-07-10T00:00:00Z'), '2026-09-08T12:00:00Z', 'CONFIRMED'
  ]
]);

const history = new FakeSheet('owner_strategy_history', [
  [
    'strategy_id',
    'audit_id',
    'period_start',
    'period_end',
    'period_return_pct',
    'strategy_return_since_start_pct',
    'max_drawdown_since_start_pct',
    'closed_trades_period',
    'trust_score_snapshot',
    'trust_zone_snapshot',
    'data_status',
    'published_at'
  ],
  [
    'QST-CAUZ-MPE9', 'aud_00003', '2026-05-10', '2026-05-16',
    3.4470165678029074, 4.575463732020002, '', 3, 30.42, 'pre QUD',
    'CONFIRMED', '2026-09-08T12:00:00Z'
  ],
  [
    'QST-CAUZ-MPE9', 'aud_00003', '2026-05-03', '2026-05-09',
    1.0908455377999893, 1.0908455377999893, '', 4, 22.34, 'pre QUD',
    'CONFIRMED', '2026-09-08T12:00:00Z'
  ],
  [
    'QST-BCR2-FXY8', 'aud_00013', '2026-07-04', '2026-07-10',
    1, 1, '', 2, 50, 'QUD Room', 'CONFIRMED', '2026-09-08T12:00:00Z'
  ]
]);

const spreadsheet = new FakeSpreadsheet(
  'MAIN_QUD_SPREADSHEET_ID',
  [registry, snapshot, history]
);
const properties = new Map([
  ['QUD_OWNER_SPREADSHEET_ID', 'MAIN_QUD_SPREADSHEET_ID'],
  ['QUD_OWNER_PROXY_SECRET', 'test-proxy-secret']
]);

const context = vm.createContext({
  console,
  Date,
  Error,
  JSON,
  Math,
  Object,
  RegExp,
  String,
  Array,
  Boolean,
  Number,
  Map,
  Set,
  isFinite,
  isNaN,
  SpreadsheetApp: {
    getActiveSpreadsheet: () => spreadsheet,
    openById: (id) => {
      if (id !== spreadsheet.getId()) throw new Error('Unknown spreadsheet');
      return spreadsheet;
    }
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (name) => properties.get(name) || '',
      setProperty: (name, value) => {
        properties.set(name, value);
        return this;
      }
    })
  },
  Utilities: { formatDate: (date) => formatDate(date) },
  Session: { getScriptTimeZone: () => 'UTC' },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: (text) => new FakeTextOutput(text)
  },
  Logger: { log: () => {} }
});

for (const fileName of [
  'QudOwnerControl.gs',
  'QudOwnerDataPublisher.gs',
  'QudOwnerApiAdapter.gs'
]) {
  const sourcePath = path.join(__dirname, '..', fileName);
  vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, {
    filename: sourcePath
  });
}

const setup = context.setupQudOwnerApiAdapter();
assert.equal(setup.ok, true);
assert.equal(properties.get('QUD_OWNER_SPREADSHEET_ID'), spreadsheet.getId());

const invalidSecret = parseOutput(context.doGet({
  parameter: { action: 'strategies', proxy_secret: 'wrong' }
}));
assert.deepEqual(invalidSecret, {
  ok: false,
  error: 'UNAUTHORIZED_PROXY',
  status: 401
});

const list = parseOutput(context.doGet({
  parameter: { action: 'strategies', proxy_secret: 'test-proxy-secret' }
}));
assert.equal(list.ok, true);
assert.equal(list.strategies.length, 1);
assertExactKeys(list.strategies[0], [
  'strategy_id',
  'trust_score',
  'trust_zone',
  'win_ratio_pct',
  'history_weeks_count',
  'data_period_end',
  'data_status'
]);
assert.equal(list.strategies[0].strategy_id, 'QST-CAUZ-MPE9');
assert.equal(list.strategies[0].data_period_end, '2026-05-16');
assertNoPrivateFields(list);

const detail = parseOutput(context.doGet({
  parameter: {
    action: 'strategy',
    strategy_id: 'qst-cauz-mpe9',
    proxy_secret: 'test-proxy-secret'
  }
}));
assert.equal(detail.ok, true);
assertExactKeys(detail.strategy, [
  'strategy_id',
  'trust_score',
  'trust_zone',
  'history_weeks_count',
  'closed_trades_total',
  'strategy_return_since_start_pct',
  'max_drawdown_since_start_pct',
  'win_ratio_pct',
  'profit_factor',
  'average_risk_pct',
  'sl_safe_pct',
  'risk_cv_pct',
  'data_period_end',
  'data_status'
]);
assert.equal(detail.strategy.max_drawdown_since_start_pct, null);
assert.equal(detail.strategy.sl_safe_pct, null);
assert.equal(detail.history.length, 2);
assert.equal(detail.history[0].period_start, '2026-05-03');
assert.equal(detail.history[1].period_end, '2026-05-16');
const noTradePublic = context.qudOwnerApiPublicHistoryRow_({
  period_start:'2026-06-20',period_end:'2026-06-26',period_return_pct:0.2,
  strategy_return_since_start_pct:4.7,closed_trades_period:0,
  trust_score_snapshot:'',trust_zone_snapshot:'NO_TRADES'
});
assert.equal(noTradePublic.trust_score_snapshot,null);
assert.equal(noTradePublic.period_return_pct,0.2);
assert.throws(() => context.qudOwnerApiPublicHistoryRow_({
  ...noTradePublic,closed_trades_period:1
}), /OWNER_DATA_INCONSISTENT|500/);
assertExactKeys(detail.history[0], [
  'period_start',
  'period_end',
  'period_return_pct',
  'strategy_return_since_start_pct',
  'closed_trades_period',
  'trust_score_snapshot',
  'trust_zone_snapshot'
]);
assertNoPrivateFields(detail);

const hidden = parseOutput(context.doGet({
  parameter: {
    action: 'strategy',
    strategy_id: 'QST-BCR2-FXY8',
    proxy_secret: 'test-proxy-secret'
  }
}));
assert.deepEqual(hidden, {
  ok: false,
  error: 'STRATEGY_NOT_FOUND',
  status: 404
});

const diagnostic = context.testQudOwnerApiAdapterReadOnly();
assert.equal(diagnostic.ok, true);
assert.deepEqual(Array.from(diagnostic.strategy_ids), ['QST-CAUZ-MPE9']);
assert.equal(diagnostic.sample_history_rows, 2);

console.log('QudOwnerApiAdapter tests passed');
