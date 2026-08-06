from pathlib import Path

APP = Path('portal/portfolio/mvp/app.js')
WORKER = Path('portal/portfolio/backend/worker/portfolio-api.js')
WORKFLOW = Path('.github/workflows/validate-vp-mvp.yml')

app = APP.read_text()
worker = WORKER.read_text()
workflow = WORKFLOW.read_text()


def replace_once(source, old, new, label):
    if old not in source:
        raise SystemExit(f'marker not found: {label}')
    return source.replace(old, new, 1)


app = replace_once(
    app,
    """  const state = {
    portfolios: [],
    portfolioId: null,
    payload: null,
    availableStrategies: [],
    selectedRequestId: null,
    loading: false
  };
""",
    """  const state = {
    portfolios: [],
    portfolioId: null,
    sessionPortfolioId: null,
    payload: null,
    availableStrategies: [],
    selectedRequestId: null,
    loading: false
  };
""",
    'state'
)

app = replace_once(
    app,
    """  function showAccess(message = '') {
    state.payload = null;
    state.portfolioId = null;
    state.availableStrategies = [];
""",
    """  function showAccess(message = '') {
    state.payload = null;
    state.portfolioId = null;
    state.sessionPortfolioId = null;
    state.availableStrategies = [];
""",
    'showAccess reset'
)

app = replace_once(
    app,
    """  function extractPortfolios(data) {
    if (Array.isArray(data?.portfolios)) return data.portfolios;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  }

  function extractPayload(data) {
""",
    """  function extractPortfolios(data) {
    if (Array.isArray(data?.portfolios)) return data.portfolios;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  }

  function captureSessionPortfolioId(data) {
    const candidates = [
      data?.portfolio_id,
      data?.portfolioId,
      data?.session?.portfolio_id,
      data?.session?.portfolioId,
      data?.identity?.portfolio_id,
      data?.identity?.portfolioId,
      data?.data?.portfolio_id,
      data?.data?.portfolioId
    ];
    const value = candidates.find((item) => String(item || '').trim());
    if (value) state.sessionPortfolioId = String(value).trim();
    return state.sessionPortfolioId;
  }

  function safeErrorCode(error) {
    const value = String(error?.code || error?.message || '').trim();
    return /^[A-Z0-9_\-]{2,80}$/.test(value) ? value : 'DATA_ROUTE_ERROR';
  }

  function extractPayload(data) {
""",
    'session capture helpers'
)

old_load = """  async function loadPortfolio(portfolioId) {
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
"""

new_load = """  async function loadPortfolio(portfolioId) {
    const requestedId = String(portfolioId || '').trim();
    const portfolioUrl = requestedId
      ? `${ENDPOINTS.portfolio}?portfolio_id=${encodeURIComponent(requestedId)}`
      : ENDPOINTS.portfolio;
    const portfolioData = await apiRequest(portfolioUrl);
    const payload = extractPayload(portfolioData);
    if (!payload) throw new Error('PORTFOLIO_PAYLOAD_MISSING');

    const resolvedId = String(
      payload.portfolio.portfolio_id || requestedId || state.sessionPortfolioId || ''
    ).trim();
    if (!resolvedId) throw new Error('PORTFOLIO_ID_MISSING');

    state.portfolioId = resolvedId;
    state.sessionPortfolioId = state.sessionPortfolioId || resolvedId;
    state.payload = payload;

    let strategiesData = null;
    try {
      const strategiesUrl = `${ENDPOINTS.strategies}?portfolio_id=${encodeURIComponent(resolvedId)}`;
      strategiesData = await apiRequest(strategiesUrl);
    } catch (error) {
      if (error?.code === 'SESSION_EXPIRED') throw error;
      try {
        strategiesData = await apiRequest(ENDPOINTS.strategies);
      } catch (fallbackError) {
        if (fallbackError?.code === 'SESSION_EXPIRED') throw fallbackError;
        strategiesData = { items: payload.availableStrategies || [] };
      }
    }

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

  async function loadWorkspace(sessionData = null) {
    showWorkspace();
    captureSessionPortfolioId(sessionData);
    dom.updateLabel.textContent = 'Загрузка данных…';

    try {
      let portfolios = [];
      try {
        const portfoliosData = await apiRequest(ENDPOINTS.portfolios);
        portfolios = extractPortfolios(portfoliosData);
      } catch (error) {
        if (error?.code === 'SESSION_EXPIRED') throw error;
      }
      state.portfolios = portfolios;

      const queryId = String(
        new URLSearchParams(window.location.search).get('portfolio_id') || ''
      ).trim();
      const listed = portfolios.find((item) => (
        String(item.portfolio_id || '') === queryId
      ));
      const selectedId = queryId
        ? (listed?.portfolio_id || queryId)
        : (portfolios[0]?.portfolio_id || state.sessionPortfolioId || null);

      try {
        await loadPortfolio(selectedId);
      } catch (error) {
        if (error?.code === 'SESSION_EXPIRED') throw error;
        if (!queryId && selectedId) {
          await loadPortfolio(null);
        } else {
          throw error;
        }
      }
    } catch (error) {
      if (handleApiError(error, false)) return;
      const code = safeErrorCode(error);
      dom.updateLabel.textContent = `Не удалось загрузить данные · ${code}`;
      dom.portfolioIdentity.textContent = 'Ошибка загрузки портфеля';
      dom.toggleObservation.disabled = true;
    }
  }
"""
app = replace_once(app, old_load, new_load, 'loadPortfolio/loadWorkspace')

