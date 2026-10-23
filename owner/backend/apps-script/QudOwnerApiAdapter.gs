/**
 * QUD Owner API Adapter.
 *
 * Read-only source in the main QUD spreadsheet:
 *   owner_strategy_registry
 *   owner_strategy_snapshot
 *   owner_strategy_history
 *
 * This adapter is deployed as a separate Apps Script Web App for the Owner
 * API. It does not read QUD Core or Virtual Portfolio sheets, does not write
 * financial data, and does not calculate financial metrics.
 */

const QUD_OWNER_API_CONFIG = Object.freeze({
  version: '1.0.0',
  spreadsheetIdProperty: 'QUD_OWNER_SPREADSHEET_ID',
  proxySecretProperty: 'QUD_OWNER_PROXY_SECRET',
  sheets: Object.freeze({
    registry: 'owner_strategy_registry',
    snapshot: 'owner_strategy_snapshot',
    history: 'owner_strategy_history'
  }),
  registryHeaders: Object.freeze([
    'audit_id',
    'strategy_id',
    'owner_visible',
    'strategy_status'
  ]),
  snapshotHeaders: Object.freeze([
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
    'data_status'
  ]),
  historyHeaders: Object.freeze([
    'strategy_id',
    'audit_id',
    'period_start',
    'period_end',
    'period_return_pct',
    'strategy_return_since_start_pct',
    'closed_trades_period',
    'trust_score_snapshot',
    'trust_zone_snapshot',
    'data_status'
  ]),
  strategyIdPattern: /^QST-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
  activeStatus: 'ACTIVE',
  confirmedStatus: 'CONFIRMED'
});

/**
 * Apps Script Web App entry point.
 *
 * Supported protected actions:
 *   ?action=strategies
 *   ?action=strategy&strategy_id=QST-XXXX-XXXX
 */
function doGet(e) {
  try {
    qudOwnerApiAssertProxySecret_(e);

    const action = String(
      e && e.parameter && e.parameter.action || ''
    ).trim().toLowerCase();

    if (action === 'strategies') {
      return qudOwnerApiJson_(qudOwnerApiGetStrategies_());
    }

    if (action === 'strategy') {
      return qudOwnerApiJson_(qudOwnerApiGetStrategy_(
        e && e.parameter && e.parameter.strategy_id
      ));
    }

    throw qudOwnerApiError_('NOT_FOUND', 404);
  } catch (error) {
    return qudOwnerApiErrorResponse_(error);
  }
}

/**
 * Run once from the Apps Script editor before deploying the Web App.
 *
 * It stores only the parent spreadsheet ID in Script Properties and validates
 * the three existing Owner sheets. It does not create or change sheet data.
 */
function setupQudOwnerApiAdapter() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      'Откройте Apps Script из основной QUD-таблицы и повторите запуск.'
    );
  }

  qudOwnerApiValidateSheets_(spreadsheet);

  PropertiesService
    .getScriptProperties()
    .setProperty(
      QUD_OWNER_API_CONFIG.spreadsheetIdProperty,
      spreadsheet.getId()
    );

  return {
    ok: true,
    spreadsheet_configured: true,
    sheets: [
      QUD_OWNER_API_CONFIG.sheets.registry,
      QUD_OWNER_API_CONFIG.sheets.snapshot,
      QUD_OWNER_API_CONFIG.sheets.history
    ],
    message: 'QUD Owner API Adapter готов к read-only проверке'
  };
}

/**
 * Read-only diagnostic for a manual run in the Apps Script editor.
 * It never returns audit_id or any other internal identifier.
 */
function testQudOwnerApiAdapterReadOnly() {
  const listPayload = qudOwnerApiGetStrategies_();
  const strategyIds = listPayload.strategies.map(function(strategy) {
    return strategy.strategy_id;
  });
  let sampleHistoryRows = 0;

  if (strategyIds.length) {
    sampleHistoryRows = qudOwnerApiGetStrategy_(
      strategyIds[0]
    ).history.length;
  }

  const result = {
    ok: true,
    published_strategies: strategyIds.length,
    strategy_ids: strategyIds,
    sample_history_rows: sampleHistoryRows
  };

  Logger.log(JSON.stringify(result));
  return result;
}

