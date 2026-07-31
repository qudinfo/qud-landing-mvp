const QUD_VP_WEEKLY_CONFIG = Object.freeze({
  spreadsheetId: '1XVsMiFtpLSuB7z4OcQ1heDj4oD2JhJ_Su3QwyzSQyG8',
  sheets: Object.freeze({
    portfolios: 'portfolios',
    apiPortfolios: 'api_portfolios',
    requests: 'portfolio_strategy_requests',
    sourcePeriods: 'strategy_period_history',
    strategyHistory: 'portfolio_strategy_history',
    portfolioHistory: 'portfolio_history'
  })
});

/**
 * Manual production entry point.
 *
 * Applies only complete WEEK periods already present in QUD Virtual Portfolio.
 * The main QUD spreadsheet is never opened or modified by this module.
 *
 * The consistency guard is part of this entry point and cannot be bypassed by
 * choosing the legacy function name from the Apps Script function selector.
 */
function runQudVirtualPortfolioWeeklyUpdate() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  const startedAtMs = Date.now();
  try {
    const result = vpw_run_();
    const validation = vpw_assertConsistencyWithRetry_({
      historyRowsSinceMs: startedAtMs,
      requireRunHistory: Number(result.applied_strategy_periods) > 0,
      compareHistory: Number(result.applied_strategy_periods) > 0,
      mode: 'WEEKLY_RUN'
    });

    result.validated_portfolios = validation.validated_portfolios;
    result.validated_history_snapshots = validation.validated_history_snapshots;
    result.validated_strategy_history_snapshots =
      validation.validated_strategy_history_snapshots;
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Backward-compatible entry point.
 * It delegates to the guarded production function, so the check cannot be skipped.
 */
function runQudVirtualPortfolioWeeklyUpdateValidated() {
  return runQudVirtualPortfolioWeeklyUpdate();
}

/**
 * Read-only current-state check.
 *
 * Does not change financial data, request states, timestamps, or history.
 * Compares `portfolios`, `api_portfolios`, and the latest `portfolio_history`
 * snapshot for every portfolio.
 */
function runQudVirtualPortfolioConsistencyCheck() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const result = vpw_assertConsistencyWithRetry_({
      historyRowsSinceMs: null,
      requireRunHistory: false,
      compareHistory: true,
      mode: 'READ_ONLY_CURRENT_STATE'
    });

    result.ok = true;
    result.checked_at_utc = new Date().toISOString();
    return result;
  } finally {
    lock.releaseLock();
  }
}

