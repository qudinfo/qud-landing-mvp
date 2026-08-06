(() => {
  'use strict';

  const ENDPOINTS = Object.freeze({
    session: '/portal/vp/session',
    portfolios: '/portal/vp/portfolios',
    portfolio: '/portal/vp/portfolio',
    strategies: '/portal/vp/strategies'
  });

  const state = {
    portfolios: [],
    portfolioId: null,
    payload: null,
    availableStrategies: [],
    selectedRequestId: null,
    loading: false
  };

  const dom = {
    headerStatus: document.getElementById('header-status'),
    accessView: document.getElementById('access-view'),
    workspace: document.getElementById('workspace'),
    accessForm: document.getElementById('access-form'),
    accessKey: document.getElementById('access-key'),
    accessMessage: document.getElementById('access-message'),
    loginButton: document.getElementById('login-button'),
    logoutButton: document.getElementById('logout-button'),
    updateLabel: document.getElementById('update-label'),
    portfolioIdentity: document.getElementById('portfolio-identity'),
    portfolioStatus: document.getElementById('portfolio-status'),
    metricAllocated: document.getElementById('metric-allocated'),
    metricBalance: document.getElementById('metric-balance'),
    metricReturnUsd: document.getElementById('metric-return-usd'),
    metricReturnPct: document.getElementById('metric-return-pct'),
    metricDrawdown: document.getElementById('metric-drawdown'),
    metricActive: document.getElementById('metric-active'),
    portfolioChart: document.getElementById('portfolio-chart'),
    portfolioChartCount: document.getElementById('portfolio-chart-count'),
    strategyList: document.getElementById('strategy-list'),
    toggleObservation: document.getElementById('toggle-observation'),
    closeObservation: document.getElementById('close-observation'),
    observationForm: document.getElementById('observation-form'),
    observationMessage: document.getElementById('observation-message'),
    submitObservation: document.getElementById('submit-observation'),
    strategySelect: document.getElementById('strategy-select'),
    strategyAvailabilityNote: document.getElementById('strategy-availability-note'),
    strategyPreview: document.getElementById('strategy-preview'),
    previewReturn: document.getElementById('preview-return'),
    previewDd: document.getElementById('preview-dd'),
    previewTrades: document.getElementById('preview-trades'),
    previewWinrate: document.getElementById('preview-winrate'),
    previewPf: document.getElementById('preview-pf'),
    previewTrust: document.getElementById('preview-trust'),
    capitalInput: document.getElementById('capital-input'),
    periodSelect: document.getElementById('period-select'),
    drawdownInput: document.getElementById('drawdown-input'),
    strategyEmptyState: document.getElementById('strategy-empty-state'),
    strategyContent: document.getElementById('strategy-content'),
    strategyDetailTitle: document.getElementById('strategy-detail-title'),
    strategyRequestId: document.getElementById('strategy-request-id'),
    strategyStatus: document.getElementById('strategy-status'),
    detailAllocated: document.getElementById('detail-allocated'),
    detailBalance: document.getElementById('detail-balance'),
    detailReturn: document.getElementById('detail-return'),
    detailDrawdown: document.getElementById('detail-drawdown'),
    detailLimit: document.getElementById('detail-limit'),
    detailPeriod: document.getElementById('detail-period'),
    qualityReturn: document.getElementById('quality-return'),
    qualityDd: document.getElementById('quality-dd'),
    qualityTrades: document.getElementById('quality-trades'),
    qualityWinrate: document.getElementById('quality-winrate'),
    qualityPf: document.getElementById('quality-pf'),
    qualityTrust: document.getElementById('quality-trust'),
    strategyChart: document.getElementById('strategy-chart'),
    strategyChartCount: document.getElementById('strategy-chart-count'),
    historyContainer: document.getElementById('history-container'),
    emptyChartTemplate: document.getElementById('empty-chart-template')
  };

  const moneyFormatter = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const compactNumberFormatter = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2
  });
  const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  function valueFrom(object, names) {
    for (const name of names) {
      const value = object && object[name];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  }

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatMoney(value) {
    const number = finiteNumber(value);
    return number === null ? '—' : `$${moneyFormatter.format(number)}`;
  }

  function formatSignedMoney(value) {
    const number = finiteNumber(value);
    if (number === null) return '—';
    return `${number > 0 ? '+' : ''}$${moneyFormatter.format(number)}`;
  }

  function formatPercent(value, signed = false) {
    const number = finiteNumber(value);
    if (number === null) return '—';
    return `${signed && number > 0 ? '+' : ''}${compactNumberFormatter.format(number)}%`;
  }

  function formatNumber(value) {
    const number = finiteNumber(value);
    return number === null ? '—' : compactNumberFormatter.format(number);
  }

  function parseDate(value) {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400000));
    }
    const text = String(value).trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (dateOnly) {
      return new Date(Date.UTC(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      ));
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatDate(value) {
    const date = parseDate(value);
    return date ? dateFormatter.format(date) : '—';
  }

  function formatPeriod(code, startDate, endDate) {
    const labels = {
      '2_weeks': '2 недели',
      '1_month': '1 месяц',
      '3_months': '3 месяца'
    };
    const label = labels[String(code)] || String(code || 'Период');
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return start === '—' && end === '—' ? label : `${label} · ${start} — ${end}`;
  }

  function statusView(status) {
    const normalized = String(status || '').toUpperCase();
    const map = {
      ACTIVE: { label: 'Активна', className: 'is-active' },
      STOPPED_DD: { label: 'Остановлена по лимиту', className: 'is-stopped' },
      COMPLETED: { label: 'Завершена', className: 'is-completed' },
      CANCELLED: { label: 'Отменена', className: 'is-completed' }
    };
    return map[normalized] || { label: normalized || '—', className: '' };
  }

  function applyStatus(element, status) {
    const view = statusView(status);
    element.textContent = view.label;
    element.className = 'status-badge';
    if (view.className) element.classList.add(view.className);
  }

  function applySignedClass(element, value) {
    const number = finiteNumber(value);
    element.classList.remove('value-positive', 'value-negative');
    if (number > 0) element.classList.add('value-positive');
    if (number < 0) element.classList.add('value-negative');
  }

  function pluralWeeks(count) {
    const value = Number(count) || 0;
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return `${value} неделя`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${value} недели`;
    return `${value} недель`;
  }

  function randomIdempotencyKey() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return `vp-${globalThis.crypto.randomUUID()}`;
    }
    return `vp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      ...options
    });
    const data = await readJson(response);

    if (response.status === 401 || response.status === 403) {
      const error = new Error('SESSION_EXPIRED');
      error.code = 'SESSION_EXPIRED';
      error.data = data;
      throw error;
    }

    if (!response.ok || data?.ok === false) {
      const error = new Error(data?.error || `HTTP_${response.status}`);
      error.code = data?.error || `HTTP_${response.status}`;
      error.status = data?.status || response.status;
      error.details = data?.details || null;
      error.data = data;
      throw error;
    }

    return data;
  }

  function showAccess(message = '') {
    state.payload = null;
    state.portfolioId = null;
    state.availableStrategies = [];
    state.selectedRequestId = null;
    dom.workspace.hidden = true;
    dom.accessView.hidden = false;
    dom.accessMessage.textContent = message;
    dom.headerStatus.textContent = 'Защищённый кабинет';
    dom.accessKey.focus();
  }

  function showWorkspace() {
    dom.accessView.hidden = true;
    dom.workspace.hidden = false;
    dom.accessMessage.textContent = '';
    dom.headerStatus.textContent = 'Сессия активна';
  }

  function handleApiError(error, fallback) {
    if (error?.code === 'SESSION_EXPIRED') {
      showAccess('Сессия завершена. Введите ключ повторно.');
      return true;
    }
    console.error(error);
    return fallback;
  }

  function extractPortfolios(data) {
    if (Array.isArray(data?.portfolios)) return data.portfolios;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  }

  function extractPayload(data) {
    const source = data?.portfolio_payload || data;
    const portfolio = source?.portfolio || source?.data?.portfolio || null;
    if (!portfolio) return null;

    const strategySlots = Array.isArray(source?.strategy_slots)
      ? source.strategy_slots
      : Array.isArray(source?.strategies)
        ? source.strategies
        : Array.isArray(source?.data?.strategy_slots)
          ? source.data.strategy_slots
          : [];
    const strategyHistory = Array.isArray(source?.strategy_history)
      ? source.strategy_history
      : Array.isArray(source?.data?.strategy_history)
        ? source.data.strategy_history
        : [];
    const portfolioHistory = Array.isArray(source?.portfolio_history)
      ? source.portfolio_history
      : Array.isArray(source?.data?.portfolio_history)
        ? source.data.portfolio_history
        : [];
    const availableStrategies = Array.isArray(source?.available_strategies)
      ? source.available_strategies
      : [];

    const enrichedSlots = strategySlots.map((slot) => ({
      ...slot,
      history: Array.isArray(slot.history)
        ? slot.history
        : strategyHistory.filter((row) => String(row.request_id) === String(slot.request_id))
    }));

    return {
      portfolio,
      strategySlots: enrichedSlots,
      strategyHistory,
      portfolioHistory,
      availableStrategies
    };
  }

  function extractAvailable(data, fallback = []) {
    const source = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.available_strategies)
        ? data.available_strategies
        : Array.isArray(data?.all_items)
          ? data.all_items.filter((row) => row.is_available === true || String(row.is_available).toUpperCase() === 'TRUE')
          : fallback;
    return source.filter((item) => {
      if (typeof item === 'string') return Boolean(item.trim());
      return Boolean(String(item?.strategy_id || '').trim());
    });
  }

  function latestUpdateValue(payload) {
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

  function renderPortfolioSummary(payload) {
    const portfolio = payload.portfolio;
    const portfolioId = valueFrom(portfolio, ['portfolio_id', 'portfolioId']);
    dom.portfolioIdentity.textContent = portfolioId
      ? `Портфель ${portfolioId}`
      : 'Виртуальный портфель';
    applyStatus(dom.portfolioStatus, valueFrom(portfolio, ['status']));

    const allocated = valueFrom(portfolio, ['total_allocated_usd']);
    const balance = valueFrom(portfolio, ['current_balance_usd']);
    const returnUsd = valueFrom(portfolio, ['portfolio_return_usd']);
    const returnPct = valueFrom(portfolio, ['portfolio_return_pct']);
    const drawdown = valueFrom(portfolio, ['current_drawdown_pct']);
    const active = valueFrom(portfolio, ['active_strategies_count']);

    dom.metricAllocated.textContent = formatMoney(allocated);
    dom.metricBalance.textContent = formatMoney(balance);
    dom.metricReturnUsd.textContent = formatSignedMoney(returnUsd);
    dom.metricReturnPct.textContent = formatPercent(returnPct, true);
    dom.metricDrawdown.textContent = formatPercent(drawdown);
    dom.metricActive.textContent = formatNumber(active);
    applySignedClass(dom.metricReturnUsd, returnUsd);
    applySignedClass(dom.metricReturnPct, returnPct);

    const updated = latestUpdateValue(payload);
    dom.updateLabel.textContent = updated
      ? `Данные обновлены: ${formatDate(updated)}`
      : 'Ожидание первого обновления';

    const history = [...payload.portfolioHistory].sort((a, b) => {
      return (parseDate(a.period_end_utc)?.getTime() || 0) -
        (parseDate(b.period_end_utc)?.getTime() || 0);
    });
    dom.portfolioChartCount.textContent = pluralWeeks(history.length);

    const points = [];
    if (history.length) {
      const firstOpening = finiteNumber(history[0].opening_balance_usd);
      if (firstOpening !== null) {
        points.push({
          date: history[0].period_start_utc || history[0].period_end_utc,
          value: firstOpening
        });
      }
      history.forEach((row) => {
        const closing = finiteNumber(row.closing_balance_usd);
        if (closing !== null) points.push({ date: row.period_end_utc, value: closing });
      });
    }
    renderLineChart(dom.portfolioChart, points, 'Тренд общего баланса портфеля');
  }

  function renderStrategyList(payload) {
    dom.strategyList.replaceChildren();
    const slots = payload.strategySlots;
    if (!slots.length) {
      const empty = document.createElement('p');
      empty.className = 'strategy-list-empty';
      empty.textContent = 'Стратегии пока не добавлены. Начните первое наблюдение.';
      dom.strategyList.append(empty);
      clearStrategyDetail();
      return;
    }

    slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'strategy-item';
      button.dataset.requestId = String(slot.request_id || '');
      if (String(slot.request_id) === String(state.selectedRequestId)) {
        button.classList.add('is-selected');
      }

      const title = document.createElement('span');
      title.className = 'strategy-item-title';
      title.textContent = String(slot.strategy_id || 'Стратегия');
      const meta = document.createElement('span');
      meta.className = 'strategy-item-meta';
      const status = document.createElement('span');
      status.textContent = statusView(slot.status).label;
      const result = document.createElement('span');
      result.textContent = formatPercent(slot.strategy_return_pct, true);
      meta.append(status, result);
      button.append(title, meta);
      button.addEventListener('click', () => selectStrategy(slot.request_id));
      dom.strategyList.append(button);
    });
  }

  function selectStrategy(requestId) {
    const slot = state.payload?.strategySlots.find((item) => {
      return String(item.request_id) === String(requestId);
    });
    if (!slot) return;
    state.selectedRequestId = slot.request_id;
    renderStrategyList(state.payload);
    renderStrategyDetail(slot);
  }

  function clearStrategyDetail() {
    state.selectedRequestId = null;
    dom.strategyContent.hidden = true;
    dom.strategyEmptyState.hidden = false;
  }

  function renderStrategyDetail(slot) {
    dom.strategyEmptyState.hidden = true;
    dom.strategyContent.hidden = false;
    dom.strategyDetailTitle.textContent = String(slot.strategy_id || 'Стратегия');
    dom.strategyRequestId.textContent = slot.request_id
      ? `Наблюдение ${slot.request_id}`
      : 'Наблюдение';
    applyStatus(dom.strategyStatus, slot.status);

    dom.detailAllocated.textContent = formatMoney(slot.allocated_balance_usd);
    dom.detailBalance.textContent = formatMoney(slot.current_balance_usd);
    dom.detailReturn.textContent = formatPercent(slot.strategy_return_pct, true);
    dom.detailDrawdown.textContent = formatPercent(slot.current_drawdown_pct);
    dom.detailLimit.textContent = formatPercent(slot.max_drawdown_limit_pct);
    dom.detailPeriod.textContent = formatPeriod(
      slot.period_code,
      slot.start_date_utc,
      slot.end_date_utc
    );
    applySignedClass(dom.detailReturn, slot.strategy_return_pct);

    dom.qualityReturn.textContent = formatPercent(slot.strategy_return_since_start_pct, true);
    dom.qualityDd.textContent = formatPercent(slot.max_drawdown_since_start_pct);
    dom.qualityTrades.textContent = formatNumber(slot.closed_trades_total);
    dom.qualityWinrate.textContent = formatPercent(slot.win_ratio_pct);
    dom.qualityPf.textContent = formatNumber(slot.profit_factor);
    dom.qualityTrust.textContent = formatNumber(slot.trust_score);
    applySignedClass(dom.qualityReturn, slot.strategy_return_since_start_pct);

    const history = [...(slot.history || [])].sort((a, b) => {
      return (parseDate(a.period_end_utc)?.getTime() || 0) -
        (parseDate(b.period_end_utc)?.getTime() || 0);
    });
    dom.strategyChartCount.textContent = pluralWeeks(history.length);
    const chartPoints = [];
    if (history.length) {
      const firstOpening = finiteNumber(history[0].opening_balance_usd);
      if (firstOpening !== null) {
        chartPoints.push({
          date: history[0].period_start_utc || slot.start_date_utc,
          value: firstOpening
        });
      }
      history.forEach((row) => {
        const closing = finiteNumber(row.closing_balance_usd);
        if (closing !== null) chartPoints.push({ date: row.period_end_utc, value: closing });
      });
    }
    renderLineChart(dom.strategyChart, chartPoints, `История баланса ${slot.strategy_id}`);
    renderHistory(history);
  }

  function renderHistory(history) {
    dom.historyContainer.replaceChildren();
    if (!history.length) {
      const empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = 'Завершённые недельные обновления пока отсутствуют.';
      dom.historyContainer.append(empty);
      return;
    }

    const scroll = document.createElement('div');
    scroll.className = 'history-scroll';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Неделя</th><th>Открытие</th><th>Результат</th><th>P/L</th><th>Закрытие</th><th>Просадка</th><th>Статус</th></tr>';
    const tbody = document.createElement('tbody');

    history.forEach((row) => {
      const tr = document.createElement('tr');
      const values = [
        formatDate(row.period_end_utc),
        formatMoney(row.opening_balance_usd),
        formatPercent(row.period_return_pct, true),
        formatSignedMoney(row.profit_loss_usd),
        formatMoney(row.closing_balance_usd),
        formatPercent(row.drawdown_pct),
        statusView(row.status_after_update).label
      ];
      values.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      });
      tbody.append(tr);
    });

    table.append(thead, tbody);
    scroll.append(table);
    dom.historyContainer.append(scroll);
  }

  function renderLineChart(container, points, ariaLabel) {
    container.replaceChildren();
    if (points.length < 2) {
      container.append(dom.emptyChartTemplate.content.cloneNode(true));
      return;
    }

    const width = 920;
    const height = container.classList.contains('small') ? 230 : 275;
    const padding = { top: 24, right: 22, bottom: 36, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const values = points.map((point) => point.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const spread = max - min;
    const buffer = spread === 0
      ? Math.max(Math.abs(max) * 0.015, 1)
      : spread * 0.17;
    min -= buffer;
    max += buffer;

    const x = (index) => padding.left + (index / (points.length - 1)) * chartWidth;
    const y = (value) => padding.top + ((max - value) / (max - min)) * chartHeight;
    const coordinates = points.map((point, index) => ({
      ...point,
      x: x(index),
      y: y(point.value)
    }));
    const linePath = coordinates.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }).join(' ');
    const baseY = padding.top + chartHeight;
    const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${baseY.toFixed(2)} L ${coordinates[0].x.toFixed(2)} ${baseY.toFixed(2)} Z`;

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'chart-svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', ariaLabel);

    const defs = document.createElementNS(svgNs, 'defs');
    const gradient = document.createElementNS(svgNs, 'linearGradient');
    gradient.id = 'qud-chart-fill';
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y2', '1');
    const topStop = document.createElementNS(svgNs, 'stop');
    topStop.setAttribute('offset', '0%');
    topStop.setAttribute('stop-color', '#74b47d');
    topStop.setAttribute('stop-opacity', '0.30');
    const bottomStop = document.createElementNS(svgNs, 'stop');
    bottomStop.setAttribute('offset', '100%');
    bottomStop.setAttribute('stop-color', '#74b47d');
    bottomStop.setAttribute('stop-opacity', '0');
    gradient.append(topStop, bottomStop);
    defs.append(gradient);
    svg.append(defs);

    for (let index = 0; index < 4; index += 1) {
      const lineY = padding.top + (index / 3) * chartHeight;
      const line = document.createElementNS(svgNs, 'line');
      line.setAttribute('class', 'chart-grid-line');
      line.setAttribute('x1', String(padding.left));
      line.setAttribute('x2', String(padding.left + chartWidth));
      line.setAttribute('y1', String(lineY));
      line.setAttribute('y2', String(lineY));
      svg.append(line);
    }

    const area = document.createElementNS(svgNs, 'path');
    area.setAttribute('class', 'chart-area');
    area.setAttribute('d', areaPath);
    svg.append(area);

    const line = document.createElementNS(svgNs, 'path');
    line.setAttribute('class', 'chart-line');
    line.setAttribute('d', linePath);
    svg.append(line);

    coordinates.forEach((point) => {
      const circle = document.createElementNS(svgNs, 'circle');
      circle.setAttribute('class', 'chart-point');
      circle.setAttribute('cx', String(point.x));
      circle.setAttribute('cy', String(point.y));
      circle.setAttribute('r', '4');
      const title = document.createElementNS(svgNs, 'title');
      title.textContent = `${formatDate(point.date)} · ${formatMoney(point.value)}`;
      circle.append(title);
      svg.append(circle);
    });

    const axisLabels = [
      { x: 4, y: padding.top + 4, text: formatMoney(max), anchor: 'start' },
      { x: 4, y: baseY, text: formatMoney(min), anchor: 'start' },
      { x: padding.left, y: height - 8, text: formatDate(points[0].date), anchor: 'start' },
      { x: padding.left + chartWidth, y: height - 8, text: formatDate(points[points.length - 1].date), anchor: 'end' }
    ];
    axisLabels.forEach((label) => {
      const text = document.createElementNS(svgNs, 'text');
      text.setAttribute('class', 'chart-label');
      text.setAttribute('x', String(label.x));
      text.setAttribute('y', String(label.y));
      text.setAttribute('text-anchor', label.anchor);
      text.textContent = label.text;
      svg.append(text);
    });

    container.append(svg);
  }

  function renderAvailableStrategies(items) {
    state.availableStrategies = items.map((item) => {
      return typeof item === 'string' ? { strategy_id: item } : item;
    });
    dom.strategySelect.replaceChildren();

    if (!state.availableStrategies.length) {
      dom.strategySelect.append(new Option('Нет доступных стратегий', ''));
      dom.strategySelect.disabled = true;
      dom.submitObservation.disabled = true;
      dom.strategyAvailabilityNote.textContent = 'Все доступные стратегии уже активны в портфеле.';
      dom.strategyPreview.hidden = true;
      return;
    }

    dom.strategySelect.append(new Option('Выберите стратегию', ''));
    state.availableStrategies.forEach((item) => {
      const strategyId = String(item.strategy_id || '').trim();
      const returnPct = finiteNumber(item.strategy_return_since_start_pct);
      const label = returnPct === null
        ? strategyId
        : `${strategyId} · ${formatPercent(returnPct, true)}`;
      dom.strategySelect.append(new Option(label, strategyId));
    });
    dom.strategySelect.disabled = false;
    dom.submitObservation.disabled = false;
    dom.strategyAvailabilityNote.textContent = `Доступно стратегий: ${state.availableStrategies.length}.`;
    renderStrategyPreview();
  }

  function renderStrategyPreview() {
    const strategyId = dom.strategySelect.value;
    const item = state.availableStrategies.find((row) => String(row.strategy_id) === strategyId);
    if (!item) {
      dom.strategyPreview.hidden = true;
      return;
    }
    dom.strategyPreview.hidden = false;
    dom.previewReturn.textContent = formatPercent(item.strategy_return_since_start_pct, true);
    dom.previewDd.textContent = formatPercent(item.max_drawdown_since_start_pct);
    dom.previewTrades.textContent = formatNumber(item.closed_trades_total);
    dom.previewWinrate.textContent = formatPercent(item.win_ratio_pct);
    dom.previewPf.textContent = formatNumber(item.profit_factor);
    dom.previewTrust.textContent = formatNumber(item.trust_score);
    applySignedClass(dom.previewReturn, item.strategy_return_since_start_pct);
  }

  async function loadPortfolio(portfolioId) {
    const url = `${ENDPOINTS.portfolio}?portfolio_id=${encodeURIComponent(portfolioId)}`;
    const strategiesUrl = `${ENDPOINTS.strategies}?portfolio_id=${encodeURIComponent(portfolioId)}`;
    const [portfolioData, strategiesData] = await Promise.all([
      apiRequest(url),
      apiRequest(strategiesUrl)
    ]);
    const payload = extractPayload(portfolioData);
    if (!payload) throw new Error('PORTFOLIO_PAYLOAD_MISSING');

    state.portfolioId = String(payload.portfolio.portfolio_id || portfolioId);
    state.payload = payload;
    const available = extractAvailable(strategiesData, payload.availableStrategies);
    payload.availableStrategies = available;

    renderPortfolioSummary(payload);
    if (!state.selectedRequestId || !payload.strategySlots.some((slot) => String(slot.request_id) === String(state.selectedRequestId))) {
      const active = payload.strategySlots.find((slot) => String(slot.status) === 'ACTIVE');
      state.selectedRequestId = (active || payload.strategySlots[0] || {}).request_id || null;
    }
    renderStrategyList(payload);
    if (state.selectedRequestId) selectStrategy(state.selectedRequestId);
    else clearStrategyDetail();
    renderAvailableStrategies(available);
  }

  async function loadWorkspace() {
    showWorkspace();
    dom.updateLabel.textContent = 'Загрузка данных…';
    try {
      const portfoliosData = await apiRequest(ENDPOINTS.portfolios);
      const portfolios = extractPortfolios(portfoliosData);
      state.portfolios = portfolios;
      if (!portfolios.length) {
        dom.portfolioIdentity.textContent = 'Портфель ещё не создан';
        dom.updateLabel.textContent = 'Нет доступного портфеля';
        dom.toggleObservation.disabled = true;
        return;
      }

      const queryId = new URLSearchParams(window.location.search).get('portfolio_id');
      const selected = portfolios.find((item) => String(item.portfolio_id) === String(queryId)) || portfolios[0];
      await loadPortfolio(selected.portfolio_id);
    } catch (error) {
      if (handleApiError(error, false)) return;
      dom.updateLabel.textContent = 'Не удалось загрузить данные';
      dom.portfolioIdentity.textContent = 'Ошибка загрузки портфеля';
    }
  }

  async function checkSession() {
    try {
      const response = await fetch(ENDPOINTS.session, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      const data = await readJson(response);
      if (response.ok && data?.ok === true && data?.authenticated === true) {
        await loadWorkspace();
        return;
      }
      showAccess();
    } catch {
      showAccess('Не удалось проверить защищённую сессию. Повторите вход.');
    }
  }

  function setObservationForm(open) {
    dom.observationForm.hidden = !open;
    dom.toggleObservation.hidden = open;
    dom.observationMessage.textContent = '';
    dom.observationMessage.classList.remove('is-success');
    if (open) dom.strategySelect.focus();
  }

  function validateObservation() {
    const strategyId = dom.strategySelect.value.trim();
    const capital = finiteNumber(dom.capitalInput.value);
    const drawdown = finiteNumber(dom.drawdownInput.value);
    const period = dom.periodSelect.value;

    if (!strategyId) return { error: 'Выберите стратегию.' };
    if (capital === null || capital < 1000) {
      return { error: 'Сумма капитала должна быть не меньше $1 000.' };
    }
    if (drawdown === null || drawdown < 1 || drawdown > 50) {
      return { error: 'Лимит просадки должен быть от 1% до 50%.' };
    }
    if (!['2_weeks', '1_month', '3_months'].includes(period)) {
      return { error: 'Выберите допустимый период.' };
    }
    return { strategyId, capital, drawdown, period };
  }

  function observationErrorMessage(error) {
    const messages = {
      INVALID_ALLOCATED_BALANCE: 'Сумма капитала должна быть не меньше $1 000.',
      INVALID_DRAWDOWN_LIMIT: 'Лимит просадки должен быть от 1% до 50%.',
      INVALID_PERIOD_CODE: 'Выбран недопустимый период.',
      ACTIVE_REQUEST_EXISTS: 'Эта стратегия уже находится под активным наблюдением.',
      STRATEGY_NOT_AVAILABLE: 'Стратегия сейчас недоступна для нового наблюдения.',
      STRATEGY_NOT_FOUND: 'Стратегия не найдена.',
      PORTFOLIO_NOT_FOUND: 'Портфель не найден или недоступен.',
      IDEMPOTENCY_KEY_CONFLICT: 'Запрос уже использован с другими параметрами. Повторите отправку.'
    };
    return messages[error?.code] || 'Не удалось начать наблюдение. Повторите попытку.';
  }

  dom.accessForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const key = dom.accessKey.value.trim();
    dom.accessMessage.textContent = '';
    if (!key) {
      dom.accessMessage.textContent = 'Введите ключ доступа.';
      dom.accessKey.focus();
      return;
    }

    dom.loginButton.disabled = true;
    dom.accessKey.disabled = true;
    dom.loginButton.textContent = 'Проверка…';
    try {
      const response = await fetch(ENDPOINTS.session, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ access_key: key })
      });
      const data = await readJson(response);
      if (!response.ok || data?.ok !== true || data?.authenticated !== true) {
        dom.accessMessage.textContent = response.status === 429
          ? 'Слишком много попыток. Повторите позднее.'
          : 'Ключ доступа не принят.';
        return;
      }
      dom.accessKey.value = '';
      await loadWorkspace();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      dom.accessMessage.textContent = 'Не удалось подключиться к защищённому сервису.';
    } finally {
      dom.accessKey.value = '';
      dom.loginButton.disabled = false;
      dom.accessKey.disabled = false;
      dom.loginButton.textContent = 'Войти';
      if (!dom.accessView.hidden) dom.accessKey.focus();
    }
  });

  dom.logoutButton.addEventListener('click', async () => {
    dom.logoutButton.disabled = true;
    dom.logoutButton.textContent = 'Выход…';
    try {
      await apiRequest(ENDPOINTS.session, { method: 'DELETE' });
      showAccess();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (!handleApiError(error, false)) {
        dom.updateLabel.textContent = 'Не удалось завершить сессию';
      }
    } finally {
      dom.logoutButton.disabled = false;
      dom.logoutButton.textContent = 'Выйти';
    }
  });

  dom.toggleObservation.addEventListener('click', () => setObservationForm(true));
  dom.closeObservation.addEventListener('click', () => setObservationForm(false));
  dom.strategySelect.addEventListener('change', renderStrategyPreview);

  dom.observationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    dom.observationMessage.classList.remove('is-success');
    dom.observationMessage.textContent = '';
    const validated = validateObservation();
    if (validated.error) {
      dom.observationMessage.textContent = validated.error;
      return;
    }

    dom.submitObservation.disabled = true;
    dom.submitObservation.textContent = 'Запуск…';
    try {
      const data = await apiRequest(ENDPOINTS.portfolio, {
        method: 'POST',
        body: JSON.stringify({
          portfolio_id: state.portfolioId,
          strategy_id: validated.strategyId,
          start_balance_usd: validated.capital,
          max_drawdown_limit_pct: validated.drawdown,
          period: validated.period,
          idempotency_key: randomIdempotencyKey()
        })
      });

      const payload = extractPayload(data);
      if (payload) {
        state.payload = payload;
        state.selectedRequestId = data?.request?.request_id || payload.strategySlots.find((slot) => String(slot.strategy_id) === validated.strategyId)?.request_id || null;
      }
      dom.observationMessage.textContent = 'Наблюдение запущено. Стратегия добавлена в портфель.';
      dom.observationMessage.classList.add('is-success');
      dom.capitalInput.value = '1000';
      dom.drawdownInput.value = '7';
      dom.periodSelect.value = '2_weeks';
      await loadPortfolio(state.portfolioId);
      setTimeout(() => setObservationForm(false), 900);
    } catch (error) {
      if (handleApiError(error, false)) return;
      dom.observationMessage.textContent = observationErrorMessage(error);
    } finally {
      dom.submitObservation.disabled = false;
      dom.submitObservation.textContent = 'Начать наблюдение';
    }
  });

  checkSession();
})();
