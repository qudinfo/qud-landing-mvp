// QUD Landing — entry point and referral code payload support

(() => {
  const mobileStyles = document.createElement('link');

  mobileStyles.rel = 'stylesheet';
  mobileStyles.href = 'mobile.css';
  mobileStyles.media = '(max-width: 760px)';

  document.head.appendChild(mobileStyles);

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
