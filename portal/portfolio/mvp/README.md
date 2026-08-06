# QUD Virtual Portfolio MVP workspace

This protected test page is the first complete user-facing Virtual Portfolio flow.

## User flow

1. Open a protected session with the QUD access key.
2. Load the subscriber's portfolio automatically.
3. View aggregate balance, return, drawdown, active strategies and weekly balance trend.
4. Select a strategy to view the user's observation, strategy profitability metrics and weekly history.
5. Start a new observation with:
   - strategy;
   - virtual capital of at least USD 1,000;
   - period (`2_weeks`, `1_month`, `3_months`);
   - maximum drawdown limit.
6. Refresh the portfolio immediately after a successful request.

## Protected endpoints

The page calls only same-origin Worker routes:

- `GET/POST/DELETE /portal/vp/session`
- `GET /portal/vp/portfolios`
- `GET /portal/vp/portfolio?portfolio_id=...`
- `GET /portal/vp/strategies?portfolio_id=...`
- `POST /portal/vp/portfolio`

The browser never sends `subscriber_id` or the Apps Script proxy secret. The Worker must validate the protected session and inject both server-side values.

## Safety

- The existing production page at `portal/portfolio/index.html` is unchanged.
- This page is available separately at `portal/portfolio/mvp/` for protected testing.
- It contains no secrets and is marked `noindex`.
- The main QUD spreadsheet remains read-only.
