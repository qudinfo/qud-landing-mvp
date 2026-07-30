const QUD_VP_CONFIG = Object.freeze({
  spreadsheetId: '1XVsMiFtpLSuB7z4OcQ1heDj4oD2JhJ_Su3QwyzSQyG8',
  proxySecretProperty: 'QUD_VP_PROXY_SECRET',
  sheets: Object.freeze({
    portfolios: 'portfolios',
    requests: 'portfolio_strategy_requests',
    strategyRegistry: 'strategy_registry',
    apiPortfolios: 'api_portfolios',
    apiRequests: 'api_strategy_requests',
    apiSlots: 'api_strategy_slots',
    apiStrategyHistory: 'api_strategy_history',
    apiPortfolioHistory: 'api_portfolio_history',
    apiAvailability: 'api_strategy_availability'
  }),
  allowedPeriods: Object.freeze(['2_weeks', '1_month', '3_months']),
  minAllocatedBalanceUsd: 100,
  maxAllocatedBalanceUsd: 10000000,
  minDrawdownPct: 1,
  maxDrawdownPct: 50
});

function doGet(e) {
  try {
    assertProxySecret_(e, null);
    const action = String((e && e.parameter && e.parameter.action) || 'health').trim();

    if (action === 'health') {
      return jsonResponse_({ ok: true, service: 'QUD Virtual Portfolio', version: '2.0.0' });
    }

    const subscriberId = requiredString_(e.parameter.subscriber_id, 'subscriber_id');

    if (action === 'portfolios') {
      return jsonResponse_(getPortfoliosForSubscriber_(subscriberId));
    }

    if (action === 'portfolio') {
      const portfolioId = requiredString_(e.parameter.portfolio_id, 'portfolio_id');
      return jsonResponse_(getPortfolioPayload_(subscriberId, portfolioId));
    }

    if (action === 'strategies') {
      const portfolioId = requiredString_(e.parameter.portfolio_id, 'portfolio_id');
      return jsonResponse_(getAvailableStrategies_(subscriberId, portfolioId));
    }

    throw apiError_('UNKNOWN_ACTION', 400);
  } catch (error) {
    return errorResponse_(error);
  }
}

function doPost(e) {
  try {
    const body = parseJsonBody_(e);
    assertProxySecret_(e, body);
    const action = String(body.action || '').trim();

    if (action !== 'create_strategy_request' && action !== 'create_portfolio') {
      throw apiError_('UNKNOWN_ACTION', 400);
    }

    const result = createStrategyRequest_(body);
    return jsonResponse_(result);
  } catch (error) {
    return errorResponse_(error);
  }
}

function getPortfoliosForSubscriber_(subscriberId) {
  const portfolios = readObjects_(QUD_VP_CONFIG.sheets.apiPortfolios)
    .filter((row) => String(row.subscriber_id) === subscriberId);

  return {
    ok: true,
    portfolios: portfolios,
    items: portfolios
  };
}

