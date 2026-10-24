const OWNER_API_PREFIX = '/owner/api/';
const SESSION_PATH = '/owner/api/session';
const STRATEGIES_PATH = '/owner/api/strategies';
const VP_API_PREFIX = '/owner/api/vp/';
const COOKIE_NAME = 'qud_owner_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  pragma: 'no-cache',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()'
});

// Best-effort per-isolate limiter for the one-user MVP. Durable rate limiting
// can replace these two functions later without changing the API contract.
const loginFailures = new Map();

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (!url.pathname.startsWith(OWNER_API_PREFIX)) {
        return jsonResponse({ ok: false, error: 'NOT_FOUND' }, 404);
      }

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            ...JSON_HEADERS,
            allow: 'GET, POST, DELETE, OPTIONS'
          }
        });
      }

      if (url.pathname === SESSION_PATH) {
        return await handleSession(request, env);
      }

      const session = await readSession(request, env);
      if (!session) {
        return jsonResponse(
          { ok: false, authenticated: false, error: 'UNAUTHENTICATED' },
          401
        );
      }

      if (url.pathname === STRATEGIES_PATH) {
        if (request.method !== 'GET') {
          return methodNotAllowed('GET');
        }
        return await handleStrategyList(env);
      }

      if (url.pathname.startsWith(VP_API_PREFIX)) {
        return await handleOwnerPortfolio(request, env, session);
      }

      const strategyId = strategyIdFromPath(url.pathname);
      if (strategyId) {
        if (request.method !== 'GET') {
          return methodNotAllowed('GET');
        }
        return await handleStrategyDetail(env, strategyId);
      }

      return jsonResponse({ ok: false, error: 'NOT_FOUND' }, 404);
    } catch (error) {
      return jsonResponse(
        { ok: false, error: safeErrorCode(error) },
        normalizeHttpStatus(error && error.status)
      );
    }
  }
};

async function handleSession(request, env) {
  if (request.method === 'GET') {
    const session = await readSession(request, env);

    if (!session) {
      return jsonResponse({ ok: true, authenticated: false }, 200);
    }

    return jsonResponse({
      ok: true,
      authenticated: true,
      owner_id: session.owner_id,
      expires_at: session.expires_at
    });
  }

  if (request.method === 'POST') {
    const rateKey = request.headers.get('cf-connecting-ip') || 'unknown';
    const blockedFor = rateLimitRemaining(rateKey);

    if (blockedFor > 0) {
      const retryAfter = Math.ceil(blockedFor / 1000);
      return jsonResponse(
        {
          ok: false,
          authenticated: false,
          error: 'TOO_MANY_ATTEMPTS',
          retry_after_seconds: retryAfter
        },
        429,
        { 'retry-after': String(retryAfter) }
      );
    }

    const body = await readJson(request);
    const suppliedKey = String(body.access_key || '').trim();
    const ownerIdentity = authenticateOwnerAccessKey(suppliedKey, env);

    if (!ownerIdentity) {
      recordLoginFailure(rateKey);
      return jsonResponse(
        { ok: false, authenticated: false, error: 'INVALID_ACCESS_KEY' },
        401
      );
    }

    loginFailures.delete(rateKey);
    const now = Math.floor(Date.now() / 1000);
    const session = {
      version: 1,
      owner_id: ownerIdentity.ownerId,
      issued_at: now,
      expires_at: now + SESSION_TTL_SECONDS
    };

    const token = await createSessionToken(session, env);
    return jsonResponse(
      {
        ok: true,
        authenticated: true,
        owner_id: session.owner_id,
        expires_at: session.expires_at
      },
      200,
      { 'set-cookie': sessionCookie(token, SESSION_TTL_SECONDS) }
    );
  }

  if (request.method === 'DELETE') {
    return jsonResponse(
      { ok: true, authenticated: false },
      200,
      { 'set-cookie': sessionCookie('', 0) }
    );
  }

  return methodNotAllowed('GET, POST, DELETE');
}

