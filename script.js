// QUD Landing — entry point and referral code payload support

(() => {
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
        ? 'Закрыть меню'
        : 'Открыть меню'
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

  const normalizeReferralCode = (value) =>
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

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