function vpw_run_() {
  const spreadsheet = SpreadsheetApp.openById(QUD_VP_WEEKLY_CONFIG.spreadsheetId);
  const portfolioSheet = vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.portfolios);
  const requestSheet = vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.requests);
  const sourcePeriodSheet = vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.sourcePeriods);
  const strategyHistorySheet = vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.strategyHistory);
  const portfolioHistorySheet = vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.portfolioHistory);

  const portfolioTable = vpw_readTable_(portfolioSheet);
  const requestTable = vpw_readTable_(requestSheet);
  const sourcePeriodTable = vpw_readTable_(sourcePeriodSheet);
  const strategyHistoryTable = vpw_readTable_(strategyHistorySheet);
  const portfolioHistoryTable = vpw_readTable_(portfolioHistorySheet);
  const strategyHistoryRows = strategyHistoryTable.objects.slice();
  const portfolioHistoryRows = portfolioHistoryTable.objects.slice();

  const today = vpw_utcDate_(new Date());
  const strategyHistoryKeys = new Set(
    strategyHistoryRows.map((row) => (
      String(row.request_id) + '|' + vpw_dateKey_(row.period_end_utc)
    ))
  );
  const portfolioHistoryByKey = new Map(
    portfolioHistoryRows.map((row) => [
      String(row.portfolio_id) + '|' + vpw_dateKey_(row.period_end_utc),
      row
    ])
  );

  const portfoliosById = new Map(
    portfolioTable.objects.map((row) => [String(row.portfolio_id), row])
  );
  const latestRequests = requestTable.objects.filter((row) => (
    vpw_boolean_(row.is_latest_strategy_request) &&
    String(row.status) !== 'CANCELLED'
  ));
  const activeRequests = latestRequests.filter(
    (row) => String(row.status) === 'ACTIVE'
  );
  const periodsByStrategy = vpw_groupSourcePeriods_(sourcePeriodTable.objects);
  const events = vpw_buildEvents_(
    activeRequests,
    periodsByStrategy,
    strategyHistoryKeys,
    today
  );
  const groups = vpw_groupEventsByPeriod_(events);

  let appliedStrategyPeriods = 0;
  let createdPortfolioSnapshots = 0;
  let updatedPortfolioSnapshots = 0;
  let stoppedByDrawdown = 0;
  let completedRequests = 0;

  groups.forEach((group, periodEndKey) => {
    const openingByPortfolio = new Map();
    const appliedPortfolioIds = new Set();

    group.forEach((event) => {
      const portfolioId = String(event.request.portfolio_id);
      if (!openingByPortfolio.has(portfolioId)) {
        openingByPortfolio.set(
          portfolioId,
          vpw_aggregatePortfolio_(latestRequests, portfolioId)
        );
      }
    });

    group.forEach((event) => {
      const request = event.request;
      if (String(request.status) !== 'ACTIVE') return;

      const historyKey = String(request.request_id) + '|' + periodEndKey;
      if (strategyHistoryKeys.has(historyKey)) return;

      const openingBalance = Number(request.current_balance_usd);
      const periodReturnPct = Number(event.period.period_return_pct);
      const profitLossUsd = openingBalance * periodReturnPct / 100;
      const closingBalance = openingBalance + profitLossUsd;
      const previousPeak = Math.max(
        Number(request.peak_balance_usd) || 0,
        Number(request.allocated_balance_usd) || 0
      );
      const peakBalance = Math.max(previousPeak, closingBalance);
      const drawdownPct = peakBalance > 0
        ? Math.max(0, (peakBalance - closingBalance) / peakBalance * 100)
        : 0;

      let statusAfterUpdate = 'ACTIVE';
      const drawdownLimit = Number(request.max_drawdown_limit_pct);

      if (drawdownPct >= drawdownLimit) {
        statusAfterUpdate = 'STOPPED_DD';
        stoppedByDrawdown += 1;
      } else if (event.periodEndDate >= vpw_date_(request.end_date_utc)) {
        statusAfterUpdate = 'COMPLETED';
        completedRequests += 1;
      }

      const appliedAt = new Date().toISOString();
      const strategyHistoryValues = [
        request.request_id,
        request.portfolio_id,
        request.strategy_id,
        vpw_dateKey_(event.period.period_start_utc),
        periodEndKey,
        openingBalance,
        periodReturnPct,
        profitLossUsd,
        closingBalance,
        peakBalance,
        drawdownPct,
        statusAfterUpdate,
        appliedAt
      ];
      const strategyHistoryRowNumber = vpw_appendAndAssert_(
        strategyHistorySheet,
        strategyHistoryValues
      );
      strategyHistoryRows.push({
        _rowNumber: strategyHistoryRowNumber,
        request_id: request.request_id,
        portfolio_id: request.portfolio_id,
        strategy_id: request.strategy_id,
        period_start_utc: vpw_dateKey_(event.period.period_start_utc),
        period_end_utc: periodEndKey,
        opening_balance_usd: openingBalance,
        period_return_pct: periodReturnPct,
        profit_loss_usd: profitLossUsd,
        closing_balance_usd: closingBalance,
        peak_balance_usd: peakBalance,
        drawdown_pct: drawdownPct,
        status_after_update: statusAfterUpdate,
        applied_at_utc: appliedAt
      });

      request.current_balance_usd = closingBalance;
      request.peak_balance_usd = peakBalance;
      request.strategy_return_usd =
        closingBalance - Number(request.allocated_balance_usd);
      request.strategy_return_pct = Number(request.allocated_balance_usd) > 0
        ? request.strategy_return_usd /
          Number(request.allocated_balance_usd) * 100
        : 0;
      request.current_drawdown_pct = drawdownPct;
      request.last_applied_period_end_utc = periodEndKey;
      request.status = statusAfterUpdate;
      if (statusAfterUpdate !== 'ACTIVE') {
        request.completed_at_utc = appliedAt;
      }

      vpw_writeRequestState_(requestSheet, requestTable.headers, request);
      strategyHistoryKeys.add(historyKey);
      appliedPortfolioIds.add(String(request.portfolio_id));
      appliedStrategyPeriods += 1;
    });

    SpreadsheetApp.flush();

    appliedPortfolioIds.forEach((portfolioId) => {
      const portfolio = portfoliosById.get(portfolioId);
      if (!portfolio) {
        throw new Error('PORTFOLIO_NOT_FOUND_' + portfolioId);
      }

      const historyKey = portfolioId + '|' + periodEndKey;
      const existingHistory = portfolioHistoryByKey.get(historyKey) || null;
      const snapshot = vpw_buildPortfolioSnapshot_({
        requests: requestTable.objects,
        strategyHistoryRows: strategyHistoryRows,
        portfolioHistoryRows: portfolioHistoryRows,
        portfolioId: portfolioId,
        periodEndKey: periodEndKey
      });
      const updatedAt = new Date().toISOString();
      const historyValues = [
        portfolioId,
        periodEndKey,
        snapshot.total_allocated_usd,
        snapshot.opening_balance_usd,
        snapshot.profit_loss_usd,
        snapshot.closing_balance_usd,
        snapshot.peak_balance_usd,
        snapshot.portfolio_return_usd,
        snapshot.portfolio_return_pct,
        snapshot.drawdown_pct,
        snapshot.active_strategies_count,
        String(portfolio.status || 'ACTIVE'),
        updatedAt
      ];

      let historyRow = existingHistory;
      if (existingHistory) {
        vpw_replaceAndAssert_(
          portfolioHistorySheet,
          existingHistory._rowNumber,
          historyValues
        );
        updatedPortfolioSnapshots += 1;
      } else {
        const rowNumber = vpw_appendAndAssert_(
          portfolioHistorySheet,
          historyValues
        );
        historyRow = { _rowNumber: rowNumber };
        portfolioHistoryRows.push(historyRow);
        portfolioHistoryByKey.set(historyKey, historyRow);
        createdPortfolioSnapshots += 1;
      }
      Object.assign(historyRow, snapshot, {
        portfolio_id: portfolioId,
        period_end_utc: periodEndKey,
        status_after_update: String(portfolio.status || 'ACTIVE'),
        updated_at_utc: updatedAt
      });

      // Columns D:J contain permanent KPI formulas. Only the timestamp is written.
      portfolio.peak_balance_usd = snapshot.peak_balance_usd;
      portfolio.last_recalc_utc = updatedAt;
      vpw_touchPortfolio_(
        portfolioSheet,
        portfolioTable.headers,
        portfolio
      );
    });

    SpreadsheetApp.flush();
  });

  // A request can expire without a confirmed week ending exactly on its end date.
  activeRequests.forEach((request) => {
    if (String(request.status) !== 'ACTIVE') return;
    if (vpw_date_(request.end_date_utc) > today) return;

    request.status = 'COMPLETED';
    request.completed_at_utc = new Date().toISOString();
    vpw_writeRequestState_(requestSheet, requestTable.headers, request);
    completedRequests += 1;
  });

  const finalTimestamp = new Date().toISOString();
  portfoliosById.forEach((portfolio) => {
    portfolio.last_recalc_utc = finalTimestamp;
    vpw_touchPortfolio_(
      portfolioSheet,
      portfolioTable.headers,
      portfolio
    );
  });

  SpreadsheetApp.flush();

  return {
    ok: true,
    applied_strategy_periods: appliedStrategyPeriods,
    created_portfolio_snapshots: createdPortfolioSnapshots,
    updated_portfolio_snapshots: updatedPortfolioSnapshots,
    stopped_by_drawdown: stoppedByDrawdown,
    completed_requests: completedRequests,
    processed_at_utc: finalTimestamp
  };
}

