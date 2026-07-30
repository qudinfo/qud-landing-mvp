const QUD_VP_WEEKLY_CONFIG = Object.freeze({
  spreadsheetId: '1XVsMiFtpLSuB7z4OcQ1heDj4oD2JhJ_Su3QwyzSQyG8',
  sheets: Object.freeze({
    portfolios: 'portfolios',
    requests: 'portfolio_strategy_requests',
    sourcePeriods: 'strategy_period_history',
    strategyHistory: 'portfolio_strategy_history',
    portfolioHistory: 'portfolio_history'
  })
});

/**
 * Manual production entry point.
 *
 * Applies only complete WEEK periods copied into QUD Virtual Portfolio.
 * The main QUD spreadsheet is never opened or modified here.
 */
function runQudVirtualPortfolioWeeklyUpdate() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    return vpw_run_();
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

  const today = vpw_utcDate_(new Date());
  const strategyHistoryKeys = new Set(
    strategyHistoryTable.objects.map((row) => (
      String(row.request_id) + '|' + vpw_dateKey_(row.period_end_utc)
    ))
  );
  const portfolioHistoryKeys = new Set(
    portfolioHistoryTable.objects.map((row) => (
      String(row.portfolio_id) + '|' + vpw_dateKey_(row.period_end_utc)
    ))
  );

  const portfoliosById = new Map(
    portfolioTable.objects.map((row) => [String(row.portfolio_id), row])
  );
  const latestRequests = requestTable.objects.filter((row) => (
    vpw_boolean_(row.is_latest_strategy_request) && String(row.status) !== 'CANCELLED'
  ));
  const activeRequests = latestRequests.filter((row) => String(row.status) === 'ACTIVE');

  const periodsByStrategy = new Map();
  sourcePeriodTable.objects.forEach((period) => {
    if (String(period.period_type).toUpperCase() !== 'WEEK') return;
    const strategyId = String(period.strategy_id);
    if (!periodsByStrategy.has(strategyId)) periodsByStrategy.set(strategyId, []);
    periodsByStrategy.get(strategyId).push(period);
  });

  periodsByStrategy.forEach((periods) => {
    periods.sort((a, b) => vpw_date_(a.period_end_utc) - vpw_date_(b.period_end_utc));
  });

  const events = [];
  activeRequests.forEach((request) => {
    const requestId = String(request.request_id);
    const strategyId = String(request.strategy_id);
    const startDate = vpw_date_(request.start_date_utc);
    const endDate = vpw_date_(request.end_date_utc);
    const periods = periodsByStrategy.get(strategyId) || [];

    periods.forEach((period) => {
      const periodStart = vpw_date_(period.period_start_utc);
      const periodEnd = vpw_date_(period.period_end_utc);
      const periodKey = requestId + '|' + vpw_dateKey_(period.period_end_utc);

      // Only a full confirmed week contained entirely inside the request window.
      if (periodStart < startDate) return;
      if (periodEnd > endDate || periodEnd > today) return;
      if (strategyHistoryKeys.has(periodKey)) return;
      if (!Number.isFinite(Number(period.period_return_pct))) return;

      events.push({
        request: request,
        period: period,
        periodEndKey: vpw_dateKey_(period.period_end_utc),
        periodEndDate: periodEnd
      });
    });
  });

  events.sort((a, b) => {
    const byDate = a.periodEndDate - b.periodEndDate;
    if (byDate !== 0) return byDate;
    return String(a.request.request_id).localeCompare(String(b.request.request_id));
  });

  const groups = new Map();
  events.forEach((event) => {
    if (!groups.has(event.periodEndKey)) groups.set(event.periodEndKey, []);
    groups.get(event.periodEndKey).push(event);
  });

  let appliedStrategyPeriods = 0;
  let createdPortfolioSnapshots = 0;
  let stoppedByDrawdown = 0;
  let completedRequests = 0;

  groups.forEach((group, periodEndKey) => {
    const affectedPortfolioIds = new Set(group.map((event) => String(event.request.portfolio_id)));
    const openingSnapshots = new Map();

    affectedPortfolioIds.forEach((portfolioId) => {
      openingSnapshots.set(portfolioId, vpw_aggregatePortfolio_(latestRequests, portfolioId));
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
      vpw_appendAtFirstEmpty_(strategyHistorySheet, [
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
      ]);

      request.current_balance_usd = closingBalance;
      request.peak_balance_usd = peakBalance;
      request.strategy_return_usd = closingBalance - Number(request.allocated_balance_usd);
      request.strategy_return_pct = Number(request.allocated_balance_usd) > 0
        ? request.strategy_return_usd / Number(request.allocated_balance_usd) * 100
        : 0;
      request.current_drawdown_pct = drawdownPct;
      request.last_applied_period_end_utc = periodEndKey;
      request.status = statusAfterUpdate;
      if (statusAfterUpdate !== 'ACTIVE') request.completed_at_utc = appliedAt;

      vpw_writeRequestState_(requestSheet, requestTable.headers, request);
      strategyHistoryKeys.add(historyKey);
      appliedStrategyPeriods += 1;
    });

    SpreadsheetApp.flush();

    affectedPortfolioIds.forEach((portfolioId) => {
      const historyKey = portfolioId + '|' + periodEndKey;
      if (portfolioHistoryKeys.has(historyKey)) return;

      const opening = openingSnapshots.get(portfolioId);
      const closing = vpw_aggregatePortfolio_(latestRequests, portfolioId);
      const portfolio = portfoliosById.get(portfolioId);
      if (!portfolio) throw new Error('PORTFOLIO_NOT_FOUND_' + portfolioId);

      const previousPeak = Number(portfolio.peak_balance_usd) || opening.currentBalance;
      const peakBalance = Math.max(previousPeak, closing.currentBalance);
      const portfolioReturnUsd = closing.currentBalance - closing.totalAllocated;
      const portfolioReturnPct = closing.totalAllocated > 0
        ? portfolioReturnUsd / closing.totalAllocated * 100
        : 0;
      const drawdownPct = peakBalance > 0
        ? Math.max(0, (peakBalance - closing.currentBalance) / peakBalance * 100)
        : 0;
      const updatedAt = new Date().toISOString();

      vpw_appendAtFirstEmpty_(portfolioHistorySheet, [
        portfolioId,
        periodEndKey,
        closing.totalAllocated,
        opening.currentBalance,
        closing.currentBalance - opening.currentBalance,
        closing.currentBalance,
        peakBalance,
        portfolioReturnUsd,
        portfolioReturnPct,
        drawdownPct,
        closing.activeCount,
        String(portfolio.status || 'ACTIVE'),
        updatedAt
      ]);

      portfolio.total_allocated_usd = closing.totalAllocated;
      portfolio.current_balance_usd = closing.currentBalance;
      portfolio.peak_balance_usd = peakBalance;
      portfolio.portfolio_return_usd = portfolioReturnUsd;
      portfolio.portfolio_return_pct = portfolioReturnPct;
      portfolio.current_drawdown_pct = drawdownPct;
      portfolio.active_strategies_count = closing.activeCount;
      portfolio.last_recalc_utc = updatedAt;

      vpw_writePortfolioState_(portfolioSheet, portfolioTable.headers, portfolio);
      portfolioHistoryKeys.add(historyKey);
      createdPortfolioSnapshots += 1;
    });

    SpreadsheetApp.flush();
  });

  // A request may expire without a new confirmed week exactly on its end date.
  activeRequests.forEach((request) => {
    if (String(request.status) !== 'ACTIVE') return;
    if (vpw_date_(request.end_date_utc) > today) return;

    request.status = 'COMPLETED';
    request.completed_at_utc = new Date().toISOString();
    vpw_writeRequestState_(requestSheet, requestTable.headers, request);
    completedRequests += 1;
  });

  // Refresh every portfolio after status-only changes.
  portfoliosById.forEach((portfolio, portfolioId) => {
    const aggregate = vpw_aggregatePortfolio_(latestRequests, portfolioId);
    const peakBalance = Math.max(
      Number(portfolio.peak_balance_usd) || 0,
      aggregate.currentBalance
    );
    const portfolioReturnUsd = aggregate.currentBalance - aggregate.totalAllocated;
    const portfolioReturnPct = aggregate.totalAllocated > 0
      ? portfolioReturnUsd / aggregate.totalAllocated * 100
      : 0;
    const drawdownPct = peakBalance > 0
      ? Math.max(0, (peakBalance - aggregate.currentBalance) / peakBalance * 100)
      : 0;

    portfolio.total_allocated_usd = aggregate.totalAllocated;
    portfolio.current_balance_usd = aggregate.currentBalance;
    portfolio.peak_balance_usd = peakBalance;
    portfolio.portfolio_return_usd = portfolioReturnUsd;
    portfolio.portfolio_return_pct = portfolioReturnPct;
    portfolio.current_drawdown_pct = drawdownPct;
    portfolio.active_strategies_count = aggregate.activeCount;
    portfolio.last_recalc_utc = new Date().toISOString();
    vpw_writePortfolioState_(portfolioSheet, portfolioTable.headers, portfolio);
  });

  SpreadsheetApp.flush();

  return {
    ok: true,
    applied_strategy_periods: appliedStrategyPeriods,
    created_portfolio_snapshots: createdPortfolioSnapshots,
    stopped_by_drawdown: stoppedByDrawdown,
    completed_requests: completedRequests,
    processed_at_utc: new Date().toISOString()
  };
}