async function handleStrategyList(env) {
  const upstream = await callUpstreamGet(env, { action: 'strategies' });
  const errorResponse = normalizeUpstreamError(upstream);
  if (errorResponse) return errorResponse;

  if (!Array.isArray(upstream.payload && upstream.payload.strategies)) {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }

  return jsonResponse({
    ok: true,
    strategies: upstream.payload.strategies.map(publicListStrategy)
  });
}

async function handleStrategyDetail(env, strategyId) {
  const upstream = await callUpstreamGet(env, {
    action: 'strategy',
    strategy_id: strategyId
  });
  const errorResponse = normalizeUpstreamError(upstream);
  if (errorResponse) return errorResponse;

  const payload = upstream.payload;
  if (
    !payload ||
    !payload.strategy ||
    !Array.isArray(payload.history)
  ) {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }

  const strategy = publicDetailStrategy(payload.strategy);
  if (strategy.strategy_id !== strategyId) {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }

  return jsonResponse({
    ok: true,
    strategy,
    history: payload.history.map(publicHistoryRow)
  });
}

/** Owner cookie is the only browser identity. Portfolio IDs never come from the client. */
async function handleOwnerPortfolio(request, env, session) {
  const identity = ownerPortfolioIdentity(session, env);
  const path = new URL(request.url).pathname;
  const portfolioPath = VP_API_PREFIX + 'portfolio';
  const strategiesPath = VP_API_PREFIX + 'strategies';
  const portfoliosPath = VP_API_PREFIX + 'portfolios';
  if (request.method === 'GET' && path === portfoliosPath) {
    const result = await ownerVpUpstream(env, 'GET', {
      action: 'portfolios', subscriber_id: identity.subscriberId
    });
    if (result.ok) {
      const listed = Array.isArray(result.portfolios) ? result.portfolios : result.items;
      if (!Array.isArray(listed)) throw apiError('INVALID_VP_RESPONSE', 502);
      const own = listed.filter((item) =>
        String(item.portfolio_id) === identity.portfolioId);
      result.portfolios = own;
      result.items = own;
    }
    return ownerVpResult(result);
  }
  if (request.method === 'GET' && path === portfolioPath) {
    return ownerVpResult(await ownerVpUpstream(env, 'GET', {
      action: 'portfolio', subscriber_id: identity.subscriberId,
      portfolio_id: identity.portfolioId
    }));
  }
  if (request.method === 'GET' && path === strategiesPath) {
    return ownerVpResult(await ownerVpUpstream(env, 'GET', {
      action: 'strategies', subscriber_id: identity.subscriberId,
      portfolio_id: identity.portfolioId
    }));
  }
  if (request.method === 'POST' && path === portfolioPath) {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
      throw apiError('FORBIDDEN_ORIGIN', 403);
    const body = await readJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw apiError('INVALID_JSON', 400);
    const strategyId = String(body.strategy_id || '').trim();
    const period = String(body.period_code || body.period || '').trim();
    const key = String(body.idempotency_key || '').trim();
    const amount = Number(body.allocated_balance_usd ?? body.start_balance_usd);
    const limit = Number(body.max_drawdown_limit_pct);
    if (!strategyId || strategyId.length > 128 || !period || !key || key.length > 128 ||
        !Number.isFinite(amount) || !Number.isFinite(limit))
      throw apiError('INVALID_OBSERVATION', 400);
    return ownerVpResult(await ownerVpUpstream(env, 'POST', {
      action: 'create_strategy_request', subscriber_id: identity.subscriberId,
      portfolio_id: identity.portfolioId, strategy_id: strategyId,
      allocated_balance_usd: amount, max_drawdown_limit_pct: limit,
      period_code: period, idempotency_key: key
    }));
  }
  return jsonResponse({ok:false,error:'NOT_FOUND'},404);
}