function qudOwnerApiGetStrategies_() {
  const spreadsheet = qudOwnerApiSpreadsheet_();
  const allowedByStrategy = qudOwnerApiAllowedStrategies_(spreadsheet);
  const snapshots = qudOwnerApiReadObjects_(
    qudOwnerApiRequiredSheet_(
      spreadsheet,
      QUD_OWNER_API_CONFIG.sheets.snapshot
    ),
    QUD_OWNER_API_CONFIG.snapshotHeaders
  );
  const seen = {};
  const strategies = [];

  snapshots.forEach(function(row) {
    const strategyId = qudOwnerApiNormalizeStrategyId_(row.strategy_id, false);

    if (!strategyId || !allowedByStrategy[strategyId]) {
      return;
    }

    if (seen[strategyId]) {
      throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
    }

    qudOwnerApiAssertAuditMatch_(
      allowedByStrategy[strategyId].audit_id,
      row.audit_id
    );
    seen[strategyId] = true;
    strategies.push(qudOwnerApiPublicListStrategy_(row, strategyId));
  });

  strategies.sort(function(left, right) {
    return left.strategy_id.localeCompare(right.strategy_id);
  });

  return { ok: true, strategies: strategies };
}

function qudOwnerApiGetStrategy_(value) {
  const strategyId = qudOwnerApiNormalizeStrategyId_(value, true);
  const spreadsheet = qudOwnerApiSpreadsheet_();
  const allowedByStrategy = qudOwnerApiAllowedStrategies_(spreadsheet);
  const registryEntry = allowedByStrategy[strategyId];

  // Use the same response for absent and non-publishable strategies so the
  // endpoint cannot be used to enumerate the private registry.
  if (!registryEntry) {
    throw qudOwnerApiError_('STRATEGY_NOT_FOUND', 404);
  }

  const snapshots = qudOwnerApiReadObjects_(
    qudOwnerApiRequiredSheet_(
      spreadsheet,
      QUD_OWNER_API_CONFIG.sheets.snapshot
    ),
    QUD_OWNER_API_CONFIG.snapshotHeaders
  ).filter(function(row) {
    return qudOwnerApiNormalizeStrategyId_(row.strategy_id, false) ===
      strategyId;
  });

  if (snapshots.length > 1) {
    throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
  }

  if (!snapshots.length) {
    throw qudOwnerApiError_('STRATEGY_DATA_NOT_FOUND', 404);
  }

  qudOwnerApiAssertAuditMatch_(registryEntry.audit_id, snapshots[0].audit_id);

  const historyRows = qudOwnerApiReadObjects_(
    qudOwnerApiRequiredSheet_(
      spreadsheet,
      QUD_OWNER_API_CONFIG.sheets.history
    ),
    QUD_OWNER_API_CONFIG.historyHeaders
  ).filter(function(row) {
    return qudOwnerApiNormalizeStrategyId_(row.strategy_id, false) ===
      strategyId &&
      String(row.data_status || '').trim().toUpperCase() ===
        QUD_OWNER_API_CONFIG.confirmedStatus;
  });
  const historyKeys = {};
  const history = historyRows.map(function(row) {
    qudOwnerApiAssertAuditMatch_(registryEntry.audit_id, row.audit_id);
    const publicRow = qudOwnerApiPublicHistoryRow_(row);
    const key = publicRow.period_start + '|' + publicRow.period_end;

    if (historyKeys[key]) {
      throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
    }

    historyKeys[key] = true;
    return publicRow;
  });

  history.sort(function(left, right) {
    return left.period_end.localeCompare(right.period_end) ||
      left.period_start.localeCompare(right.period_start);
  });

  return {
    ok: true,
    strategy: qudOwnerApiPublicDetailStrategy_(snapshots[0], strategyId),
    history: history
  };
}

function qudOwnerApiPublicListStrategy_(row, strategyId) {
  return {
    strategy_id: strategyId,
    trust_score: qudOwnerApiRequiredNumber_(row.trust_score),
    trust_zone: qudOwnerApiRequiredText_(row.trust_zone),
    win_ratio_pct: qudOwnerApiRequiredNumber_(row.win_ratio_pct),
    history_weeks_count: qudOwnerApiRequiredNumber_(
      row.history_weeks_count
    ),
    data_period_end: qudOwnerApiRequiredDateIso_(row.data_period_end),
    data_status: qudOwnerApiRequiredText_(row.data_status).toUpperCase()
  };
}

function qudOwnerApiPublicDetailStrategy_(row, strategyId) {
  return {
    strategy_id: strategyId,
    trust_score: qudOwnerApiRequiredNumber_(row.trust_score),
    trust_zone: qudOwnerApiRequiredText_(row.trust_zone),
    history_weeks_count: qudOwnerApiRequiredNumber_(
      row.history_weeks_count
    ),
    closed_trades_total: qudOwnerApiRequiredNumber_(
      row.closed_trades_total
    ),
    strategy_return_since_start_pct: qudOwnerApiRequiredNumber_(
      row.strategy_return_since_start_pct
    ),
    max_drawdown_since_start_pct: qudOwnerApiOptionalNumber_(
      row.max_drawdown_since_start_pct
    ),
    win_ratio_pct: qudOwnerApiRequiredNumber_(row.win_ratio_pct),
    profit_factor: qudOwnerApiOptionalNumber_(row.profit_factor),
    average_risk_pct: qudOwnerApiOptionalNumber_(row.average_risk_pct),
    sl_safe_pct: qudOwnerApiOptionalNumber_(row.sl_safe_pct),
    risk_cv_pct: qudOwnerApiOptionalNumber_(row.risk_cv_pct),
    data_period_end: qudOwnerApiRequiredDateIso_(row.data_period_end),
    data_status: qudOwnerApiRequiredText_(row.data_status).toUpperCase()
  };
}

