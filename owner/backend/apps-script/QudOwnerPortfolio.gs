// Called by the authenticated profile service while holding its script lock.
function qudEnsureOwnerPortfolio_(owners, ownerId) {
  if (typeof ownerId !== 'string' || !/^QUD-[a-f0-9]{32}$/.test(ownerId))
    throw qudOwnerApiError_('OWNER_UNAVAILABLE', 403);
  const people = owners.getDataRange().getValues().slice(1).filter(row => row[0] === ownerId);
  if (people.length !== 1 || people[0][3] !== 'Активен')
    throw qudOwnerApiError_('OWNER_UNAVAILABLE', 403);

  const portfolioId = 'QVP-O-' + ownerId.slice(4);
  const subscriberId = 'QSUB-O-' + ownerId.slice(4);
  const book = SpreadsheetApp.openById(panel5QUD_CABINET_CONNECTION.vp);
  const sheet = book.getSheetByName('portfolios');
  const columns = ['portfolio_id', 'subscriber_id', 'status', 'total_allocated_usd',
    'current_balance_usd', 'peak_balance_usd', 'portfolio_return_usd', 'portfolio_return_pct',
    'current_drawdown_pct', 'active_strategies_count', 'created_at_utc', 'last_recalc_utc'];
  const headers = sheet.getRange(1, 1, 1, columns.length).getValues()[0];
  if (columns.some((name, index) => headers[index] !== name))
    throw qudOwnerApiError_('PORTFOLIO_CONFIGURATION', 500);
  const last = sheet.getLastRow();
  const rows = last > 1 ? sheet.getRange(2, 1, last - 1, 2).getValues() : [];
  const matches = rows.filter(row => row[0] === portfolioId || row[1] === subscriberId);
  if (matches.length) {
    if (matches.length !== 1 || matches[0][0] !== portfolioId || matches[0][1] !== subscriberId)
      throw qudOwnerApiError_('PORTFOLIO_BINDING_CONFLICT', 409);
  } else {
    const r = last + 1;
    const values = [portfolioId, subscriberId, 'ACTIVE',
      `=SUMIFS(portfolio_strategy_requests!E:E;portfolio_strategy_requests!B:B;A${r};portfolio_strategy_requests!AA:AA;TRUE)`,
      `=SUMIFS(portfolio_strategy_requests!K:K;portfolio_strategy_requests!B:B;A${r};portfolio_strategy_requests!AA:AA;TRUE)`,
      `=MAX(D${r};E${r};IFERROR(MAXIFS(portfolio_history!G:G;portfolio_history!A:A;A${r});0))`,
      `=E${r}-D${r}`, `=IF(D${r}=0;0;G${r}/D${r}*100)`,
      `=IF(F${r}=0;0;MAX(0;(F${r}-E${r})/F${r}*100))`,
      `=COUNTIFS(portfolio_strategy_requests!B:B;A${r};portfolio_strategy_requests!J:J;"ACTIVE")`,
      new Date().toISOString(), ''];
    sheet.getRange(r, 1, 1, values.length).setValues([values]);
    SpreadsheetApp.flush();
  }
  return {ok: true, portfolio_id: portfolioId, subscriber_id: subscriberId};
}
