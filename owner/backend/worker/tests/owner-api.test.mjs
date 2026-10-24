import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const directory = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(directory, '..', 'owner-api.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { default: worker } = await import(moduleUrl);

const env = {
  QUD_OWNER_ACCESS_KEY: 'test-owner-access-key',
  QUD_OWNER_ID: 'TEST-OWNER-001',
  QUD_OWNER_SESSION_SECRET: 'test-owner-session-secret',
  QUD_OWNER_APPS_SCRIPT_URL:
    'https://script.google.com/macros/s/test-deployment-id/exec',
  QUD_OWNER_PROXY_SECRET: 'test-owner-proxy-secret'
};

function request(pathname, init = {}) {
  return new Request(`https://fx-qud.com${pathname}`, init);
}

async function payload(response) {
  return response.json();
}

function cookiePair(setCookie) {
  return String(setCookie || '').split(';')[0];
}

function assertExactKeys(object, expected) {
  assert.deepEqual(Object.keys(object).sort(), expected.slice().sort());
}

function assertNoPrivateFields(value) {
  const serialized = JSON.stringify(value);
  for (const field of [
    'audit_id',
    'trader_id',
    'account_login',
    'email',
    'published_at',
    'proxy_secret',
    'owner_id'
  ]) {
    assert.equal(serialized.includes(`"${field}"`), false, field);
  }
}

let response = await worker.fetch(request('/owner/api/session'), env);
assert.equal(response.status, 200);
assert.deepEqual(await payload(response), { ok: true, authenticated: false });

response = await worker.fetch(request('/owner/api/session', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: 'null'
}), env);
assert.equal(response.status, 400);
assert.deepEqual(await payload(response), {
  ok: false,
  error: 'INVALID_JSON'
});

response = await worker.fetch(request('/owner/api/session', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'cf-connecting-ip': '198.51.100.10'
  },
  body: JSON.stringify({ access_key: 'wrong' })
}), env);
assert.equal(response.status, 401);
assert.deepEqual(await payload(response), {
  ok: false,
  authenticated: false,
  error: 'INVALID_ACCESS_KEY'
});

let upstreamCalls = 0;
globalThis.fetch = async () => {
  upstreamCalls += 1;
  throw new Error('Upstream must not be called');
};
response = await worker.fetch(request('/owner/api/strategies', {
  headers: { cookie: 'qud_vp_session=not-an-owner-session' }
}), env);
assert.equal(response.status, 401);
assert.equal(upstreamCalls, 0);

response = await worker.fetch(request('/owner/api/session', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'cf-connecting-ip': '198.51.100.10'
  },
  body: JSON.stringify({ access_key: env.QUD_OWNER_ACCESS_KEY })
}), env);
assert.equal(response.status, 200);
const loginPayload = await payload(response);
assert.equal(loginPayload.ok, true);
assert.equal(loginPayload.authenticated, true);
assert.equal(loginPayload.owner_id, env.QUD_OWNER_ID);

const setCookie = response.headers.get('set-cookie');
assert.match(setCookie, /^qud_owner_session=/);
assert.match(setCookie, /Path=\/owner/);
assert.match(setCookie, /HttpOnly/);
assert.match(setCookie, /Secure/);
assert.match(setCookie, /SameSite=Strict/);
assert.equal(setCookie.includes('qud_vp_session'), false);
const sessionCookie = cookiePair(setCookie);

response = await worker.fetch(request('/owner/api/session', {
  headers: { cookie: sessionCookie }
}), env);
assert.equal(response.status, 200);
const sessionPayload = await payload(response);
assert.equal(sessionPayload.authenticated, true);
assert.equal(sessionPayload.owner_id, env.QUD_OWNER_ID);

response = await worker.fetch(request('/owner/api/strategies', {
  headers: { cookie: `${sessionCookie}x` }
}), env);
assert.equal(response.status, 401);
assert.equal((await payload(response)).error, 'UNAUTHENTICATED');