function vpw_aggregatePortfolio_(latestRequests, portfolioId) {
  const rows = latestRequests.filter((request) => (
    String(request.portfolio_id) === String(portfolioId) &&
    String(request.status) !== 'CANCELLED'
  ));

  return rows.reduce((result, request) => {
    result.totalAllocated += Number(request.allocated_balance_usd) || 0;
    result.currentBalance += Number(request.current_balance_usd) || 0;
    if (String(request.status) === 'ACTIVE') result.activeCount += 1;
    return result;
  }, { totalAllocated: 0, currentBalance: 0, activeCount: 0 });
}

function vpw_writeRequestState_(sheet, headers, request) {
  const map = vpw_headerMap_(headers);
  const row = request._rowNumber;
  const values = {
    current_balance_usd: request.current_balance_usd,
    peak_balance_usd: request.peak_balance_usd,
    strategy_return_usd: request.strategy_return_usd,
    strategy_return_pct: request.strategy_return_pct,
    current_drawdown_pct: request.current_drawdown_pct,
    last_applied_period_end_utc: request.last_applied_period_end_utc,
    status: request.status,
    completed_at_utc: request.completed_at_utc || ''
  };

  Object.keys(values).forEach((header) => {
    if (map[header] === undefined) throw new Error('MISSING_REQUEST_COLUMN_' + header);
    sheet.getRange(row, map[header] + 1).setValue(values[header]);
  });
}

