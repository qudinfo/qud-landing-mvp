(() => {
  'use strict';

  const assessment = {
    vectors: {
      risk_discipline: 'Risk discipline',
      sl_trade_control: 'Trade and Stop Loss control',
      behavioral_stability: 'Behavioural stability',
      process_transparency: 'Process transparency'
    },
    questions: [
      {
        text: 'Before opening a trade, how do you usually define the acceptable risk?',
        options: [
          ['A', 'From the trade structure: entry, Stop Loss and position size', 0, 'risk_discipline'],
          ['B', 'Using a predefined percentage of the account', 0, 'risk_discipline'],
          ['C', 'According to my current confidence in the trade idea', 2, 'risk_discipline'],
          ['D', 'Situationally: risk may be refined after entry', 3, 'risk_discipline']
        ]
      },
      {
        text: 'How is Stop Loss normally used in your trades?',
        options: [
          ['A', 'It is placed after entry when the market confirms direction', 2, 'sl_trade_control'],
          ['B', 'It is defined before entry or when the trade is opened', 0, 'sl_trade_control'],
          ['C', 'It is not used in every trade; it depends on the instrument and situation', 2, 'sl_trade_control'],
          ['D', 'Trades are usually managed manually without a mandatory Stop Loss', 3, 'sl_trade_control']
        ]
      },
      {
        text: 'What usually happens to the initial risk after a position is opened?',
        options: [
          ['A', 'Risk may be expanded if the market idea remains valid', 3, 'sl_trade_control'],
          ['B', 'Risk stays within the original plan', 0, 'sl_trade_control'],
          ['C', 'Risk may be reduced as the trade develops', 0, 'sl_trade_control'],
          ['D', 'Risk is adjusted situationally according to price behaviour', 2, 'sl_trade_control']
        ]
      },
      {
        text: 'How does your trading behaviour usually change after a losing trade?',
        options: [
          ['A', 'I continue only when the next planned setup appears', 0, 'behavioral_stability'],
          ['B', 'I may want to recover the loss faster, but the risk size remains limited', 1, 'behavioral_stability'],
          ['C', 'Activity may increase if the market presents new opportunities', 2, 'behavioral_stability'],
          ['D', 'I usually pause and return to trading later', 0, 'behavioral_stability']
        ]
      },
      {
        text: 'How do you control daily drawdown?',
        options: [
          ['A', 'There is a level after which trading stops', 0, 'risk_discipline'],
          ['B', 'Daily drawdown is managed according to the situation and market conditions', 2, 'risk_discipline'],
          ['C', 'There is a drawdown guideline, but continuation is decided manually', 1, 'risk_discipline'],
          ['D', 'Control focuses on setup quality rather than a daily limit', 2, 'risk_discipline']
        ]
      },
      {
        text: 'How do you control drawdown over a trading period?',
        options: [
          ['A', 'A predefined limit triggers a review of trading', 0, 'risk_discipline'],
          ['B', 'Drawdown is assessed through account dynamics and recent trade quality', 1, 'risk_discipline'],
          ['C', 'A pause is decided manually when the drawdown becomes psychologically noticeable', 2, 'risk_discipline'],
          ['D', 'Trading continues if the strategy can still recover the result', 3, 'risk_discipline']
        ]
      },
      {
        text: 'How repeatable are your trades in their entry and management logic?',
        options: [
          ['A', 'I use several working models depending on market context', 1, 'behavioral_stability'],
          ['B', 'Most trades follow predefined logic', 0, 'behavioral_stability'],
          ['C', 'Trade logic is often formed while observing the market', 3, 'behavioral_stability'],
          ['D', 'The main idea is clear, but management often depends on the situation', 2, 'behavioral_stability']
        ]
      },
      {
        text: 'In what form is your trading plan documented?',
        options: [
          ['A', 'There is a general trading logic without detailed written rules', 2, 'process_transparency'],
          ['B', 'Entry, risk, management and exit conditions are documented', 0, 'process_transparency'],
          ['C', 'The plan exists as rules and notes that are updated periodically', 1, 'process_transparency'],
          ['D', 'There is no formal plan; decisions follow the current market', 3, 'process_transparency']
        ]
      },
      {
        text: 'How do deviations from the original plan arise in your trading?',
        options: [
          ['A', 'Deviations are recorded and reviewed afterwards', 1, 'behavioral_stability'],
          ['B', 'Deviations are acceptable when the market creates an unusual situation', 2, 'behavioral_stability'],
          ['C', 'The plan may change during the trade with the market context', 3, 'behavioral_stability'],
          ['D', 'Deviations are rare because the rules limit actions in advance', 0, 'behavioral_stability']
        ]
      },
      {
        text: 'How do you record your trading decisions?',
        options: [
          ['A', 'I keep a journal with entry reason, risk, management and conclusions', 0, 'process_transparency'],
          ['B', 'I save key trades, screenshots or short notes', 1, 'process_transparency'],
          ['C', 'Terminal history is the main source for analysis', 2, 'process_transparency'],
          ['D', 'I record selectively when a trade seems important', 2, 'process_transparency']
        ]
      },
      {
        text: 'When do you increase position size?',
        options: [
          ['A', 'When the trade moves in my favour and receives confirmation', 1, 'risk_discipline'],
          ['B', 'Only by a predefined rule and within the total risk limit', 0, 'risk_discipline'],
          ['C', 'When confidence in the trading idea increases', 2, 'risk_discipline'],
          ['D', 'When I need to recover faster after a drawdown', 3, 'risk_discipline']
        ]
      },
      {
        text: 'Which format for confirming the trading process is most acceptable to you?',
        options: [
          ['A', 'Automatic recording of trading events without intervention in trades', 0, 'process_transparency'],
          ['B', 'Periodic report exports and manual reconciliation', 1, 'process_transparency'],
          ['C', 'A self-maintained trading journal followed by review', 2, 'process_transparency'],
          ['D', 'A description of strategy, logic and results without technical recording', 3, 'process_transparency']
        ]
      }
    ]
  };

  const shell = document.createElement('div');
  shell.innerHTML = `
    <aside class="risk-launcher" aria-label="QUD Risk Self-Assessment">
      <div class="risk-launcher-preview" id="risk-launcher-preview" aria-hidden="true">
        <span class="risk-launcher-kicker">Preliminary diagnostic view</span>
        <strong>QUD Risk Self-Assessment</strong>
        <p>12 questions · preliminary risk vector<br>Approximately 3 minutes</p>
        <button class="risk-launcher-start" type="button" data-risk-open>Start assessment</button>
      </div>
      <button class="risk-launcher-tab" type="button" aria-expanded="false" aria-controls="risk-launcher-preview" aria-label="Open QUD Risk Self-Assessment">
        <span class="risk-launcher-icon" aria-hidden="true">
          <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 3 57 13v18c0 17-10 29-25 37C17 60 7 48 7 31V13L32 3Z" fill="rgba(38,48,58,.84)" stroke="currentColor" stroke-width="2"/><path d="m19 34 9 9 18-20" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="risk-launcher-label">Risk assessment</span>
        <span class="risk-launcher-dot" aria-hidden="true"></span>
      </button>
    </aside>

    <section class="risk-dialog" aria-hidden="true">
      <div class="risk-dialog-backdrop" data-risk-close></div>
      <div class="risk-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="risk-dialog-title">
        <header class="risk-dialog-header">
          <div class="risk-dialog-brand">
            <span class="risk-dialog-brand-mark"><img src="../../qud-logo.svg" alt="QUD"></span>
          </div>
          <button class="risk-dialog-close" type="button" aria-label="Close assessment" data-risk-close>×</button>
        </header>
        <div class="risk-dialog-content">
          <div class="risk-view is-active" data-risk-view="intro">
            <div class="risk-intro-grid">
              <div>
                <span class="risk-dialog-kicker">QUD Risk Self-Assessment</span>
                <h2 id="risk-dialog-title">See your preliminary<br class="risk-intro-break"> trading-process risk vector.</h2>
                <p class="risk-view-lead">Answer 12 questions about risk, Stop Loss, drawdown, discipline and decision recording. The result is a diagnostic starting point, not an audit.</p>
                <p class="risk-intro-meta">12 questions&nbsp;&nbsp;·&nbsp;&nbsp;About 3 minutes&nbsp;&nbsp;·&nbsp;&nbsp;No score shown</p>
                <div class="risk-actions">
                  <button class="risk-primary-action" type="button" data-risk-start>Begin assessment</button>
                </div>
              </div>
              <div class="risk-vector-preview" aria-label="Assessment areas">
                <span>Risk discipline</span>
                <span>Trade and Stop Loss control</span>
                <span>Behavioural stability</span>
                <span>Process transparency</span>
              </div>
            </div>
          </div>

          <div class="risk-view" data-risk-view="question">
            <div class="risk-progress-row">
              <span class="risk-question-count">01 / 12</span>
              <div class="risk-progress-track" aria-hidden="true"><div class="risk-progress-value"></div></div>
            </div>
            <h2 class="risk-question-title"></h2>
            <div class="risk-options"></div>
            <div class="risk-question-footer">
              <button class="risk-back-action" type="button" data-risk-back>← Previous question</button>
              <span class="risk-question-hint">Select the answer closest to your usual process</span>
            </div>
          </div>

          <div class="risk-view" data-risk-view="result">
            <div class="risk-result-grid">
              <div class="risk-result-context">
                <span class="risk-dialog-kicker">About this result</span>
                <h2>Preliminary diagnostic view</h2>
                <p>This result is based only on your answers. It is not a final QUD profile and does not assess the quality or profitability of your strategy.</p>
                <p>The next diagnostic step uses actual trading events rather than self-reported answers.</p>
              </div>
              <div class="risk-result-summary">
                <div class="risk-profile-card">
                  <span class="risk-profile-label">Preliminary process profile</span>
                  <strong class="risk-profile-name"></strong>
                  <span class="risk-profile-label">Primary areas for attention</span>
                  <ul class="risk-focus-list"></ul>
                </div>
                <div class="risk-result-cta">
                  <strong>Continue with a 7-day TDA Trial Audit</strong>
                  <p>QUD records actual trading events on a test MT5 account without intervening in trades.</p>
                  <div class="risk-actions">
                    <button class="risk-primary-action" type="button" data-risk-form>Start TDA Trial Audit</button>
                    <button class="risk-secondary-action" type="button" data-risk-restart>Retake</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="risk-view" data-risk-view="form">
            <span class="risk-dialog-kicker">TDA Trial Audit</span>
            <h2>Continue with real trading-event diagnostics.</h2>
            <p class="risk-view-lead">Leave your details. Your preliminary result will be attached to the request in the production version.</p>
            <form class="risk-form" novalidate>
              <div class="risk-form-grid">
                <label>Name<input type="text" name="name" autocomplete="name" required></label>
                <label>Email<input type="email" name="email" autocomplete="email" required></label>
                <label>Telegram<input type="text" name="telegram" placeholder="@username"></label>
                <label>Comment<input type="text" name="comment" placeholder="Optional"></label>
              </div>
              <div class="risk-actions">
                <button class="risk-primary-action" type="submit">Send TDA Trial request</button>
                <button class="risk-secondary-action" type="button" data-risk-result>Back to result</button>
              </div>
              <p class="risk-prototype-note">Prototype mode: this form does not send or store personal data.</p>
            </form>
          </div>

          <div class="risk-view" data-risk-view="success">
            <div class="risk-success">
              <div class="risk-success-icon" aria-hidden="true">✓</div>
              <span class="risk-dialog-kicker">Prototype complete</span>
              <h2>Your request journey is ready for review.</h2>
              <p class="risk-view-lead">In the production version, this step will record the request in QUD Leads Center and notify the team.</p>
              <div class="risk-actions" style="justify-content:center">
                <button class="risk-primary-action" type="button" data-risk-close>Close prototype</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  document.body.append(...shell.children);

  const launcher = document.querySelector('.risk-launcher');
  const launcherTab = launcher.querySelector('.risk-launcher-tab');
  const launcherPreview = launcher.querySelector('.risk-launcher-preview');
  // Keep the desktop launcher away from visible text and form controls.
  let positionFrame = 0;
  const positionLauncher = () => {
    positionFrame = 0;
    if (window.innerWidth <= 760 || launcher.classList.contains('is-preview-open')) return;
    const rect = launcherTab.getBoundingClientRect(), left = rect.left, rightEdge = rect.right;
    const nodes = document.querySelectorAll('h1,h2,h3,h4,p,label,button,a,input,textarea,.header');
    const obstacles = Array.from(nodes).filter(node => !launcher.contains(node) && !node.closest('.risk-dialog')).map(node => node.getBoundingClientRect()).filter(rect => rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight && rect.right > left - 10 && rect.left < rightEdge + 10);
    const candidates = [.5,.35,.65,.23,.77].map(part => Math.max(90,Math.min(innerHeight-45,innerHeight*part)));
    const score = y => obstacles.reduce((sum, rect) => sum + Math.max(0, Math.min(y+30,rect.bottom+8)-Math.max(y-30,rect.top-8)),0);
    const best = candidates.sort((a,b) => score(a)-score(b))[0];
    launcher.style.top = `${best}px`;
  };
  const scheduleLauncher = () => { if (!positionFrame) positionFrame = requestAnimationFrame(positionLauncher); };
  window.addEventListener('scroll', scheduleLauncher, {passive:true});
  window.addEventListener('resize', scheduleLauncher, {passive:true});
  scheduleLauncher();
  const dialog = document.querySelector('.risk-dialog');
  const views = [...dialog.querySelectorAll('[data-risk-view]')];
  const questionCount = dialog.querySelector('.risk-question-count');
  const progressValue = dialog.querySelector('.risk-progress-value');
  const questionTitle = dialog.querySelector('.risk-question-title');
  const optionsRoot = dialog.querySelector('.risk-options');
  const backButton = dialog.querySelector('[data-risk-back]');
  const profileName = dialog.querySelector('.risk-profile-name');
  const focusList = dialog.querySelector('.risk-focus-list');
  const form = dialog.querySelector('.risk-form');
  let currentQuestion = 0;
  let answers = [];
  let lastFocusedElement = null;

  const showView = (name) => {
    views.forEach((view) => view.classList.toggle('is-active', view.dataset.riskView === name));
    dialog.querySelector('.risk-dialog-content').scrollTop = 0;
  };

  const togglePreview = (force) => {
    const isOpen = typeof force === 'boolean' ? force : !launcher.classList.contains('is-preview-open');
    launcher.classList.toggle('is-preview-open', isOpen);
    launcherTab.setAttribute('aria-expanded', String(isOpen));
    launcherPreview.setAttribute('aria-hidden', String(!isOpen));
  };

  const openDialog = () => {
    lastFocusedElement = document.activeElement;
    togglePreview(false);
    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-risk-assessment-open');
    showView('intro');
    requestAnimationFrame(() => dialog.querySelector('[data-risk-start]').focus());
  };

  const closeDialog = () => {
    dialog.classList.remove('is-open');
    dialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-risk-assessment-open');
    lastFocusedElement?.focus();
  };

  const calculateResult = () => {
    const vectorScores = Object.fromEntries(Object.keys(assessment.vectors).map((key) => [key, 0]));
    let totalScore = 0;

    answers.forEach((answer) => {
      totalScore += answer.points;
      vectorScores[answer.vector] += answer.points;
    });

    const profile = totalScore <= 7
      ? 'Managed process'
      : totalScore <= 15
        ? 'Developing process'
        : totalScore <= 25
          ? 'Unstable process'
          : 'Elevated-risk process';

    const topVectors = Object.entries(vectorScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([key]) => assessment.vectors[key]);

    profileName.textContent = profile;
    focusList.replaceChildren(...topVectors.map((vector) => {
      const item = document.createElement('li');
      item.textContent = vector;
      return item;
    }));
    showView('result');
  };

  const renderQuestion = () => {
    const question = assessment.questions[currentQuestion];
    const selected = answers[currentQuestion];
    questionCount.textContent = `${String(currentQuestion + 1).padStart(2, '0')} / ${assessment.questions.length}`;
    progressValue.style.width = `${((currentQuestion + 1) / assessment.questions.length) * 100}%`;
    questionTitle.textContent = question.text;
    backButton.disabled = currentQuestion === 0;
    optionsRoot.replaceChildren(...question.options.map(([label, text, points, vector]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'risk-option';
      if (selected?.label === label) button.classList.add('is-selected');
      button.innerHTML = `<span class="risk-option-letter">${label}</span><span>${text}</span>`;
      button.addEventListener('click', () => {
        answers[currentQuestion] = { label, points, vector };
        if (currentQuestion === assessment.questions.length - 1) {
          calculateResult();
          return;
        }
        currentQuestion += 1;
        renderQuestion();
      });
      return button;
    }));
  };

  const startAssessment = () => {
    currentQuestion = 0;
    answers = [];
    showView('question');
    renderQuestion();
  };

  launcherTab.addEventListener('click', () => {
    if (matchMedia('(hover: hover)').matches && launcher.classList.contains('is-preview-open')) openDialog();
    else togglePreview();
  });
  launcher.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) togglePreview(true); });
  launcher.addEventListener('mouseleave', () => { if (matchMedia('(hover: hover)').matches) { togglePreview(false); scheduleLauncher(); } });
  document.querySelectorAll('[data-risk-open]').forEach((button) => button.addEventListener('click', openDialog));
  dialog.querySelector('[data-risk-start]').addEventListener('click', startAssessment);
  dialog.querySelector('[data-risk-restart]').addEventListener('click', startAssessment);
  dialog.querySelector('[data-risk-form]').addEventListener('click', () => showView('form'));
  dialog.querySelector('[data-risk-result]').addEventListener('click', () => showView('result'));
  dialog.querySelectorAll('[data-risk-close]').forEach((button) => button.addEventListener('click', closeDialog));

  backButton.addEventListener('click', () => {
    if (currentQuestion === 0) return;
    currentQuestion -= 1;
    renderQuestion();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    showView('success');
  });

  document.addEventListener('click', (event) => {
    if (!launcher.contains(event.target)) togglePreview(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (dialog.classList.contains('is-open')) closeDialog();
      else togglePreview(false);
    }
  });
})();