globalThis.fetch = async (input, init) => {
  upstreamCalls += 1;
  const url = new URL(input);
  assert.equal(url.origin, 'https://script.google.com');
  assert.equal(url.pathname, '/macros/s/test-deployment-id/exec');
  assert.equal(url.searchParams.get('action'), 'strategies');
  assert.equal(
    url.searchParams.get('proxy_secret'),
    env.QUD_OWNER_PROXY_SECRET
  );
  assert.equal(init.method, 'GET');
  assert.equal(init.redirect, 'follow');

  return new Response(JSON.stringify({
    ok: true,
    strategies: [{
      strategy_id: 'QST-CAUZ-MPE9',
      trust_score: 60,
      trust_zone: 'QUD Room',
      win_ratio_pct: 86.66666667,
      history_weeks_count: 5,
      data_period_end: '2026-07-10',
      data_status: 'CONFIRMED',
      audit_id: 'aud_private',
      email: 'private@example.test'
    }]
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};

response = await worker.fetch(request('/owner/api/strategies', {
  headers: { cookie: sessionCookie }
}), env);
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
const list = await payload(response);
assert.equal(list.strategies.length, 1);
assertExactKeys(list.strategies[0], [
  'strategy_id',
  'trust_score',
  'trust_zone',
  'win_ratio_pct',
  'history_weeks_count',
  'data_period_end',
  'data_status'
]);
assertNoPrivateFields(list);

globalThis.fetch = async (input) => {
  upstreamCalls += 1;
  const url = new URL(input);
  assert.equal(url.searchParams.get('action'), 'strategy');
  assert.equal(url.searchParams.get('strategy_id'), 'QST-CAUZ-MPE9');
  assert.equal(
    url.searchParams.get('proxy_secret'),
    env.QUD_OWNER_PROXY_SECRET
  );

  return new Response(JSON.stringify({
    ok: true,
    strategy: {
      strategy_id: 'QST-CAUZ-MPE9',
      trust_score: 60,
      trust_zone: 'QUD Room',
      history_weeks_count: 5,
      closed_trades_total: 15,
      strategy_return_since_start_pct: 11.94628052,
      max_drawdown_since_start_pct: null,
      win_ratio_pct: 86.66666667,
      profit_factor: 5.264633719,
      average_risk_pct: 1.567113333,
      sl_safe_pct: null,
      risk_cv_pct: 0.343152098,
      data_period_end: '2026-07-10',
      data_status: 'CONFIRMED',
      audit_id: 'aud_private',
      account_login: 'private-login'
    },
    history: [{
      period_start: '2026-07-04',
      period_end: '2026-07-10',
      period_return_pct: 3.862459986,
      strategy_return_since_start_pct: 11.94628052,
      closed_trades_period: 4,
      trust_score_snapshot: 60,
      trust_zone_snapshot: 'QUD Room',
      audit_id: 'aud_private',
      published_at: '2026-09-08T12:00:00Z'
    }]
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};

response = await worker.fetch(request(
  '/owner/api/strategies/qst-cauz-mpe9',
  { headers: { cookie: sessionCookie } }
), env);
assert.equal(response.status, 200);
const detail = await payload(response);
assert.equal(detail.strategy.max_drawdown_since_start_pct, null);
assert.equal(detail.strategy.sl_safe_pct, null);
assertExactKeys(detail.strategy, [
  'strategy_id',
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
]);
assertExactKeys(detail.history[0], [
  'period_start',
  'period_end',
  'period_return_pct',
  'strategy_return_since_start_pct',
  'closed_trades_period',
  'trust_score_snapshot',
  'trust_zone_snapshot'
]);
assertNoPrivateFields(detail);

globalThis.fetch = async () => new Response(JSON.stringify({
  ok: false,
  error: 'OWNER_DATA_INCONSISTENT',
  status: 500
}), {
  status: 200,
  headers: { 'content-type': 'application/json' }
});
response = await worker.fetch(request('/owner/api/strategies', {
  headers: { cookie: sessionCookie }
}), env);
assert.equal(response.status, 502);
assert.deepEqual(await payload(response), {
  ok: false,
  error: 'UPSTREAM_UNAVAILABLE'
});

const callsBeforeInvalidId = upstreamCalls;
response = await worker.fetch(request(
  '/owner/api/strategies/not-a-strategy',
  { headers: { cookie: sessionCookie } }
), env);
assert.equal(response.status, 400);
assert.deepEqual(await payload(response), {
  ok: false,
  error: 'INVALID_STRATEGY_ID'
});
assert.equal(upstreamCalls, callsBeforeInvalidId);

globalThis.fetch = async () => new Response(JSON.stringify({
  ok: false,
  error: 'STRATEGY_NOT_FOUND',
  status: 404
}), {
  status: 200,
  headers: { 'content-type': 'application/json' }
});
response = await worker.fetch(request(
  '/owner/api/strategies/QST-BCR2-FXY8',
  { headers: { cookie: sessionCookie } }
), env);
assert.equal(response.status, 404);
assert.deepEqual(await payload(response), {
  ok: false,
  error: 'STRATEGY_NOT_FOUND'
});

response = await worker.fetch(request('/owner/api/strategies', {
  method: 'POST',
  headers: { cookie: sessionCookie }
}), env);
assert.equal(response.status, 405);
assert.equal(response.headers.get('allow'), 'GET');

const vpEnv = {
  ...env,
  QUD_OWNER_VP_IDENTITY_MAP: JSON.stringify({
    'TEST-OWNER-001': {
      subscriber_id: 'TEST-SUBSCRIBER-001',
      portfolio_id: 'QVP-TEST-001'
    }
  }),
  QUD_VP_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/vp-test-deployment/exec',
  QUD_VP_PROXY_SECRET: 'vp-test-secret'
};
let vpCalls = [];
globalThis.fetch = async (url, options) => {
  vpCalls.push({ url: String(url), options });
  const action = options.method === 'GET'
    ? new URL(url).searchParams.get('action')
    : JSON.parse(options.body).action;
  const data = action === 'portfolios'
    ? { ok: true, portfolios: [
      { portfolio_id: 'QVP-TEST-001' },
      { portfolio_id: 'QVP-OTHER-001' }
    ] }
    : { ok: true, action, portfolio: { portfolio_id: 'QVP-TEST-001' } };
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};
response = await worker.fetch(request('/owner/api/vp/portfolios', {
  headers: { cookie: sessionCookie }
}), vpEnv);
assert.equal(response.status, 200);
assert.deepEqual((await payload(response)).portfolios, [{ portfolio_id: 'QVP-TEST-001' }]);

response = await worker.fetch(request('/owner/api/vp/portfolio?portfolio_id=QVP-OTHER-001', {
  headers: { cookie: sessionCookie }
}), vpEnv);
assert.equal(response.status, 200);
assert.equal(new URL(vpCalls.at(-1).url).searchParams.get('portfolio_id'), 'QVP-TEST-001');
assert.equal(new URL(vpCalls.at(-1).url).searchParams.get('subscriber_id'), 'TEST-SUBSCRIBER-001');

response = await worker.fetch(request('/owner/api/vp/portfolio', {
  method: 'POST',
  headers: { cookie: sessionCookie, 'content-type': 'application/json', origin: 'https://fx-qud.com' },
  body: JSON.stringify({
    portfolio_id: 'QVP-OTHER-001', subscriber_id: 'OTHER',
    strategy_id: 'QST-TEST-001', start_balance_usd: 1000,
    max_drawdown_limit_pct: 7, period: '2_weeks', idempotency_key: 'test-request-1'
  })
}), vpEnv);
assert.equal(response.status, 200);
const forwarded = JSON.parse(vpCalls.at(-1).options.body);
assert.equal(forwarded.portfolio_id, 'QVP-TEST-001');
assert.equal(forwarded.subscriber_id, 'TEST-SUBSCRIBER-001');
assert.equal(forwarded.action, 'create_strategy_request');

const vpCallCount = vpCalls.length;
response = await worker.fetch(request('/owner/api/vp/portfolio', {
  method: 'POST',
  headers: { cookie: sessionCookie, 'content-type': 'application/json', origin: 'https://other.example' },
  body: '{}'
}), vpEnv);
assert.equal(response.status, 403);
assert.equal(vpCalls.length, vpCallCount);

response = await worker.fetch(request('/owner/api/vp/portfolio', {
  headers: { cookie: 'qud_vp_session=old-vp-session' }
}), vpEnv);
assert.equal(response.status, 401);
assert.equal(vpCalls.length, vpCallCount);

response = await worker.fetch(request('/owner/api/vp/portfolio', {
  headers: { cookie: sessionCookie }
}), env);
assert.equal(response.status, 503);
assert.equal(vpCalls.length, vpCallCount);

response = await worker.fetch(request('/owner/api/session', {
  method: 'DELETE',
  headers: { cookie: sessionCookie }
}), env);
assert.equal(response.status, 200);
assert.deepEqual(await payload(response), { ok: true, authenticated: false });
assert.match(response.headers.get('set-cookie'), /Max-Age=0/);

console.log('Owner Worker tests passed');
