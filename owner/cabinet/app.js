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
      const row = document.createElement('article');
      row.className = 'strategy-catalog-row panel';

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
      strategyCatalog.append(row);
    });
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
