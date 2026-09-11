(() => {
  'use strict';

  // Owner session is managed separately in session.js.
  const allowedViews = new Set([
    'overview',
    'strategies',
    'portfolio',
    'real-account',
    'documents',
    'profile'
  ]);

  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('menu-button');
  const closeButton = document.getElementById('sidebar-close');
  const backdrop = document.getElementById('sidebar-backdrop');
  const viewTitle = document.getElementById('view-title');
  const content = document.getElementById('cabinet-content');
  const ownerShell = document.getElementById('owner-shell');
  const ownerLogin = document.getElementById('owner-login');
  const toast = document.getElementById('demo-toast');
  const strategyView = document.getElementById('view-strategies');
  const strategyCatalog = document.getElementById('strategy-catalog');
  const strategyCount = document.getElementById('strategy-count');
  const navItems = Array.from(document.querySelectorAll('.nav-item[data-view]'));
  const viewTriggers = Array.from(document.querySelectorAll('[data-view], [data-open-view]'));
  const demoTriggers = Array.from(document.querySelectorAll('[data-demo-action]'));
  const views = new Map(
    Array.from(document.querySelectorAll('.view')).map((view) => [
      view.id.replace('view-', ''),
      view
    ])
  );

  let toastTimer;
  let strategyState = 'initial';
  let strategyCache = null;
  let strategyRequest = 0;
  let strategyController;
  const strategyDetailCache = new Map();
  let selectedStrategyId = '';
  let strategyDetailRequest = 0;
  let strategyDetailController;

  function closeSidebar({ restoreFocus = false } = {}) {
    sidebar.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    backdrop.hidden = true;
    if (restoreFocus && window.innerWidth <= 820) menuButton.focus();
  }

  function openSidebar() {
    sidebar.classList.add('is-open');
    menuButton.setAttribute('aria-expanded', 'true');
    backdrop.hidden = false;
    closeButton.focus();
  }

  function hideToast() {
    window.clearTimeout(toastTimer);
    toast.classList.remove('is-visible');
    toast.hidden = true;
  }

  function showDemoToast(title, message) {
    window.clearTimeout(toastTimer);
    toast.querySelector('strong').textContent = title;
    toast.querySelector('span').textContent = message;
    toast.hidden = false;
    toast.classList.remove('is-visible');
    window.requestAnimationFrame(() => toast.classList.add('is-visible'));
    toastTimer = window.setTimeout(hideToast, 3600);
  }

  function formatWeeks(value) {
    const lastTwo = value % 100;
    const last = value % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return `${value} недель`;
    if (last === 1) return `${value} неделя`;
    if (last >= 2 && last <= 4) return `${value} недели`;
    return `${value} недель`;
  }

  function formatStrategyCount(value) {
    const lastTwo = value % 100;
    const last = value % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return `${value} стратегий`;
    if (last === 1) return `${value} стратегия`;
    if (last >= 2 && last <= 4) return `${value} стратегии`;
    return `${value} стратегий`;
  }

  function isValidStrategy(value) {
    return value &&
      /^QST-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value.strategy_id) &&
      Number.isFinite(value.trust_score) &&
      typeof value.trust_zone === 'string' && value.trust_zone.trim() !== '' &&
      Number.isFinite(value.win_ratio_pct) &&
      Number.isInteger(value.history_weeks_count) && value.history_weeks_count >= 0 &&
      typeof value.data_period_end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.data_period_end) &&
      typeof value.data_status === 'string' && value.data_status.trim() !== '';
  }

  function isOptionalNumber(value) {
    return value === null || Number.isFinite(value);
  }

  function isValidStrategyDetail(data, strategyId) {
    const strategy = data && data.strategy;
    return data && data.ok === true &&
      strategy && strategy.strategy_id === strategyId &&
      Number.isFinite(strategy.trust_score) &&
      typeof strategy.trust_zone === 'string' && strategy.trust_zone.trim() !== '' &&
      Number.isInteger(strategy.history_weeks_count) && strategy.history_weeks_count >= 0 &&
      Number.isFinite(strategy.closed_trades_total) &&
      Number.isFinite(strategy.strategy_return_since_start_pct) &&
      isOptionalNumber(strategy.max_drawdown_since_start_pct) &&
      Number.isFinite(strategy.win_ratio_pct) &&
      isOptionalNumber(strategy.profit_factor) &&
      isOptionalNumber(strategy.average_risk_pct) &&
      isOptionalNumber(strategy.sl_safe_pct) &&
      isOptionalNumber(strategy.risk_cv_pct) &&
      typeof strategy.data_period_end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(strategy.data_period_end) &&
      typeof strategy.data_status === 'string' && strategy.data_status.trim() !== '' &&
      Array.isArray(data.history) && data.history.every((row) =>
        row &&
        typeof row.period_start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.period_start) &&
        typeof row.period_end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.period_end) &&
        row.period_start <= row.period_end &&
        Number.isFinite(row.period_return_pct) &&
        Number.isFinite(row.strategy_return_since_start_pct) &&
        Number.isFinite(row.closed_trades_period) &&
        Number.isFinite(row.trust_score_snapshot) &&
        typeof row.trust_zone_snapshot === 'string' && row.trust_zone_snapshot.trim() !== ''
      );
  }

  function formatPercent(value, signed = false) {
    const normalized = Math.abs(value) < 0.005 ? 0 : value;
    const prefix = signed && normalized > 0 ? '+' : '';
    return `${prefix}${normalized.toFixed(2).replace(/\.00$/, '')}%`;
  }

  function formatNumber(value) {
    return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  function formatDate(value) {
    const [year, month, day] = value.split('-');
    return `${day}.${month}.${year}`;
  }

  function createMetric(label, value) {
    const metric = document.createElement('span');
    metric.className = 'strategy-metric';
    const caption = document.createElement('small');
    const result = document.createElement('strong');
    caption.textContent = label;
    result.textContent = value;
    metric.append(caption, result);
    return metric;
  }

  function renderStrategies(strategies) {
    strategyCatalog.replaceChildren();
    strategyCatalog.setAttribute('aria-busy', 'false');
    strategyCount.textContent = formatStrategyCount(strategies.length);

    if (strategies.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'strategy-state';
      empty.textContent = 'Пока нет доступных стратегий.';
      strategyCatalog.append(empty);
      return;
    }

    strategies.forEach((strategy, index) => {
      const row = document.createElement('button');
      row.className = 'strategy-catalog-row panel';
      row.type = 'button';
      row.setAttribute('aria-label', `Открыть стратегию ${strategy.strategy_id}`);
      row.addEventListener('click', () => openStrategy(strategy.strategy_id));

      const identity = document.createElement('span');
      identity.className = 'strategy-identity';
      const number = document.createElement('span');
      number.className = 'strategy-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const identityCopy = document.createElement('span');
      const identityLabel = document.createElement('small');
      const identityValue = document.createElement('strong');
      identityLabel.textContent = 'Strategy ID';
      identityValue.textContent = strategy.strategy_id;
      identityCopy.append(identityLabel, identityValue);
      identity.append(number, identityCopy);

      row.append(
        identity,
        createMetric('Trust Score', String(strategy.trust_score)),
        createMetric('Trust Zone', strategy.trust_zone),
        createMetric('Win Ratio', `${strategy.win_ratio_pct.toFixed(1).replace(/\.0$/, '')}%`),
        createMetric('История', formatWeeks(strategy.history_weeks_count))
      );
      const open = document.createElement('span');
      open.className = 'strategy-row-open';
      open.setAttribute('aria-hidden', 'true');
      open.innerHTML = '<svg><use href="#icon-chevron"></use></svg>';
      row.append(open);
      strategyCatalog.append(row);
    });
  }

  function createDetailMetric(label, value, className = '') {
    const metric = document.createElement('div');
    metric.className = `strategy-detail-metric${className ? ` ${className}` : ''}`;
    const caption = document.createElement('dt');
    const result = document.createElement('dd');
    caption.textContent = label;
    result.textContent = value;
    metric.append(caption, result);
    return metric;
  }

  function createStrategyChart(history, strategyId) {
    const section = document.createElement('section');
    section.className = 'strategy-chart panel';
    const heading = document.createElement('div');
    heading.className = 'strategy-section-heading';
    heading.innerHTML = '<div><p class="eyebrow">Performance History</p><h3>Динамика стратегии</h3></div><span>Накопительный результат, %</span>';
    section.append(heading);

    if (history.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'strategy-chart-empty';
      empty.textContent = 'Недостаточно подтверждённых данных для построения графика.';
      section.append(empty);
      return section;
    }

    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('class', 'strategy-history-chart');
    svg.setAttribute('viewBox', '0 0 900 320');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Динамика накопительного результата стратегии ${strategyId}`);

    const values = history.map((row) => row.strategy_return_since_start_pct);
    const rawMin = Math.min(0, ...values);
    const rawMax = Math.max(0, ...values);
    const rawSpan = rawMax - rawMin;
    const padding = rawSpan === 0 ? Math.max(Math.abs(rawMax) * 0.15, 1) : rawSpan * 0.12;
    const min = rawMin - padding;
    const max = rawMax + padding;
    const left = 66;
    const right = 22;
    const top = 24;
    const bottom = 54;
    const width = 900 - left - right;
    const height = 320 - top - bottom;
    const xAt = (index) => history.length === 1
      ? left + width / 2
      : left + (index / (history.length - 1)) * width;
    const yAt = (value) => top + ((max - value) / (max - min)) * height;
    const addSvg = (name, attributes, text = '') => {
      const element = document.createElementNS(namespace, name);
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
      if (text) element.textContent = text;
      svg.append(element);
      return element;
    };

    for (let index = 0; index <= 4; index += 1) {
      const value = max - ((max - min) * index / 4);
      const y = yAt(value);
      addSvg('line', { class: 'chart-grid-line', x1: left, x2: 900 - right, y1: y, y2: y });
      addSvg('text', { class: 'chart-axis-label', x: left - 12, y: y + 4, 'text-anchor': 'end' }, formatPercent(value));
    }

    const zeroY = yAt(0);
    addSvg('line', { class: 'chart-zero-line', x1: left, x2: 900 - right, y1: zeroY, y2: zeroY });
    const points = history.map((row, index) => `${xAt(index)},${yAt(row.strategy_return_since_start_pct)}`).join(' ');
    addSvg('polyline', { class: 'chart-result-line', points });
    history.forEach((row, index) => {
      addSvg('circle', {
        class: 'chart-result-point',
        cx: xAt(index),
        cy: yAt(row.strategy_return_since_start_pct),
        r: history.length === 1 ? 6 : 4
      });
    });

    const mobileLabelIndexes = new Set([
      0,
      Math.floor((history.length - 1) / 2),
      history.length - 1
    ]);
    const labelIndexes = history.length <= 5
      ? history.map((_, index) => index)
      : [...mobileLabelIndexes];
    [...new Set(labelIndexes)].forEach((index) => {
      addSvg('text', {
        class: `chart-axis-label chart-date-label${mobileLabelIndexes.has(index) ? '' : ' chart-date-intermediate'}`,
        x: xAt(index),
        y: 300,
        'text-anchor': index === 0 && history.length > 1 ? 'start' : index === history.length - 1 && history.length > 1 ? 'end' : 'middle'
      }, formatDate(history[index].period_end));
    });
    section.append(svg);
    return section;
  }

  function createHistoryTable(history) {
    const section = document.createElement('details');
    section.className = 'strategy-history panel';
    const summary = document.createElement('summary');
    summary.className = 'strategy-history-summary';
    const summaryCopy = document.createElement('span');
    summaryCopy.innerHTML = '<small>История</small><strong>Подтверждённые периоды</strong>';
    const summaryMeta = document.createElement('span');
    summaryMeta.className = 'strategy-history-meta';
    summaryMeta.textContent = history.length === 0
      ? 'Нет периодов'
      : `${history.length} · ${formatDate(history[0].period_start)}–${formatDate(history[history.length - 1].period_end)}`;
    const summaryIcon = document.createElement('span');
    summaryIcon.className = 'strategy-history-toggle';
    summaryIcon.setAttribute('aria-hidden', 'true');
    summaryIcon.innerHTML = '<svg><use href="#icon-chevron"></use></svg>';
    summary.append(summaryCopy, summaryMeta, summaryIcon);
    section.append(summary);

    if (history.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'strategy-history-empty';
      empty.textContent = 'Подтверждённая история пока отсутствует.';
      section.append(empty);
      return section;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'strategy-history-scroll';
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Период</th><th>Результат периода</th><th>Результат с начала</th></tr></thead>';
    const body = document.createElement('tbody');
    history.forEach((row) => {
      const tr = document.createElement('tr');
      const period = document.createElement('td');
      const periodResult = document.createElement('td');
      const totalResult = document.createElement('td');
      period.textContent = `${formatDate(row.period_start)} — ${formatDate(row.period_end)}`;
      periodResult.textContent = formatPercent(row.period_return_pct, true);
      totalResult.textContent = formatPercent(row.strategy_return_since_start_pct, true);
      periodResult.className = row.period_return_pct > 0 ? 'positive' : row.period_return_pct < 0 ? 'negative' : '';
      totalResult.className = row.strategy_return_since_start_pct > 0 ? 'positive' : row.strategy_return_since_start_pct < 0 ? 'negative' : '';
      tr.append(period, periodResult, totalResult);
      body.append(tr);
    });
    table.append(body);
    wrapper.append(table);
    section.append(wrapper);
    return section;
  }

  function renderStrategyDetail(data) {
    const { strategy, history } = data;
    strategyCatalog.replaceChildren();
    strategyCatalog.setAttribute('aria-busy', 'false');

    const back = document.createElement('button');
    back.className = 'strategy-back';
    back.type = 'button';
    back.textContent = '← Все стратегии';
    back.addEventListener('click', showStrategyList);

    const header = document.createElement('section');
    header.className = 'strategy-detail-header panel';
    const identity = document.createElement('div');
    identity.innerHTML = `<p class="eyebrow">Strategy ID</p><h2>${strategy.strategy_id}</h2><p>Подтверждённые показатели стратегии QUD</p>`;
    const trust = document.createElement('dl');
    trust.className = 'strategy-trust-summary';
    trust.append(
      createDetailMetric('Trust Score', String(strategy.trust_score)),
      createDetailMetric('Trust Zone', strategy.trust_zone)
    );
    header.append(identity, trust);

    const metrics = document.createElement('dl');
    metrics.className = 'strategy-detail-metrics';
    metrics.append(
      createDetailMetric('Закрытых сделок', formatNumber(strategy.closed_trades_total)),
      createDetailMetric('Доходность с начала', formatPercent(strategy.strategy_return_since_start_pct, true)),
      createDetailMetric('Max Drawdown', strategy.max_drawdown_since_start_pct === null ? 'Недостаточно подтверждённых данных' : formatPercent(strategy.max_drawdown_since_start_pct), strategy.max_drawdown_since_start_pct === null ? 'metric-insufficient' : ''),
      createDetailMetric('Profit Factor', strategy.profit_factor === null ? '—' : formatNumber(strategy.profit_factor)),
      createDetailMetric('Average Risk', strategy.average_risk_pct === null ? '—' : formatPercent(strategy.average_risk_pct)),
      createDetailMetric('SL Safe', strategy.sl_safe_pct === null ? 'Недостаточно подтверждённых данных' : formatPercent(strategy.sl_safe_pct), strategy.sl_safe_pct === null ? 'metric-insufficient' : ''),
      createDetailMetric('Risk CV', strategy.risk_cv_pct === null ? '—' : formatPercent(strategy.risk_cv_pct)),
      createDetailMetric('Обновлено', formatDate(strategy.data_period_end))
    );

    const summary = document.createElement('div');
    summary.className = 'strategy-detail-summary';
    summary.append(header, metrics);
    const dashboard = document.createElement('div');
    dashboard.className = 'strategy-detail-dashboard';
    dashboard.append(summary, createStrategyChart(history, strategy.strategy_id));

    strategyCatalog.append(back, dashboard, createHistoryTable(history));
    strategyCatalog.querySelector('.strategy-back').focus({ preventScroll: true });
  }

  function renderStrategyDetailState(kind, strategyId) {
    strategyCatalog.replaceChildren();
    strategyCatalog.setAttribute('aria-busy', kind === 'loading' ? 'true' : 'false');
    const state = document.createElement('div');
    state.className = `strategy-state${kind === 'error' ? ' strategy-state-error' : ''}`;
    state.setAttribute('role', kind === 'loading' ? 'status' : 'alert');
    const message = document.createElement('p');
    message.textContent = kind === 'loading'
      ? 'Загрузка стратегии…'
      : kind === 'not-found'
        ? 'Стратегия недоступна.'
        : 'Не удалось загрузить данные стратегии.';
    state.append(message);
    if (kind === 'error') {
      const retry = document.createElement('button');
      retry.className = 'button button-primary';
      retry.type = 'button';
      retry.textContent = 'Повторить';
      retry.addEventListener('click', () => loadStrategyDetail(strategyId));
      state.append(retry);
    }
    const back = document.createElement('button');
    back.className = 'strategy-back strategy-back-state';
    back.type = 'button';
    back.textContent = '← Все стратегии';
    back.addEventListener('click', showStrategyList);
    strategyCatalog.append(back, state);
  }

  function showStrategyList() {
    strategyDetailRequest += 1;
    if (strategyDetailController) strategyDetailController.abort();
    strategyDetailController = undefined;
    selectedStrategyId = '';
    strategyView.classList.remove('is-detail');
    if (strategyCache) renderStrategies(strategyCache);
    content.scrollTop = 0;
  }

  function openStrategy(strategyId) {
    selectedStrategyId = strategyId;
    strategyView.classList.add('is-detail');
    strategyCount.textContent = '';
    content.scrollTop = 0;
    if (strategyDetailCache.has(strategyId)) {
      renderStrategyDetail(strategyDetailCache.get(strategyId));
      return;
    }
    loadStrategyDetail(strategyId);
  }

  async function loadStrategyDetail(strategyId) {
    if (strategyDetailController) strategyDetailController.abort();
    renderStrategyDetailState('loading', strategyId);
    const requestId = ++strategyDetailRequest;
    const controller = new AbortController();
    strategyDetailController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`/owner/api/strategies/${encodeURIComponent(strategyId)}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      if (requestId !== strategyDetailRequest || selectedStrategyId !== strategyId) return;
      if (response.status === 404) {
        renderStrategyDetailState('not-found', strategyId);
        return;
      }
      const data = await response.json();
      if (!response.ok || !isValidStrategyDetail(data, strategyId)) {
        throw new Error('INVALID_STRATEGY_DETAIL_RESPONSE');
      }
      strategyDetailCache.set(strategyId, data);
      renderStrategyDetail(data);
    } catch {
      if (requestId !== strategyDetailRequest || selectedStrategyId !== strategyId) return;
      renderStrategyDetailState('error', strategyId);
    } finally {
      window.clearTimeout(timeout);
      if (strategyDetailController === controller) strategyDetailController = undefined;
    }
  }

  function renderStrategyError() {
    strategyCatalog.replaceChildren();
    strategyCatalog.setAttribute('aria-busy', 'false');
    strategyCount.textContent = '';
    const error = document.createElement('div');
    error.className = 'strategy-state strategy-state-error';
    const message = document.createElement('p');
    message.textContent = 'Не удалось загрузить стратегии.';
    const retry = document.createElement('button');
    retry.className = 'button button-primary';
    retry.type = 'button';
    retry.textContent = 'Повторить';
    retry.addEventListener('click', loadStrategies);
    error.append(message, retry);
    strategyCatalog.append(error);
  }

  async function loadStrategies() {
    if (strategyState === 'loading' || strategyState === 'loaded') return;
    strategyState = 'loading';
    strategyCatalog.setAttribute('aria-busy', 'true');
    strategyCatalog.innerHTML = '<div class="strategy-state" role="status">Загрузка стратегий…</div>';
    strategyCount.textContent = '';

    const requestId = ++strategyRequest;
    const controller = new AbortController();
    strategyController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('/owner/api/strategies', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });

      if (response.status === 401) {
        window.location.reload();
        return;
      }

      const data = await response.json();
      if (!response.ok || data.ok !== true || !Array.isArray(data.strategies) || !data.strategies.every(isValidStrategy)) {
        throw new Error('INVALID_STRATEGY_RESPONSE');
      }

      if (requestId !== strategyRequest) return;
      strategyCache = data.strategies;
      strategyState = 'loaded';
      renderStrategies(strategyCache);
    } catch {
      if (requestId !== strategyRequest) return;
      strategyState = 'error';
      renderStrategyError();
    } finally {
      window.clearTimeout(timeout);
      if (strategyController === controller) strategyController = undefined;
    }
  }

  function maybeLoadStrategies() {
    const strategiesView = views.get('strategies');
    if (strategiesView && !strategiesView.hidden && !ownerShell.hidden && strategyState === 'initial') {
      loadStrategies();
    }
  }

  function resetStrategyLibrary() {
    strategyRequest += 1;
    if (strategyController) strategyController.abort();
    strategyController = undefined;
    strategyCache = null;
    strategyDetailCache.clear();
    selectedStrategyId = '';
    strategyDetailRequest += 1;
    if (strategyDetailController) strategyDetailController.abort();
    strategyDetailController = undefined;
    strategyView.classList.remove('is-detail');
    strategyState = 'initial';
    strategyCount.textContent = '';
    strategyCatalog.setAttribute('aria-busy', 'false');
    strategyCatalog.innerHTML = '<div class="strategy-state" role="status">Загрузка стратегий…</div>';
  }

  function activateView(requestedView, { updateHash = true, moveFocus = false } = {}) {
    const viewName = allowedViews.has(requestedView) ? requestedView : 'overview';
    const activeView = views.get(viewName);
    if (!activeView) return;

    views.forEach((view, name) => {
      const isActive = name === viewName;
      view.hidden = !isActive;
      view.classList.toggle('is-active', isActive);
    });

    navItems.forEach((item) => {
      const isActive = item.dataset.view === viewName;
      item.classList.toggle('is-active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    viewTitle.textContent = activeView.dataset.title || 'Owner Cabinet';
    document.title = `${viewTitle.textContent} — QUD Capital Owner`;

    if (updateHash && window.location.hash !== `#${viewName}`) {
      window.history.replaceState(null, '', `#${viewName}`);
    }

    content.scrollTop = 0;
    closeSidebar();
    hideToast();
    maybeLoadStrategies();
    if (moveFocus) content.focus({ preventScroll: true });
  }

  viewTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      if (trigger.tagName === 'A') event.preventDefault();
      activateView(trigger.dataset.view || trigger.dataset.openView, { moveFocus: true });
    });
  });

  demoTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const action = trigger.dataset.demoAction;
      const title = action === 'document'
        ? 'Документ пока не подключён'
        : 'Раздел помощи пока не подключён';
      showDemoToast(
        title,
        'Сейчас это визуальный placeholder frontend-каркаса.'
      );
    });
  });

  menuButton.addEventListener('click', () => {
    if (sidebar.classList.contains('is-open')) closeSidebar({ restoreFocus: true });
    else openSidebar();
  });
  closeButton.addEventListener('click', () => closeSidebar({ restoreFocus: true }));
  backdrop.addEventListener('click', () => closeSidebar({ restoreFocus: true }));

  window.addEventListener('hashchange', () => {
    activateView(window.location.hash.slice(1), { updateHash: false });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (sidebar.classList.contains('is-open')) closeSidebar({ restoreFocus: true });
    else if (!toast.hidden) hideToast();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeSidebar();
  });

  new MutationObserver(maybeLoadStrategies)
    .observe(ownerShell, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(() => {
    if (!ownerLogin.hidden) resetStrategyLibrary();
  }).observe(ownerLogin, { attributes: true, attributeFilter: ['hidden'] });

  activateView(window.location.hash.slice(1), { updateHash: false });
})();