function getPortfolioPayload_(subscriberId, portfolioId) {
  const portfolio = readObjects_(QUD_VP_CONFIG.sheets.apiPortfolios)
    .find((row) => String(row.portfolio_id) === portfolioId);

  if (!portfolio || String(portfolio.subscriber_id) !== subscriberId) {
    throw apiError_('PORTFOLIO_NOT_FOUND', 404);
  }

  const slots = readObjects_(QUD_VP_CONFIG.sheets.apiSlots)
    .filter((row) => String(row.portfolio_id) === portfolioId);

  const requests = readObjects_(QUD_VP_CONFIG.sheets.apiRequests)
    .filter((row) => String(row.portfolio_id) === portfolioId);

  const strategyHistory = readObjects_(QUD_VP_CONFIG.sheets.apiStrategyHistory)
    .filter((row) => String(row.portfolio_id) === portfolioId);

  const portfolioHistory = readObjects_(QUD_VP_CONFIG.sheets.apiPortfolioHistory)
    .filter((row) => String(row.portfolio_id) === portfolioId);

  const availability = readObjects_(QUD_VP_CONFIG.sheets.apiAvailability)
    .filter((row) => String(row.portfolio_id) === portfolioId);

  const primarySlot = slots.find((row) => String(row.status) === 'ACTIVE') || slots[0] || null;
  const compatibilityPortfolio = Object.assign({}, portfolio);

  // Temporary compatibility layer for the current single-strategy frontend.
  if (primarySlot) {
    compatibilityPortfolio.strategy_id = primarySlot.strategy_id;
    compatibilityPortfolio.start_balance_usd = primarySlot.allocated_balance_usd;
    compatibilityPortfolio.max_drawdown_limit_pct = primarySlot.max_drawdown_limit_pct;
    compatibilityPortfolio.start_date_utc = primarySlot.start_date_utc;
    compatibilityPortfolio.end_date_utc = primarySlot.end_date_utc;
    compatibilityPortfolio.last_applied_period_end_utc = primarySlot.last_applied_period_end_utc;
  }

  const compatibilityHistory = primarySlot
    ? strategyHistory.filter((row) => String(row.request_id) === String(primarySlot.request_id))
    : portfolioHistory;

  const strategies = slots.map((slot) => Object.assign({}, slot, {
    history: strategyHistory.filter(
      (row) => String(row.request_id) === String(slot.request_id)
    )
  }));

  return {
    ok: true,
    portfolio: compatibilityPortfolio,
    strategies: strategies,
    strategy_slots: slots,
    strategy_requests: requests,
    strategy_history: strategyHistory,
    portfolio_history: portfolioHistory,
    available_strategies: availability.filter((row) => toBoolean_(row.is_available)),
    history: compatibilityHistory,
    data: {
      portfolio: compatibilityPortfolio,
      strategies: strategies,
      strategy_slots: slots,
      strategy_requests: requests,
      strategy_history: strategyHistory,
      portfolio_history: portfolioHistory
    }
  };
}

function getAvailableStrategies_(subscriberId, portfolioId) {
  assertPortfolioOwnership_(subscriberId, portfolioId);

  const rows = readObjects_(QUD_VP_CONFIG.sheets.apiAvailability)
    .filter((row) => String(row.portfolio_id) === portfolioId);

  const available = rows.filter((row) => toBoolean_(row.is_available));

  return {
    ok: true,
    portfolio_id: portfolioId,
    strategies: available.map((row) => row.strategy_id),
    items: available,
    all_items: rows
  };
}