function ownerPortfolioIdentity(session, env) {
  let map;
  try { map = JSON.parse(String(env.QUD_OWNER_VP_IDENTITY_MAP || '')); }
  catch { throw apiError('VP_IDENTITY_NOT_CONFIGURED', 503); }
  const entry = map && typeof map === 'object' && map[session.owner_id];
  const subscriberId = String(entry?.subscriber_id || '').trim();
  const portfolioId = String(entry?.portfolio_id || '').trim();
  if (!subscriberId || !portfolioId) throw apiError('VP_IDENTITY_NOT_CONFIGURED', 503);
  return {subscriberId,portfolioId};
}

function ownerVpUpstreamConfig(env) {
  const value=String(env.QUD_VP_APPS_SCRIPT_URL || '').trim();
  const secret=String(env.QUD_VP_PROXY_SECRET || '').trim();
  let url;
  try { url=new URL(value); } catch { throw apiError('VP_UPSTREAM_NOT_CONFIGURED',503); }
  if(url.protocol!=='https:' || url.hostname!=='script.google.com' ||
      !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname) || !secret)
    throw apiError('VP_UPSTREAM_NOT_CONFIGURED',503);
  return {url,secret};
}

async function ownerVpUpstream(env, method, fields) {
  const upstream=ownerVpUpstreamConfig(env);
  const url=new URL(upstream.url);
  const options={method,redirect:'follow',headers:{accept:'application/json'}};
  if(method==='GET') {
    Object.entries(fields).forEach(([name,value])=>url.searchParams.set(name,String(value)));
    url.searchParams.set('proxy_secret',upstream.secret);
  } else {
    options.headers['content-type']='application/json';
    options.body=JSON.stringify({...fields,proxy_secret:upstream.secret});
  }
  const response=await fetch(url.toString(),options);
  if(!response.ok) throw apiError('VP_UPSTREAM_UNAVAILABLE',502);
  try { return await response.json(); }
  catch { throw apiError('INVALID_VP_RESPONSE',502); }
}

function ownerVpResult(result) {
  if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean')
    throw apiError('INVALID_VP_RESPONSE',502);
  const status=result.ok ? 200 : Number(result.status);
  return jsonResponse(result,result.ok ? 200 :
    (Number.isInteger(status) && status>=400 && status<=499 ? status : 502));
}

async function callUpstreamGet(env, params) {
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
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }

  return { response, payload };
}

function normalizeUpstreamError(upstream) {
  if (!upstream.response.ok) {
    return jsonResponse({ ok: false, error: 'UPSTREAM_UNAVAILABLE' }, 502);
  }

  const payload = upstream.payload;
  if (!payload || payload.ok !== false) return null;

  const status = normalizeUpstreamStatus(payload.status);
  const code = safeUpstreamErrorCode(payload.error);

  // Proxy authentication and internal data errors are deployment concerns,
  // not browser authentication errors. Do not expose their internal codes.
  if (status === 401 || status >= 500) {
    return jsonResponse({ ok: false, error: 'UPSTREAM_UNAVAILABLE' }, 502);
  }

  return jsonResponse({ ok: false, error: code }, status);
}

function publicListStrategy(value) {
  const row = requiredObject(value);

  return {
    strategy_id: requiredStrategyId(row.strategy_id),
    trust_score: requiredNumber(row.trust_score),
    trust_zone: requiredText(row.trust_zone),
    win_ratio_pct: requiredNumber(row.win_ratio_pct),
    history_weeks_count: requiredNumber(row.history_weeks_count),
    data_period_end: requiredDateOnly(row.data_period_end),
    data_status: requiredText(row.data_status)
  };
}

