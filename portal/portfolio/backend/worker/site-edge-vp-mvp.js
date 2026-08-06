const SESSION_PATH = '/portal/vp/session';
const DIAGNOSTICS_PATH = '/portal/vp/diagnostics';
const COOKIE_NAME = 'qud_vp_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
});

const loginFailures = new Map();

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (!url.pathname.startsWith('/portal/vp/')) {
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
        return handleSession(request, env);
      }

      const session = await readSession(request, env);
      if (!session) {
        return jsonResponse(
          { ok: false, authenticated: false, error: 'UNAUTHENTICATED' },
          401
        );
      }

      if (url.pathname === DIAGNOSTICS_PATH && request.method === 'GET') {
        return handleDiagnostics(env, session);
      }

      return handlePortfolioRoute(request, env, session);
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: safeErrorCode(error),
          details: error && error.details ? error.details : null
        },
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
    return sessionResponse(session);
  }

  if (request.method === 'POST') {
    const rateKey = request.headers.get('cf-connecting-ip') || 'unknown';
    const blockedFor = rateLimitRemaining(rateKey);
    if (blockedFor > 0) {
      return jsonResponse(
        {
          ok: false,
          authenticated: false,
          error: 'TOO_MANY_ATTEMPTS',
          retry_after_seconds: Math.ceil(blockedFor / 1000)
        },
        429,
        { 'retry-after': String(Math.ceil(blockedFor / 1000)) }
      );
    }

    const body = await readJson(request);
    const suppliedKey = String(body.access_key || '').trim();
    const expectedKey = requiredEnv(env, 'QUD_VP_ACCESS_KEY');

    if (!constantTimeEqual(suppliedKey, expectedKey)) {
      recordLoginFailure(rateKey);
      return jsonResponse(
        { ok: false, authenticated: false, error: 'INVALID_ACCESS_KEY' },
        401
      );
    }

    loginFailures.delete(rateKey);
    const now = Math.floor(Date.now() / 1000);
    const session = {
      subscriber_id: String(
        env.QUD_VP_SUBSCRIBER_ID || 'TEST-SUBSCRIBER-001'
      ).trim(),
      portfolio_id: String(
        env.QUD_VP_PORTFOLIO_ID || 'QVP-20260728-00B2'
      ).trim(),
      issued_at: now,
      expires_at: now + SESSION_TTL_SECONDS
    };

    const token = await createSessionToken(session, env);
    return jsonResponse(
      {
        ok: true,
        authenticated: true,
        subscriber_id: session.subscriber_id,
        portfolio_id: session.portfolio_id,
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

  return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405, {
    allow: 'GET, POST, DELETE'
  });
}

async function handlePortfolioRoute(request, env, session) {
  const identity = requireIdentity(session);
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'GET' && path === '/portal/vp/portfolios') {
    return proxyGet(env, {
      action: 'portfolios',
      subscriber_id: identity.subscriberId
    });
  }

  if (request.method === 'GET' && path === '/portal/vp/portfolio') {
    const portfolioId = requiredString(
      url.searchParams.get('portfolio_id') || identity.portfolioId,
      'portfolio_id'
    );
    assertOwnedPortfolio(portfolioId, identity.portfolioId);
    return proxyGet(env, {
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
    assertOwnedPortfolio(portfolioId, identity.portfolioId);
    return proxyGet(env, {
      action: 'strategies',
      subscriber_id: identity.subscriberId,
      portfolio_id: portfolioId
    });
  }

  if (request.method === 'POST' && path === '/portal/vp/portfolio') {
    const body = await readJson(request);
    const portfolioId = requiredString(
      body.portfolio_id || identity.portfolioId,
      'portfolio_id'
    );
    assertOwnedPortfolio(portfolioId, identity.portfolioId);

    return proxyPost(env, {
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
      period_code: requiredString(
        body.period_code || body.period,
        'period_code'
      ),
      idempotency_key: requiredString(
        body.idempotency_key,
        'idempotency_key'
      )
    });
  }

  return jsonResponse({ ok: false, error: 'NOT_FOUND' }, 404);
}

async function handleDiagnostics(env, session) {
  const identity = requireIdentity(session);
  const configuration = {
    access_key_configured: Boolean(String(env.QUD_VP_ACCESS_KEY || '').trim()),
    apps_script_url_configured: Boolean(
      String(env.QUD_VP_APPS_SCRIPT_URL || '').trim()
    ),
    proxy_secret_configured: Boolean(
      String(env.QUD_VP_PROXY_SECRET || '').trim()
    ),
    session_secret_mode: String(env.QUD_VP_SESSION_SECRET || '').trim()
      ? 'DEDICATED_SECRET'
      : 'ACCESS_KEY_FALLBACK'
  };

  let upstream = {
    reachable: false,
    http_status: null,
    api_ok: false,
    portfolios_count: null,
    error: null
  };

  try {
    const result = await callUpstreamGet(env, {
      action: 'portfolios',
      subscriber_id: identity.subscriberId
    });
    upstream = {
      reachable: true,
      http_status: result.response.status,
      api_ok: result.payload && result.payload.ok !== false,
      portfolios_count: extractPortfolioCount(result.payload),
      error: result.payload && result.payload.ok === false
        ? String(result.payload.error || 'UPSTREAM_API_ERROR')
        : null
    };
  } catch (error) {
    upstream.error = safeErrorCode(error);
  }

  return jsonResponse({
    ok: configuration.apps_script_url_configured &&
      configuration.proxy_secret_configured &&
      upstream.reachable &&
      upstream.api_ok,
    authenticated: true,
    identity: {
      subscriber_id: identity.subscriberId,
      portfolio_id: identity.portfolioId
    },
    configuration,
    routes: {
      session: SESSION_PATH,
      portfolios: '/portal/vp/portfolios',
      portfolio: '/portal/vp/portfolio',
      strategies: '/portal/vp/strategies'
    },
    upstream
  });
}

async function proxyGet(env, params) {
  const result = await callUpstreamGet(env, params);
  return normalizeUpstream(result.response, result.payload);
}

async function callUpstreamGet(env, params) {
  const upstream = requireUpstream(env);
  const url = new URL(upstream.url);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  url.searchParams.set('proxy_secret', upstream.secret);

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
    headers: { accept: 'application/json' }
  });
  const payload = await parseUpstreamJson(response);
  return { response, payload };
}