function vpw_groupSourcePeriods_(periods) {
  const result = new Map();

  periods.forEach((period) => {
    if (String(period.period_type).toUpperCase() !== 'WEEK') return;
    if (!Number.isFinite(Number(period.period_return_pct))) return;

    const strategyId = String(period.strategy_id);
    if (!result.has(strategyId)) result.set(strategyId, []);
    result.get(strategyId).push(period);
  });

  result.forEach((rows) => {
    rows.sort(
      (a, b) =>
        vpw_date_(a.period_end_utc) - vpw_date_(b.period_end_utc)
    );
  });

  return result;
}

function vpw_buildEvents_(requests, periodsByStrategy, historyKeys, today) {
  const events = [];

  requests.forEach((request) => {
    const requestId = String(request.request_id);
    const startDate = vpw_date_(request.start_date_utc);
    const endDate = vpw_date_(request.end_date_utc);
    const periods =
      periodsByStrategy.get(String(request.strategy_id)) || [];

    periods.forEach((period) => {
      const periodStart = vpw_date_(period.period_start_utc);
      const periodEnd = vpw_date_(period.period_end_utc);
      const periodEndKey = vpw_dateKey_(period.period_end_utc);
      const historyKey = requestId + '|' + periodEndKey;

      // Never apply a partial week that began before the request.
      if (periodStart < startDate) return;
      if (periodEnd > endDate || periodEnd > today) return;
      if (historyKeys.has(historyKey)) return;

      events.push({
        request: request,
        period: period,
        periodEndKey: periodEndKey,
        periodEndDate: periodEnd
      });
    });
  });

  events.sort((a, b) => {
    const byDate = a.periodEndDate - b.periodEndDate;
    if (byDate !== 0) return byDate;
    return String(a.request.request_id).localeCompare(
      String(b.request.request_id)
    );
  });

  return events;
}

function vpw_groupEventsByPeriod_(events) {
  const groups = new Map();

  events.forEach((event) => {
    if (!groups.has(event.periodEndKey)) {
      groups.set(event.periodEndKey, []);
    }
    groups.get(event.periodEndKey).push(event);
  });

  return groups;
}

