(() => {
  'use strict';

  // Existing demo shell; Owner session is managed separately in session.js.
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
  const toast = document.getElementById('demo-toast');
  const navItems = Array.from(document.querySelectorAll('.nav-item[data-view]'));
  const viewTriggers = Array.from(document.querySelectorAll('[data-view], [data-open-view]'));
  const demoTriggers = Array.from(document.querySelectorAll('[data-demo-action]'));
  const strategyToggles = Array.from(document.querySelectorAll('.strategy-catalog-card[aria-controls]'));
  const views = new Map(
    Array.from(document.querySelectorAll('.view')).map((view) => [
      view.id.replace('view-', ''),
      view
    ])
  );

  let toastTimer;

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

  function setStrategyCardState(toggle, isExpanded) {
    const details = document.getElementById(toggle.getAttribute('aria-controls'));
    const card = toggle.closest('[data-strategy-card]');
    if (!details || !card) return;

    toggle.setAttribute('aria-expanded', String(isExpanded));
    details.hidden = !isExpanded;
    card.classList.toggle('is-expanded', isExpanded);
  }

  function toggleStrategyCard(selectedToggle) {
    const shouldOpen = selectedToggle.getAttribute('aria-expanded') !== 'true';
    strategyToggles.forEach((toggle) => {
      setStrategyCardState(toggle, toggle === selectedToggle && shouldOpen);
    });
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
    if (moveFocus) content.focus({ preventScroll: true });
  }

  viewTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      if (trigger.tagName === 'A') event.preventDefault();
      activateView(trigger.dataset.view || trigger.dataset.openView, { moveFocus: true });
    });
  });

  strategyToggles.forEach((toggle) => {
    toggle.addEventListener('click', () => toggleStrategyCard(toggle));
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
    else {
      const expandedStrategy = strategyToggles.find((toggle) => toggle.getAttribute('aria-expanded') === 'true');
      if (expandedStrategy) {
        setStrategyCardState(expandedStrategy, false);
        expandedStrategy.focus();
      } else if (!toast.hidden) hideToast();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeSidebar();
  });

  activateView(window.location.hash.slice(1), { updateHash: false });
})();