function qudOwnerApiPublicHistoryRow_(row) {
  const periodStart = qudOwnerApiRequiredDateIso_(row.period_start);
  const periodEnd = qudOwnerApiRequiredDateIso_(row.period_end);

  if (periodStart > periodEnd) {
    throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
  }

  return {
    period_start: periodStart,
    period_end: periodEnd,
    period_return_pct: qudOwnerApiRequiredNumber_(row.period_return_pct),
    strategy_return_since_start_pct: qudOwnerApiRequiredNumber_(
      row.strategy_return_since_start_pct
    ),
    closed_trades_period: qudOwnerApiRequiredNumber_(
      row.closed_trades_period
    ),
    trust_score_snapshot: Number(row.closed_trades_period) === 0 &&
      (row.trust_score_snapshot === '' || row.trust_score_snapshot === null) &&
      String(row.trust_zone_snapshot || '').trim() === 'NO_TRADES'
        ? null : qudOwnerApiRequiredNumber_(row.trust_score_snapshot),
    trust_zone_snapshot: qudOwnerApiRequiredText_(
      row.trust_zone_snapshot
    )
  };
}

function qudOwnerApiAllowedStrategies_(spreadsheet) {
  const rows = qudOwnerApiReadObjects_(
    qudOwnerApiRequiredSheet_(
      spreadsheet,
      QUD_OWNER_API_CONFIG.sheets.registry
    ),
    QUD_OWNER_API_CONFIG.registryHeaders
  );
  const allowed = {};

  rows.forEach(function(row) {
    const strategyId = qudOwnerApiNormalizeStrategyId_(row.strategy_id, false);
    const visible = qudOwnerApiBoolean_(row.owner_visible);
    const status = String(row.strategy_status || '').trim().toUpperCase();

    if (!strategyId || !visible || status !== QUD_OWNER_API_CONFIG.activeStatus) {
      return;
    }

    if (allowed[strategyId]) {
      throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
    }

    allowed[strategyId] = {
      audit_id: qudOwnerApiRequiredText_(row.audit_id)
    };
  });

  return allowed;
}

function qudOwnerApiValidateSheets_(spreadsheet) {
  qudOwnerApiReadObjects_(
    qudOwnerApiRequiredSheet_(
      spreadsheet,
      QUD_OWNER_API_CONFIG.sheets.registry
    ),
    QUD_OWNER_API_CONFIG.registryHeaders
  );
  qudOwnerApiReadObjects_(
    qudOwnerApiRequiredSheet_(
      spreadsheet,
      QUD_OWNER_API_CONFIG.sheets.snapshot
    ),
    QUD_OWNER_API_CONFIG.snapshotHeaders
  );
  qudOwnerApiReadObjects_(
    qudOwnerApiRequiredSheet_(
      spreadsheet,
      QUD_OWNER_API_CONFIG.sheets.history
    ),
    QUD_OWNER_API_CONFIG.historyHeaders
  );
}

function qudOwnerApiSpreadsheet_() {
  const spreadsheetId = String(
    PropertiesService
      .getScriptProperties()
      .getProperty(QUD_OWNER_API_CONFIG.spreadsheetIdProperty) || ''
  ).trim();

  if (!spreadsheetId) {
    throw qudOwnerApiError_('OWNER_API_NOT_CONFIGURED', 500);
  }

  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throw qudOwnerApiError_('OWNER_API_NOT_CONFIGURED', 500);
  }
}

function qudOwnerApiRequiredSheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    throw qudOwnerApiError_('OWNER_DATA_SCHEMA_INVALID', 500);
  }

  return sheet;
}

