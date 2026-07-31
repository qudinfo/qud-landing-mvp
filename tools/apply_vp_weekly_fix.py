from pathlib import Path

PATH = Path('portal/portfolio/backend/apps-script/WeeklyUpdate.gs')
s = PATH.read_text()

def rep(old, new):
    global s
    if old not in s:
        raise SystemExit('marker not found: ' + old[:80])
    s = s.replace(old, new, 1)

rep(
"""  const strategyHistoryTable = vpw_readTable_(strategyHistorySheet);
  const portfolioHistoryTable = vpw_readTable_(portfolioHistorySheet);

  const today = vpw_utcDate_(new Date());
  const strategyHistoryKeys = new Set(
    strategyHistoryTable.objects.map((row) => (
""",
"""  const strategyHistoryTable = vpw_readTable_(strategyHistorySheet);
  const portfolioHistoryTable = vpw_readTable_(portfolioHistorySheet);
  const strategyHistoryRows = strategyHistoryTable.objects.slice();
  const portfolioHistoryRows = portfolioHistoryTable.objects.slice();

  const today = vpw_utcDate_(new Date());
  const strategyHistoryKeys = new Set(
    strategyHistoryRows.map((row) => (
""")
rep('    portfolioHistoryTable.objects.map((row) => [',
    '    portfolioHistoryRows.map((row) => [')

old_append = """      const appliedAt = new Date().toISOString();
      vpw_appendAndAssert_(strategyHistorySheet, [
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
"""
new_append = """      const appliedAt = new Date().toISOString();
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
"""
rep(old_append, new_append)

old_calc = """      const openingAggregate = openingByPortfolio.get(portfolioId);
      const closingAggregate = vpw_aggregatePortfolio_(
        latestRequests,
        portfolioId
      );
      const historyKey = portfolioId + '|' + periodEndKey;
      const existingHistory = portfolioHistoryByKey.get(historyKey) || null;
      const openingBalance = existingHistory
        ? Number(existingHistory.opening_balance_usd)
        : openingAggregate.currentBalance;
      const previousPeak = Math.max(
        Number(portfolio.peak_balance_usd) || 0,
        existingHistory
          ? Number(existingHistory.peak_balance_usd) || 0
          : 0,
        openingBalance
      );
      const peakBalance = Math.max(
        previousPeak,
        closingAggregate.currentBalance
      );
      const portfolioReturnUsd =
        closingAggregate.currentBalance - closingAggregate.totalAllocated;
      const portfolioReturnPct = closingAggregate.totalAllocated > 0
        ? portfolioReturnUsd / closingAggregate.totalAllocated * 100
        : 0;
      const drawdownPct = peakBalance > 0
        ? Math.max(
            0,
            (peakBalance - closingAggregate.currentBalance) /
              peakBalance * 100
          )
        : 0;
      const updatedAt = new Date().toISOString();
      const historyValues = [
        portfolioId,
        periodEndKey,
        closingAggregate.totalAllocated,
        openingBalance,
        closingAggregate.currentBalance - openingBalance,
        closingAggregate.currentBalance,
        peakBalance,
        portfolioReturnUsd,
        portfolioReturnPct,
        drawdownPct,
        closingAggregate.activeCount,
        String(portfolio.status || 'ACTIVE'),
        updatedAt
      ];
"""
new_calc = """      const historyKey = portfolioId + '|' + periodEndKey;
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
"""
rep(old_calc, new_calc)

old_write = """      if (existingHistory) {
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
        portfolioHistoryByKey.set(historyKey, {
          _rowNumber: rowNumber,
          portfolio_id: portfolioId,
          period_end_utc: periodEndKey,
          opening_balance_usd: openingBalance,
          peak_balance_usd: peakBalance
        });
        createdPortfolioSnapshots += 1;
      }

      // Columns D:J contain permanent KPI formulas. Only the timestamp is written.
      portfolio.peak_balance_usd = peakBalance;
"""
new_write = """      let historyRow = existingHistory;
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
"""
rep(old_write, new_write)

helpers = r'''
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

'''
rep('function vpw_writeRequestState_(sheet, headers, request) {',
    helpers + 'function vpw_writeRequestState_(sheet, headers, request) {')

rep(
"""    result.validated_history_snapshots = validation.validated_history_snapshots;
    return result;
""",
"""    result.validated_history_snapshots = validation.validated_history_snapshots;
    result.validated_strategy_history_snapshots =
      validation.validated_strategy_history_snapshots;
    return result;
""")
rep(
"""        validated_history_snapshots:
          result.validatedHistorySnapshots
      };
""",
"""        validated_history_snapshots:
          result.validatedHistorySnapshots,
        validated_strategy_history_snapshots:
          result.validatedStrategyHistorySnapshots
      };
""")
rep(
"""  const historyTable = vpw_readTable_(
    vpw_sheet_(
      spreadsheet,
      QUD_VP_WEEKLY_CONFIG.sheets.portfolioHistory
    )
  );

  const mismatches = [];
""",
"""  const historyTable = vpw_readTable_(
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
""")

old_guard_tail = """      const apiRow = apiById.get(portfolioId);
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
    });
  }

  return {
    mismatches: mismatches,
    validatedPortfolios: portfolioById.size,
    validatedHistorySnapshots:
      options.compareHistory
        ? latestHistoryByPortfolio.size
        : 0
  };
"""
new_guard_tail = """      const apiRow = apiById.get(portfolioId);
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
"""
rep(old_guard_tail, new_guard_tail)

PATH.write_text(s)