function vpw_aggregatePortfolio_(latestRequests, portfolioId) {
  return latestRequests
    .filter((request) => (
      String(request.portfolio_id) === String(portfolioId) &&
      String(request.status) !== 'CANCELLED'
    ))
    .reduce((result, request) => {
      result.totalAllocated +=
        Number(request.allocated_balance_usd) || 0;
      result.currentBalance +=
        Number(request.current_balance_usd) || 0;
      if (String(request.status) === 'ACTIVE') {
        result.activeCount += 1;
      }
      return result;
    }, {
      totalAllocated: 0,
      currentBalance: 0,
      activeCount: 0
    });
}


/**
 * Rebuilds one portfolio period from request-level strategy history.
 * Existing portfolio snapshots are never used as the opening/P&L source.
 */
function vpw_buildPortfolioSnapshot_(options) {
  const portfolioId = String(options.portfolioId);
  const periodEndKey = vpw_dateKey_(options.periodEndKey);
  const periodEndMs = vpw_date_(periodEndKey);
  const selectedRequests = vpw_selectRequestsAtPeriodEnd_(
    options.requests,
    portfolioId,
    periodEndMs
  );
  if (selectedRequests.length === 0) {
    throw new Error(
      'NO_REQUESTS_FOR_PORTFOLIO_PERIOD_' + portfolioId + '_' + periodEndKey
    );
  }

  let totalAllocated = 0;
  let openingBalance = 0;
  let profitLossUsd = 0;
  let closingBalance = 0;
  let activeCount = 0;

  selectedRequests.forEach((request) => {
    const requestId = String(request.request_id);
    const allocated = vpw_finiteNumber_(
      request.allocated_balance_usd,
      'ALLOCATED_BALANCE_' + requestId
    );
    const historyRows = options.strategyHistoryRows
      .filter((row) => (
        String(row.request_id) === requestId &&
        vpw_date_(row.period_end_utc) <= periodEndMs
      ))
      .sort((a, b) => (
        vpw_date_(a.period_end_utc) - vpw_date_(b.period_end_utc)
      ));
    const exactRows = historyRows.filter((row) => (
      vpw_date_(row.period_end_utc) === periodEndMs
    ));
    if (exactRows.length > 1) {
      throw new Error(
        'DUPLICATE_STRATEGY_HISTORY_' + requestId + '_' + periodEndKey
      );
    }

    const exactRow = exactRows[0] || null;
    const latestRow = historyRows.length
      ? historyRows[historyRows.length - 1]
      : null;
    const requestClosing = latestRow
      ? vpw_finiteNumber_(
          latestRow.closing_balance_usd,
          'STRATEGY_CLOSING_' + requestId
        )
      : allocated;
    const requestOpening = exactRow
      ? vpw_finiteNumber_(
          exactRow.opening_balance_usd,
          'STRATEGY_OPENING_' + requestId
        )
      : requestClosing;
    const requestProfitLoss = exactRow
      ? vpw_finiteNumber_(
          exactRow.profit_loss_usd,
          'STRATEGY_PROFIT_LOSS_' + requestId
        )
      : 0;
    if (!vpw_numbersClose_(
      requestOpening + requestProfitLoss,
      requestClosing
    )) {
      throw new Error(
        'STRATEGY_HISTORY_MATH_FAILED_' + requestId + '_' + periodEndKey
      );
    }

    let statusAtPeriodEnd = latestRow
      ? String(latestRow.status_after_update || 'ACTIVE')
      : 'ACTIVE';
    if (
      statusAtPeriodEnd === 'ACTIVE' &&
      vpw_date_(request.end_date_utc) <= periodEndMs
    ) {
      statusAtPeriodEnd = 'COMPLETED';
    }

    totalAllocated += allocated;
    openingBalance += requestOpening;
    profitLossUsd += requestProfitLoss;
    closingBalance += requestClosing;
    if (statusAtPeriodEnd === 'ACTIVE') activeCount += 1;
  });

  if (!vpw_numbersClose_(
    openingBalance + profitLossUsd,
    closingBalance
  )) {
    throw new Error(
      'PORTFOLIO_PERIOD_MATH_FAILED_' + portfolioId + '_' + periodEndKey
    );
  }

  const previousPeak = options.portfolioHistoryRows
    .filter((row) => (
      String(row.portfolio_id) === portfolioId &&
      vpw_date_(row.period_end_utc) < periodEndMs
    ))
    .reduce((maximum, row) => Math.max(
      maximum,
      Number(row.peak_balance_usd) || 0
    ), 0);
  const peakBalance = Math.max(
    previousPeak,
    openingBalance,
    closingBalance
  );
  const portfolioReturnUsd = closingBalance - totalAllocated;
  const portfolioReturnPct = totalAllocated > 0
    ? portfolioReturnUsd / totalAllocated * 100
    : 0;
  const drawdownPct = peakBalance > 0
    ? Math.max(0, (peakBalance - closingBalance) / peakBalance * 100)
    : 0;

  return {
    portfolio_id: portfolioId,
    period_end_utc: periodEndKey,
    total_allocated_usd: totalAllocated,
    opening_balance_usd: openingBalance,
    profit_loss_usd: profitLossUsd,
    closing_balance_usd: closingBalance,
    peak_balance_usd: peakBalance,
    portfolio_return_usd: portfolioReturnUsd,
    portfolio_return_pct: portfolioReturnPct,
    drawdown_pct: drawdownPct,
    active_strategies_count: activeCount
  };
}