function publicDetailStrategy(value) {
  const row = requiredObject(value);

  return {
    strategy_id: requiredStrategyId(row.strategy_id),
    trust_score: requiredNumber(row.trust_score),
    trust_zone: requiredText(row.trust_zone),
    history_weeks_count: requiredNumber(row.history_weeks_count),
    closed_trades_total: requiredNumber(row.closed_trades_total),
    strategy_return_since_start_pct: requiredNumber(
      row.strategy_return_since_start_pct
    ),
    max_drawdown_since_start_pct: optionalNumber(
      row.max_drawdown_since_start_pct
    ),
    win_ratio_pct: requiredNumber(row.win_ratio_pct),
    profit_factor: optionalNumber(row.profit_factor),
    average_risk_pct: optionalNumber(row.average_risk_pct),
    sl_safe_pct: optionalNumber(row.sl_safe_pct),
    risk_cv_pct: optionalNumber(row.risk_cv_pct),
    data_period_end: requiredDateOnly(row.data_period_end),
    data_status: requiredText(row.data_status)
  };
}

function publicHistoryRow(value) {
  const row = requiredObject(value);
  const periodStart = requiredDateOnly(row.period_start);
  const periodEnd = requiredDateOnly(row.period_end);

  if (periodStart > periodEnd) {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }

  return {
    period_start: periodStart,
    period_end: periodEnd,
    period_return_pct: requiredNumber(row.period_return_pct),
    strategy_return_since_start_pct: requiredNumber(
      row.strategy_return_since_start_pct
    ),
    closed_trades_period: requiredNumber(row.closed_trades_period),
    trust_score_snapshot: row.closed_trades_period === 0 &&
      row.trust_score_snapshot === null && row.trust_zone_snapshot === 'NO_TRADES'
        ? null : requiredNumber(row.trust_score_snapshot),
    trust_zone_snapshot: requiredText(row.trust_zone_snapshot)
  };
}

function strategyIdFromPath(pathname) {
  const prefix = `${STRATEGIES_PATH}/`;
  if (!pathname.startsWith(prefix)) return '';

  const encoded = pathname.slice(prefix.length);
  if (!encoded || encoded.includes('/')) return '';

  let decoded;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    throw apiError('INVALID_STRATEGY_ID', 400);
  }

  return requiredStrategyId(decoded);
}

function requiredStrategyId(value) {
  const strategyId = String(value || '').trim().toUpperCase();
  if (!/^QST-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(strategyId)) {
    throw apiError('INVALID_STRATEGY_ID', 400);
  }
  return strategyId;
}

function requiredObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }
  return value;
}

function requiredText(value) {
  const text = String(value === null || value === undefined ? '' : value)
    .trim();
  if (!text) throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  return text;
}

function requiredNumber(value) {
  if (value === '' || value === null || value === undefined) {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }
  return number;
}

function optionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  return requiredNumber(value);
}