async function proxyPost(env, payload) {
  const upstream = requireUpstream(env);
  const response = await fetch(upstream.url, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ ...payload, proxy_secret: upstream.secret })
  });
  const responsePayload = await parseUpstreamJson(response);
  return normalizeUpstream(response, responsePayload);
}

async function parseUpstreamJson(response) {
  try {
    return await response.json();
  } catch {
    throw apiError('INVALID_UPSTREAM_RESPONSE', 502);
  }
}

function normalizeUpstream(response, payload) {
  if (!response.ok) {
    return jsonResponse(
      {
        ok: false,
        error: 'UPSTREAM_HTTP_ERROR',
        upstream_status: response.status
      },
      502
    );
  }

  const status = payload && payload.ok === false
    ? normalizeHttpStatus(payload.status)
    : 200;
  return jsonResponse(payload, status);
}

function requireIdentity(session) {
  if (!session || typeof session !== 'object') {
    throw apiError('UNAUTHENTICATED', 401);
  }
  return {
    subscriberId: requiredString(session.subscriber_id, 'subscriber_id'),
    portfolioId: requiredString(session.portfolio_id, 'portfolio_id')
  };
}

function assertOwnedPortfolio(requestedId, sessionId) {
  if (String(requestedId) !== String(sessionId)) {
    throw apiError('PORTFOLIO_NOT_ALLOWED', 403);
  }
}

function requireUpstream(env) {
  const url = String(env.QUD_VP_APPS_SCRIPT_URL || '').trim();
  const secret = String(env.QUD_VP_PROXY_SECRET || '').trim();
  if (!url || !secret) throw apiError('UPSTREAM_NOT_CONFIGURED', 500);
  return { url, secret };
}

function requiredEnv(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw apiError(`${name}_NOT_CONFIGURED`, 500);
  return value;
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
    if (!session.expires_at || Number(session.expires_at) <= now) return null;
    if (!session.subscriber_id || !session.portfolio_id) return null;
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
  return String(env.QUD_VP_SESSION_SECRET || env.QUD_VP_ACCESS_KEY || '').trim();
}

async function signText(value, secret) {
  if (!secret) throw apiError('SESSION_SECRET_NOT_CONFIGURED', 500);
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

function sessionResponse(session) {
  return jsonResponse({
    ok: true,
    authenticated: true,
    subscriber_id: session.subscriber_id,
    portfolio_id: session.portfolio_id,
    expires_at: session.expires_at
  });
}

function sessionCookie(value, maxAge) {
  const encoded = encodeURIComponent(value);
  return `${COOKIE_NAME}=${encoded}; Path=/portal/vp; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function parseCookies(header) {
  return header.split(';').reduce((result, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return result;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
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
  const a = new TextEncoder().encode(String(left));
  const b = new TextEncoder().encode(String(right));
  const length = Math.max(a.length, b.length);
  let difference = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] || 0) ^ (b[index] || 0);
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
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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

function extractPortfolioCount(payload) {
  if (Array.isArray(payload && payload.portfolios)) return payload.portfolios.length;
  if (Array.isArray(payload && payload.items)) return payload.items.length;
  if (Array.isArray(payload)) return payload.length;
  return null;
}

function apiError(code, status, details = null) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
}

function safeErrorCode(error) {
  const value = String(error && (error.code || error.message) || 'INTERNAL_ERROR');
  return /^[A-Z0-9_\-]{2,100}$/.test(value) ? value : 'INTERNAL_ERROR';
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
