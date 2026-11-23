(() => {
  'use strict';

  // Owner session is managed separately in session.js.
  const allowedViews = new Set([
    'overview',
    'strategies',
    'portfolio',
    'profile'
  ]);

  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('menu-button');
  const closeButton = document.getElementById('sidebar-close');
  const backdrop = document.getElementById('sidebar-backdrop');
  const viewTitle = document.getElementById('view-title');
  const topbarSectionIcon = document.querySelector('.topbar-section-icon use');
  const brokerApplicationDialog = document.getElementById('broker-application-dialog');
  const brokerApplicationForm = document.getElementById('broker-application-form');
  const brokerAccountDialog = document.getElementById('broker-account-dialog');
  const brokerAccountForm = document.getElementById('broker-account-form');
  const brokerAccountCard = document.querySelector('.broker-account-card');
  const brokerAccountEntry = document.querySelector('.broker-account-entry');
  const brokerAccountTemplate = brokerAccountEntry.cloneNode(true);
  const brokerAccountBroker = document.getElementById('broker-account-input-broker');
  const brokerAccountNumber = document.getElementById('broker-account-input-number');
  const brokerAccountPassword = document.getElementById('broker-account-input-password');
  const applicationStrategy = document.getElementById('application-strategy');
  const applicationPeriod = document.getElementById('application-period');
  const applicationAccount = document.getElementById('application-account');
  const applicationAccountHelp = document.getElementById('application-account-help');
  const costPeriod = document.getElementById('broker-cost-period');
  const costAmount = document.getElementById('broker-cost-amount');
  const costNote = document.getElementById('broker-cost-note');
  const tariffBlock = document.getElementById('broker-tariffs');
  const oneMonthOption = applicationPeriod.querySelector('option[value="1"]');
  const content = document.getElementById('cabinet-content');
  const ownerShell = document.getElementById('owner-shell');
  const ownerLogin = document.getElementById('owner-login');
  const toast = document.getElementById('demo-toast');
  const strategyView = document.getElementById('view-strategies');
  const strategyCatalog = document.getElementById('strategy-catalog');
  const catalogMetrics = document.getElementById('catalog-metrics');
  const catalogDescription = document.getElementById('catalog-description');
  const catalogIntro = catalogDescription.textContent;
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
  let applicationStrategies = null;
  let applicationRequest = 0;
  let applicationController;
  const maxDemoBrokerAccounts = 3;
  let demoBrokerAccounts = [];
  const metricTip = document.createElement('div');
  metricTip.id = 'catalog-metric-tip';
  metricTip.className = 'metric-tooltip';
  metricTip.setAttribute('role', 'tooltip');
  metricTip.hidden = true;
  document.body.append(metricTip);

  let helpAnchor;
  let helpHideTimer;
  const helpObserver = new MutationObserver(positionMetricHelp);

  function closeMetricHelp() {
    clearTimeout(helpHideTimer);
    helpObserver.disconnect();
    helpAnchor?.removeAttribute('aria-describedby');
    helpAnchor = null;
    metricTip.hidden = true;
  }

  function positionMetricHelp() {
    if (!helpAnchor) return;
    const anchor = helpAnchor.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    if (!anchor.width || anchor.bottom < 0 || anchor.top > height || anchor.right < 0 || anchor.left > width) {
      closeMetricHelp();
      return;
    }
    const box = metricTip.getBoundingClientRect();
    const left = Math.min(width - box.width - 8, Math.max(8, anchor.left + anchor.width / 2 - box.width / 2));
    const top = anchor.bottom + 6 + box.height <= height - 8 ? anchor.bottom + 6 : Math.max(8, anchor.top - box.height - 6);
    metricTip.style.left = left + 'px';
    metricTip.style.top = top + 'px';
  }

  function deferHelpClose() {
    clearTimeout(helpHideTimer);
    helpHideTimer = setTimeout(() => {
      if (document.activeElement !== helpAnchor && !helpAnchor?.matches(':hover') && !metricTip.matches(':hover')) closeMetricHelp();
    }, 180);
  }

  function addMetricHelp(labelElement, description) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'metric-help';
    button.textContent = '?';
    button.setAttribute('aria-label', 'Пояснение: ' + labelElement.textContent.trim().replace(/\s+/g, ' '));
    labelElement.append(button);

    function show() {
      closeMetricHelp();
      helpAnchor = button;
      metricTip.textContent = typeof description === 'function' ? description() : description;
      metricTip.hidden = false;
      button.setAttribute('aria-describedby', metricTip.id);
      positionMetricHelp();
      helpObserver.observe(button.closest('.view') || strategyView, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'open'] });
    }
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') show(); });
    button.addEventListener('focus', show);
    button.addEventListener('click', event => { event.stopPropagation(); show(); });
    button.addEventListener('pointerleave', deferHelpClose);
    button.addEventListener('blur', deferHelpClose);
  }

  document.querySelectorAll('[data-portfolio-help]').forEach(label => {
    addMetricHelp(label, label.dataset.portfolioHelp);
  });

  metricTip.addEventListener('pointerenter', () => clearTimeout(helpHideTimer));
  metricTip.addEventListener('pointerleave', deferHelpClose);
  document.addEventListener('pointerdown', event => {
    if (helpAnchor && !helpAnchor.contains(event.target) && !metricTip.contains(event.target)) closeMetricHelp();
  }, true);
  document.addEventListener('keydown', event => { if (helpAnchor && event.key === 'Escape') closeMetricHelp(); });
  document.addEventListener('scroll', positionMetricHelp, true);
  window.addEventListener('resize', positionMetricHelp);
  window.addEventListener('hashchange', closeMetricHelp);
  window.addEventListener('owner:session', closeMetricHelp);

  const viewIcons = {
    overview: '#icon-overview',
    strategies: '#icon-strategies',
    portfolio: '#icon-portfolio',
    'real-account': '#icon-account',
    documents: '#icon-documents',
    profile: '#icon-users'
  };

  function accountField(entry, id) {
    return entry.querySelector(`[id^="${id}"]`);
  }

  function hideDemoPassword(entry) {
    const entries = entry ? [entry] : Array.from(brokerAccountCard.querySelectorAll('.broker-account-entry'));
    entries.forEach((accountEntry) => {
      accountField(accountEntry, 'broker-password-value').textContent = '••••••••';
      const toggle = accountField(accountEntry, 'broker-password-toggle');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.setAttribute('aria-label', 'Показать мастер-пароль');
      toggle.querySelector('use').setAttribute('href', '#icon-eye');
    });
  }

  function clearDemoBrokerAccount() {
    brokerAccountForm.reset();
    if (brokerAccountDialog.open) brokerAccountDialog.close();
    hideDemoPassword();
    if (!demoBrokerAccounts.length) return;
    demoBrokerAccounts = [];
    brokerAccountCard.querySelectorAll('.broker-account-entry[data-demo-id]').forEach((entry) => {
      if (entry !== brokerAccountEntry) entry.remove();
    });
    accountField(brokerAccountEntry, 'broker-password-field').hidden = true;
    delete brokerAccountEntry.dataset.demoId;
    delete brokerAccountEntry.dataset.connected;
    document.getElementById('broker-account-name').textContent = 'Новый брокерский счёт';
    document.getElementById('broker-account-badge').textContent = 'Заявка № —';
    document.getElementById('broker-account-status').textContent = 'Не подключён';
    document.getElementById('broker-account-description').textContent =
      'После подключения здесь появятся подтверждённые данные счёта и выбранной стратегии.';
    document.getElementById('broker-account-broker').textContent = '—';
    document.getElementById('broker-account-number').textContent = '—';
    document.getElementById('broker-account-state').textContent = 'Ожидает подключения';
    document.getElementById('open-broker-account').hidden = false;
    brokerAccountEntry.open = false;
  }

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

  async function loadCatalogMetrics(strategies, requestId, signal) {
    const confirmed = strategies.filter(s => s.data_status.toUpperCase() === 'CONFIRMED' && !s.strategy_id.includes('-DEMO-'));
    if (!confirmed.length) return;
    const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
    const score = confirmed.reduce((sum, s) => sum + s.trust_score, 0) / confirmed.length;
    function display(weekly = null, wins = null, trades = null, week = null) {
      if (requestId !== strategyRequest) return;
      const winRatio = trades > 0 && wins !== null ? number.format(100 * wins / trades) + '%' : '—';
      const weeklyReturn = weekly === null ? '—' : number.format(weekly) + '%';
      const metrics = [
        ['Закрыто сделок\nза всё время', trades === null ? '—' : number.format(trades),
          trades === null ? 'Сколько сделок трейдеры завершили за всю подтверждённую историю стратегий каталога.'
            : `Всего закрытых сделок по стратегиям каталога — ${number.format(trades)}. Открытые сделки войдут в статистику после закрытия.`],
        ['Win Ratio\nза всё время', winRatio,
          winRatio === '—' ? 'Доля прибыльных сделок среди всех закрытых сделок каталога.'
            : `С прибылью закрыто ${number.format(wins)} из ${number.format(trades)} сделок. Это ${winRatio}. Размер прибыли у каждой сделки может быть разным.`],
        ['Средний\nTrust Score', number.format(score),
          `QUD оценивает, как трейдеры управляют риском. Средняя оценка стратегий каталога — ${number.format(score)} из 100. У каждой стратегии одинаковый вес.`],
        ['Средняя доходность\nза последнюю неделю', weeklyReturn,
          week ? `С ${formatDate(week.period_start)} по ${formatDate(week.period_end)} средняя доходность составила ${weeklyReturn}. Количество стратегий в расчёте — ${number.format(confirmed.length)}. У каждой одинаковый вес.`
            : 'Среднее значение доходности стратегий за одну отчётную неделю. Для расчёта нужны результаты каждой стратегии за тот же период.']
      ];
      catalogMetrics.replaceChildren(...metrics.map(([label, value, help]) => {
        const pair = document.createElement('div');
        const term = document.createElement('dt');
        const result = document.createElement('dd');
        term.textContent = label;
        addMetricHelp(term, help);
        result.textContent = value;
        pair.append(term, result);
        return pair;
      }));
      catalogMetrics.hidden = false;
    }
    display();
    const details = [];
    // Limit concurrent requests and reuse the data when a strategy is opened.
    const pending = confirmed.values();
    async function loadNext() {
      for (const item of pending) {
        const id = item.strategy_id;
        let detail = strategyDetailCache.get(id);
        if (!detail) {
          const response = await fetch('/owner/api/strategies/' + encodeURIComponent(id), {
            credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)])
          });
          if (!response.ok) throw new Error('CATALOG_DETAIL_UNAVAILABLE');
          detail = await response.json();
        }
        if (!isValidStrategyDetail(detail, id) || detail.strategy.data_status.toUpperCase() !== 'CONFIRMED' ||
            detail.strategy.data_period_end !== item.data_period_end) throw new Error('CATALOG_SNAPSHOT_CHANGED');
        if (requestId !== strategyRequest) return;
        strategyDetailCache.set(id, detail);
        details.push(detail);
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(3, confirmed.length) }, loadNext));
    } catch {
      return;
    }
    if (details.length !== confirmed.length || requestId !== strategyRequest) return;
    const end = confirmed.reduce((latest, s) => s.data_period_end > latest ? s.data_period_end : latest, '');
    const weeks = details.map(d => d.history.find(h => h.period_end === end));
    const sameWeek = weeks.every(h => h && h.period_start === weeks[0].period_start);
    const weekly = sameWeek ? weeks.reduce((sum, h) => sum + h.period_return_pct, 0) / weeks.length : null;
    let trades = 0, wins = 0, exact = true;
    for (const { strategy } of details) {
      const n = strategy.closed_trades_total;
      if (!Number.isSafeInteger(n) || n < 0) return;
      trades += n;
      const count = confirmedWinCount(strategy);
      if (count === null) exact = false;
      else wins += count;
    }
    display(weekly, exact ? wins : null, trades, sameWeek ? weeks[0] : null);
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
        (Number.isFinite(row.trust_score_snapshot) ||
          (row.closed_trades_period === 0 && row.trust_score_snapshot === null &&
            row.trust_zone_snapshot === 'NO_TRADES')) &&
        typeof row.trust_zone_snapshot === 'string' && row.trust_zone_snapshot.trim() !== ''
      );
  }

  function formatPercent(value, signed = false) {
    const normalized = Math.abs(value) < 0.005 ? 0 : value;
    const prefix = signed && normalized > 0 ? '+' : '';
    return `${prefix}${normalized.toFixed(2).replace(/\.00$/, '')}%`;
  }

  function formatTrustScore(value) {
    return Number.isFinite(value) ? String(Math.round(value)) : '—';
  }

  function formatNumber(value) {
    return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  function formatDate(value) {
    const [year, month, day] = value.split('-');
    return `${day}.${month}.${year}`;
  }

  const helpNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const trustScoreHelp = 'Оценка от 0 до 100 баллов по методике QUD. Учитывает, как трейдер управляет риском и какой историей это подтверждено. Это один из основных показателей допуска стратегии в каталог.';

  function trustZoneHelp(strategy) {
    return 'Для допуска в каталог нужно набрать минимум 40 баллов Trust Score. С 40 баллов начинается QUD Room, с 80 — QUD Elite. ' +
      `У этой стратегии ${helpNumber.format(strategy.trust_score)} из 100. Категория — ${strategy.trust_zone}.`;
  }

  function confirmedWinCount(strategy) {
    const trades = strategy.closed_trades_total;
    const ratio = strategy.win_ratio_pct;
    if (!Number.isSafeInteger(trades) || trades < 0 || !Number.isFinite(ratio) || ratio < 0 || ratio > 100) return null;
    const raw = ratio * trades / 100;
    const wins = Math.round(raw);
    return Math.abs(raw - wins) <= 8 * Number.EPSILON * Math.max(1, trades) ? wins : null;
  }

  function winRatioHelp(strategy) {
    const detail = strategyDetailCache.get(strategy.strategy_id);
    const info = detail && detail.strategy;
    if (info && info.closed_trades_total === 0) return 'У стратегии пока нет закрытых сделок, по которым можно определить долю прибыльных.';
    const wins = info && confirmedWinCount(info);
    if (Number.isInteger(wins)) {
      return `Закрытых сделок — ${helpNumber.format(info.closed_trades_total)}, из них прибыльных — ${helpNumber.format(wins)}. Их доля — ${helpNumber.format(info.win_ratio_pct)}%.`;
    }
    return `Доля прибыльных сделок среди всех закрытых сделок стратегии — ${helpNumber.format(strategy.win_ratio_pct)}%. Берётся из истории сделок: каждая сделка учитывается один раз независимо от суммы.`;
  }

  function historyHelp(strategy) {
    const detail = strategyDetailCache.get(strategy.strategy_id);
    const history = detail && detail.history;
    const weeks = `В истории стратегии — ${formatWeeks(strategy.history_weeks_count)} с подтверждёнными результатами.`;
    return history && history.length
      ? weeks + ` Первый отчёт начинается ${formatDate(history[0].period_start)}, последний заканчивается ${formatDate(history[history.length - 1].period_end)}.`
      : weeks;
  }

  function createMetric(label, value, help) {
    const metric = document.createElement('span');
    metric.className = 'strategy-metric';
    const caption = document.createElement('small');
    const result = document.createElement('strong');
    caption.textContent = label;
    addMetricHelp(caption, help);
    result.textContent = value;
    metric.append(caption, result);
    return metric;
  }

  function renderStrategies(strategies) {
    strategyCatalog.replaceChildren();
    strategyCatalog.setAttribute('aria-busy', 'false');
    catalogDescription.textContent = strategies.length && strategies.some(strategy =>
      strategy.data_status.toUpperCase() !== 'CONFIRMED' || strategy.strategy_id.includes('-DEMO-')
    ) ? 'Каталог QUD предназначен для анализа торговых стратегий. Демонстрационные значения не являются основанием для инвестиционных решений.' : catalogIntro;

    if (strategies.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'strategy-state';
      empty.textContent = 'Пока нет доступных стратегий.';
      strategyCatalog.append(empty);
      return;
    }

    strategies.forEach((strategy) => {
      const row = document.createElement('div');
      row.className = 'strategy-catalog-row panel';
      row.addEventListener('click', event => {
        if (!event.target.closest('button')) openStrategy(strategy.strategy_id);
      });

      const identity = document.createElement('span');
      identity.className = 'strategy-identity';
      const identityCopy = document.createElement('span');
      const identityLabel = document.createElement('small');
      const identityValue = document.createElement('strong');
      identityLabel.textContent = 'Strategy ID';
      identityValue.textContent = strategy.strategy_id;
      identityCopy.append(identityLabel, identityValue);
      identity.append(identityCopy);

      row.append(
        identity,
        createMetric('Trust Score', formatTrustScore(strategy.trust_score), trustScoreHelp),
        createMetric('Trust Zone', strategy.trust_zone, trustZoneHelp(strategy)),
        createMetric('Win Ratio', `${strategy.win_ratio_pct.toFixed(1).replace(/\.0$/, '')}%`, () => winRatioHelp(strategy)),
        createMetric('История', formatWeeks(strategy.history_weeks_count), () => historyHelp(strategy))
      );
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'strategy-row-open';
      open.setAttribute('aria-label', `Открыть стратегию ${strategy.strategy_id}`);
      open.addEventListener('click', () => openStrategy(strategy.strategy_id));
      open.innerHTML = '<svg><use href="#icon-chevron"></use></svg>';
      row.append(open);
      strategyCatalog.append(row);
    });
  }

  function createDetailMetric(label, value, help, className = '') {
    const metric = document.createElement('div');
    metric.className = `strategy-detail-metric${className ? ` ${className}` : ''}`;
    const caption = document.createElement('dt');
    const result = document.createElement('dd');
    caption.textContent = label;
    addMetricHelp(caption, help);
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
    svg.setAttribute('role', 'group');
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

    const points = values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ');
    if (history.length > 1) {
      const base = top + height;
      addSvg('polygon', { class: 'chart-result-area', points: `${points} ${xAt(history.length - 1)},${base} ${xAt(0)},${base}` });
    }

    for (let index = 0; index <= 4; index += 1) {
      const value = max - ((max - min) * index / 4);
      const y = yAt(value);
      addSvg('line', { class: 'chart-grid-line', x1: left, x2: 900 - right, y1: y, y2: y });
      addSvg('text', { class: 'chart-axis-label', x: left - 12, y: y + 4, 'text-anchor': 'end' }, formatPercent(value));
    }

    const zeroY = yAt(0);
    addSvg('line', { class: 'chart-zero-line', x1: left, x2: 900 - right, y1: zeroY, y2: zeroY });
    addSvg('polyline', { class: 'chart-result-line', points });
    const plot = document.createElement('div');
    plot.className = 'strategy-chart-plot';
    const label = document.createElement('span');
    label.className = 'chart-point-value';
    label.hidden = true;
    label.setAttribute('aria-hidden', 'true');
    const hitWidth = Math.min(48, width / Math.max(1, history.length - 1));
    history.forEach((row, index) => {
      const cx = xAt(index);
      const cy = yAt(values[index]);
      const value = formatPercent(values[index], true).replace('.', ',');
      addSvg('circle', { class: 'chart-result-point', cx, cy, r: 2.25 });
      const hit = addSvg('rect', {
        class: 'chart-point-hit', x: cx - hitWidth / 2, y: cy - 24,
        width: hitWidth, height: 48, tabindex: 0, role: 'img',
        'aria-label': `${formatDate(row.period_end)}, ${value}`
      });
      const showValue = () => {
        label.textContent = value;
        label.style.left = `${cx / 900 * 100}%`;
        label.style.top = `${cy / 320 * 100}%`;
        label.classList.toggle('align-start', cx < left + 50);
        label.classList.toggle('align-end', cx > 900 - right - 50);
        label.hidden = false;
      };
      const hideValue = () => { label.hidden = true; };
      hit.addEventListener('pointerenter', showValue);
      hit.addEventListener('pointerleave', (event) => {
        if (event.pointerType !== 'touch') hideValue();
      });
      hit.addEventListener('focus', showValue);
      hit.addEventListener('blur', hideValue);
      hit.addEventListener('click', () => {
        hit.focus({ preventScroll: true });
        showValue();
      });
      hit.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') hideValue();
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
    plot.append(svg, label);
    section.append(plot);
    return section;
  }

  function createHistoryTable(history, strategy) {
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
    const latest = history[history.length - 1];
    const headings = table.tHead.rows[0].cells;
    addMetricHelp(headings[1], 'Изменение результата только за указанную неделю. ' +
      `За ${formatDate(latest.period_start)}–${formatDate(latest.period_end)}: ${helpNumber.format(latest.period_return_pct)}%; закрыто сделок — ${helpNumber.format(latest.closed_trades_period)}.`);
    addMetricHelp(headings[2], 'Результат, накопленный с начала наблюдения к концу указанной недели. ' +
      `К ${formatDate(latest.period_end)} он составил ${helpNumber.format(latest.strategy_return_since_start_pct)}%.` +
      (latest.period_end === strategy.data_period_end ? ` За это время закрыто сделок: ${helpNumber.format(strategy.closed_trades_total)}.` : ''));
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
      createDetailMetric('Trust Score', formatTrustScore(strategy.trust_score), trustScoreHelp),
      createDetailMetric('Trust Zone', strategy.trust_zone, trustZoneHelp(strategy))
    );
    header.append(identity, trust);

    const metrics = document.createElement('dl');
    metrics.className = 'strategy-detail-metrics';
    const latest = history.find(row => row.period_end === strategy.data_period_end);
    const countedTrades = helpNumber.format(strategy.closed_trades_total);
    const lastDate = formatDate(strategy.data_period_end);
    function withReading(explanation, value) {
      return explanation + (value === null
        ? ' Подтверждённых данных для расчёта пока недостаточно.'
        : ` Значение на ${lastDate} — ${helpNumber.format(value)}%.`);
    }
    metrics.append(
      createDetailMetric('Закрытых сделок', formatNumber(strategy.closed_trades_total),
        `С начала наблюдения по этой стратегии закрыто сделок — ${countedTrades}.` +
        (latest ? ` За последний отчётный период закрыто сделок: ${helpNumber.format(latest.closed_trades_period)}.` : '')),
      createDetailMetric('Доходность с начала', formatPercent(strategy.strategy_return_since_start_pct, true),
        `На сколько процентов изменился результат стратегии с начала наблюдения. К ${lastDate} он составил ${helpNumber.format(strategy.strategy_return_since_start_pct)}%.`),
      createDetailMetric('Max Drawdown', strategy.max_drawdown_since_start_pct === null ? 'Недостаточно подтверждённых данных' : formatPercent(strategy.max_drawdown_since_start_pct),
        strategy.max_drawdown_since_start_pct === null
          ? 'Самое большое снижение от ранее достигнутого максимума по недельным итогам. Подтверждённых данных о его размере пока недостаточно.'
          : `Самый большой спад по недельным итогам: от достигнутого максимума результат снизился на ${helpNumber.format(Math.abs(strategy.max_drawdown_since_start_pct))}%.`,
        strategy.max_drawdown_since_start_pct === null ? 'metric-insufficient' : ''),
      createDetailMetric('Profit Factor', strategy.profit_factor === null ? '—' : formatNumber(strategy.profit_factor),
        'Прибыль по всем выигрышным сделкам делим на сумму потерь по всем убыточным.' +
        (strategy.profit_factor === null ? ' Для расчёта пока недостаточно данных.' : ` Соотношение прибыли и потерь у этой стратегии — ${helpNumber.format(strategy.profit_factor)} к 1.`)),
      createDetailMetric('Average Risk', strategy.average_risk_pct === null ? '—' : formatPercent(strategy.average_risk_pct),
        withReading('Какой долей капитала трейдер в среднем планировал рискнуть в одной сделке.', strategy.average_risk_pct)),
      createDetailMetric('SL Safe', strategy.sl_safe_pct === null ? 'Недостаточно подтверждённых данных' : formatPercent(strategy.sl_safe_pct),
        withReading('Стоп-лосс — заданная цена для автоматического выхода из сделки, если рынок идёт против трейдера. SL Safe показывает долю проверенных сделок, в которых трейдер соблюдал правила QUD по установке и изменению этой границы.', strategy.sl_safe_pct),
        strategy.sl_safe_pct === null ? 'metric-insufficient' : ''),
      createDetailMetric('Risk CV', strategy.risk_cv_pct === null ? '—' : formatPercent(strategy.risk_cv_pct),
        'Насколько менялся плановый риск от сделки к сделке. Чем меньше значение, тем ровнее трейдер выбирал риск.' +
        (strategy.risk_cv_pct === null ? ' Подтверждённых данных для расчёта пока недостаточно.' : '')),
      createDetailMetric('Обновлено', lastDate, `${lastDate} — последний день, за который в карточке учтены подтверждённые результаты.`)
    );

    const summary = document.createElement('div');
    summary.className = 'strategy-detail-summary';
    summary.append(header, metrics);
    const dashboard = document.createElement('div');
    dashboard.className = 'strategy-detail-dashboard';
    dashboard.append(summary, createStrategyChart(history, strategy.strategy_id));

    strategyCatalog.append(back, dashboard, createHistoryTable(history, strategy));
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
    catalogMetrics.hidden = true;
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
    catalogDescription.textContent = catalogIntro;
    strategyCatalog.setAttribute('aria-busy', 'true');
    strategyCatalog.innerHTML = '<div class="strategy-state" role="status">Загрузка стратегий…</div>';
    catalogMetrics.hidden = true;

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
      window.clearTimeout(timeout);
      await loadCatalogMetrics(strategyCache, requestId, controller.signal);
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
    catalogMetrics.hidden = true;
    strategyCatalog.setAttribute('aria-busy', 'false');
    strategyCatalog.innerHTML = '<div class="strategy-state" role="status">Загрузка стратегий…</div>';
    applicationRequest += 1;
    if (applicationController) applicationController.abort();
    applicationController = undefined;
    applicationStrategies = null;
    applicationStrategy.disabled = true;
    applicationStrategy.replaceChildren(new Option('Загрузка стратегий…', ''));
  }

  function renderApplicationStrategies(strategies) {
    applicationStrategies = strategies;
    applicationStrategy.replaceChildren(new Option(
      strategies.length ? 'Выберите стратегию' : 'Доступных стратегий пока нет',
      ''
    ));
    strategies.forEach((strategy) => {
      applicationStrategy.add(new Option(strategy.strategy_id, strategy.strategy_id));
    });
    applicationStrategy.disabled = strategies.length === 0;
    updateApplicationCost();
  }

  function renderApplicationAccounts() {
    const connected = Array.from(document.querySelectorAll('.broker-account-entry[data-connected="true"]'))
      .filter((entry) => ['accountId', 'broker', 'server', 'accountNumber']
        .every((key) => entry.dataset[key]?.trim()));
    const availableDemoAccounts = demoBrokerAccounts.filter((account) =>
      !connected.some((entry) => entry.dataset.demoId === account.id)
    );
    const accountCount = connected.length + availableDemoAccounts.length;
    applicationAccount.replaceChildren(new Option(
      accountCount ? 'Выберите брокерский счёт' : 'Нет брокерских счетов',
      ''
    ));
    connected.forEach((entry) => {
      const { accountId, broker, server, accountNumber } = entry.dataset;
      applicationAccount.add(new Option(`${broker} · ${server} · ${accountNumber}`, accountId));
    });
    availableDemoAccounts.forEach((account) => {
      applicationAccount.add(new Option(
        `${account.broker} · ${account.accountNumber} (тестовый счёт)`,
        account.id
      ));
    });
    applicationAccount.disabled = accountCount === 0;
    applicationAccountHelp.textContent = availableDemoAccounts.length
      ? 'Тестовые счета доступны для предварительного выбора; заявка пока не отправляется в QUD.'
      : 'Выберите счёт из блока «Мои брокерские счета».';
  }

  function updateApplicationCost() {
    const months = Number(applicationPeriod.value);
    costPeriod.textContent = months === 1 ? '1 месяц' : months === 3 ? '3 месяца' : 'Не выбран';
    costAmount.textContent = '—';
    if (!applicationStrategy.value || !months) {
      costNote.textContent = 'Выберите стратегию и период обслуживания.';
      return;
    }

    const strategy = applicationStrategies?.find((item) => item.strategy_id === applicationStrategy.value);
    const category = typeof strategy?.category === 'string' ? strategy.category.trim().toLowerCase() : '';
    // Published tariff rows belong to the visible "Тарифы" block; no rate is inferred from placeholder text.
    const rates = Array.from(tariffBlock.querySelectorAll('[data-service-tariff]'));
    const rate = rates.find((item) => Number(item.dataset.periodMonths) === months &&
      item.dataset.strategyCategory?.trim().toLowerCase() === category) ||
      rates.find((item) => Number(item.dataset.periodMonths) === months &&
        item.dataset.strategyCategory?.trim().toLowerCase() === 'all');
    const amount = rate?.dataset.priceRub ? Number(rate.dataset.priceRub) : NaN;
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      costNote.textContent = 'Утверждённый тариф для выбранных параметров пока не опубликован.';
      return;
    }
    costAmount.textContent = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
    costNote.textContent = 'Предварительная сумма по опубликованному тарифу; окончательные условия подтвердит QUD.';
  }

  function syncApplicationPeriod() {
    const selected = applicationStrategies?.find((strategy) =>
      strategy.strategy_id === applicationStrategy.value
    );
    const isElite = typeof selected?.category === 'string' &&
      selected.category.trim().toLowerCase() === 'elite';
    oneMonthOption.disabled = isElite;
    if (isElite) applicationPeriod.value = '3';
    updateApplicationCost();
  }

  async function loadApplicationStrategies() {
    if (strategyCache || applicationStrategies) {
      renderApplicationStrategies(strategyCache || applicationStrategies);
      return;
    }
    applicationStrategy.disabled = true;
    applicationStrategy.replaceChildren(new Option('Загрузка стратегий…', ''));
    const requestId = ++applicationRequest;
    const controller = new AbortController();
    applicationController = controller;
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
      if (!response.ok || data.ok !== true || !Array.isArray(data.strategies) ||
          !data.strategies.every(isValidStrategy)) {
        throw new Error('INVALID_STRATEGY_RESPONSE');
      }
      if (requestId !== applicationRequest || !brokerApplicationDialog.open) return;
      renderApplicationStrategies(data.strategies);
    } catch {
      if (requestId !== applicationRequest || !brokerApplicationDialog.open) return;
      applicationStrategy.replaceChildren(new Option('Не удалось загрузить стратегии', ''));
    } finally {
      window.clearTimeout(timeout);
      if (applicationController === controller) applicationController = undefined;
    }
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
    topbarSectionIcon.setAttribute('href', viewIcons[viewName]);
    if (viewName !== 'real-account') hideDemoPassword();
    document.title = `${viewTitle.textContent} — QUD Capital Owner`;

    if ((updateHash || (requestedView && requestedView !== viewName)) && window.location.hash !== `#${viewName}`) {
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

  function appendDemoBrokerAccount(broker, accountNumber, masterPassword) {
    const index = demoBrokerAccounts.length + 1;
    const account = { id: `demo-local-account-${index}`, broker, accountNumber, masterPassword };
    const entry = index === 1 ? brokerAccountEntry : brokerAccountTemplate.cloneNode(true);
    if (index > 1) {
      entry.querySelectorAll('[id]').forEach((node) => { node.id = `${node.id}-${index}`; });
      brokerAccountCard.append(entry);
    }
    hideDemoPassword();
    entry.dataset.demoId = account.id;
    entry.dataset.connected = 'false';
    accountField(entry, 'broker-account-name').textContent = `${broker} · ${accountNumber}`;
    accountField(entry, 'broker-account-badge').textContent = 'Тестовый счёт';
    accountField(entry, 'broker-account-status').textContent = 'Без стратегии';
    accountField(entry, 'broker-account-description').textContent =
      'Счёт добавлен только для локального предпросмотра. Данные не отправлены QUD; стратегия не подключена.';
    accountField(entry, 'broker-account-broker').textContent = broker;
    accountField(entry, 'broker-account-number').textContent = accountNumber;
    accountField(entry, 'broker-account-state').textContent = 'Тестовый режим';
    accountField(entry, 'broker-password-field').hidden = false;
    entry.addEventListener('toggle', () => {
      if (!entry.open) hideDemoPassword(entry);
    });
    demoBrokerAccounts.push(account);
    entry.open = true;
    document.getElementById('open-broker-account').hidden = demoBrokerAccounts.length >= maxDemoBrokerAccounts;
  }

  document.getElementById('open-broker-account').addEventListener('click', () => {
    if (demoBrokerAccounts.length >= maxDemoBrokerAccounts) return;
    brokerAccountForm.reset();
    hideDemoPassword();
    brokerAccountBroker.setCustomValidity('');
    brokerAccountNumber.setCustomValidity('');
    brokerAccountDialog.showModal();
    brokerAccountBroker.focus();
  });
  document.getElementById('close-broker-account').addEventListener('click', () => brokerAccountDialog.close());
  document.getElementById('cancel-broker-account').addEventListener('click', () => brokerAccountDialog.close());
  brokerAccountDialog.addEventListener('close', () => brokerAccountForm.reset());
  [brokerAccountBroker, brokerAccountNumber].forEach((input) => {
    input.addEventListener('input', () => input.setCustomValidity(''));
  });
  brokerAccountCard.addEventListener('click', (event) => {
    const toggle = event.target.closest('button[id^="broker-password-toggle"]');
    if (!toggle) return;
    const entry = toggle.closest('.broker-account-entry');
    const account = demoBrokerAccounts.find((item) => item.id === entry?.dataset.demoId);
    if (!account) return;
    const reveal = toggle.getAttribute('aria-pressed') !== 'true';
    if (reveal) hideDemoPassword();
    accountField(entry, 'broker-password-value').textContent = reveal ? account.masterPassword : '••••••••';
    toggle.setAttribute('aria-pressed', String(reveal));
    toggle.setAttribute('aria-label', reveal ? 'Скрыть мастер-пароль' : 'Показать мастер-пароль');
    toggle.querySelector('use').setAttribute('href', reveal ? '#icon-eye-off' : '#icon-eye');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideDemoPassword();
  });
  brokerAccountForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (demoBrokerAccounts.length >= maxDemoBrokerAccounts) return;
    const broker = brokerAccountBroker.value.trim();
    const accountNumber = brokerAccountNumber.value.trim();
    if (!broker) {
      brokerAccountBroker.setCustomValidity('Укажите брокера.');
      brokerAccountBroker.reportValidity();
      return;
    }
    if (!accountNumber) {
      brokerAccountNumber.setCustomValidity('Укажите номер счёта.');
      brokerAccountNumber.reportValidity();
      return;
    }
    const masterPassword = brokerAccountPassword.value;
    brokerAccountForm.reset();
    appendDemoBrokerAccount(broker, accountNumber, masterPassword);
    brokerAccountDialog.close();
  });

  new MutationObserver(() => {
    if (ownerShell.hidden) clearDemoBrokerAccount();
  }).observe(ownerShell, { attributes: true, attributeFilter: ['hidden'] });

  document.getElementById('open-broker-application').addEventListener('click', () => {
    brokerApplicationForm.reset();
    oneMonthOption.disabled = false;
    renderApplicationAccounts();
    updateApplicationCost();
    brokerApplicationDialog.showModal();
    loadApplicationStrategies();
  });
  document.getElementById('close-broker-application').addEventListener('click', () => brokerApplicationDialog.close());
  brokerApplicationDialog.addEventListener('close', () => {
    applicationRequest += 1;
    if (applicationController) applicationController.abort();
    applicationController = undefined;
  });
  applicationStrategy.addEventListener('change', syncApplicationPeriod);
  applicationPeriod.addEventListener('change', updateApplicationCost);
  brokerApplicationForm.addEventListener('submit', (event) => event.preventDefault());

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