app = replace_once(
    app,
    """      const data = await readJson(response);
      if (response.ok && data?.ok === true && data?.authenticated === true) {
        await loadWorkspace();
        return;
      }
""",
    """      const data = await readJson(response);
      if (response.ok && data?.ok === true && data?.authenticated === true) {
        captureSessionPortfolioId(data);
        await loadWorkspace(data);
        return;
      }
""",
    'checkSession load'
)

app = replace_once(
    app,
    """      dom.accessKey.value = '';
      await loadWorkspace();
      window.scrollTo({ top: 0, behavior: 'smooth' });
""",
    """      dom.accessKey.value = '';
      captureSessionPortfolioId(data);
      await loadWorkspace(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
""",
    'login load'
)

worker = replace_once(
    worker,
    """const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff'
});

/**
 * Attach this handler after the existing QUD session validation.
""",
    """const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff'
});

/**
 * Returns true only for protected Virtual Portfolio data routes.
 * The session route must remain handled by the existing authentication code.
 */
export function isPortfolioApiRequest(request) {
  const path = new URL(request.url).pathname;
  return path.startsWith('/portal/vp/') && path !== '/portal/vp/session';
}

/**
 * Attach this handler after the existing QUD session validation.
 *
 * Production dispatch example:
 *   if (isPortfolioApiRequest(request)) {
 *     const session = await requireExistingQudSession(request, env);
 *     return handlePortfolioApi(request, env, session);
 *   }
""",
    'worker dispatch helper'
)

workflow = workflow.replace(
    """      - 'portal/portfolio/mvp/**'
      - '.github/workflows/validate-vp-mvp.yml'
""",
    """      - 'portal/portfolio/mvp/**'
      - 'portal/portfolio/backend/worker/**'
      - '.github/workflows/validate-vp-mvp.yml'
"""
)
workflow = replace_once(
    workflow,
    """          js = (root / 'app.js').read_text()

          required_files = ['./styles.css', './app.js']
""",
    """          js = (root / 'app.js').read_text()
          worker = Path('portal/portfolio/backend/worker/portfolio-api.js').read_text()

          required_files = ['./styles.css', './app.js']
""",
    'workflow worker read'
)
workflow = replace_once(
    workflow,
    """          if 'min=\"1000\"' not in html or 'capital < 1000' not in js:
              raise SystemExit('USD 1,000 minimum is not enforced in both UI and JS')

          print(f'validated {len(used)} DOM bindings')
""",
    """          if 'min=\"1000\"' not in html or 'capital < 1000' not in js:
              raise SystemExit('USD 1,000 minimum is not enforced in both UI and JS')

          compatibility_markers = [
              'sessionPortfolioId',
              'captureSessionPortfolioId',
              'await loadPortfolio(null)'
          ]
          for marker in compatibility_markers:
              if marker not in js:
                  raise SystemExit(f'missing Worker compatibility marker: {marker}')

          if 'isPortfolioApiRequest' not in worker or "path !== '/portal/vp/session'" not in worker:
              raise SystemExit('Worker protected-route dispatch helper is missing')

          print(f'validated {len(used)} DOM bindings and protected Worker compatibility')
""",
    'workflow compatibility checks'
)

APP.write_text(app)
WORKER.write_text(worker)
WORKFLOW.write_text(workflow)
