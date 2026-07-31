/**
 * Guarded weekly-update entry point.
 *
 * Runs the existing weekly calculation and then checks every portfolio snapshot
 * written during this run against the final `portfolios` KPI row. A mismatch
 * stops the run with a descriptive error instead of remaining silent.
 *
 * Use this function for manual runs and future triggers:
 *   runQudVirtualPortfolioWeeklyUpdateValidated
 */
function runQudVirtualPortfolioWeeklyUpdateValidated() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  const startedAtMs = Date.now();
  try {
    const result = vpw_run_();
    const appliedStrategyPeriods = Number(result.applied_strategy_periods) || 0;
    const validatedSnapshots = vpwg_assertUpdatedPortfolioSnapshots_(
      startedAtMs,
      appliedStrategyPeriods
    );

    result.validated_portfolio_snapshots = validatedSnapshots;
    return result;
  } finally {
    lock.releaseLock();
  }
}

function vpwg_assertUpdatedPortfolioSnapshots_(startedAtMs, appliedStrategyPeriods) {
  const spreadsheet = SpreadsheetApp.openById(QUD_VP_WEEKLY_CONFIG.spreadsheetId);
  const portfolioSheet = vpwg_sheet_(
    spreadsheet,
    QUD_VP_WEEKLY_CONFIG.sheets.portfolios
  );
  const historySheet = vpwg_sheet_(
    spreadsheet,
    QUD_VP_WEEKLY_CONFIG.sheets.portfolioHistory
  );

  const portfolioTable = vpwg_readTable_(portfolioSheet);
  const historyTable = vpwg_readTable_(historySheet);
  const runHistoryRows = historyTable.objects.filter((row) => {
    const updatedAtMs = Date.parse(String(row.updated_at_utc || ''));
    return Number.isFinite(updatedAtMs) && updatedAtMs >= startedAtMs;
  });

  if (appliedStrategyPeriods > 0 && runHistoryRows.length === 0) {
    throw new Error('PORTFOLIO_HISTORY_VALIDATION_MISSING_FOR_APPLIED_PERIODS');
  }

  const latestHistoryByPortfolio = new Map();
  runHistoryRows.forEach((row) => {
    const portfolioId = String(row.portfolio_id);
    const existing = latestHistoryByPortfolio.get(portfolioId);
    if (!existing || vpwg_historySortValue_(row) > vpwg_historySortValue_(existing)) {
      latestHistoryByPortfolio.set(portfolioId, row);
    }
  });

  const portfolioById = new Map(
    portfolioTable.objects.map((row) => [String(row.portfolio_id), row])
  );

  latestHistoryByPortfolio.forEach((historyRow, portfolioId) => {
    const portfolioRow = portfolioById.get(portfolioId);
    if (!portfolioRow) throw new Error('PORTFOLIO_NOT_FOUND_' + portfolioId);

    vpwg_assertRowConsistency_(
      portfolioSheet,
      portfolioTable.headers,
      portfolioRow._rowNumber,
      historySheet,
      historyTable.headers,
      historyRow._rowNumber
    );
  });

  return latestHistoryByPortfolio.size;
}

function vpwg_assertRowConsistency_(
  portfolioSheet,
  portfolioHeaders,
  portfolioRowNumber,
  historySheet,
  historyHeaders,
  historyRowNumber
) {
  const portfolioMap = vpwg_headerMap_(portfolioHeaders);
  const historyMap = vpwg_headerMap_(historyHeaders);
  const checks = [
    ['portfolio_id', 'portfolio_id', 'TEXT'],
    ['status', 'status_after_update', 'TEXT'],
    ['total_allocated_usd', 'total_allocated_usd', 'NUMBER'],
    ['current_balance_usd', 'closing_balance_usd', 'NUMBER'],
    ['peak_balance_usd', 'peak_balance_usd', 'NUMBER'],
    ['portfolio_return_usd', 'portfolio_return_usd', 'NUMBER'],
    ['portfolio_return_pct', 'portfolio_return_pct', 'NUMBER'],
    ['current_drawdown_pct', 'drawdown_pct', 'NUMBER'],
    ['active_strategies_count', 'active_strategies_count', 'NUMBER']
  ];

  checks.forEach((check) => {
    if (portfolioMap[check[0]] === undefined) {
      throw new Error('MISSING_PORTFOLIO_CONSISTENCY_COLUMN_' + check[0]);
    }
    if (historyMap[check[1]] === undefined) {
      throw new Error('MISSING_HISTORY_CONSISTENCY_COLUMN_' + check[1]);
    }
  });

  let mismatches = [];
  let portfolioValues = [];
  let historyValues = [];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    SpreadsheetApp.flush();
    if (attempt > 0) Utilities.sleep(150);

    portfolioValues = portfolioSheet
      .getRange(portfolioRowNumber, 1, 1, portfolioHeaders.length)
      .getValues()[0];
    historyValues = historySheet
      .getRange(historyRowNumber, 1, 1, historyHeaders.length)
      .getValues()[0];

    mismatches = checks.reduce((result, check) => {
      const portfolioValue = portfolioValues[portfolioMap[check[0]]];
      const historyValue = historyValues[historyMap[check[1]]];
      const matches = check[2] === 'NUMBER'
        ? vpwg_numbersClose_(portfolioValue, historyValue)
        : String(portfolioValue).trim() === String(historyValue).trim();

      if (!matches) {
        result.push({
          portfolio_field: check[0],
          history_field: check[1],
          portfolio_value: portfolioValue,
          history_value: historyValue
        });
      }
      return result;
    }, []);

    if (mismatches.length === 0) return;
  }

  const portfolioId = String(portfolioValues[portfolioMap.portfolio_id] || '').trim();
  throw new Error(
    'PORTFOLIO_HISTORY_MISMATCH_' + portfolioId +
    '_HISTORY_ROW_' + historyRowNumber + '_' + JSON.stringify(mismatches)
  );
}

function vpwg_historySortValue_(row) {
  const updatedAt = Date.parse(String(row.updated_at_utc || ''));
  return Number.isFinite(updatedAt) ? updatedAt : 0;
}

function vpwg_numbersClose_(left, right) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return false;

  const tolerance = Math.max(1, Math.abs(leftNumber), Math.abs(rightNumber)) * 1e-9;
  return Math.abs(leftNumber - rightNumber) <= tolerance;
}

function vpwg_readTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { headers: [], objects: [] };

  const headers = values[0].map((value) => String(value).trim());
  const objects = values.slice(1)
    .map((row, index) => {
      const object = { _rowNumber: index + 2 };
      headers.forEach((header, column) => {
        if (header) object[header] = row[column];
      });
      return object;
    })
    .filter((object) => {
      const firstHeader = headers[0];
      return firstHeader && object[firstHeader] !== '' && object[firstHeader] !== null;
    });

  return { headers: headers, objects: objects };
}

function vpwg_headerMap_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    if (header) map[header] = index;
  });
  return map;
}

function vpwg_sheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error('SHEET_NOT_FOUND_' + name);
  return sheet;
}
