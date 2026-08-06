from pathlib import Path

CODE = Path('portal/portfolio/backend/apps-script/Code.gs')
WEEKLY = Path('portal/portfolio/backend/apps-script/WeeklyUpdate.gs')
README = Path('portal/portfolio/backend/README.md')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'marker not found: {label}')
    return text.replace(old, new, 1)


# ------------------------------------------------------------------
# API v2: MVP rules, metrics and date normalization.
# ------------------------------------------------------------------
code = CODE.read_text()

code = replace_once(
    code,
    "    strategyRegistry: 'strategy_registry',\n",
    "    strategyRegistry: 'strategy_registry',\n    strategySnapshot: 'strategy_snapshot',\n",
    'strategySnapshot config'
)
code = replace_once(
    code,
    "  minAllocatedBalanceUsd: 100,\n",
    "  minAllocatedBalanceUsd: 1000,\n",
    'minimum allocation'
)
code = replace_once(
    code,
    "version: '2.0.0'",
    "version: '2.1.0'",
    'API version'
)

code = replace_once(
    code,
    """  const availability = readObjects_(QUD_VP_CONFIG.sheets.apiAvailability)
    .filter((row) => String(row.portfolio_id) === portfolioId);

  const primarySlot = slots.find((row) => String(row.status) === 'ACTIVE') || slots[0] || null;
""",
    """  const availability = readObjects_(QUD_VP_CONFIG.sheets.apiAvailability)
    .filter((row) => String(row.portfolio_id) === portfolioId);
  const strategyMetrics = strategyMetricsById_();
  slots.forEach((row) => enrichStrategyRow_(row, strategyMetrics));
  availability.forEach((row) => enrichStrategyRow_(row, strategyMetrics));

  const primarySlot = slots.find((row) => String(row.status) === 'ACTIVE') || slots[0] || null;
""",
    'portfolio metrics enrichment'
)

code = replace_once(
    code,
    """  const rows = readObjects_(QUD_VP_CONFIG.sheets.apiAvailability)
    .filter((row) => String(row.portfolio_id) === portfolioId);
  const available = rows.filter((row) => toBoolean_(row.is_available));
""",
    """  const rows = readObjects_(QUD_VP_CONFIG.sheets.apiAvailability)
    .filter((row) => String(row.portfolio_id) === portfolioId);
  const strategyMetrics = strategyMetricsById_();
  rows.forEach((row) => enrichStrategyRow_(row, strategyMetrics));
  const available = rows.filter((row) => toBoolean_(row.is_available));
""",
    'available strategy metrics enrichment'
)

code = replace_once(
    code,
    "    const requestId = generateUniqueRequestId_(requestTable.objects);\n",
    "    const requestId = generateUniqueRequestId_(requestTable.objects, strategyId);\n",
    'request id call'
)

code = replace_once(
    code,
    """function generateUniqueRequestId_(requests) {
  const existing = new Set(requests.map((row) => String(row.request_id)));
  const datePart = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
    const candidate = 'QSR-' + datePart + '-' + suffix;
    if (!existing.has(candidate)) return candidate;
  }

  throw apiError_('REQUEST_ID_GENERATION_FAILED', 500);
}
""",
    """function generateUniqueRequestId_(requests, strategyId) {
  const existing = new Set(requests.map((row) => String(row.request_id)));
  const datePart = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd');
  const prefix = String(strategyId).startsWith('TST-')
    ? 'TST-QSR-'
    : 'QSR-';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
    const candidate = prefix + datePart + '-' + suffix;
    if (!existing.has(candidate)) return candidate;
  }

  throw apiError_('REQUEST_ID_GENERATION_FAILED', 500);
}
""",
    'test request id prefix'
)

code = replace_once(
    code,
    "        if (header) object[header] = normalizeValue_(row[index]);\n",
    "        if (header) object[header] = normalizeFieldValue_(header, row[index]);\n",
    'field-aware normalization'
)

helpers = r'''function strategyMetricsById_() {
  const fields = [
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
    'last_update_utc'
  ];
  const result = new Map();

  readObjects_(QUD_VP_CONFIG.sheets.strategySnapshot).forEach((row) => {
    const strategyId = String(row.strategy_id || '').trim();
    if (!strategyId) return;

    const metrics = {};
    fields.forEach((field) => {
      if (row[field] !== undefined && row[field] !== '') {
        metrics[field] = row[field];
      }
    });
    result.set(strategyId, metrics);
  });

  return result;
}

function enrichStrategyRow_(row, metricsById) {
  const strategyId = String(row.strategy_id || '').trim();
  const metrics = metricsById.get(strategyId);
  if (metrics) Object.assign(row, metrics);
  return row;
}

const QUD_VP_DATE_ONLY_FIELDS = new Set([
  'observation_start_utc',
  'start_date_utc',
  'end_date_utc',
  'period_start_utc',
  'period_end_utc',
  'last_applied_period_end_utc',
  'active_request_end_date'
]);

function normalizeFieldValue_(fieldName, value) {
  if (QUD_VP_DATE_ONLY_FIELDS.has(String(fieldName))) {
    if (value instanceof Date) {
      return Utilities.formatDate(value, 'UTC', 'yyyy-MM-dd');
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const milliseconds = Date.UTC(1899, 11, 30) +
        Math.round(value * 24 * 60 * 60 * 1000);
      return Utilities.formatDate(
        new Date(milliseconds),
        'UTC',
        'yyyy-MM-dd'
      );
    }
  }

  return normalizeValue_(value);
}

'''
code = replace_once(
    code,
    "function normalizeValue_(value) {\n",
    helpers + "function normalizeValue_(value) {\n",
    'normalization helpers'
)