function vpw_selectRequestsAtPeriodEnd_(requests, portfolioId, periodEndMs) {
  const selectedByStrategy = new Map();
  requests.forEach((request) => {
    if (String(request.portfolio_id) !== String(portfolioId)) return;
    if (String(request.status) === 'CANCELLED') return;
    if (vpw_date_(request.start_date_utc) > periodEndMs) return;
    const strategyId = String(request.strategy_id);
    const existing = selectedByStrategy.get(strategyId);
    if (!existing || vpw_requestIsLater_(request, existing)) {
      selectedByStrategy.set(strategyId, request);
    }
  });
  return Array.from(selectedByStrategy.values());
}

function vpw_requestIsLater_(candidate, existing) {
  const candidateStart = vpw_date_(candidate.start_date_utc);
  const existingStart = vpw_date_(existing.start_date_utc);
  if (candidateStart !== existingStart) return candidateStart > existingStart;
  const candidateCreated = Date.parse(String(candidate.created_at_utc || ''));
  const existingCreated = Date.parse(String(existing.created_at_utc || ''));
  const candidateSafe = Number.isFinite(candidateCreated) ? candidateCreated : 0;
  const existingSafe = Number.isFinite(existingCreated) ? existingCreated : 0;
  if (candidateSafe !== existingSafe) return candidateSafe > existingSafe;
  return Number(candidate._rowNumber || 0) > Number(existing._rowNumber || 0);
}

function vpw_finiteNumber_(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('INVALID_NUMBER_' + label);
  return number;
}

function vpw_writeRequestState_(sheet, headers, request) {
  const map = vpw_headerMap_(headers);
  const values = {
    status: request.status,
    current_balance_usd: request.current_balance_usd,
    peak_balance_usd: request.peak_balance_usd,
    strategy_return_usd: request.strategy_return_usd,
    strategy_return_pct: request.strategy_return_pct,
    current_drawdown_pct: request.current_drawdown_pct,
    last_applied_period_end_utc: request.last_applied_period_end_utc,
    completed_at_utc: request.completed_at_utc || ''
  };

  Object.keys(values).forEach((header) => {
    if (map[header] === undefined) {
      throw new Error('MISSING_REQUEST_COLUMN_' + header);
    }
    sheet
      .getRange(request._rowNumber, map[header] + 1)
      .setValue(values[header]);
  });
}

function vpw_touchPortfolio_(sheet, headers, portfolio) {
  const map = vpw_headerMap_(headers);

  if (map.last_recalc_utc === undefined) {
    throw new Error(
      'MISSING_PORTFOLIO_COLUMN_last_recalc_utc'
    );
  }

  sheet
    .getRange(portfolio._rowNumber, map.last_recalc_utc + 1)
    .setValue(portfolio.last_recalc_utc);
}

function vpw_appendAndAssert_(sheet, values) {
  const rowNumber = vpw_firstEmptyRow_(sheet, 1, 2);
  sheet
    .getRange(rowNumber, 1, 1, values.length)
    .setValues([values]);
  SpreadsheetApp.flush();
  vpw_assertQa_(sheet, rowNumber, values.length);
  return rowNumber;
}

function vpw_replaceAndAssert_(sheet, rowNumber, values) {
  sheet
    .getRange(rowNumber, 1, 1, values.length)
    .setValues([values]);
  SpreadsheetApp.flush();
  vpw_assertQa_(sheet, rowNumber, values.length);
}

function vpw_assertQa_(sheet, rowNumber, dataWidth) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];
  const map = vpw_headerMap_(
    headers.map((value) => String(value).trim())
  );

  if (map.qa_status === undefined) {
    throw new Error('MISSING_QA_STATUS_' + sheet.getName());
  }

  let status = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    SpreadsheetApp.flush();
    status = String(
      sheet
        .getRange(rowNumber, map.qa_status + 1)
        .getDisplayValue()
    ).trim();

    if (status) break;
    Utilities.sleep(100);
  }

  if (status !== 'OK') {
    sheet
      .getRange(rowNumber, 1, 1, dataWidth)
      .clearContent();
    SpreadsheetApp.flush();
    throw new Error(
      'QA_FAILED_' +
      sheet.getName() +
      '_ROW_' +
      rowNumber +
      '_' +
      status
    );
  }
}