function requiredDateOnly(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw apiError('INVALID_UPSTREAM_RESPONSE', 502);

  const date = new Date(`${text}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text
  ) {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }
  return text;
}

function requireUpstream(env) {
  const value = String(env.QUD_OWNER_APPS_SCRIPT_URL || '').trim();
  const secret = String(env.QUD_OWNER_PROXY_SECRET || '').trim();
  let url;

  try {
    url = new URL(value);
  } catch {
    throw apiError('UPSTREAM_NOT_CONFIGURED', 500);
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'script.google.com' ||
    !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname) ||
    !secret
  ) {
    throw apiError('UPSTREAM_NOT_CONFIGURED', 500);
  }

  return { url: url.toString(), secret };
}

function requiredEnv(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw apiError(`${name}_NOT_CONFIGURED`, 500);
  return value;
}

/**
 * Single-owner credential resolver for MVP stage 1.
 *
 * When the project moves to five owners, replace only this resolver with a
 * credential store lookup. The signed session and all public routes already
 * use owner_id and therefore do not need to change.
 */
function authenticateOwnerAccessKey(suppliedKey, env) {
  const expectedKey = requiredEnv(env, 'QUD_OWNER_ACCESS_KEY');
  const ownerId = String(env.QUD_OWNER_ID || 'TEST-OWNER-001').trim();

  if (!ownerId) {
    throw apiError('QUD_OWNER_ID_NOT_CONFIGURED', 500);
  }

  if (
    suppliedKey.length > 512 ||
    !constantTimeEqual(suppliedKey, expectedKey)
  ) {
    return null;
  }

  return { ownerId };
}

async function readSession(request, env) {
  const cookie = parseCookies(request.headers.get('cookie') || '')[COOKIE_NAME];
  if (!cookie) return null;

  const dot = cookie.lastIndexOf('.');
  if (dot <= 0) return null;

  const payloadPart = cookie.slice(0, dot);
  const signaturePart = cookie.slice(dot + 1);
  const expected = await signText(payloadPart, sessionSigningSecret(env));
  if (!constantTimeEqual(signaturePart, expected)) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payloadPart));
    const now = Math.floor(Date.now() / 1000);

    if (session.version !== 1) return null;
    if (!session.owner_id) return null;
    if (!session.expires_at || Number(session.expires_at) <= now) return null;
    return session;
  } catch {
    return null;
  }
}

async function createSessionToken(session, env) {
  const payloadPart = base64UrlEncode(JSON.stringify(session));
  const signature = await signText(payloadPart, sessionSigningSecret(env));
  return `${payloadPart}.${signature}`;
}

function sessionSigningSecret(env) {
  const secret = String(
    env.QUD_OWNER_SESSION_SECRET || env.QUD_OWNER_ACCESS_KEY || ''
  ).trim();
  if (!secret) throw apiError('SESSION_SECRET_NOT_CONFIGURED', 500);
  return secret;
}

async function signText(value, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(value)
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function sessionCookie(value, maxAge) {
  const encoded = encodeURIComponent(value);
  return `${COOKIE_NAME}=${encoded}; Path=/owner; Max-Age=${maxAge}; ` +
    'HttpOnly; Secure; SameSite=Strict';
}

function parseCookies(header) {
  return header.split(';').reduce(function(result, part) {
    const separator = part.indexOf('=');
    if (separator < 0) return result;

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(value);
      } catch {
        result[key] = '';
      }
    }
    return result;
  }, {});
}

function rateLimitRemaining(key) {
  const now = Date.now();
  const entry = loginFailures.get(key);
  if (!entry) return 0;

  if (now - entry.startedAt >= LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return 0;
  }

  if (entry.count < LOGIN_MAX_FAILURES) return 0;
  return LOGIN_WINDOW_MS - (now - entry.startedAt);
}

function recordLoginFailure(key) {
  const now = Date.now();
  const current = loginFailures.get(key);

  if (!current || now - current.startedAt >= LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 1, startedAt: now });
    return;
  }

  current.count += 1;
  loginFailures.set(key, current);
}

function constantTimeEqual(left, right) {
  const first = new TextEncoder().encode(String(left));
  const second = new TextEncoder().encode(String(right));
  const length = Math.max(first.length, second.length);
  let difference = first.length ^ second.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (first[index] || 0) ^ (second[index] || 0);
  }

  return difference === 0;
}

function base64UrlEncode(value) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlDecode(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, function(character) {
    return character.charCodeAt(0);
  });
  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  bytes.forEach(function(byte) {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function readJson(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw apiError('INVALID_JSON', 400);
    }
    return value;
  } catch {
    throw apiError('INVALID_JSON', 400);
  }
}

function normalizeUpstreamStatus(value) {
  const status = Number(value);
  if (!Number.isInteger(status) || status < 400 || status > 599) return 502;
  return status;
}

function safeUpstreamErrorCode(value) {
  const code = String(value || 'UPSTREAM_ERROR');
  return /^[A-Z0-9_-]{2,100}$/.test(code) ? code : 'UPSTREAM_ERROR';
}

function methodNotAllowed(allow) {
  return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405, {
    allow
  });
}

function apiError(code, status) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

function safeErrorCode(error) {
  const value = String(
    error && (error.code || error.message) || 'INTERNAL_ERROR'
  );
  return /^[A-Z0-9_-]{2,100}$/.test(value)
    ? value
    : 'INTERNAL_ERROR';
}

function normalizeHttpStatus(value) {
  const status = Number(value);
  return Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : 500;
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}