// Support uses only the authenticated Owner API. No email or Owner ID is sent by the browser.
(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const dialog = byId('support-dialog');
  const openButton = byId('open-support');
  const unreadBadge = byId('support-unread');
  const historyState = byId('support-history-state');
  const historyCount = byId('support-history-count');
  const messages = byId('support-messages');
  const messageInput = byId('support-message');
  const feedback = byId('support-feedback');
  const sendButton = byId('support-send');
  const endpoint = '/owner/api/support';
  let sessionOwner = '';
  let outgoingId = '';
  let authenticated = false;
  let available = false;
  let ownerEmail = '';
  let unreadCount = 0;
  let refreshTimer;
  let requestVersion = 0;
  let sending = false;
  const readTimers = new Map();
  let readIds = new Set();

  function showUnread(count) {
    unreadCount = Math.max(0, Math.min(Number(count) || 0, 999));
    unreadBadge.hidden = unreadCount === 0;
    unreadBadge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    const label = unreadCount ? `Поддержка, новых сообщений: ${unreadCount}` : 'Поддержка';
    openButton.setAttribute('aria-label', label);
    openButton.title = label;
  }

  function fitMessageInput() {
    if (!dialog.open) return;
    messageInput.style.height = 'auto';
    const borders = messageInput.offsetHeight - messageInput.clientHeight;
    messageInput.style.height = (messageInput.scrollHeight + borders) + 'px';
  }

  window.addEventListener('resize', fitMessageInput);

  function updateComposer() {
    fitMessageInput();
    const canSend = authenticated && available && ownerEmail && !sending;
    messageInput.disabled = !authenticated || sending;
    sendButton.disabled = !canSend || !messageInput.value.trim();
  }

  async function supportRequest(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json', 'X-QUD-Support-Owner': sessionOwner, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      ...options
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
      const error = new Error('SUPPORT_UNAVAILABLE');
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function renderMessages(items) {
    messages.replaceChildren();
    historyCount.textContent = items.length ? `${items.length} сообщ.` : '';
    historyState.hidden = items.length > 0;
    if (!items.length) historyState.textContent = 'Сообщений пока нет.';
    items.forEach((item) => {
      if (!item || typeof item.id !== 'string' ||
          !['owner', 'qud'].includes(item.direction) || typeof item.body !== 'string') return;
      const entry = document.createElement('article');
      entry.className = `support-message support-message-${item.direction}`;
      const label = document.createElement('strong');
      label.textContent = item.direction === 'qud' ? 'QUD' : 'Вы';
      const date = document.createElement('time');
      if (typeof item.created_at === 'string') {
        const parsed = new Date(item.created_at);
        if (Number.isFinite(parsed.getTime())) {
          date.dateTime = parsed.toISOString();
          date.textContent = new Intl.DateTimeFormat('ru-RU', {
            dateStyle: 'short', timeStyle: 'short'
          }).format(parsed);
        }
      }
      const body = document.createElement('p');
      body.textContent = item.body;
      entry.append(label, date, body);
      if (item.direction === 'qud' && !item.read) {
        entry.dataset.unreadId = item.id;
        const newLabel = document.createElement('em');
        newLabel.textContent = 'Новое';
        newLabel.hidden = readIds.has(item.id);
        entry.append(newLabel);
      }
      messages.append(entry);
    });
    syncReadIndicators();
    updateReadTimers();
  }

  async function refreshSupport() {
    if (!authenticated) return;
    const version = ++requestVersion;
    try {
      const data = await supportRequest(endpoint);
      if (version !== requestVersion || !authenticated) return;
      if (!Array.isArray(data.messages)) throw new Error('INVALID_SUPPORT_RESPONSE');
      available = true;
      const email = typeof data.owner_email === 'string' ? data.owner_email.trim() : '';
      ownerEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
      renderMessages(data.messages);
      feedback.textContent = ownerEmail
        ? ''
        : 'Отправка недоступна: к кабинету не привязан подтверждённый email.';
    } catch (error) {
      if (version !== requestVersion || !authenticated) return;
      available = false;
      ownerEmail = '';
      showUnread(0);
      messages.replaceChildren();
      updateReadTimers();
      historyCount.textContent = '';
      historyState.hidden = false;
      historyState.textContent = 'Не удалось загрузить переписку. Откройте поддержку ещё раз.';
      feedback.textContent = 'Можно написать сообщение. Отправка станет доступна после подключения.';
    }
    updateComposer();
  }

  function syncReadIndicators() {
    let count = 0;
    for (const entry of messages.querySelectorAll('[data-unread-id]')) {
      const read = readIds.has(entry.dataset.unreadId);
      entry.querySelector('em').hidden = read;
      if (!read) count++;
    }
    showUnread(count);
  }

  function visibleUnreadIds() {
    const ids = new Set();
    if (!authenticated || !dialog.open || document.hidden) return ids;
    const list = messages.getBoundingClientRect();
    const panel = dialog.getBoundingClientRect();
    const top = Math.max(0, list.top, panel.top);
    const bottom = Math.min(window.innerHeight, list.bottom, panel.bottom);
    if (bottom <= top) return ids;
    for (const entry of messages.querySelectorAll('[data-unread-id]')) {
      const id = entry.dataset.unreadId;
      const rect = entry.getBoundingClientRect();
      if (!readIds.has(id) && rect.bottom > top && rect.top < bottom) ids.add(id);
    }
    return ids;
  }

  function updateReadTimers() {
    const visible = visibleUnreadIds();
    for (const [id, timer] of readTimers) {
      if (!visible.has(id)) {
        clearTimeout(timer);
        readTimers.delete(id);
      }
    }
    for (const id of visible) {
      if (readTimers.has(id)) continue;
      readTimers.set(id, setTimeout(() => {
        readTimers.delete(id);
        if (visibleUnreadIds().has(id)) markRead(id);
      }, 5000));
    }
  }

  async function markRead(id) {
    if (readIds.has(id)) return;
    const sessionReads = readIds;
    sessionReads.add(id);
    syncReadIndicators();
    try {
      await supportRequest(`${endpoint}/read`, {
        method: 'POST', body: JSON.stringify({ message_id: id })
      });
    } catch {
      if (readIds !== sessionReads) return;
      sessionReads.delete(id);
      syncReadIndicators();
      // The next refresh or interaction can retry.
    }
  }

  dialog.addEventListener('close', updateReadTimers);
  dialog.addEventListener('scroll', updateReadTimers, true);
  document.addEventListener('visibilitychange', updateReadTimers);
  window.addEventListener('resize', updateReadTimers);

  openButton.addEventListener('click', () => {
    dialog.showModal();
    updateReadTimers();
    fitMessageInput();
    refreshSupport();
    byId('close-support').focus();
  });
  byId('close-support').addEventListener('click', () => dialog.close());
  messageInput.addEventListener('input', () => {
    outgoingId = '';
    if (messageInput.value.trim()) {
      for (const id of visibleUnreadIds()) markRead(id);
    }
    updateComposer();
    updateReadTimers();
  });
  byId('support-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = messageInput.value.trim();
    if (!authenticated || !available || !ownerEmail || !body || sending) return;
    sending = true;
    updateComposer();
    const owner = sessionOwner;
    outgoingId ||= crypto.randomUUID();
    feedback.textContent = 'Отправка сообщения…';
    try {
      await supportRequest(endpoint, { method: 'POST', body: JSON.stringify({ message: body, message_id: outgoingId }) });
      if (owner !== sessionOwner) return;
      outgoingId = '';
      messageInput.value = '';
      await refreshSupport();
      if (owner !== sessionOwner) return;
      feedback.textContent = available
        ? 'Сообщение отправлено QUD.'
        : 'Сообщение отправлено, но историю пока не удалось обновить.';
    } catch {
      if (owner !== sessionOwner) return;
      feedback.textContent = 'Не удалось отправить сообщение. Текст сохранён в форме; попробуйте ещё раз.';
    } finally {
      if (owner !== sessionOwner) return;
      sending = false;
      updateComposer();
    }
  });

  window.addEventListener('owner:session', (event) => {
    authenticated = event.detail && event.detail.authenticated === true;
    const nextOwner = authenticated ? event.detail.owner_id : '';
    if (nextOwner !== sessionOwner) {
      sessionOwner = nextOwner;
      readIds = new Set();
      available = false;
      ownerEmail = '';
      outgoingId = '';
      sending = false;
      messageInput.value = '';
      messages.replaceChildren();
      updateReadTimers();
      historyCount.textContent = '';
      historyState.hidden = false;
      historyState.textContent = 'Загружаем переписку…';
      showUnread(0);
      updateComposer();
    }
    clearInterval(refreshTimer);
    requestVersion++;
    if (!authenticated) {
      if (dialog.open) dialog.close();
      available = false;
      ownerEmail = '';
      messageInput.value = '';
      messages.replaceChildren();
      showUnread(0);
      updateComposer();
      return;
    }
    refreshSupport();
    refreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshSupport();
    }, 60000);
  });
})();