/**
 * Retries formula-backed comparisons to avoid a false mismatch while Sheets
 * is still recalculating after SpreadsheetApp.flush().
 */
function vpw_assertConsistencyWithRetry_(options) {
  let result = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    SpreadsheetApp.flush();
    if (attempt > 0) Utilities.sleep(250);

    result = vpw_collectConsistency_(options);
    if (result.mismatches.length === 0) {
      return {
        mode: options.mode,
        validated_portfolios: result.validatedPortfolios,
        validated_history_snapshots:
          result.validatedHistorySnapshots,
        validated_strategy_history_snapshots:
          result.validatedStrategyHistorySnapshots
      };
    }
  }

  throw new Error(
    'PORTFOLIO_CONSISTENCY_FAILED_' +
    options.mode +
    '_' +
    JSON.stringify(result.mismatches.slice(0, 25))
  );
}

function vpw_collectConsistency_(options) {
  const spreadsheet = SpreadsheetApp.openById(
    QUD_VP_WEEKLY_CONFIG.spreadsheetId
  );
  const portfolioTable = vpw_readTable_(
    vpw_sheet_(
      spreadsheet,
      QUD_VP_WEEKLY_CONFIG.sheets.portfolios
    )
  );
  const apiPortfolioTable = vpw_readTable_(
    vpw_sheet_(
      spreadsheet,
      QUD_VP_WEEKLY_CONFIG.sheets.apiPortfolios
    )
  );
  const historyTable = vpw_readTable_(
    vpw_sheet_(
      spreadsheet,
      QUD_VP_WEEKLY_CONFIG.sheets.portfolioHistory
    )
  );
  const requestTable = vpw_readTable_(
    vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.requests)
  );
  const strategyHistoryTable = vpw_readTable_(
    vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.strategyHistory)
  );

  const mismatches = [];
  const portfolioById = vpw_mapById_(
    portfolioTable.objects,
    'portfolio_id',
    mismatches,
    'PORTFOLIOS'
  );
  const apiById = vpw_mapById_(
    apiPortfolioTable.objects,
    'portfolio_id',
    mismatches,
    'API_PORTFOLIOS'
  );

  vpw_assertSameIdSet_(
    portfolioById,
    apiById,
    mismatches,
    'PORTFOLIOS',
    'API_PORTFOLIOS'
  );

  const apiPairs = [
    ['portfolio_id', 'portfolio_id', 'TEXT'],
    ['subscriber_id', 'subscriber_id', 'TEXT'],
    ['status', 'status', 'TEXT'],
    ['total_allocated_usd', 'total_allocated_usd', 'NUMBER'],
    ['current_balance_usd', 'current_balance_usd', 'NUMBER'],
    ['peak_balance_usd', 'peak_balance_usd', 'NUMBER'],
    ['portfolio_return_usd', 'portfolio_return_usd', 'NUMBER'],
    ['portfolio_return_pct', 'portfolio_return_pct', 'NUMBER'],
    ['current_drawdown_pct', 'current_drawdown_pct', 'NUMBER'],
    ['active_strategies_count', 'active_strategies_count', 'NUMBER']
  ];

  portfolioById.forEach((portfolioRow, portfolioId) => {
    const apiRow = apiById.get(portfolioId);
    if (!apiRow) return;

    vpw_compareRows_(
      portfolioRow,
      apiRow,
      apiPairs,
      mismatches,
      'PORTFOLIOS',
      'API_PORTFOLIOS',
      portfolioId
    );
  });

  let candidateHistoryRows = historyTable.objects.slice();

  if (options.historyRowsSinceMs !== null) {
    const lowerBound = Number(options.historyRowsSinceMs) - 1000;
    candidateHistoryRows = candidateHistoryRows.filter((row) => {
      const value = Date.parse(String(row.updated_at_utc || ''));
      return Number.isFinite(value) && value >= lowerBound;
    });
  }

  if (
    options.requireRunHistory &&
    candidateHistoryRows.length === 0
  ) {
    mismatches.push({
      type: 'RUN_HISTORY_MISSING',
      history_rows_since_ms: options.historyRowsSinceMs
    });
  }

  const latestHistoryByPortfolio =
    vpw_latestHistoryByPortfolio_(candidateHistoryRows);

  if (options.compareHistory) {
    // Portfolio history is a financial snapshot. Request expiration can change
    // active-count/status after the snapshot without changing its financial KPI,
    // so those two operational fields are intentionally checked only between
    // `portfolios` and `api_portfolios`.
    const historyPairs = [
      ['portfolio_id', 'portfolio_id', 'TEXT'],
      ['total_allocated_usd', 'total_allocated_usd', 'NUMBER'],
      ['current_balance_usd', 'closing_balance_usd', 'NUMBER'],
      ['peak_balance_usd', 'peak_balance_usd', 'NUMBER'],
      ['portfolio_return_usd', 'portfolio_return_usd', 'NUMBER'],
      ['portfolio_return_pct', 'portfolio_return_pct', 'NUMBER'],
      ['current_drawdown_pct', 'drawdown_pct', 'NUMBER']
    ];

    const historyPortfolioIds =
      options.historyRowsSinceMs === null
        ? Array.from(portfolioById.keys())
        : Array.from(latestHistoryByPortfolio.keys());

    historyPortfolioIds.forEach((portfolioId) => {
      const portfolioRow = portfolioById.get(portfolioId);
      const historyRow = latestHistoryByPortfolio.get(portfolioId);

      if (!portfolioRow) {
        mismatches.push({
          type: 'PORTFOLIO_MISSING_FOR_HISTORY',
          portfolio_id: portfolioId
        });
        return;
      }

      if (!historyRow) {
        mismatches.push({
          type: 'LATEST_HISTORY_MISSING',
          portfolio_id: portfolioId,
          history_scope:
            options.historyRowsSinceMs === null
              ? 'ALL'
              : 'CURRENT_RUN'
        });
        return;
      }

      vpw_compareRows_(
        portfolioRow,
        historyRow,
        historyPairs,
        mismatches,
        'PORTFOLIOS',
        'PORTFOLIO_HISTORY',
        portfolioId
      );

      const apiRow = apiById.get(portfolioId);
      if (apiRow) {
        vpw_compareRows_(
          apiRow,
          historyRow,
          historyPairs,
          mismatches,
          'API_PORTFOLIOS',
          'PORTFOLIO_HISTORY',
          portfolioId
        );
      }

      try {
        const rebuilt = vpw_buildPortfolioSnapshot_({
          requests: requestTable.objects,
          strategyHistoryRows: strategyHistoryTable.objects,
          portfolioHistoryRows: historyTable.objects,
          portfolioId: portfolioId,
          periodEndKey: historyRow.period_end_utc
        });
        const rebuiltPairs = [
          ['total_allocated_usd', 'total_allocated_usd', 'NUMBER'],
          ['opening_balance_usd', 'opening_balance_usd', 'NUMBER'],
          ['profit_loss_usd', 'profit_loss_usd', 'NUMBER'],
          ['closing_balance_usd', 'closing_balance_usd', 'NUMBER'],
          ['peak_balance_usd', 'peak_balance_usd', 'NUMBER'],
          ['portfolio_return_usd', 'portfolio_return_usd', 'NUMBER'],
          ['portfolio_return_pct', 'portfolio_return_pct', 'NUMBER'],
          ['drawdown_pct', 'drawdown_pct', 'NUMBER'],
          ['active_strategies_count', 'active_strategies_count', 'NUMBER']
        ];
        vpw_compareRows_(
          rebuilt,
          historyRow,
          rebuiltPairs,
          mismatches,
          'REBUILT_FROM_STRATEGY_HISTORY',
          'PORTFOLIO_HISTORY',
          portfolioId
        );
      } catch (error) {
        mismatches.push({
          type: 'STRATEGY_HISTORY_REBUILD_FAILED',
          portfolio_id: portfolioId,
          period_end_utc: historyRow.period_end_utc,
          error: String(error && error.message || error)
        });
      }
    });
  }

  return {
    mismatches: mismatches,
    validatedPortfolios: portfolioById.size,
    validatedHistorySnapshots:
      options.compareHistory
        ? latestHistoryByPortfolio.size
        : 0,
    validatedStrategyHistorySnapshots:
      options.compareHistory
        ? latestHistoryByPortfolio.size
        : 0
  };
}