function createStrategyRequest_(body) {
  const subscriberId = requiredString_(body.subscriber_id, 'subscriber_id');
  const portfolioId = requiredString_(body.portfolio_id, 'portfolio_id');
  const strategyId = requiredString_(body.strategy_id, 'strategy_id');
  const periodCode = requiredString_(body.period_code || body.period, 'period_code');
  const idempotencyKey = requiredString_(body.idempotency_key, 'idempotency_key');
  const allocatedBalance = finiteNumber_(
    body.allocated_balance_usd !== undefined ? body.allocated_balance_usd : body.start_balance_usd,
    'allocated_balance_usd'
  );
  const maxDrawdown = finiteNumber_(body.max_drawdown_limit_pct, 'max_drawdown_limit_pct');

  validateRequestParameters_(allocatedBalance, maxDrawdown, periodCode);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    assertPortfolioOwnership_(subscriberId, portfolioId);

    const requestsSheet = getSheet_(QUD_VP_CONFIG.sheets.requests);
    const requestTable = readSheetTable_(requestsSheet);
    const headers = requestTable.headers;
    const headerMap = headerMap_(headers);

    const existingByIdempotency = requestTable.objects.find(
      (row) => String(row.idempotency_key) === idempotencyKey
    );

    if (existingByIdempotency) {
      if (
        String(existingByIdempotency.subscriber_id) !== subscriberId ||
        String(existingByIdempotency.portfolio_id) !== portfolioId
      ) {
        throw apiError_('IDEMPOTENCY_KEY_CONFLICT', 409);
      }

      return {
        ok: true,
        created: false,
        idempotent_replay: true,
        request: existingByIdempotency,
        portfolio_payload: getPortfolioPayload_(subscriberId, portfolioId)
      };
    }

    const strategy = readObjects_(QUD_VP_CONFIG.sheets.strategyRegistry)
      .find((row) => String(row.strategy_id) === strategyId);

    if (!strategy) throw apiError_('STRATEGY_NOT_FOUND', 404);
    if (
      String(strategy.qa_status) !== 'OK' ||
      !toBoolean_(strategy.is_selectable) ||
      !toBoolean_(strategy.export_ready)
    ) {
      throw apiError_('STRATEGY_NOT_AVAILABLE', 409);
    }

    const activeDuplicate = requestTable.objects.find((row) =>
      String(row.portfolio_id) === portfolioId &&
      String(row.strategy_id) === strategyId &&
      String(row.status) === 'ACTIVE'
    );

    if (activeDuplicate) {
      throw apiError_('ACTIVE_REQUEST_EXISTS', 409, {
        request_id: activeDuplicate.request_id,
        end_date_utc: normalizeValue_(activeDuplicate.end_date_utc)
      });
    }

    const now = new Date();
    const startDate = utcDateOnly_(now);
    const endDate = calculateEndDate_(now, periodCode);
    const requestId = generateUniqueRequestId_(requestTable.objects);
    const appendRow = firstEmptyRowInColumn_(requestsSheet, 1, 2);

    // Keep the current slot intact until the new row exists and passes QA.
    const previousLatestRows = [];
    if (headerMap.is_latest_strategy_request !== undefined) {
      requestTable.objects.forEach((row, index) => {
        if (
          String(row.portfolio_id) === portfolioId &&
          String(row.strategy_id) === strategyId &&
          toBoolean_(row.is_latest_strategy_request)
        ) {
          previousLatestRows.push(index + 2);
        }
      });
    }

    const values = [
      requestId,
      portfolioId,
      subscriberId,
      strategyId,
      allocatedBalance,
      maxDrawdown,
      periodCode,
      startDate,
      endDate,
      'ACTIVE',
      allocatedBalance,
      allocatedBalance,
      0,
      0,
      0,
      '',
      idempotencyKey,
      now.toISOString(),
      ''
    ];

    requestsSheet.getRange(appendRow, 1, 1, values.length).setValues([values]);

    if (headerMap.is_latest_strategy_request !== undefined) {
      requestsSheet
        .getRange(appendRow, headerMap.is_latest_strategy_request + 1)
        .setValue(true);
    }

    SpreadsheetApp.flush();

    const createdRequest = readObjects_(QUD_VP_CONFIG.sheets.apiRequests)
      .find((row) => String(row.request_id) === requestId);

    if (!createdRequest) {
      requestsSheet.getRange(appendRow, 1, 1, values.length).clearContent();
      if (headerMap.is_latest_strategy_request !== undefined) {
        requestsSheet
          .getRange(appendRow, headerMap.is_latest_strategy_request + 1)
          .clearContent();
      }
      SpreadsheetApp.flush();
      throw apiError_('REQUEST_QA_FAILED', 500);
    }

    if (headerMap.is_latest_strategy_request !== undefined) {
      previousLatestRows.forEach((rowNumber) => {
        requestsSheet
          .getRange(rowNumber, headerMap.is_latest_strategy_request + 1)
          .setValue(false);
      });
      SpreadsheetApp.flush();
    }

    return {
      ok: true,
      created: true,
      idempotent_replay: false,
      request: createdRequest,
      portfolio_payload: getPortfolioPayload_(subscriberId, portfolioId)
    };
  } finally {
    lock.releaseLock();
  }
}

function assertPortfolioOwnership_(subscriberId, portfolioId) {
  const portfolio = readObjects_(QUD_VP_CONFIG.sheets.apiPortfolios)
    .find((row) => String(row.portfolio_id) === portfolioId);

  if (!portfolio || String(portfolio.subscriber_id) !== subscriberId) {
    throw apiError_('PORTFOLIO_NOT_FOUND', 404);
  }

  return portfolio;
}