function vpw_writePortfolioState_(sheet, headers, portfolio) {
  const map = vpw_headerMap_(headers);
  const row = portfolio._rowNumber;
  const values = {
    total_allocated_usd: portfolio.total_allocated_usd,
    current_balance_usd: portfolio.current_balance_usd,
    peak_balance_usd: portfolio.peak_balance_usd,
    portfolio_return_usd: portfolio.portfolio_return_usd,
    portfolio_return_pct: portfolio.portfolio_return_pct,
    current_drawdown_pct: portfolio.current_drawdown_pct,
    active_strategies_count: portfolio.active_strategies_count,
    last_recalc_utc: portfolio.last_recalc_utc
  };

  Object.keys(values).forEach((header) => {
    if (map[header] === undefined) throw new Error('MISSING_PORTFOLIO_COLUMN_' + header);
    sheet.getRange(row, map[header] + 1).setValue(values[header]);
  });
}

function vpw_readTable_(sheet) {
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

function vpw_appendAtFirstEmpty_(sheet, values) {
  const row = vpw_firstEmptyRow_(sheet, 1, 2);
  sheet.getRange(row, 1, 1, values.length).setValues([values]);
  return row;
}

function vpw_firstEmptyRow_(sheet, column, startRow) {
  const lastRow = Math.max(sheet.getLastRow(), startRow - 1);
  if (lastRow < startRow) return startRow;

  const values = sheet.getRange(startRow, column, lastRow - startRow + 1, 1).getValues();
  for (let index = 0; index < values.length; index += 1) {
    if (values[index][0] === '' || values[index][0] === null) return startRow + index;
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
    return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  }

  const text = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!match) throw new Error('INVALID_DATE_' + text);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function vpw_utcDate_(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function vpw_dateKey_(value) {
  const timestamp = vpw_date_(value);
  return Utilities.formatDate(new Date(timestamp), 'UTC', 'yyyy-MM-dd');
}