function vpw_compareRows_(
  leftRow,
  rightRow,
  pairs,
  mismatches,
  leftName,
  rightName,
  portfolioId
) {
  pairs.forEach((pair) => {
    const leftField = pair[0];
    const rightField = pair[1];
    const valueType = pair[2];
    const leftValue = leftRow[leftField];
    const rightValue = rightRow[rightField];
    const matches = valueType === 'NUMBER'
      ? vpw_numbersClose_(leftValue, rightValue)
      : String(leftValue).trim() ===
        String(rightValue).trim();

    if (!matches) {
      mismatches.push({
        type: 'VALUE_MISMATCH',
        portfolio_id: portfolioId,
        left_table: leftName,
        left_field: leftField,
        left_value: leftValue,
        right_table: rightName,
        right_field: rightField,
        right_value: rightValue
      });
    }
  });
}

function vpw_mapById_(
  rows,
  idField,
  mismatches,
  tableName
) {
  const result = new Map();

  rows.forEach((row) => {
    const id = String(row[idField] || '').trim();

    if (!id) {
      mismatches.push({
        type: 'EMPTY_ID',
        table: tableName,
        row_number: row._rowNumber
      });
      return;
    }

    if (result.has(id)) {
      mismatches.push({
        type: 'DUPLICATE_ID',
        table: tableName,
        id: id
      });
      return;
    }

    result.set(id, row);
  });

  return result;
}

