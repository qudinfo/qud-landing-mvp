// QUD Landing — entry point and referral code payload support

(() => {
  const LANGUAGE_STORAGE_KEY = 'qud_language';
  const isEnglishPage = document.documentElement.lang === 'en';

  const getSavedLanguage = () => {
    try {
      const language = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return language === 'ru' || language === 'en' ? language : '';
    } catch (error) {
      return '';
    }
  };

  const getBrowserLanguage = () => {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];
    return String(languages[0] || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  };

  const getLanguageUrl = (language) => {
    const url = new URL(window.location.href);
    url.pathname = language === 'en' ? '/' : '/ru/';
    return url.href;
  };

  document.querySelectorAll('.language-link, .mobile-language-link').forEach((link) => {
    link.href = getLanguageUrl(isEnglishPage ? 'ru' : 'en');
    link.addEventListener('click', () => {
      try {
        window.localStorage.setItem(
          LANGUAGE_STORAGE_KEY,
          isEnglishPage ? 'ru' : 'en'
        );
      } catch (error) {
        // Language selection still works when browser storage is unavailable.
      }
    });
  });

  if (isEnglishPage) {
    const englishText = new Map([
      ['Audit', 'Audit'], ['For traders', 'For traders'], ['Capital', 'Capital'], ['About QUD', 'About QUD'], ['Contacts', 'Contacts'],
      ['QUD Trade Decision Audit', 'QUD Trade Decision Audit'],
      ['Architecture QUD Trade Decision Audit', 'QUD Trade Decision Audit architecture'],
      ['The QUD system connects to the trading process as an independent observation module: it records actual trading events without intervening in the trading process.', 'The QUD system connects to the trading process as an independent observation module: it records actual trading events without intervening in the trading process.'],
      ['1. Данные', '1. Data'], ['2. Обработка', '2. Processing'], ['3. Аналитика', '3. Analytics'], ['4. Результат', '4. Result'],
      ['Настройка профиля аудита и запуск автоматизированного сбора торговых событий в заданный период.', 'Setting up the audit profile and launching automated collection of trading events for a defined period.'],
      ['Собранные события приводятся к единой структуре: риск-параметры и изменения позиций связываются в последовательность торговых действий.', 'Collected events are brought into a unified structure: risk parameters and position changes are linked into a sequence of trading actions.'],
      ['Система рассчитывает риск-метрики на основе обработанных данных, AI используется как дополнительный аналитический слой для выявления связей, слабых зон и повторяющихся паттернов.', 'The system calculates risk metrics from processed data. AI is used as an additional analytical layer to identify relationships, weak areas and recurring patterns.'],
      ['Итогом аудита становится структурированный отчёт с общей динамикой торгового процесса, ключевыми отклонениями, устойчивыми паттернами и точками контроля для дальнейшего наблюдения и уровнем доверия.', 'The audit results in a structured report on the overall dynamics of the trading process, key deviations, stable patterns, control points for further observation and the level of trust.'],
      ['Рабочий процесс этапа', 'Stage workflow'], ['Данные', 'Data'], ['Профиль аудита', 'Audit profile'], ['Период наблюдения', 'Observation period'], ['Контроль событий', 'Event control'],
      ['Интерактивные карточки отчётов', 'Interactive report cards'], ['Анализ поведения', 'Behaviour analysis'], ['спокойно', 'calm'], ['напряжение', 'tension'], ['стресс', 'stress'], ['снижение', 'reduction'], ['стресс-фаза', 'stress phase'], ['контроль', 'control'], ['отрезков', 'periods'],
      ['Смена поведенческого режима: от спокойного исполнения к стрессовой фазе и последующему снижению нагрузки.', 'A shift in behavioural mode: from calm execution to a stress phase and subsequent reduction in load.'],
      ['Риск-профиль', 'Risk profile'], ['стабильная зона', 'stable zone'], ['скачок риска', 'risk spike'], ['средний риск', 'average risk'], ['максимум', 'maximum'], ['скачок', 'spike'],
      ['Динамика риска от сделки к сделке и выявление резких скачков, которые ухудшают доверие к торговому поведению.', 'Risk dynamics from trade to trade and identification of sharp spikes that undermine trust in trading behaviour.'],
      ['Отклонение от плана', 'Plan deviation'], ['целевой план', 'target plan'], ['выход', 'breach'], ['внутри допуска', 'within tolerance'], ['среднее откл.', 'average deviation'],
      ['Допустимый коридор поведения сделки: большинство действий остаётся внутри плана, но отдельный выход за границу требует внимания.', 'An acceptable trade-behaviour range: most actions remain within the plan, but an individual breach requires attention.'],
      ['Предыдущая карточка', 'Previous card'], ['Листайте отчёты', 'Browse reports'], ['Следующая карточка', 'Next card'], ['Почему данным можно доверять?', 'Why can the data be trusted?'],
      ['Аудит формирует выводы не на субъективной оценке, а на основе зафиксированных событий в процессе торговли. Такой подход позволяет изучить последовательность полученного итогового результата.', 'The audit draws conclusions not from subjective assessment, but from recorded events in the trading process. This approach makes it possible to examine the sequence behind the final result.'],
      ['Трейдерам', 'For traders'], ['Качество решений, подтверждённое данными', 'Decision quality confirmed by data'],
      ['Даже рабочая торговая стратегия может терять устойчивость: меняется рынок, растёт отклонение от правил, снижается повторяемость сильных сделок.', 'Even a working trading strategy can lose stability: the market changes, deviations from rules increase and the repeatability of strong trades declines.'],
      ['Проверяете, за счёт чего стратегия даёт результат.', 'You verify what drives the strategy’s result.'], ['Находите, где процесс начинает терять качество.', 'You identify where the process begins to lose quality.'], ['Изучить условия', 'View terms'],
      ['Диагностика', 'Diagnostics'], ['Первичная фиксация торговых событий и базовая картина риск-поведения.', 'Initial recording of trading events and a baseline picture of risk behaviour.'],
      ['Трейдер накапливает проверяемую историю дисциплины и стабильности.', 'The trader builds a verifiable history of discipline and stability.'], ['Рейтинг', 'Rating'], ['Профиль формируется на основе риска, решений и повторяемости поведения.', 'The profile is formed from risk, decisions and behavioural repeatability.'], ['QUD контур', 'QUD framework'], ['История доверия открывает путь к следующим уровням и возможностям QUD.', 'The trust history opens the way to the next QUD levels and opportunities.'],
      ['Результаты аудита QUD', 'QUD audit outcomes'], ['расчёт риск-дисциплины и история доверия капитала', 'risk-discipline calculation and capital trust history'], ['Единый стандарт', 'Unified standard'], ['накопленные данные позволяют вести сравнительный анализ', 'accumulated data enables comparative analysis'], ['Понимание риска', 'Risk understanding'], ['поиск и анализ слабых зон в дисциплине и исполнении сетапов', 'identification and analysis of weak areas in discipline and setup execution'], ['Уверенность', 'Confidence'], ['усиление регламента стратегии на основе получаемых данных', 'strengthening the strategy framework based on the data received'],
      ['Начните 7-дневный TDA Trial Audit', 'Start a 7-day TDA Trial Audit'], ['и получите свой первый диагностический срез торгового процесса.', 'and receive your first diagnostic view of the trading process.'], ['Без оплаты', 'No charge'], ['Быстрый старт', 'Quick start'], ['Ясные выводы', 'Clear conclusions'],
      ['Владельцам капитала', 'For capital owners'], ['Инвестируйте в решения, а не в обещания', 'Allocate capital to decisions, not promises'],
      ['QUD показывает независимую предварительную проверку, помогает снизить информационную асимметрию, сравнить торговые процессы по единым критериям и принимать решение не только на основе заявленной доходности.', 'QUD provides independent preliminary verification, helps reduce information asymmetry, compare trading processes using consistent criteria and make a decision not only on the basis of stated returns.'],
      ['Контур доверия капитала', 'Capital trust framework'], ['Поиск актива', 'Asset search'], ['Вы рассматриваете торговую стратегию или алгоритм как потенциальный актив.', 'You consider a trading strategy or algorithm as a potential asset.'], ['Проверка в QUD', 'QUD verification'], ['QUD фиксирует риск-поведение и рассчитывает показатели дисциплины и устойчивости.', 'QUD records risk behaviour and calculates discipline and stability metrics.'], ['Решение капитала', 'Capital decision'], ['Вы принимаете решение на основе данных, а не только заявленной доходности.', 'You make a decision based on data, not only on stated returns.'], ['Наблюдение', 'Observation'], ['QUD помогает отслеживать качество процесса после подключения капитала.', 'QUD helps monitor process quality after capital is allocated.'],
      ['Пример профиля торговой стратегии', 'Example trading strategy profile'], ['Профиль торгового процесса по ключевым риск-факторам', 'Trading process profile across key risk factors'], ['Средний уровень доверия', 'Medium trust level'], ['Риск-дисциплина', 'Risk discipline'], ['Поведение в просадке', 'Behaviour in drawdown'], ['Качество исполнения', 'Execution quality'], ['Стабильность во времени', 'Stability over time'], ['Защита капитала', 'Capital protection'], ['Повторяемость результата', 'Result repeatability'], ['Просадка макс.', 'Max drawdown'], ['Длительность просадки', 'Drawdown duration'], ['34 дня', '34 days'], ['Нарушения риска', 'Risk breaches'], ['Сделки без SL', 'Trades without SL'],
      ['Как капитал связывается с трейдером', 'How capital connects with a trader'], ['QUD не управляет средствами и не принимает инвестиционные решения за владельца капитала. Наша роль — быть независимым слоем между капиталом и торговым процессом: проверять качество решений, контролировать риск-поведение и давать владельцу капитала закрытую картину происходящего.', 'QUD does not manage funds or make investment decisions for the capital owner. Our role is to be an independent layer between capital and the trading process: verify decision quality, monitor risk behaviour and provide the capital owner with a private view of what is happening.'],
      ['Капитал. Стратегии. Доверие.', 'Capital. Strategies. Trust.'], ['О QUD', 'About QUD'], ['Запросить аудит', 'Request an audit'], ['Стратегия', 'Strategy'], ['Торговая история и факты процесса', 'Trading history and process facts'], ['Обработка данных', 'Data processing'], ['Уровень доверия и принятие решения', 'Trust level and decision-making'], ['Контроль и защитная среда', 'Control and protective environment'], ['Независимость данных и отсутствие конфликта интересов', 'Data independence and absence of conflicts of interest'], ['Понятные критерии и проверяемая логика анализа', 'Clear criteria and verifiable analytical logic'], ['Конфиденциальность данных и защита торговой истории', 'Data confidentiality and protection of trading history'], ['Контроль рисков до принятия инвестиционного решения', 'Risk control before making an investment decision'], ['Как работает QUD', 'How QUD works'], ['Фиксация торговли', 'Trading event recording'], ['TDA подключается к торговому процессу и фиксирует реальные события стратегии.', 'TDA connects to the trading process and records actual strategy events.'], ['Факты процесса', 'Process facts'], ['QUD собирает историю сделок, риск, изменения позиций и поведение стратегии.', 'QUD collects trade history, risk, position changes and strategy behaviour.'], ['Профиль доверия', 'Trust profile'], ['На основе данных формируется профиль устойчивости и качества процесса.', 'A profile of process stability and quality is formed from the data.'], ['Капитал видит проверяемую перспективу стратегии и принимает решение на данных.', 'Capital sees the verifiable outlook of the strategy and makes a data-based decision.'], ['История стратегии регулярно обновляется и показывает динамику её поведения.', 'The strategy history is regularly updated and shows the dynamics of its behaviour.'], ['Что вы получаете с QUD', 'What you receive with QUD'], ['Торговая стратегия становится понятным активом для капитала', 'A trading strategy becomes an understandable asset for capital'], ['Капитал быстрее понимает, можно ли рассматривать сотрудничество', 'Capital understands sooner whether cooperation can be considered'], ['Риск становится видимым до допуска стратегии к капиталу', 'Risk becomes visible before a strategy is admitted to capital'], ['Каждый аудит усиливает историю доверия к стратегии', 'Each audit strengthens the strategy’s trust history'], ['QUD — ваш независимый партнёр', 'QUD — your independent partner'], ['на пути стратегии к доверию капитала', 'on the path from strategy to capital trust'],
      ['Заполните данные', 'Complete your details'], ['Кто вы?', 'Who are you?'], ['Владелец стратегии', 'Strategy owner'], ['Владелец капитала', 'Capital owner'], ['Партнёр', 'Partner'], ['Ваш email', 'Your email'], ['Коротко опишите задачу', 'Briefly describe your request'], ['Referral Code — при наличии', 'Referral code — if available'], ['Я согласен на обработку предоставленных данных и принимаю', 'I consent to the processing of the data provided and accept the'], ['условия обработки данных.', 'data processing terms.'], ['Отправить заявку', 'Send request'], ['Ваши данные защищены и не передаются третьим лицам.', 'Your data is protected and is not shared with third parties.'], ['Разделы', 'Sections'], ['Информация', 'Information'], ['Политика конфиденциальности', 'Privacy Policy'], ['Раскрытие рисков', 'Risk Disclosure'], ['Отказ от ответственности', 'Disclaimer'], ['Услуги и стоимость', 'Services & Pricing'], ['Партнёрское взаимодействие', 'Partnership'], ['Закрыть', 'Close'], ['Юридическая информация', 'Legal information'], ['Этот раздел находится в подготовке. Полная версия будет добавлена после финального согласования регламентов QUD.', 'This section is being prepared. The full version will be added after final approval of QUD policies.']
    ]);

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      const raw = node.nodeValue;
      const key = raw.replace(/\s+/g, ' ').trim();
      const translation = englishText.get(key);
      if (!translation) return;
      const prefix = /^\s/.test(raw) ? ' ' : '';
      const suffix = /\s$/.test(raw) ? ' ' : '';
      node.nodeValue = `${prefix}${translation}${suffix}`;
    });
  }

  const mobileStyles = document.createElement('link');

  mobileStyles.rel = 'stylesheet';
  mobileStyles.href = 'mobile.css';
  mobileStyles.media = '(max-width: 760px)';

  document.head.appendChild(mobileStyles);

  const siteHeader =
    document.querySelector('.site-header');

  const mainNavigation =
    document.querySelector('#main-navigation');

  const mobileMenuToggle =
    document.querySelector('.mobile-menu-toggle');

  const mobileMenuQuery =
    window.matchMedia('(max-width: 980px)');

  const setMobileMenuState = (
    isOpen,
    { restoreFocus = false } = {}
  ) => {
    if (
      !siteHeader ||
      !mainNavigation ||
      !mobileMenuToggle
    ) return;

    const shouldOpen =
      isOpen && mobileMenuQuery.matches;

    siteHeader.classList.toggle(
      'is-menu-open',
      shouldOpen
    );

    document.body.classList.toggle(
      'mobile-menu-open',
      shouldOpen
    );

    mobileMenuToggle.setAttribute(
      'aria-expanded',
      String(shouldOpen)
    );

    mobileMenuToggle.setAttribute(
      'aria-label',
      shouldOpen
        ? (isEnglishPage ? 'Close menu' : 'Закрыть меню')
        : (isEnglishPage ? 'Open menu' : 'Открыть меню')
    );

    if (
      !shouldOpen &&
      mobileMenuQuery.matches &&
      mainNavigation.contains(
        document.activeElement
      )
    ) {
      mobileMenuToggle.focus({
        preventScroll: true
      });
    }

    if (mobileMenuQuery.matches) {
      mainNavigation.setAttribute(
        'aria-hidden',
        String(!shouldOpen)
      );

      mainNavigation.toggleAttribute(
        'inert',
        !shouldOpen
      );
    } else {
      mainNavigation.removeAttribute(
        'aria-hidden'
      );

      mainNavigation.removeAttribute(
        'inert'
      );
    }

    if (shouldOpen) {
      mainNavigation
        .querySelector('a')
        ?.focus();
    } else if (restoreFocus) {
      mobileMenuToggle.focus({
        preventScroll: true
      });
    }
  };

  if (
    siteHeader &&
    mainNavigation &&
    mobileMenuToggle
  ) {
    setMobileMenuState(false);

    mobileMenuToggle.addEventListener(
      'click',
      () => {
        const isOpen =
          mobileMenuToggle.getAttribute(
            'aria-expanded'
          ) === 'true';

        setMobileMenuState(!isOpen);
      }
    );

    mainNavigation
      .querySelectorAll('a')
      .forEach((link) => {
        link.addEventListener(
          'click',
          () => setMobileMenuState(false)
        );
      });

    document
      .querySelectorAll(
        '.logo, .header-button'
      )
      .forEach((link) => {
        link.addEventListener(
          'click',
          () => setMobileMenuState(false)
        );
      });

    document.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Escape' &&
          siteHeader.classList.contains(
            'is-menu-open'
          )
        ) {
          setMobileMenuState(
            false,
            { restoreFocus: true }
          );
        }
      }
    );

    mobileMenuQuery.addEventListener(
      'change',
      () => setMobileMenuState(false)
    );
  }

  const REFERRAL_INPUT_SELECTOR =
    '.contacts-form input[name="referral_code"]';

  const QUD_LEADS_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbxW3MR6BZBOBQFngHgLcLakLc3E-P8RKQoedeNOnB_RsaL6FjjvNNTXtMYY_vzvynkk/exec';

  const PILOT_REFERRAL_STORAGE_KEY =
    'qudPilotReferralCode';

  const normalizeReferralCode = (value) =>
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

  const isPilotReferralCode = (value) =>
    /^QUDPTP-\d{5}$/.test(value);

  const getStoredPilotReferralCode = () => {
    try {
      const storedCode = normalizeReferralCode(
        window.localStorage.getItem(
          PILOT_REFERRAL_STORAGE_KEY
        )
      );

      return isPilotReferralCode(storedCode)
        ? storedCode
        : '';
    } catch (error) {
      return '';
    }
  };

  const prefillPilotReferralCode = () => {
    const referralInput = document.querySelector(
      REFERRAL_INPUT_SELECTOR
    );

    if (!referralInput || referralInput.value) return;

    const storedCode = getStoredPilotReferralCode();

    if (storedCode) referralInput.value = storedCode;
  };

  prefillPilotReferralCode();

  document.addEventListener('input', (event) => {
    const input = event.target.closest?.(
      REFERRAL_INPUT_SELECTOR
    );

    if (!input) return;

    input.value = normalizeReferralCode(
      input.value
    );
  });

  const originalFetch = window.fetch.bind(window);

  window.fetch = (resource, options) => {
    const requestUrl =
      typeof resource === 'string'
        ? resource
        : String(resource?.url || '');

    let nextOptions = options;

    if (
      requestUrl === QUD_LEADS_ENDPOINT &&
      options &&
      typeof options.body === 'string'
    ) {
      try {
        const payload = JSON.parse(options.body);

        const referralInput =
          document.querySelector(
            REFERRAL_INPUT_SELECTOR
          );

        payload.referral_code =
          normalizeReferralCode(
            referralInput?.value ||
            payload.referral_code ||
            ''
          );

        nextOptions = {
          ...options,
          body: JSON.stringify(payload)
        };
      } catch (error) {
        console.warn(
          'QUD referral code was not added to payload:',
          error
        );
      }
    }

    return originalFetch(resource, nextOptions);
  };

  const coreScript =
    document.createElement('script');

  coreScript.src = '/script.core.js';
  coreScript.async = false;

  document.head.appendChild(coreScript);
})();
