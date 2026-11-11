(() => {
  'use strict';

  const assessment = {
    vectors: {
      risk_discipline: 'Риск-дисциплина',
      sl_trade_control: 'Контроль сделки и Stop Loss',
      behavioral_stability: 'Поведенческая устойчивость',
      process_transparency: 'Прозрачность процесса'
    },
    questions: [
      {
        text: "Перед открытием сделки как обычно определяется допустимый риск?",
        options: [
          ["A", "От структуры сделки: точка входа, Stop Loss, размер позиции", 0, "risk_discipline"],
          ["B", "Через заранее заданный процент от счёта", 0, "risk_discipline"],
          ["C", "По текущей уверенности в торговой идее", 2, "risk_discipline"],
          ["D", "По ситуации: риск может уточняться уже после входа", 3, "risk_discipline"]
        ]
      },
      {
        text: "Как обычно используется Stop Loss в ваших сделках?",
        options: [
          ["A", "Stop Loss ставится после входа, когда рынок подтверждает направление", 2, "sl_trade_control"],
          ["B", "Stop Loss задаётся до входа или в момент открытия сделки", 0, "sl_trade_control"],
          ["C", "Stop Loss используется не во всех сделках, зависит от инструмента и ситуации", 2, "sl_trade_control"],
          ["D", "Сделки чаще контролируются вручную без обязательного Stop Loss", 3, "sl_trade_control"]
        ]
      },
      {
        text: "Что чаще всего происходит с первоначальным риском после открытия позиции?",
        options: [
          ["A", "Риск может расширяться, если рыночная идея остаётся актуальной", 3, "sl_trade_control"],
          ["B", "Риск остаётся в пределах первоначального плана", 0, "sl_trade_control"],
          ["C", "Риск может снижаться по мере развития сделки", 0, "sl_trade_control"],
          ["D", "Риск корректируется по ситуации, в зависимости от поведения цены", 2, "sl_trade_control"]
        ]
      },
      {
        text: "Как обычно меняется торговое поведение после убыточной сделки?",
        options: [
          ["A", "Торговля продолжается только при появлении следующего планового сетапа", 0, "behavioral_stability"],
          ["B", "Может появиться желание быстрее вернуть убыток, но объём риска ограничивается", 1, "behavioral_stability"],
          ["C", "Активность может увеличиться, если рынок даёт новые возможности", 2, "behavioral_stability"],
          ["D", "После убытка обычно беру паузу и возвращаюсь к торговле позже", 0, "behavioral_stability"]
        ]
      },
      {
        text: "Как у вас устроен контроль дневной просадки?",
        options: [
          ["A", "Есть уровень, после которого торговля останавливается", 0, "risk_discipline"],
          ["B", "Дневная просадка контролируется по ситуации и состоянию рынка", 2, "risk_discipline"],
          ["C", "Есть ориентир по просадке, но решение о продолжении принимается вручную", 1, "risk_discipline"],
          ["D", "Основной контроль идёт по качеству сетапов, а не по дневному лимиту", 2, "risk_discipline"]
        ]
      },
      {
        text: "Как вы контролируете просадку за торговый период?",
        options: [
          ["A", "Используется заранее заданный лимит, после которого торговля пересматривается", 0, "risk_discipline"],
          ["B", "Просадка анализируется по динамике счёта и качеству последних сделок", 1, "risk_discipline"],
          ["C", "Решение о паузе принимается вручную, когда просадка становится психологически заметной", 2, "risk_discipline"],
          ["D", "Торговля продолжается, если стратегия ещё может восстановить результат", 3, "risk_discipline"]
        ]
      },
      {
        text: "Насколько повторяемы ваши сделки по логике входа и сопровождения?",
        options: [
          ["A", "Есть несколько рабочих моделей, выбор зависит от рыночного контекста", 1, "behavioral_stability"],
          ["B", "Большинство сделок строятся по заранее описанной логике", 0, "behavioral_stability"],
          ["C", "Логика сделки часто формируется уже в процессе наблюдения за рынком", 3, "behavioral_stability"],
          ["D", "Основная идея понятна, но сопровождение часто зависит от ситуации", 2, "behavioral_stability"]
        ]
      },
      {
        text: "В каком виде у вас зафиксирован торговый план?",
        options: [
          ["A", "Есть общая торговая логика, но без подробного письменного регламента", 2, "process_transparency"],
          ["B", "Прописаны условия входа, риска, сопровождения и выхода", 0, "process_transparency"],
          ["C", "План существует в виде правил и заметок, которые периодически обновляются", 1, "process_transparency"],
          ["D", "Формального плана нет, решения принимаются по текущему рынку", 3, "process_transparency"]
        ]
      },
      {
        text: "Как в вашей торговле появляются отклонения от первоначального плана?",
        options: [
          ["A", "Отклонения фиксируются и затем разбираются", 1, "behavioral_stability"],
          ["B", "Отклонения допустимы, если рынок даёт нестандартную ситуацию", 2, "behavioral_stability"],
          ["C", "План может меняться по ходу сделки вместе с рыночным контекстом", 3, "behavioral_stability"],
          ["D", "Отклонения редки, потому что правила заранее ограничивают действия", 0, "behavioral_stability"]
        ]
      },
      {
        text: "Как вы фиксируете свои торговые решения?",
        options: [
          ["A", "Ведётся журнал с причиной входа, риском, сопровождением и выводами", 0, "process_transparency"],
          ["B", "Сохраняются основные сделки, скриншоты или короткие заметки", 1, "process_transparency"],
          ["C", "История в терминале используется как основной источник анализа", 2, "process_transparency"],
          ["D", "Фиксация ведётся выборочно, когда сделка кажется важной", 2, "process_transparency"]
        ]
      },
      {
        text: "В каких случаях вы увеличиваете размер позиции?",
        options: [
          ["A", "Когда сделка развивается в мою сторону и появляется подтверждение", 1, "risk_discipline"],
          ["B", "Только по заранее описанному правилу и в пределах общего лимита риска", 0, "risk_discipline"],
          ["C", "Когда уверенность в торговой идее становится выше", 2, "risk_discipline"],
          ["D", "Когда нужно быстрее восстановить результат после просадки", 3, "risk_discipline"]
        ]
      },
      {
        text: "Какой формат подтверждения торгового процесса для вас наиболее приемлем?",
        options: [
          ["A", "Автоматическая фиксация событий торговли без вмешательства в сделки", 0, "process_transparency"],
          ["B", "Периодическая выгрузка отчётов и ручная сверка результатов", 1, "process_transparency"],
          ["C", "Самостоятельный журнал сделок с последующим разбором", 2, "process_transparency"],
          ["D", "Описание стратегии, логики и результатов без технической фиксации", 3, "process_transparency"]
        ]
      }
    ]
  };

  const shell = document.createElement('div');
  shell.innerHTML = `
    <aside class="risk-launcher" aria-label="Самооценка рисков QUD">
      <div class="risk-launcher-preview" id="risk-launcher-preview" aria-hidden="true">
        <span class="risk-launcher-kicker">Предварительная оценка</span>
        <strong>Самооценка рисков QUD</strong>
        <p>12 вопросов · предварительная оценка рисков<br>Около 3 минут</p>
        <button class="risk-launcher-start" type="button" data-risk-open>Пройти тест</button>
      </div>
      <button class="risk-launcher-tab" type="button" aria-expanded="false" aria-controls="risk-launcher-preview" aria-label="Открыть самооценку рисков QUD">
        <span class="risk-launcher-icon" aria-hidden="true">
          <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 3 57 13v18c0 17-10 29-25 37C17 60 7 48 7 31V13L32 3Z" fill="rgba(38,48,58,.84)" stroke="currentColor" stroke-width="2"/><path d="m19 34 9 9 18-20" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="risk-launcher-label">Оценка рисков</span>
        <span class="risk-launcher-dot" aria-hidden="true"></span>
      </button>
    </aside>

    <section class="risk-dialog" aria-hidden="true">
      <div class="risk-dialog-backdrop" data-risk-close></div>
      <div class="risk-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="risk-dialog-title">
        <header class="risk-dialog-header">
          <div class="risk-dialog-brand">
            <span class="risk-dialog-brand-mark"><img src="/qud-logo.svg" alt="QUD"></span>
          </div>
          <button class="risk-dialog-close" type="button" aria-label="Закрыть тест" data-risk-close>×</button>
        </header>
        <div class="risk-dialog-content">
          <div class="risk-view is-active" data-risk-view="intro">
            <div class="risk-intro-grid">
              <div>
                <span class="risk-dialog-kicker">Самооценка рисков QUD</span>
                <h2 id="risk-dialog-title">Узнайте предварительный<br class="risk-intro-break"> профиль рисков вашей торговли.</h2>
                <p class="risk-view-lead">Ответьте на 12 вопросов о риске, Stop Loss, просадке, дисциплине и записи решений. Результат — отправная точка диагностики, а не аудит.</p>
                <p class="risk-intro-meta">12 вопросов&nbsp;&nbsp;·&nbsp;&nbsp;Около 3 минут&nbsp;&nbsp;·&nbsp;&nbsp;Без показа баллов</p>
                <div class="risk-actions">
                  <button class="risk-primary-action" type="button" data-risk-start>Начать тест</button>
                </div>
              </div>
              <div class="risk-vector-preview" aria-label="Направления оценки">
                <span>Риск-дисциплина</span>
                <span>Контроль сделки и Stop Loss</span>
                <span>Поведенческая устойчивость</span>
                <span>Прозрачность процесса</span>
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
              <button class="risk-back-action" type="button" data-risk-back>← Предыдущий вопрос</button>
              <span class="risk-question-hint">Выберите ответ, наиболее близкий вашему процессу</span>
            </div>
          </div>

          <div class="risk-view" data-risk-view="result">
            <div class="risk-result-grid">
              <div class="risk-result-context">
                <span class="risk-dialog-kicker">О результате</span>
                <h2>Предварительная оценка</h2>
                <p>Результат основан только на ваших ответах. Это не окончательный профиль QUD и не оценка качества или доходности стратегии.</p>
                <p>Следующий этап диагностики основан на реальных торговых событиях.</p>
              </div>
              <div class="risk-result-summary">
                <div class="risk-profile-card">
                  <span class="risk-profile-label">Предварительный профиль процесса</span>
                  <strong class="risk-profile-name"></strong>
                  <span class="risk-profile-label">Основные направления внимания</span>
                  <ul class="risk-focus-list"></ul>
                </div>
                <div class="risk-result-cta">
                  <strong>Продолжите с семидневным TDA Trial Audit</strong>
                  <p>QUD фиксирует реальные торговые события на тестовом счёте MT5, не вмешиваясь в сделки.</p>
                  <div class="risk-actions">
                    <button class="risk-primary-action" type="button" data-risk-form>Начать TDA Trial Audit</button>
                    <button class="risk-secondary-action" type="button" data-risk-restart>Пройти заново</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="risk-view" data-risk-view="form">
            <span class="risk-dialog-kicker">TDA Trial Audit</span>
            <h2>Продолжите диагностику на основе реальных торговых событий.</h2>
            <p class="risk-view-lead">Оставьте свои данные. Предварительный результат будет приложен к заявке.</p>
            <form class="risk-form" novalidate>
              <div class="risk-form-grid">
                <label>Имя<input type="text" name="name" autocomplete="name" required></label>
                <label>Email<input type="email" name="email" autocomplete="email" required></label>
                <label>Telegram<input type="text" name="telegram" placeholder="@username"></label>
                <label>Комментарий<input type="text" name="comment" placeholder="Необязательно"></label>
              </div>
              <label class="risk-consent"><input type="checkbox" name="consent" required> <span>Я согласен на обработку данных и передачу результата теста для ответа на заявку.</span></label><p class="risk-form-status" role="status" aria-live="polite"></p>
              <div class="risk-actions">
                <button class="risk-primary-action" type="submit">Отправить заявку на TDA Trial</button>
                <button class="risk-secondary-action" type="button" data-risk-result>Вернуться к результату</button>
              </div>

            </form>
          </div>

          <div class="risk-view" data-risk-view="success">
            <div class="risk-success">
              <div class="risk-success-icon" aria-hidden="true">✓</div>
              <span class="risk-dialog-kicker">Заявка отправлена</span>
              <h2>Ваша заявка отправлена.</h2>
              <p class="risk-view-lead">Мы свяжемся с вами по электронной почте.</p>
              <div class="risk-actions" style="justify-content:center">
                <button class="risk-primary-action" type="button" data-risk-close>Закрыть</button>
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
      ? 'Управляемый процесс'
      : totalScore <= 15
        ? 'Формирующийся процесс'
        : totalScore <= 25
          ? 'Нестабильный процесс'
          : 'Процесс повышенного риска';

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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const status = form.querySelector('.risk-form-status');
    const submit = form.querySelector('[type="submit"]');
    const result = [profileName.textContent, ...Array.from(focusList.children, item => item.textContent)].join(' | ');
    const name = form.elements.name.value.trim();
    const comment = form.elements.comment.value.trim();
    const message = [name && `Name: ${name}`, comment, `Risk self-assessment: ${result}`].filter(Boolean).join('\n');
    submit.disabled = true; status.textContent = 'Отправляем заявку…';
    try {
      await window.qudSendTraderLead({email:form.elements.email.value, telegram:form.elements.telegram.value, message, entryPoint:'risk_self_assessment'});
      form.reset(); status.textContent = ''; showView('success');
    } catch (error) { console.error(error); status.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз.'; }
    finally { submit.disabled = false; }
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
