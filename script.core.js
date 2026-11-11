// QUD Landing — interactive sections and lead form logic

// QUD Landing — Audit cards slider

const isEnglishPage = document.documentElement.lang === 'en';

const auditCards = document.querySelectorAll(".audit-report-card");
const auditButtons = document.querySelectorAll(".audit-slider-button");

let activeAuditCard = 0;

function updateAuditCards() {
  auditCards.forEach((card, index) => {
    card.classList.remove("is-active", "is-left", "is-right");

    if (index === activeAuditCard) {
      card.classList.add("is-active");
    } else if (index === (activeAuditCard + 1) % auditCards.length) {
      card.classList.add("is-right");
    } else {
      card.classList.add("is-left");
    }
  });
}

if (auditCards.length && auditButtons.length) {
  updateAuditCards();

  auditButtons[0].addEventListener("click", () => {
    activeAuditCard =
      (activeAuditCard - 1 + auditCards.length) % auditCards.length;

    updateAuditCards();
  });

  auditButtons[1].addEventListener("click", () => {
    activeAuditCard =
      (activeAuditCard + 1) % auditCards.length;

    updateAuditCards();
  });
}

// QUD Landing — Audit workflow hover

const auditSteps = document.querySelectorAll(".audit-step");
const auditWorkflow = document.querySelector(".audit-workflow");

const workflowTitle = document.getElementById("workflow-title");
const workflowItems = document.querySelector(".workflow-items");

let workflowData = {
  data: {
    title: "Данные",
    items: [
      { label: "Профиль аудита", icon: "profile" },
      { label: "Период наблюдения", icon: "period" },
      { label: "Контроль событий", icon: "flow" }
    ]
  },
  processing: {
    title: "Обработка",
    items: [
      { label: "Очистка данных", icon: "cleaning" },
      { label: "Структуризация", icon: "structure" },
      { label: "Поиск отклонений", icon: "deviation" }
    ]
  },

  analytics: {
    title: "Аналитика",
    items: [
      { label: "Риск-метрики", icon: "riskMetrics" },
      { label: "AI-анализ", icon: "aiAnalysis" },
      { label: "Паттерны решений", icon: "decisionPatterns" }
    ]
  },

  result: {
    title: "Результат",
    items: [
      { label: "Итоговый отчет", icon: "finalReport" },
      { label: "Динамика процесса", icon: "processDynamics" },
      { label: "Фокус внимания", icon: "focusAttention" }
    ]
  }
};

if (isEnglishPage) {
  workflowData = {
    data: { title: 'Data', items: [{ label: 'Audit profile', icon: 'profile' }, { label: 'Observation period', icon: 'period' }, { label: 'Event control', icon: 'flow' }] },
    processing: { title: 'Processing', items: [{ label: 'Data cleansing', icon: 'cleaning' }, { label: 'Structuring', icon: 'structure' }, { label: 'Deviation detection', icon: 'deviation' }] },
    analytics: { title: 'Analytics', items: [{ label: 'Risk metrics', icon: 'riskMetrics' }, { label: 'AI analysis', icon: 'aiAnalysis' }, { label: 'Decision patterns', icon: 'decisionPatterns' }] },
    result: { title: 'Result', items: [{ label: 'Final report', icon: 'finalReport' }, { label: 'Process dynamics', icon: 'processDynamics' }, { label: 'Focus areas', icon: 'focusAttention' }] }
  };
}