function validateRequestParameters_(allocatedBalance, maxDrawdown, periodCode) {
  if (
    allocatedBalance < QUD_VP_CONFIG.minAllocatedBalanceUsd ||
    allocatedBalance > QUD_VP_CONFIG.maxAllocatedBalanceUsd
  ) {
    throw apiError_('INVALID_ALLOCATED_BALANCE', 400);
  }

  if (
    maxDrawdown < QUD_VP_CONFIG.minDrawdownPct ||
    maxDrawdown > QUD_VP_CONFIG.maxDrawdownPct
  ) {
    throw apiError_('INVALID_DRAWDOWN_LIMIT', 400);
  }

  if (QUD_VP_CONFIG.allowedPeriods.indexOf(periodCode) === -1) {
    throw apiError_('INVALID_PERIOD_CODE', 400);
  }
}

function calculateEndDate_(start, periodCode) {
  const date = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  ));

  if (periodCode === '2_weeks') date.setUTCDate(date.getUTCDate() + 14);
  if (periodCode === '1_month') date.setUTCMonth(date.getUTCMonth() + 1);
  if (periodCode === '3_months') date.setUTCMonth(date.getUTCMonth() + 3);

  return utcDateOnly_(date);
}

function generateUniqueRequestId_(requests) {
  const existing = new Set(requests.map((row) => String(row.request_id)));
  const datePart = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
    const candidate = 'QSR-' + datePart + '-' + suffix;
    if (!existing.has(candidate)) return candidate;
  }

  throw apiError_('REQUEST_ID_GENERATION_FAILED', 500);
}

function readObjects_(sheetName) {
  return readSheetTable_(getSheet_(sheetName)).objects;
}

function readSheetTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { headers: [], objects: [] };

  const headers = values[0].map((value) => String(value).trim());
  const objects = values.slice(1)
    .filter((row) => row.some((value) => value !== '' && value !== null))
    .map((row) => {
      const object = {};
      headers.forEach((header, index) => {
        if (header) object[header] = normalizeValue_(row[index]);
      });
      return object;
    });

  return { headers: headers, objects: objects };
}

function getSheet_(sheetName) {
  const sheet = SpreadsheetApp
    .openById(QUD_VP_CONFIG.spreadsheetId)
    .getSheetByName(sheetName);

  if (!sheet) throw apiError_('SHEET_NOT_FOUND_' + sheetName, 500);
  return sheet;
}

function headerMap_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    if (header) map[header] = index;
  });
  return map;
}

function firstEmptyRowInColumn_(sheet, column, startRow) {
  const lastRow = Math.max(sheet.getLastRow(), startRow - 1);
  if (lastRow < startRow) return startRow;

  const values = sheet.getRange(startRow, column, lastRow - startRow + 1, 1).getValues();
  for (let index = 0; index < values.length; index += 1) {
    if (values[index][0] === '' || values[index][0] === null) return startRow + index;
  }
  return lastRow + 1;
}

function assertProxySecret_(e, body) {
  const expected = PropertiesService.getScriptProperties()
    .getProperty(QUD_VP_CONFIG.proxySecretProperty);

  if (!expected) throw apiError_('PROXY_SECRET_NOT_CONFIGURED', 500);

  const provided = String(
    (body && body.proxy_secret) ||
    (e && e.parameter && e.parameter.proxy_secret) ||
    ''
  );

  if (!provided || provided !== expected) {
    throw apiError_('UNAUTHORIZED_PROXY', 403);
  }
}

function parseJsonBody_(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    throw apiError_('INVALID_JSON', 400);
  }
}

function requiredString_(value, fieldName) {
  const result = String(value === undefined || value === null ? '' : value).trim();
  if (!result) throw apiError_('MISSING_' + fieldName.toUpperCase(), 400);
  return result;
}

function finiteNumber_(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw apiError_('INVALID_' + fieldName.toUpperCase(), 400);
  }
  return number;
}

function toBoolean_(value) {
  if (value === true) return true;
  return String(value).trim().toUpperCase() === 'TRUE';
}

function normalizeValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
  }
  return value;
}

function utcDateOnly_(date) {
  return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
}

function apiError_(code, status, details) {
  const error = new Error(code);
  error.apiCode = code;
  error.status = status || 500;
  error.details = details || null;
  return error;
}

function errorResponse_(error) {
  return jsonResponse_({
    ok: false,
    error: error.apiCode || 'INTERNAL_ERROR',
    status: error.status || 500,
    details: error.details || null
  });
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