function qudOwnerApiReadObjects_(sheet, requiredHeaders) {
  const range = sheet.getDataRange();
  const rawValues = range.getValues();
  const displayValues = range.getDisplayValues();
  const required = requiredHeaders.map(qudOwnerApiNormalizeHeader_);
  const scanLimit = Math.min(displayValues.length, 30);
  let headerRowIndex = -1;
  let headerMap = {};

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const candidateMap = {};

    displayValues[rowIndex].forEach(function(value, columnIndex) {
      const key = qudOwnerApiNormalizeHeader_(value);
      if (key) candidateMap[key] = columnIndex;
    });

    if (required.every(function(key) {
      return candidateMap[key] !== undefined;
    })) {
      headerRowIndex = rowIndex;
      headerMap = candidateMap;
      break;
    }
  }

  if (headerRowIndex < 0) {
    throw qudOwnerApiError_('OWNER_DATA_SCHEMA_INVALID', 500);
  }

  const objects = [];

  for (
    let rowIndex = headerRowIndex + 1;
    rowIndex < displayValues.length;
    rowIndex += 1
  ) {
    const hasValue = displayValues[rowIndex].some(function(value) {
      return String(value || '').trim() !== '';
    });

    if (!hasValue) continue;

    const object = {};
    requiredHeaders.forEach(function(header) {
      const columnIndex = headerMap[qudOwnerApiNormalizeHeader_(header)];
      const raw = rawValues[rowIndex][columnIndex];
      const display = displayValues[rowIndex][columnIndex];
      object[header] = raw === '' || raw === null || raw === undefined
        ? String(display || '').trim()
        : raw;
    });
    objects.push(object);
  }

  return objects;
}

function qudOwnerApiAssertProxySecret_(e) {
  const expected = String(
    PropertiesService
      .getScriptProperties()
      .getProperty(QUD_OWNER_API_CONFIG.proxySecretProperty) || ''
  ).trim();
  const supplied = String(
    e && e.parameter && e.parameter.proxy_secret || ''
  ).trim();

  if (!expected) {
    throw qudOwnerApiError_('OWNER_API_NOT_CONFIGURED', 500);
  }

  if (!qudOwnerApiConstantTimeEqual_(supplied, expected)) {
    throw qudOwnerApiError_('UNAUTHORIZED_PROXY', 401);
  }
}

function qudOwnerApiConstantTimeEqual_(left, right) {
  const first = String(left || '');
  const second = String(right || '');
  const length = Math.max(first.length, second.length);
  let difference = first.length ^ second.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (first.charCodeAt(index) || 0) ^
      (second.charCodeAt(index) || 0);
  }

  return difference === 0;
}

function qudOwnerApiAssertAuditMatch_(expected, actual) {
  if (
    String(expected || '').trim().toLowerCase() !==
    String(actual || '').trim().toLowerCase()
  ) {
    throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
  }
}

function qudOwnerApiNormalizeStrategyId_(value, required) {
  const strategyId = String(value || '').trim().toUpperCase();

  if (!strategyId && !required) return '';

  if (!QUD_OWNER_API_CONFIG.strategyIdPattern.test(strategyId)) {
    throw qudOwnerApiError_('INVALID_STRATEGY_ID', 400);
  }

  return strategyId;
}

function qudOwnerApiBoolean_(value) {
  return value === true ||
    String(value || '').trim().toUpperCase() === 'TRUE';
}

function qudOwnerApiRequiredText_(value) {
  const text = String(value === null || value === undefined ? '' : value)
    .trim();

  if (!text) {
    throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
  }

  return text;
}

function qudOwnerApiRequiredNumber_(value) {
  if (value === '' || value === null || value === undefined) {
    throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
  }

  const number = Number(value);

  if (!isFinite(number)) {
    throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
  }

  return number;
}

function qudOwnerApiOptionalNumber_(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  return qudOwnerApiRequiredNumber_(value);
}

function qudOwnerApiRequiredDateIso_(value) {
  const date = qudOwnerApiParseDate_(value);

  if (!date) {
    throw qudOwnerApiError_('OWNER_DATA_INCONSISTENT', 500);
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}

function qudOwnerApiParseDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number' && isFinite(value)) {
    return new Date(
      Date.UTC(1899, 11, 30) +
      Math.round(value * 24 * 60 * 60 * 1000)
    );
  }

  const text = String(value || '').trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Date.UTC(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3])
    ));
  }

  const european = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (european) {
    return new Date(Date.UTC(
      Number(european[3]),
      Number(european[2]) - 1,
      Number(european[1])
    ));
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function qudOwnerApiNormalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function qudOwnerApiError_(code, status) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

function qudOwnerApiErrorResponse_(error) {
  const code = String(error && error.code || 'INTERNAL_ERROR');
  const safeCode = /^[A-Z0-9_-]{2,100}$/.test(code)
    ? code
    : 'INTERNAL_ERROR';
  const status = Number(error && error.status);

  return qudOwnerApiJson_({
    ok: false,
    error: safeCode,
    status: Number.isInteger(status) && status >= 400 && status <= 599
      ? status
      : 500
  });
}

function qudOwnerApiJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