CODE.write_text(code)


# ------------------------------------------------------------------
# Weekly consistency: validate current formulas from latest requests,
# while allowing a new portfolio or a new allocation before next week.
# ------------------------------------------------------------------
weekly = WEEKLY.read_text()

current_validation = r'''
  const latestRequestsForValidation = requestTable.objects.filter((row) => (
    vpw_boolean_(row.is_latest_strategy_request) &&
    String(row.status) !== 'CANCELLED'
  ));
  const maxHistoryPeakByPortfolio = new Map();
  historyTable.objects.forEach((row) => {
    const portfolioId = String(row.portfolio_id);
    const peak = Number(row.peak_balance_usd) || 0;
    maxHistoryPeakByPortfolio.set(
      portfolioId,
      Math.max(maxHistoryPeakByPortfolio.get(portfolioId) || 0, peak)
    );
  });

  portfolioById.forEach((portfolioRow, portfolioId) => {
    const aggregate = vpw_aggregatePortfolio_(
      latestRequestsForValidation,
      portfolioId
    );
    const peakBalance = Math.max(
      aggregate.totalAllocated,
      aggregate.currentBalance,
      maxHistoryPeakByPortfolio.get(portfolioId) || 0
    );
    const returnUsd = aggregate.currentBalance - aggregate.totalAllocated;
    const returnPct = aggregate.totalAllocated > 0
      ? returnUsd / aggregate.totalAllocated * 100
      : 0;
    const drawdownPct = peakBalance > 0
      ? Math.max(
          0,
          (peakBalance - aggregate.currentBalance) /
            peakBalance * 100
        )
      : 0;
    const rebuiltCurrent = {
      total_allocated_usd: aggregate.totalAllocated,
      current_balance_usd: aggregate.currentBalance,
      peak_balance_usd: peakBalance,
      portfolio_return_usd: returnUsd,
      portfolio_return_pct: returnPct,
      current_drawdown_pct: drawdownPct,
      active_strategies_count: aggregate.activeCount
    };
    const currentPairs = [
      ['total_allocated_usd', 'total_allocated_usd', 'NUMBER'],
      ['current_balance_usd', 'current_balance_usd', 'NUMBER'],
      ['peak_balance_usd', 'peak_balance_usd', 'NUMBER'],
      ['portfolio_return_usd', 'portfolio_return_usd', 'NUMBER'],
      ['portfolio_return_pct', 'portfolio_return_pct', 'NUMBER'],
      ['current_drawdown_pct', 'current_drawdown_pct', 'NUMBER'],
      ['active_strategies_count', 'active_strategies_count', 'NUMBER']
    ];
    vpw_compareRows_(
      rebuiltCurrent,
      portfolioRow,
      currentPairs,
      mismatches,
      'REBUILT_FROM_LATEST_REQUESTS',
      'PORTFOLIOS',
      portfolioId
    );
  });

'''
weekly = replace_once(
    weekly,
    "  let candidateHistoryRows = historyTable.objects.slice();\n",
    current_validation + "  let candidateHistoryRows = historyTable.objects.slice();\n",
    'current portfolio validation'
)

weekly = replace_once(
    weekly,
    """    const historyPortfolioIds =
      options.historyRowsSinceMs === null
        ? Array.from(portfolioById.keys())
        : Array.from(latestHistoryByPortfolio.keys());
""",
    """    const historyPortfolioIds =
      Array.from(latestHistoryByPortfolio.keys());
""",
    'history scope without false missing history'
)

old_compare = """      vpw_compareRows_(
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
"""
new_compare = """      // During a weekly run the new snapshot must match the current
      // portfolio. In a read-only check, a user may have added capital or a
      // strategy after the last closed week; that is valid and is checked
      // separately against the latest requests above.
      if (options.historyRowsSinceMs !== null) {
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
      }
"""
weekly = replace_once(
    weekly,
    old_compare,
    new_compare,
    'conditional current-history comparison'
)

WEEKLY.write_text(weekly)


# ------------------------------------------------------------------
# Documentation.
# ------------------------------------------------------------------
readme = README.read_text()
addition = '''
## MVP stage 1 rules

- minimum virtual allocation per strategy request is USD 1,000;
- available-strategy and portfolio responses include the latest profitability and quality metrics from `strategy_snapshot`;
- all date-only fields are normalized to `YYYY-MM-DD` before JSON serialization;
- test strategies create request IDs with the `TST-QSR-` prefix;
- the read-only consistency check validates current portfolio formulas from latest requests and validates closed weekly history independently, so a new allocation before the next weekly close is not treated as an error.
'''
if '## MVP stage 1 rules' not in readme:
    readme = readme.rstrip() + '\n\n' + addition.lstrip()
README.write_text(readme)
