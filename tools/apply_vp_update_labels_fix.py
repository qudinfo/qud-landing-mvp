from pathlib import Path

APP = Path('portal/portfolio/mvp/app.js')
INDEX = Path('portal/portfolio/mvp/index.html')
CSS = Path('portal/portfolio/mvp/styles.css')

app = APP.read_text()
index = INDEX.read_text()
css = CSS.read_text()


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'marker not found: {label}')
    return text.replace(old, new, 1)

old_update_fn = """  function latestUpdateValue(payload) {
    const candidates = [
      payload?.portfolio?.last_recalc_utc,
      ...payload?.portfolioHistory?.map((row) => row.updated_at_utc || row.period_end_utc) || [],
      ...payload?.strategySlots?.map((row) => row.last_update_utc || row.last_applied_period_end_utc) || []
    ].filter(Boolean);
    if (!candidates.length) return null;
    return candidates
      .map((value) => ({ value, date: parseDate(value) }))
      .filter((item) => item.date)
      .sort((a, b) => b.date - a.date)[0]?.value || null;
  }
"""

new_update_fn = """  function latestDateValue(candidates) {
    const values = candidates.filter(Boolean);
    if (!values.length) return null;
    return values
      .map((value) => ({ value, date: parseDate(value) }))
      .filter((item) => item.date)
      .sort((a, b) => b.date - a.date)[0]?.value || null;
  }

  function latestPortfolioChangeValue(payload) {
    return latestDateValue([
      payload?.portfolio?.last_recalc_utc,
      ...payload?.strategySlots?.flatMap((row) => [
        row.created_at_utc,
        row.completed_at_utc,
        row.last_update_utc,
        row.last_applied_period_end_utc
      ]) || []
    ]);
  }

  function latestHistoryPeriodValue(payload) {
    return latestDateValue(
      payload?.portfolioHistory?.map((row) => row.period_end_utc) || []
    );
  }
"""

app = replace_once(app, old_update_fn, new_update_fn, 'latest update helpers')

old_render_label = """    const updated = latestUpdateValue(payload);
    dom.updateLabel.textContent = updated
      ? `Данные обновлены: ${formatDate(updated)}`
      : 'Ожидание первого обновления';
"""

new_render_label = """    const portfolioChanged = latestPortfolioChangeValue(payload);
    const historyCalculated = latestHistoryPeriodValue(payload);
    if (portfolioChanged && historyCalculated) {
      dom.updateLabel.textContent = `Портфель изменён: ${formatDate(portfolioChanged)} · История рассчитана по: ${formatDate(historyCalculated)}`;
    } else if (portfolioChanged) {
      dom.updateLabel.textContent = `Портфель изменён: ${formatDate(portfolioChanged)} · История ожидает первого расчёта`;
    } else if (historyCalculated) {
      dom.updateLabel.textContent = `История рассчитана по: ${formatDate(historyCalculated)}`;
    } else {
      dom.updateLabel.textContent = 'Ожидание первого обновления';
    }
"""

app = replace_once(app, old_render_label, new_render_label, 'workspace update label')

old_css = ".update-label { color: var(--muted); font-size: 11px; white-space: nowrap; }"
new_css = ".update-label { max-width: 360px; color: var(--muted); font-size: 11px; line-height: 1.45; text-align: right; white-space: normal; }"
css = replace_once(css, old_css, new_css, 'update label css')

index = index.replace('styles.css?v=20260807-1354', 'styles.css?v=20260807-1553')
index = index.replace('app.js?v=20260807-1354', 'app.js?v=20260807-1553')

APP.write_text(app)
INDEX.write_text(index)
CSS.write_text(css)
