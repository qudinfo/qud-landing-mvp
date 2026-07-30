# QUD Virtual Portfolio backend

## Permanent model

A subscriber owns one portfolio. The portfolio contains multiple strategy slots.
Each strategy slot is represented by the latest request for that strategy.

Rules:

- one portfolio can contain multiple strategies;
- one strategy can have only one `ACTIVE` request inside the portfolio;
- parameters of an active request are immutable;
- a new request for the same strategy is allowed only after the current request is completed or stopped;
- the current portfolio balance uses only the latest request for each strategy;
- completed latest requests remain frozen in the portfolio balance until replaced;
- older requests remain in history and are never summed again;
- the main QUD spreadsheet is read-only;
- all portfolio writes and tests occur only in `QUD Virtual Portfolio`.

## Source sheets

Write layer:

- `portfolios` — one aggregate portfolio per subscriber;
- `portfolio_strategy_requests` — all strategy requests and their parameters;
- `portfolio_strategy_history` — completed weekly periods for each request;
- `portfolio_history` — aggregate portfolio snapshots.

Read/API layer:

- `api_portfolios`;
- `api_strategy_slots` — latest request for each strategy;
- `api_strategy_requests` — all QA-approved requests;
- `api_strategy_history`;
- `api_portfolio_history`;
- `api_strategy_availability`.

Rows with failed QA are excluded from API views.

## Protected API contract

The browser communicates only with the Cloudflare Worker.
The Worker validates the existing protected session and injects `subscriber_id`.
The browser cannot choose or replace the subscriber identity.

### `GET /portal/vp/portfolios`

Returns all portfolios owned by the authenticated subscriber.

### `GET /portal/vp/portfolio?portfolio_id=...`

Returns:

```json
{
  "ok": true,
  "portfolio": {},
  "strategy_slots": [],
  "strategy_requests": [],
  "strategy_history": [],
  "portfolio_history": [],
  "available_strategies": []
}
```

The response temporarily includes `history` and single-strategy compatibility fields so the current frontend continues to work during migration.

### `GET /portal/vp/strategies?portfolio_id=...`

Returns only strategies that:

- have `qa_status = OK`;
- are selectable and export-ready;
- do not already have an active request in this portfolio.

### `POST /portal/vp/portfolio`

Creates a new strategy request inside the existing portfolio.
It does not create a second portfolio.

Browser payload:

```json
{
  "portfolio_id": "QVP-...",
  "strategy_id": "QST-...",
  "start_balance_usd": 1500,
  "max_drawdown_limit_pct": 5,
  "period": "2_weeks",
  "idempotency_key": "uuid"
}
```

Server checks:

- authenticated subscriber owns the portfolio;
- strategy exists and has `qa_status = OK`;
- no active request exists for the same portfolio and strategy;
- balance, drawdown and period are valid;
- `idempotency_key` has not created another row;
- the write is executed under `LockService`.

## Environment configuration

Apps Script property:

- `QUD_VP_PROXY_SECRET`

Cloudflare Worker bindings:

- `QUD_VP_APPS_SCRIPT_URL`
- `QUD_VP_PROXY_SECRET`

Secrets must never be committed to GitHub.

## Test records

All temporary records use the `TST-` prefix and exist only in the QUD Virtual Portfolio spreadsheet.
After the full test cycle, remove test history first, then test requests, test strategy periods, snapshot and registry rows.
The real strategy `QST-CAUZ-MPE9` and portfolio `QVP-20260728-00B2` must remain unchanged.
