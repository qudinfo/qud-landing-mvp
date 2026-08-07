const QUD_VP_SCHEDULE_CONFIG = Object.freeze({
  handler: 'runQudVirtualPortfolioScheduledUpdate',
  hourUtc: 5,
  minuteUtc: 0,
  timeZone: 'Etc/UTC'
});

/**
 * Scheduled entry point for QUD Virtual Portfolio MVP.
 *
 * Runs from a Google Apps Script time trigger. The trigger checks every day,
 * but the financial updater is called only when there is real work:
 * - a new completed WEEK period can be applied to an ACTIVE request; or
 * - an ACTIVE request has reached its end date and must be completed.
 *
 * This guard prevents a no-op daily check from changing portfolio timestamps.
 */
function runQudVirtualPortfolioScheduledUpdate() {
  const checkedAtUtc = new Date().toISOString();

  if (!vpw_hasScheduledWork_()) {
    return {
      ok: true,
      skipped: true,
      reason: 'NO_NEW_COMPLETED_PERIODS_OR_EXPIRATIONS',
      checked_at_utc: checkedAtUtc
    };
  }

  const result = runQudVirtualPortfolioWeeklyUpdate();
  result.scheduled = true;
  result.checked_at_utc = checkedAtUtc;
  return result;
}

/**
 * One-time setup for the production daily trigger.
 *
 * Apps Script time triggers are approximate. nearMinute(0) targets 05:00 UTC,
 * normally within roughly +/- 15 minutes rather than at an exact second.
 * Existing QUD VP scheduled triggers are removed first so duplicates cannot run.
 */
function installQudVirtualPortfolioDailyTrigger() {
  removeQudVirtualPortfolioDailyTrigger();

  ScriptApp.newTrigger(QUD_VP_SCHEDULE_CONFIG.handler)
    .timeBased()
    .atHour(QUD_VP_SCHEDULE_CONFIG.hourUtc)
    .nearMinute(QUD_VP_SCHEDULE_CONFIG.minuteUtc)
    .everyDays(1)
    .inTimezone(QUD_VP_SCHEDULE_CONFIG.timeZone)
    .create();

  return getQudVirtualPortfolioDailyTriggerStatus();
}

/**
 * Removes only QUD Virtual Portfolio scheduled-update triggers.
 */
function removeQudVirtualPortfolioDailyTrigger() {
  let removed = 0;

  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() !== QUD_VP_SCHEDULE_CONFIG.handler) return;
    ScriptApp.deleteTrigger(trigger);
    removed += 1;
  });

  return {
    ok: true,
    removed_triggers: removed
  };
}

/**
 * Read-only trigger status check.
 */
function getQudVirtualPortfolioDailyTriggerStatus() {
  const triggers = ScriptApp.getProjectTriggers()
    .filter((trigger) => (
      trigger.getHandlerFunction() === QUD_VP_SCHEDULE_CONFIG.handler
    ));

  return {
    ok: true,
    installed: triggers.length === 1,
    trigger_count: triggers.length,
    handler: QUD_VP_SCHEDULE_CONFIG.handler,
    target_time_utc: '05:00',
    scheduling_precision: 'APPROX_PLUS_MINUS_15_MINUTES',
    time_zone: QUD_VP_SCHEDULE_CONFIG.timeZone,
    trigger_ids: triggers.map((trigger) => trigger.getUniqueId())
  };
}

/**
 * Read-only preflight: determines whether the guarded weekly updater has
 * anything to apply today. It deliberately reuses the weekly engine's parser
 * and event builder so scheduled and manual runs follow the same rules.
 */
function vpw_hasScheduledWork_() {
  const spreadsheet = SpreadsheetApp.openById(QUD_VP_WEEKLY_CONFIG.spreadsheetId);
  const requestTable = vpw_readTable_(
    vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.requests)
  );
  const sourcePeriodTable = vpw_readTable_(
    vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.sourcePeriods)
  );
  const strategyHistoryTable = vpw_readTable_(
    vpw_sheet_(spreadsheet, QUD_VP_WEEKLY_CONFIG.sheets.strategyHistory)
  );

  const today = vpw_utcDate_(new Date());
  const activeRequests = requestTable.objects.filter((row) => (
    vpw_boolean_(row.is_latest_strategy_request) &&
    String(row.status) === 'ACTIVE'
  ));

  if (activeRequests.some((request) => (
    vpw_date_(request.end_date_utc) <= today
  ))) {
    return true;
  }

  const strategyHistoryKeys = new Set(
    strategyHistoryTable.objects.map((row) => (
      String(row.request_id) + '|' + vpw_dateKey_(row.period_end_utc)
    ))
  );
  const periodsByStrategy = vpw_groupSourcePeriods_(sourcePeriodTable.objects);
  const events = vpw_buildEvents_(
    activeRequests,
    periodsByStrategy,
    strategyHistoryKeys,
    today
  );

  return events.length > 0;
}