const workflowIcons = {
  profile: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <path
        d="M23 7H48L60 19V56H23V7Z"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linejoin="round"
      />
      <path
        d="M48 7V19H60"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linejoin="round"
      />
      <circle
        cx="40"
        cy="25"
        r="5.4"
        stroke="currentColor"
        stroke-width="0.5"
      />
      <path
        d="M31 39C33.2 34.8 36.2 33 40 33C43.8 33 46.8 34.8 49 39H31Z"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linejoin="round"
      />
      <path
        d="M31 47H51"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linecap="round"
      />
      <path
        d="M31 50H43"
        stroke="currentColor"
        stroke-width="0.25"
        stroke-linecap="round"
      />
    </svg>
  `,

  period: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <path
        d="M19 16H61V55H19V16Z"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linejoin="round"
      />
      <path
        d="M19 27H61"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linecap="round"
      />
      <path
        d="M31 8V20"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M49 8V20"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
      <rect x="28" y="34" width="5.0" height="5.0" rx="1" fill="currentColor"/>
      <rect x="38" y="34" width="5.0" height="5.0" rx="1" fill="currentColor"/>
      <rect x="48" y="34" width="5.0" height="5.0" rx="1" fill="currentColor"/>
      <rect x="28" y="45" width="5.0" height="5.0" rx="1" fill="currentColor"/>
      <rect x="38" y="45" width="5.0" height="5.0" rx="1" fill="currentColor"/>
      <rect x="48" y="45" width="5.0" height="5.0" rx="1" fill="currentColor"/>
    </svg>
  `,

  flow: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <path
        d="M16 17H38"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-dasharray="5 7"
      />
      <path
        d="M48 17H64"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-dasharray="5 7"
      />
      <circle
        cx="40"
        cy="17"
        r="5.2"
        stroke="currentColor"
        stroke-width="0.5"
      />

      <path
        d="M16 32H28"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linecap="round"
      />
      <path
        d="M48 32H64"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-dasharray="5 7"
      />
      <circle
        cx="35"
        cy="32"
        r="5.2"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="0.5"
      />

      <path
        d="M16 47H35"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-dasharray="5 7"
      />
      <path
        d="M48 47H64"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linecap="round"
      />
    </svg>
  `,

  cleaning: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <path d="M21 13H59"/>
      <path d="M25 13L30 51H50L55 13"/>
      <path d="M32 25H48"/>
      <path d="M34 35H46"/>
      <path d="M36 45H44"/>
    </svg>
  `,

  structure: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <rect x="22" y="15" width="36" height="11"/>
      <rect x="22" y="29" width="36" height="11"/>
      <rect x="22" y="43" width="36" height="11"/>
      <path d="M32 20.5H48"/>
      <path d="M32 34.5H48"/>
      <path d="M32 48.5H48"/>
    </svg>
  `,

  deviation: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <path d="M20 45H60"/>
      <path d="M24 39V28"/>
      <path d="M36 39V20"/>
      <path d="M48 39V31"/>
      <path d="M60 39V16"/>
      <circle cx="60" cy="16" r="5"/>
      <circle cx="48" cy="31" r="3.4" fill="currentColor" stroke="currentColor"/>
    </svg>
  `,

  riskMetrics: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <path d="M18 46C21 28 30 18 40 18C50 18 59 28 62 46"/>
      <path d="M40 18V25"/>
      <path d="M27 25L32 30"/>
      <path d="M53 25L48 30"/>
      <path d="M40 39L53 29"/>
      <circle cx="40" cy="39" r="3.6" fill="currentColor" stroke="currentColor"/>
    </svg>
  `,

  aiAnalysis: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <circle cx="40" cy="32" r="18"/>
      <path d="M40 14V8"/>
      <path d="M40 56V50"/>
      <path d="M22 32H16"/>
      <path d="M64 32H58"/>
      <path d="M31 36C33 28 37 24 40 24C43 24 47 28 49 36"/>
      <path d="M34 36H46"/>
      <circle cx="40" cy="31" r="3.2" fill="currentColor" stroke="currentColor"/>
    </svg>
  `,

  decisionPatterns: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <circle cx="24" cy="22" r="5"/>
      <circle cx="40" cy="36" r="5" fill="currentColor" stroke="currentColor"/>
      <circle cx="56" cy="22" r="5"/>
      <path d="M28 25L36 33"/>
      <path d="M44 33L52 25"/>
      <path d="M24 43H56"/>
      <path d="M32 50H48"/>
    </svg>
  `,

  finalReport: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <path d="M24 14H56V52H24Z"/>
      <path d="M31 24H49"/>
      <path d="M31 33H49"/>
      <path d="M31 42H41"/>
      <circle cx="51" cy="44" r="4" fill="currentColor" stroke="currentColor"/>
      <path d="M54 47L60 53"/>
    </svg>
  `,

  processDynamics: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <path d="M18 46H62"/>
      <path d="M22 40L32 31L42 35L58 20"/>
      <circle cx="22" cy="40" r="3"/>
      <circle cx="32" cy="31" r="3"/>
      <circle cx="42" cy="35" r="3" fill="currentColor" stroke="currentColor"/>
      <circle cx="58" cy="20" r="3"/>
    </svg>
  `,

  focusAttention: `
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      <path d="M20 32C25 22 32 17 40 17C48 17 55 22 60 32C55 42 48 47 40 47C32 47 25 42 20 32Z"/>
      <circle cx="40" cy="32" r="10"/>
      <circle cx="40" cy="32" r="3.7" fill="currentColor" stroke="currentColor"/>
      <path d="M40 22V17" opacity="0.78"/>
      <path d="M40 47V42" opacity="0.78"/>
    </svg>
  `,

  default: `
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="2"/>
    </svg>
  `
};


function updateWorkflow(type) {
    const data = workflowData[type];
  
    if (!data || !auditWorkflow || !workflowItems) return;
  
    workflowTitle.textContent = data.title;
  
    auditWorkflow.classList.remove("is-visible");
  
    workflowItems.innerHTML = data.items
  .map((item) => {
    const label = typeof item === "string" ? item : item.label;
    const icon = typeof item === "string" ? "default" : item.icon;

    return `
      <div class="workflow-item">
        <span class="workflow-icon">${workflowIcons[icon] || workflowIcons.default}</span>
        <p>${label}</p>
      </div>
    `;
  })
  .join("");
  
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        auditWorkflow.classList.add("is-visible");
      });
    });
  }

if (auditSteps.length && auditWorkflow) {
  const firstAuditStep = auditSteps[0];
  const auditProcess = document.querySelector(".audit-process");
  const isMobilePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  function activateAuditStep(step) {
    auditSteps.forEach((item) => item.classList.remove("is-active"));
    step.classList.add("is-active");
    updateWorkflow(step.dataset.workflow);
  }

  activateAuditStep(firstAuditStep);

  auditSteps.forEach((step) => {
    step.addEventListener("mouseenter", () => {
      activateAuditStep(step);
    });

    step.addEventListener("click", () => {
      activateAuditStep(step);
    });
  });

  if (auditProcess) {
    auditProcess.addEventListener("mouseleave", () => {
      if (isMobilePointer) return;

      auditSteps.forEach((item) => item.classList.remove("is-active"));
      firstAuditStep.classList.add("is-active");
      auditWorkflow.classList.remove("is-visible");
    });
  }
}

// QUD Landing — Traders path flight animation

const tradersPathMap = document.querySelector(".traders-path-map");

let traderFlightAnimation = null;
let traderFlightStartTime = null;

function getTraderPathElements() {
  if (!tradersPathMap) return null;

  return {
    path: tradersPathMap.querySelector("#trader-flight-path"),
    plane: tradersPathMap.querySelector("#trader-flight-plane"),
    steps: tradersPathMap.querySelectorAll(".traders-path-step")
  };
}

function setActiveTraderPathStep(stepNumber) {
  const elements = getTraderPathElements();
  if (!elements || !elements.steps.length) return;

  elements.steps.forEach((step, index) => {
    step.classList.toggle("is-active", index === stepNumber - 1);
  });
}

function moveTraderPlane(progress) {
  const elements = getTraderPathElements();
  if (!elements || !elements.path || !elements.plane) return;

  const pathLength = elements.path.getTotalLength();
  const currentPoint = elements.path.getPointAtLength(pathLength * progress);
  const nextPoint = elements.path.getPointAtLength(
    pathLength * Math.min(progress + 0.01, 1)
  );

  const angle =
    Math.atan2(nextPoint.y - currentPoint.y, nextPoint.x - currentPoint.x) *
    180 /
    Math.PI;

  elements.plane.setAttribute(
    "transform",
    `translate(${currentPoint.x} ${currentPoint.y}) rotate(${angle})`
  );
}

function updateTraderStepByProgress(progress) {
  if (progress < 0.18) {
    setActiveTraderPathStep(1);
  } else if (progress < 0.46) {
    setActiveTraderPathStep(2);
  } else if (progress < 0.72) {
    setActiveTraderPathStep(3);
  } else {
    setActiveTraderPathStep(4);
  }
}

function animateTraderFlight(timestamp) {
  if (!traderFlightStartTime) {
    traderFlightStartTime = timestamp;
  }

  const duration = 4200;
  const rawProgress = (timestamp - traderFlightStartTime) / duration;
  const progress = rawProgress % 1;

  moveTraderPlane(progress);
  updateTraderStepByProgress(progress);

  traderFlightAnimation = requestAnimationFrame(animateTraderFlight);
}

function resetTraderFlight() {
  if (traderFlightAnimation) {
    cancelAnimationFrame(traderFlightAnimation);
  }

  traderFlightAnimation = null;
  traderFlightStartTime = null;

  moveTraderPlane(0);
  setActiveTraderPathStep(1);
}

if (tradersPathMap) {
  resetTraderFlight();

  tradersPathMap.addEventListener("pointerenter", () => {
    resetTraderFlight();
    traderFlightAnimation = requestAnimationFrame(animateTraderFlight);
  });

  tradersPathMap.addEventListener("pointerleave", () => {
    resetTraderFlight();
  });
}

// QUD Landing — Traders audit flow text

const tradersAuditFlowText = document.getElementById("traders-audit-flow-text");

let tradersAuditFlowTexts = [
  "Оставьте заявку и выберите формат наблюдения. QUD TDA подключается к торговому процессу как независимый модуль фиксации событий без вмешательства в сделки.",
  "Торгуете в привычном режиме. Система фиксирует сделки в заданный период по риск-параметрам и поведение стратегии по фактам.",
  "По итогам периода наблюдения получаете структурированный отчёт. Анализируете слабые зоны процесса и начинаете формировать проверяемую историю торговых решений."
];

if (isEnglishPage) {
  tradersAuditFlowTexts = [
    'Submit a request and select an observation format. QUD TDA connects to the trading process as an independent event-recording module without intervening in trades.',
    'Trade as usual. The system records trades during the defined period using risk parameters and the strategy’s actual behaviour.',
    'At the end of the observation period, you receive a structured report. You analyse weak areas of the process and begin building a verifiable history of trading decisions.'
  ];
}

let activeTradersAuditFlowIndex = 0;
let tradersAuditFlowTimer = null;
let isTradersAuditFlowPaused = false;

function rotateTradersAuditFlowText() {
  if (!tradersAuditFlowText || isTradersAuditFlowPaused) return;

  tradersAuditFlowText.classList.add("is-changing");

  setTimeout(() => {
    activeTradersAuditFlowIndex =
      (activeTradersAuditFlowIndex + 1) % tradersAuditFlowTexts.length;

    tradersAuditFlowText.textContent =
      tradersAuditFlowTexts[activeTradersAuditFlowIndex];

    tradersAuditFlowText.classList.remove("is-changing");
  }, 750);
}

function startTradersAuditFlowRotation() {
  if (tradersAuditFlowTimer) {
    clearInterval(tradersAuditFlowTimer);
  }

  tradersAuditFlowTimer = setInterval(rotateTradersAuditFlowText, 3500);
}

if (tradersAuditFlowText) {
  startTradersAuditFlowRotation();

  tradersAuditFlowText.addEventListener("pointerenter", () => {
    isTradersAuditFlowPaused = true;

    if (tradersAuditFlowTimer) {
      clearInterval(tradersAuditFlowTimer);
      tradersAuditFlowTimer = null;
    }

    tradersAuditFlowText.classList.remove("is-changing");
    tradersAuditFlowText.classList.add("is-paused");
  });

  tradersAuditFlowText.addEventListener("pointerleave", () => {
    isTradersAuditFlowPaused = false;

    tradersAuditFlowText.classList.remove("is-paused");

    tradersAuditFlowText.classList.add("is-changing");

    setTimeout(() => {
      tradersAuditFlowText.classList.remove("is-changing");
      startTradersAuditFlowRotation();
    }, 750);
  });
}

// QUD Landing — Investors process auto-rotation

const investorsProcessBlock = document.querySelector(".investors-process-inline");
const investorsProcessItems = document.querySelectorAll(".investors-process-inline .process-orbit-item");

let activeInvestorsProcessIndex = 0;
let investorsProcessTimer = null;

function setInvestorsProcessStep(index) {
  if (!investorsProcessItems.length) return;

  activeInvestorsProcessIndex = index;

  investorsProcessItems.forEach((item, itemIndex) => {
    item.classList.remove("is-active", "is-next", "is-prev", "is-back");

    if (itemIndex === index) {
      item.classList.add("is-active");
    } else if (itemIndex === (index + 1) % investorsProcessItems.length) {
      item.classList.add("is-next");
    } else if (itemIndex === (index - 1 + investorsProcessItems.length) % investorsProcessItems.length) {
      item.classList.add("is-prev");
    } else {
      item.classList.add("is-back");
    }
  });
}

function rotateInvestorsProcessStep() {
  if (!investorsProcessItems.length) return;

  const nextIndex = (activeInvestorsProcessIndex + 1) % investorsProcessItems.length;
  setInvestorsProcessStep(nextIndex);
}

function startInvestorsProcessRotation() {
  if (investorsProcessTimer) {
    clearInterval(investorsProcessTimer);
  }

  setInvestorsProcessStep(0);
  investorsProcessTimer = setInterval(rotateInvestorsProcessStep, 2500);
}

function stopInvestorsProcessRotation() {
  if (investorsProcessTimer) {
    clearInterval(investorsProcessTimer);
    investorsProcessTimer = null;
  }

  setInvestorsProcessStep(0);
}

if (investorsProcessBlock && investorsProcessItems.length) {
  setInvestorsProcessStep(0);

  investorsProcessBlock.addEventListener("pointerenter", () => {
    startInvestorsProcessRotation();
  });

  investorsProcessBlock.addEventListener("pointerleave", () => {
    stopInvestorsProcessRotation();
  });

  investorsProcessItems.forEach((item, index) => {
    item.addEventListener("focus", () => {
      setInvestorsProcessStep(index);
    });
  });
}

// QUD Landing — Capital trust text rotation

// QUD Landing — Capital trust text rotation

const capitalIconsText = document.querySelector(".capital-icons-text");
const capitalIconsLabel = document.getElementById("capital-icons-label");
const capitalIconsTitle = document.getElementById("capital-icons-title");
const capitalIconsDescription = document.getElementById("capital-icons-description");

let capitalIconsData = [
  {
    label: "01",
    title: "Проверка до доверия",
    description:
      "Владелец капитала получает структурированный отчёт по торговой стратегии или алгоритму до принятия решения о доверии капитала."
  },
  {
    label: "02",
    title: "Защитный контур",
    description:
      "Используя инфраструктуру, QUD помогает выстроить контроль риска и ограничения, не управляя средствами и не принимая инвестиционные решения за владельца капитала."
  },
  {
    label: "03",
    title: "Закрытое наблюдение",
    description:
      "Владелец капитала получает регулярную закрытую картину качества решений, дисциплины и динамики доверия к торговому процессу."
  }
];

if (isEnglishPage) {
  capitalIconsData = [
    { label: '01', title: 'Verification before trust', description: 'The capital owner receives a structured report on a trading strategy or algorithm before deciding whether to entrust capital.' },
    { label: '02', title: 'Protective framework', description: 'Using its infrastructure, QUD helps establish risk control and limits without managing funds or making investment decisions for the capital owner.' },
    { label: '03', title: 'Private observation', description: 'The capital owner receives a regular private view of decision quality, discipline and the dynamics of trust in the trading process.' }
  ];
}

let activeCapitalIconIndex = 0;
let capitalIconsTimer = null;
let isCapitalIconsPaused = false;
let capitalIconsChangeTimer = null;

function setCapitalIconText(index) {
  if (!capitalIconsLabel || !capitalIconsTitle || !capitalIconsDescription) return;

  const item = capitalIconsData[index];
  if (!item) return;

  activeCapitalIconIndex = index;
  capitalIconsLabel.textContent = item.label;
  capitalIconsTitle.textContent = item.title;
  capitalIconsDescription.textContent = item.description;
}

function rotateCapitalIconText() {
  if (!capitalIconsText || isCapitalIconsPaused) return;

  const nextIndex = (activeCapitalIconIndex + 1) % capitalIconsData.length;

  capitalIconsText.classList.add("is-changing");

  if (capitalIconsChangeTimer) {
    clearTimeout(capitalIconsChangeTimer);
  }

  capitalIconsChangeTimer = setTimeout(() => {
    setCapitalIconText(nextIndex);
    capitalIconsText.classList.remove("is-changing");
  }, 750);
}

function startCapitalIconsRotation() {
  if (capitalIconsTimer) {
    clearInterval(capitalIconsTimer);
  }

  capitalIconsTimer = setInterval(rotateCapitalIconText, 3000);
}

function stopCapitalIconsRotation() {
  if (capitalIconsTimer) {
    clearInterval(capitalIconsTimer);
    capitalIconsTimer = null;
  }

  if (capitalIconsChangeTimer) {
    clearTimeout(capitalIconsChangeTimer);
    capitalIconsChangeTimer = null;
  }
}

if (capitalIconsText && capitalIconsLabel && capitalIconsTitle && capitalIconsDescription) {
  setCapitalIconText(0);
  startCapitalIconsRotation();

  capitalIconsText.addEventListener("pointerenter", () => {
    isCapitalIconsPaused = true;
    stopCapitalIconsRotation();
    capitalIconsText.classList.remove("is-changing");
    capitalIconsText.classList.add("is-paused");
  });

  capitalIconsText.addEventListener("pointerleave", () => {
    isCapitalIconsPaused = false;
    capitalIconsText.classList.remove("is-paused");
    startCapitalIconsRotation();
  });
}

// QUD Contacts — dynamic message placeholder by selected contour
(() => {
  const roleInputs = document.querySelectorAll('.contacts-role-option input[name="role"]');
  const messageField = document.querySelector('.contacts-form textarea[name="message"]');

  if (!roleInputs.length || !messageField) return;

  const updateContactsMessagePlaceholder = () => {
    const selectedRole = document.querySelector('.contacts-role-option input[name="role"]:checked');
    const nextPlaceholder = selectedRole?.dataset?.messagePlaceholder;

    if (nextPlaceholder) {
      messageField.placeholder = nextPlaceholder;
    }
  };

  roleInputs.forEach((input) => {
    input.addEventListener('change', updateContactsMessagePlaceholder);
  });

  updateContactsMessagePlaceholder();
})();

// QUD Legal modal — legal information pages
(() => {
  const modal = document.getElementById('legal-modal');
  const modalTitle = document.getElementById('legal-modal-title');
  const modalText = document.getElementById('legal-modal-text');
  const legalLinks = document.querySelectorAll('[data-legal-modal]');
  const closeButtons = document.querySelectorAll('[data-legal-close]');

  if (!modal || !modalTitle || !modalText || !legalLinks.length) return;

  const legalContent = {
    privacy: {
      title: 'Политика конфиденциальности',
      text: 'QUD может получать данные, которые пользователь добровольно передаёт через форму, переписку или в процессе аудита: email, Telegram, выбранный формат взаимодействия, описание задачи, торговые отчёты, технические файлы, данные торгового процесса и материалы, необходимые для подготовки TDA-отчёта.\n\nЭти данные используются для связи с пользователем, проведения аудита, подготовки аналитических материалов, проверки качества отчётов и дальнейшего взаимодействия в рамках QUD.\n\nQUD не продаёт персональные данные. Данные не передаются третьим лицам, за исключением случаев, когда это необходимо для технической обработки, хранения, выполнения запрошенного взаимодействия или требуется применимым законодательством.\n\nПользователь может запросить уточнение, ограничение обработки или удаление своих данных, направив обращение на контактный email проекта.'
    },
    risk: {
      title: 'Раскрытие рисков',
      text: 'Торговля на финансовых рынках связана с риском потери капитала. Использование кредитного плеча, высокая волатильность, ошибки исполнения, рыночные гэпы и изменение условий торговли могут привести к частичной или полной потере средств.\n\nПрошлые результаты, торговая статистика, отчёты и данные аудита не гарантируют будущую доходность и не подтверждают отсутствие риска в будущем.\n\nМатериалы QUD не являются инвестиционной рекомендацией, торговым сигналом, предложением открыть или закрыть сделку, предложением инвестировать или гарантией результата.\n\nQUD фиксирует данные торгового процесса и формирует информационно-аналитические материалы. Любые торговые, инвестиционные и управленческие решения пользователь принимает самостоятельно.'
    },
    disclaimer: {
      title: 'Отказ от ответственности',
      text: 'QUD предоставляет информационно-аналитические материалы на основе зафиксированных торговых данных. QUD не является брокером, дилером, управляющей компанией, инвестиционным фондом, финансовым советником или поставщиком торговых сигналов.\n\nQUD не исполняет сделки, не управляет средствами пользователей, не принимает инвестиционные решения и не гарантирует доходность, сохранность капитала или достижение финансового результата.\n\nQUD не несёт ответственности за убытки, торговые решения, действия пользователя, действия брокеров, технические сбои торговых платформ, ошибки передачи данных, неполные или некорректно предоставленные материалы.\n\nКачество аналитических выводов зависит от полноты и корректности переданных данных. Формат отчётов, методология и условия взаимодействия могут изменяться по мере развития проекта.'
    },
    services: {
      title: 'Услуги и стоимость',
      html: `
        <div class="services-modal-content">
          <p class="services-modal-lead">QUD предоставляет цифровой аналитический аудит торгового процесса: фиксирует фактические события торговли, структурирует данные и формирует отчёт по риску, дисциплине и устойчивости торговых решений.</p>
          <p class="services-modal-note">QUD не вмешивается в сделки, не управляет счётом и не даёт торговые сигналы.</p>
    
          <section class="services-modal-section">
            <h3>TDA Trial Audit</h3>
            <div class="services-modal-badge">Бесплатно — 7 дней</div>
            <p><strong>Безопасный первый шаг в QUD-контуре.</strong> Первичная диагностика торгового процесса на фактических данных, а не только по итоговому результату.</p>
            <ul>
              <li>диагностический срез торгового процесса;</li>
              <li>понимание слабых зон в риске и дисциплине;</li>
              <li>фиксация фактических торговых событий;</li>
              <li>первичный TDA-отчёт по итогам наблюдения.</li>
            </ul>
            <p class="services-modal-small">Для полезного среза желательно совершить минимум 5 сделок за период наблюдения.</p>
          </section>
    
          <section class="services-modal-section">
            <h3>TDA Basic</h3>
            <div class="services-modal-badge">Ежемесячная подписка</div>
            <p>Регулярное наблюдение торгового процесса и еженедельный TDA-отчёт: риск, сопровождение позиций, дисциплина и динамика процесса во времени.</p>
    
            <div class="services-price-grid">
              <div><strong>1 месяц — $49</strong><span>первый полноценный цикл наблюдения</span></div>
              <div><strong>3 месяца — $129</strong><span>более чистая история торговли</span></div>
              <div><strong>6 месяцев — $239</strong><span>динамика устойчивости стратегии</span></div>
            </div>
    
            <ul>
              <li>подключение одного MT5-счёта;</li>
              <li>ежедневный сбор торговых данных;</li>
              <li>анализ риск-дисциплины;</li>
              <li>еженедельный TDA-отчёт;</li>
              <li>накопление истории торгового процесса.</li>
            </ul>
          </section>
    
          <section class="services-modal-section">
            <h3>Индивидуальный аудит стратегии для капитала</h3>
            <div class="services-modal-badge">Стоимость: по запросу</div>
            <p>Формат для владельцев капитала, партнёров и команд, которым важно увидеть стратегию глубже, чем по итоговой доходности.</p>
            <p>QUD выступает как предварительный слой проверки перед диалогом о сотрудничестве и помогает увидеть факты торгового процесса до момента доверия капитала.</p>
            <ul>
              <li>каким риском был получен результат;</li>
              <li>была ли заранее заданная защита капитала;</li>
              <li>что происходило с позицией после входа;</li>
              <li>как менялось поведение после убытков;</li>
              <li>где стратегия может быть уязвима для капитала.</li>
            </ul>
          </section>
    
          <section class="services-modal-section">
            <h3>Как QUD подключается к счёту</h3>
            <p>Для TDA Trial Audit демо MT5-счёт выдаётся QUD. Для TDA Basic подключение возможно к демо или реальному MT5-счёту трейдера либо к демо MT5-счёту, выданному QUD.</p>
            <p>Для подключения трейдер предоставляет сервер брокера, логин MT5 и investor password.</p>
            <p><strong>Investor password используется только для наблюдения и чтения данных.</strong></p>
            <ul>
              <li>QUD не может открывать или закрывать сделки;</li>
              <li>QUD не может изменять позиции или объём;</li>
              <li>QUD не может выводить средства;</li>
              <li>QUD не управляет счётом трейдера.</li>
            </ul>
          </section>
    
          <p class="services-modal-disclaimer">QUD не предоставляет инвестиционные рекомендации, торговые сигналы, брокерские услуги и управление активами. Оплата производится за цифровой аналитический аудит торгового процесса, сбор данных, обработку торговых событий и подготовку TDA-отчёта.</p>
        </div>
      `
    },
    partner: {
      title: 'Партнёрское взаимодействие',
      text: 'QUD открыт к сотрудничеству с участниками рынка, которые могут усилить инфраструктуру аудита торговых решений, анализа торгового процесса и формирования доверия между капиталом и стратегиями.\n\nВозможные направления партнёрства: брокерская и техническая инфраструктура, трейдерские сообщества, образовательные проекты, владельцы капитала, аналитические команды, юридическая поддержка, маркетинг и международное развитие проекта.\n\nПартнёрское взаимодействие с QUD не означает предоставление инвестиционных рекомендаций, управление средствами, передачу капитала, продажу торговых сигналов или гарантию доходности.\n\nЛюбое партнёрство рассматривается индивидуально и требует отдельного согласования условий, ролей, ответственности и формата взаимодействия.'
    },
    data_processing: {
      title: 'Условия обработки данных',
      text: 'QUD получает и обрабатывает только те данные, которые пользователь добровольно передаёт через форму, переписку или в процессе взаимодействия с проектом.\n\nДанные используются для связи с пользователем, обработки заявки, подготовки ответа, проведения аудита торгового процесса и дальнейшего взаимодействия в рамках QUD.\n\nОтправляя заявку, пользователь подтверждает, что передаёт данные добровольно и понимает цель их использования. Пользователь может запросить уточнение или удаление своих данных через контактный email проекта.\n\nQUD не продаёт переданные данные и не использует их для целей, не связанных с обработкой заявки, аудитом или коммуникацией с пользователем.'
    }
  };

  const englishLegalContent = {
    privacy: { title: 'Privacy Policy', text: 'QUD may receive data that a user voluntarily provides through the form, correspondence or during an audit: email, Telegram, selected interaction format, task description, trading reports, technical files, trading-process data and materials required to prepare a TDA report.\n\nThis data is used to communicate with the user, conduct an audit, prepare analytical materials, verify report quality and continue interaction within QUD.\n\nQUD does not sell personal data. Data is not shared with third parties except where required for technical processing, storage, the requested interaction or applicable law.\n\nA user may request clarification, restriction of processing or deletion of their data by contacting the project email.' },
    risk: { title: 'Risk Disclosure', text: 'Trading in financial markets involves a risk of capital loss. Leverage, high volatility, execution errors, market gaps and changes in trading conditions may result in a partial or total loss of funds.\n\nPast results, trading statistics, reports and audit data do not guarantee future returns or confirm the absence of future risk.\n\nQUD materials are not investment advice, a trading signal, an offer to open or close a trade, an offer to invest or a guarantee of any outcome.\n\nQUD records trading-process data and prepares informational and analytical materials. The user makes all trading, investment and management decisions independently.' },
    disclaimer: { title: 'Disclaimer', text: 'QUD provides informational and analytical materials based on recorded trading data. QUD is not a broker, dealer, management company, investment fund, financial adviser or provider of trading signals.\n\nQUD does not execute trades, manage user funds, make investment decisions or guarantee returns, capital preservation or the achievement of a financial result.\n\nQUD is not liable for losses, trading decisions, user actions, broker actions, trading-platform technical failures, data-transfer errors or incomplete or inaccurate materials supplied.\n\nThe quality of analytical conclusions depends on the completeness and accuracy of the data provided. Report formats, methodology and terms of interaction may change as the project develops.' },
    services: { title: 'Services & Pricing', html: `<div class="services-modal-content"><p class="services-modal-lead">QUD provides a digital analytical audit of the trading process: it records actual trading events, structures data and prepares a report on risk, discipline and the stability of trading decisions.</p><p class="services-modal-note">QUD does not intervene in trades, manage the account or provide trading signals.</p><section class="services-modal-section"><h3>TDA Trial Audit</h3><div class="services-modal-badge">No charge — 7 days</div><p><strong>A safe first step in the QUD framework.</strong> Initial diagnostics of the trading process based on actual data, not solely on the final result.</p><ul><li>diagnostic view of the trading process;</li><li>understanding of weak areas in risk and discipline;</li><li>recording of actual trading events;</li><li>an initial TDA report after observation.</li></ul><p class="services-modal-small">For a useful view, it is advisable to make at least 5 trades during the observation period.</p></section><section class="services-modal-section"><h3>TDA Basic</h3><div class="services-modal-badge">Monthly subscription</div><p>Regular observation of the trading process and a weekly TDA report: risk, position management, discipline and process dynamics over time.</p><div class="services-price-grid"><div><strong>1 month — $49</strong><span>the first full observation cycle</span></div><div><strong>3 months — $129</strong><span>a cleaner trading history</span></div><div><strong>6 months — $239</strong><span>strategy stability dynamics</span></div></div><ul><li>connection of one MT5 account;</li><li>daily collection of trading data;</li><li>risk-discipline analysis;</li><li>weekly TDA report;</li><li>accumulation of trading-process history.</li></ul></section><section class="services-modal-section"><h3>Individual strategy audit for capital</h3><div class="services-modal-badge">Price on request</div><p>A format for capital owners, partners and teams that need to see a strategy more deeply than through final returns.</p><p>QUD acts as a preliminary verification layer before a discussion of cooperation and helps reveal facts of the trading process before capital is entrusted.</p><ul><li>what risk produced the result;</li><li>whether capital protection was defined in advance;</li><li>what happened to the position after entry;</li><li>how behaviour changed after losses;</li><li>where the strategy may be vulnerable for capital.</li></ul></section><section class="services-modal-section"><h3>How QUD connects to an account</h3><p>For TDA Trial Audit, QUD provides a demo MT5 account. For TDA Basic, a trader’s demo or live MT5 account may be connected, or a QUD-issued demo MT5 account may be used.</p><p>For connection, the trader provides the broker server, MT5 login and investor password.</p><p><strong>The investor password is used only for observation and read-only data access.</strong></p><ul><li>QUD cannot open or close trades;</li><li>QUD cannot change positions or volume;</li><li>QUD cannot withdraw funds;</li><li>QUD does not manage the trader’s account.</li></ul></section><p class="services-modal-disclaimer">QUD does not provide investment advice, trading signals, brokerage services or asset management. Payment is made for a digital analytical audit of the trading process, data collection, processing of trading events and preparation of a TDA report.</p></div>` },
    partner: { title: 'Partnership', text: 'QUD is open to cooperation with market participants who can strengthen the infrastructure for auditing trading decisions, analysing the trading process and building trust between capital and strategies.\n\nPotential partnership directions include brokerage and technical infrastructure, trader communities, educational projects, capital owners, analytical teams, legal support, marketing and international project development.\n\nPartnership with QUD does not mean the provision of investment advice, fund management, capital transfer, sale of trading signals or a guarantee of returns.\n\nEach partnership is considered individually and requires separate agreement on terms, roles, responsibilities and the format of interaction.' },
    data_processing: { title: 'Data Processing Terms', text: 'QUD receives and processes only data that the user voluntarily provides through the form, correspondence or interaction with the project.\n\nThe data is used to communicate with the user, process the request, prepare a response, conduct an audit of the trading process and continue interaction within QUD.\n\nBy submitting a request, the user confirms that they provide data voluntarily and understand the purpose of its use. The user may request clarification or deletion of their data through the project email.\n\nQUD does not sell submitted data or use it for purposes unrelated to request processing, auditing or communication with the user.' }
  };

  const openLegalModal = (type) => {
    const content = (isEnglishPage ? englishLegalContent : legalContent)[type];

    if (!content) return;

    modalTitle.textContent = content.title;

    if (content.html) {
      modalText.innerHTML = content.html;
      modalText.classList.add('is-structured');
    } else {
      modalText.textContent = content.text;
      modalText.classList.remove('is-structured');
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-legal-modal-open');
  };

  const closeLegalModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-legal-modal-open');
  };

  legalLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const modalType = link.getAttribute('data-legal-modal');
      openLegalModal(modalType);
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', closeLegalModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeLegalModal();
    }
  });
})();

// QUD Contacts — form validation and future lead submission
(() => {
  const form = document.querySelector('.contacts-form');
  if (!form) return;

  const emailInput = form.querySelector('input[name="email"]');
  const telegramInput = form.querySelector('input[name="telegram"]');
  const messageInput = form.querySelector('textarea[name="message"]');
  const referralCodeInput = form.querySelector(
    'input[name="referral_code"]'
  );
  const consentInput = form.querySelector('input[name="consent"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const formMessages = isEnglishPage ? {
    email: 'Enter your email so we can respond to your request.',
    message: 'Briefly describe your request before submitting.',
    consent: 'Provide consent to data processing to submit your request.',
    prepared: 'The request has been checked. Submission to the database will be enabled after Google Apps Script is configured.',
    sending: 'Sending your request...',
    success: 'Request sent. We have received your message and are preparing a response.',
    error: 'Unable to send the request. Please contact the project by email.'
  } : {
    email: 'Укажите email, чтобы мы могли ответить на заявку.',
    message: 'Коротко опишите запрос перед отправкой заявки.',
    consent: 'Поставьте согласие на обработку данных, чтобы отправить заявку.',
    prepared: 'Заявка проверена. Подключение отправки в базу будет активировано после настройки Google Apps Script.',
    sending: 'Отправляем заявку...',
    success: 'Заявка отправлена. Мы получили ваше сообщение, уже готовим ответ.',
    error: 'Не удалось отправить заявку. Напишите нам на контактный email проекта.'
  };

  const QUD_LEADS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxW3MR6BZBOBQFngHgLcLakLc3E-P8RKQoedeNOnB_RsaL6FjjvNNTXtMYY_vzvynkk/exec';

  const status = document.createElement('p');
  status.className = 'contacts-form-status';
  status.setAttribute('aria-live', 'polite');
  form.appendChild(status);

  const setStatus = (message, type = 'info') => {
    status.textContent = message;
    status.dataset.status = type;
  };

  const getSelectedRole = () => {
    const selectedRole = form.querySelector('input[name="role"]:checked');
    return selectedRole ? selectedRole.value : '';
  };

  const validateContactsForm = () => {
    const email = emailInput?.value.trim() || '';
    const message = messageInput?.value.trim() || '';
    const consent = Boolean(consentInput?.checked);

    if (!email) {
      setStatus(formMessages.email, 'error');
      emailInput?.focus();
      return false;
    }

    if (!message && !form.classList.contains('qud-contact-form')) {
      setStatus(formMessages.message, 'error');
      messageInput?.focus();
      return false;
    }

    if (!consent) {
      setStatus(formMessages.consent, 'error');
      consentInput?.focus();
      return false;
    }

    return true;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!validateContactsForm()) return;

    const role = getSelectedRole();
    const payload = {
      role,
      email: emailInput.value.trim(),
      telegram: telegramInput?.value.trim() || '',
      message: messageInput.value.trim(),
      consent: consentInput.checked,
      source: 'landing',
      entry_point: 'main_landing',
      lead_intent: role === 'strategy_owner' ? 'tda_trial' : ''
    };

    if (!QUD_LEADS_ENDPOINT) {
      console.info('QUD lead payload prepared:', payload);
      setStatus(formMessages.prepared, 'info');
      return;
    }

    try {
      submitButton?.setAttribute('disabled', 'disabled');
      setStatus(formMessages.sending, 'info');

      const response = await fetch(QUD_LEADS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Lead submission failed');
      }

      form.reset();
      setStatus(formMessages.success, 'success');
    } catch (error) {
      console.error(error);
      setStatus(formMessages.error, 'error');
    } finally {
      submitButton?.removeAttribute('disabled');
    }
  });
})();
