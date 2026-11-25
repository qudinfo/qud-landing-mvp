(() => {
 const isEnglishPage = false;
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

  document.querySelectorAll('.language-link,.mobile-language-link').forEach(link => {
    link.addEventListener('click', () => {
      try { localStorage.setItem('qud_language', 'en'); } catch {}
    });
  });
})();
