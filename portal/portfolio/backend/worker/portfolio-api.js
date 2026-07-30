const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff'
});

/**
 * Attach this handler after the existing QUD session validation.
 *
 * Required env bindings:
 *   QUD_VP_APPS_SCRIPT_URL - deployed Apps Script /exec URL
 *   QUD_VP_PROXY_SECRET    - shared secret stored in Apps Script properties
 *
 * Required session shape:
 *   { subscriber_id: string, portfolio_id?: string }
 */
export async function handlePortfolioApi(request, env, session) {
  try {
    const identity = requireIdentity(session);
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/portal/vp/portfolios') {
      return forwardGet(env, {
        action: 'portfolios',
        subscriber_id: identity.subscriberId
      });
    }

    if (request.method === 'GET' && path === '/portal/vp/portfolio') {
      const portfolioId = requiredString(
        url.searchParams.get('portfolio_id') || identity.portfolioId,
        'portfolio_id'
      );

      return forwardGet(env, {
        action: 'portfolio',
        subscriber_id: identity.subscriberId,
        portfolio_id: portfolioId
      });
    }

    if (request.method === 'GET' && path === '/portal/vp/strategies') {
      const portfolioId = requiredString(
        url.searchParams.get('portfolio_id') || identity.portfolioId,
        'portfolio_id'
      );

      return forwardGet(env, {
        action: 'strategies',
        subscriber_id: identity.subscriberId,
        portfolio_id: portfolioId
      });
    }

    if (request.method === 'POST' && path === '/portal/vp/portfolio') {
      const body = await readJson(request);
      const portfolioId = requiredString(
        body.portfolio_id || url.searchParams.get('portfolio_id') || identity.portfolioId,
        'portfolio_id'
      );

      const payload = {
        action: 'create_strategy_request',
        subscriber_id: identity.subscriberId,
        portfolio_id: portfolioId,
        strategy_id: requiredString(body.strategy_id, 'strategy_id'),
        allocated_balance_usd: finiteNumber(
          body.allocated_balance_usd ?? body.start_balance_usd,
          'allocated_balance_usd'
        ),
        max_drawdown_limit_pct: finiteNumber(
          body.max_drawdown_limit_pct,
          'max_drawdown_limit_pct'
        ),
        period_code: requiredString(body.period_code || body.period, 'period_code'),
        idempotency_key: requiredString(body.idempotency_key, 'idempotency_key')
      };

      return forwardPost(env, payload);
    }

    return jsonResponse({ ok: false, error: 'NOT_FOUND' }, 404);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error.code || 'INTERNAL_ERROR',
        details: error.details || null
      },
      error.status || 500
    );
  }
}

async function forwardGet(env, params) {
  const upstream = requireUpstream(env);
  const url = new URL(upstream.url);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set('proxy_secret', upstream.secret);

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
    headers: { accept: 'application/json' }
  });

  return normalizeUpstream(response);
}

async function forwardPost(env, payload) {
  const upstream = requireUpstream(env);

  const response = await fetch(upstream.url, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      ...payload,
      proxy_secret: upstream.secret
    })
  });

  return normalizeUpstream(response);
}

async function normalizeUpstream(response) {
  let payload;

  try {
    payload = await response.json();
  } catch {
    return jsonResponse({ ok: false, error: 'INVALID_UPSTREAM_RESPONSE' }, 502);
  }

  if (!response.ok) {
    return jsonResponse(
      { ok: false, error: 'UPSTREAM_HTTP_ERROR', upstream_status: response.status },
      502
    );
  }

  const status = payload && payload.ok === false
    ? normalizeStatus(payload.status)
    : 200;

  return jsonResponse(payload, status);
}

function requireIdentity(session) {
  if (!session || typeof session !== 'object') {
    throw apiError('UNAUTHENTICATED', 401);
  }

  const subscriberId = requiredString(
    session.subscriber_id || session.subscriberId,
    'subscriber_id'
  );

  const portfolioId = String(
    session.portfolio_id || session.portfolioId || ''
  ).trim();

  return { subscriberId, portfolioId };
}

function requireUpstream(env) {
  const url = String(env.QUD_VP_APPS_SCRIPT_URL || '').trim();
  const secret = String(env.QUD_VP_PROXY_SECRET || '').trim();

  if (!url || !secret) {
    throw apiError('UPSTREAM_NOT_CONFIGURED', 500);
  }

  return { url, secret };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw apiError('INVALID_JSON', 400);
  }
}

function requiredString(value, field) {
  const result = String(value ?? '').trim();
  if (!result) throw apiError(`MISSING_${field.toUpperCase()}`, 400);
  return result;
}

function finiteNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw apiError(`INVALID_${field.toUpperCase()}`, 400);
  }
  return number;
}

function normalizeStatus(value) {
  const status = Number(value);
  if (!Number.isInteger(status) || status < 400 || status > 599) return 400;
  return status;
}

function apiError(code, status, details = null) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS
  });
}