function vpw_assertSameIdSet_(
  leftMap,
  rightMap,
  mismatches,
  leftName,
  rightName
) {
  leftMap.forEach((unused, id) => {
    if (!rightMap.has(id)) {
      mismatches.push({
        type: 'ID_MISSING',
        id: id,
        present_in: leftName,
        missing_from: rightName
      });
    }
  });

  rightMap.forEach((unused, id) => {
    if (!leftMap.has(id)) {
      mismatches.push({
        type: 'ID_MISSING',
        id: id,
        present_in: rightName,
        missing_from: leftName
      });
    }
  });
}

function vpw_latestHistoryByPortfolio_(rows) {
  const result = new Map();

  rows.forEach((row) => {
    const portfolioId = String(row.portfolio_id || '').trim();
    if (!portfolioId) return;

    const existing = result.get(portfolioId);
    if (!existing || vpw_historyIsLater_(row, existing)) {
      result.set(portfolioId, row);
    }
  });

  return result;
}

function vpw_historyIsLater_(candidate, existing) {
  let candidatePeriod = 0;
  let existingPeriod = 0;

  try {
    candidatePeriod = vpw_date_(candidate.period_end_utc);
  } catch (error) {
    candidatePeriod = 0;
  }

  try {
    existingPeriod = vpw_date_(existing.period_end_utc);
  } catch (error) {
    existingPeriod = 0;
  }

  if (candidatePeriod !== existingPeriod) {
    return candidatePeriod > existingPeriod;
  }

  const candidateUpdatedAt = Date.parse(
    String(candidate.updated_at_utc || '')
  );
  const existingUpdatedAt = Date.parse(
    String(existing.updated_at_utc || '')
  );

  return (
    (Number.isFinite(candidateUpdatedAt)
      ? candidateUpdatedAt
      : 0) >
    (Number.isFinite(existingUpdatedAt)
      ? existingUpdatedAt
      : 0)
  );
}

function vpw_numbersClose_(left, right) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (
    !Number.isFinite(leftNumber) ||
    !Number.isFinite(rightNumber)
  ) {
    return false;
  }

  const tolerance =
    Math.max(
      1,
      Math.abs(leftNumber),
      Math.abs(rightNumber)
    ) * 1e-9;

  return Math.abs(leftNumber - rightNumber) <= tolerance;
}

function vpw_readTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { headers: [], objects: [] };

  const headers = values[0].map(
    (value) => String(value).trim()
  );
  const objects = values
    .slice(1)
    .map((row, index) => {
      const object = { _rowNumber: index + 2 };
      headers.forEach((header, column) => {
        if (header) object[header] = row[column];
      });
      return object;
    })
    .filter((object) => {
      const firstHeader = headers[0];
      return (
        firstHeader &&
        object[firstHeader] !== '' &&
        object[firstHeader] !== null
      );
    });

  return { headers: headers, objects: objects };
}

function vpw_firstEmptyRow_(sheet, column, startRow) {
  const lastRow = Math.max(
    sheet.getLastRow(),
    startRow - 1
  );
  if (lastRow < startRow) return startRow;

  const values = sheet
    .getRange(
      startRow,
      column,
      lastRow - startRow + 1,
      1
    )
    .getValues();

  for (let index = 0; index < values.length; index += 1) {
    if (
      values[index][0] === '' ||
      values[index][0] === null
    ) {
      return startRow + index;
    }
  }

  return lastRow + 1;
}

function vpw_headerMap_(headers) {
  const map = {};

  headers.forEach((header, index) => {
    if (header) map[header] = index;
  });

  return map;
}

function vpw_sheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error('SHEET_NOT_FOUND_' + name);
  return sheet;
}

function vpw_boolean_(value) {
  if (value === true) return true;
  return String(value).trim().toUpperCase() === 'TRUE';
}

function vpw_date_(value) {
  if (value instanceof Date) {
    return Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate()
    );
  }

  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    const sheetsEpoch = Date.UTC(1899, 11, 30);
    return sheetsEpoch + Math.round(value) * 86400000;
  }

  const text = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);

  if (!match) throw new Error('INVALID_DATE_' + text);

  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
}

function vpw_utcDate_(date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

function vpw_dateKey_(value) {
  return Utilities.formatDate(
    new Date(vpw_date_(value)),
    'UTC',
    'yyyy-MM-dd'
  );
}
