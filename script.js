// QUD Landing — interactive sections and lead form logic

// QUD Landing — Audit cards slider

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

const workflowData = {
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

const tradersAuditFlowTexts = [
  "Оставьте заявку и выберите формат наблюдения. QUD TDA подключается к торговому процессу как независимый модуль фиксации событий без вмешательства в сделки.",
  "Торгуете в привычном режиме. Система фиксирует сделки в заданный период по риск-параметрам и поведение стратегии по фактам.",
  "По итогам периода наблюдения получаете структурированный отчёт. Анализируете слабые зоны процесса и начинаете формировать проверяемую историю торговых решений."
];

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

const capitalIconsData = [
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

  const openLegalModal = (type) => {
    const content = legalContent[type] || legalContent.disclaimer;

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
      openLegalModal(link.dataset.legalModal);
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
  const consentInput = form.querySelector('input[name="consent"]');
  const submitButton = form.querySelector('button[type="submit"]');

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
      setStatus('Укажите email, чтобы мы могли ответить на заявку.', 'error');
      emailInput?.focus();
      return false;
    }

    if (!message) {
      setStatus('Коротко опишите запрос перед отправкой заявки.', 'error');
      messageInput?.focus();
      return false;
    }

    if (!consent) {
      setStatus('Поставьте согласие на обработку данных, чтобы отправить заявку.', 'error');
      consentInput?.focus();
      return false;
    }

    return true;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!validateContactsForm()) return;

    const payload = {
      role: getSelectedRole(),
      email: emailInput.value.trim(),
      telegram: telegramInput?.value.trim() || '',
      message: messageInput.value.trim(),
      consent: consentInput.checked,
      source: 'landing'
    };

    if (!QUD_LEADS_ENDPOINT) {
      console.info('QUD lead payload prepared:', payload);
      setStatus('Заявка проверена. Подключение отправки в базу будет активировано после настройки Google Apps Script.', 'info');
      return;
    }

    try {
      submitButton?.setAttribute('disabled', 'disabled');
      setStatus('Отправляем заявку...', 'info');

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
      setStatus('Заявка отправлена. Мы получили ваше сообщение, уже готовим ответ.', 'success');
    } catch (error) {
      console.error(error);
      setStatus('Не удалось отправить заявку. Напишите нам на контактный email проекта.', 'error');
    } finally {
      submitButton?.removeAttribute('disabled');
    }
  });
})();