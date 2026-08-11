(() => {
  const cookieName = 'barbara-language';
  const storageKey = 'barbara-language';
  const cookieMaxAge = 60 * 60 * 24 * 365;
  const languagePaths = {
    en: '/en/',
    'pt-br': '/pt-br/',
    es: '/es/',
  };

  function getCookie(name) {
    let cookies = '';

    try {
      cookies = document.cookie;
    } catch {
      return '';
    }

    const prefix = `${name}=`;
    const cookie = cookies.split('; ').find((entry) => entry.startsWith(prefix));

    if (!cookie) return '';

    try {
      return decodeURIComponent(cookie.slice(prefix.length));
    } catch {
      return '';
    }
  }

  function setLanguagePreference(language) {
    if (!languagePaths[language]) return;

    try {
      document.cookie = `${cookieName}=${encodeURIComponent(language)}; Max-Age=${cookieMaxAge}; Path=/; SameSite=Lax`;
    } catch {
      // Storage is an enhancement; navigation must still work when blocked.
    }

    try {
      window.localStorage.setItem(storageKey, language);
    } catch {
      // Private browsing or policy controls may disable local storage.
    }
  }

  function getLanguagePreference() {
    const cookieLanguage = getCookie(cookieName);
    if (languagePaths[cookieLanguage]) return cookieLanguage;

    try {
      const storedLanguage = window.localStorage.getItem(storageKey);
      if (languagePaths[storedLanguage]) return storedLanguage;
    } catch {
      // Treat blocked storage as no saved preference.
    }

    return '';
  }

  function languageFromBrowser() {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];

    for (const language of languages) {
      if (/^pt(?:-|$)/i.test(language || '')) return 'pt-br';
      if (/^es(?:-|$)/i.test(language || '')) return 'es';
      if (/^en(?:-|$)/i.test(language || '')) return 'en';
    }

    return '';
  }

  function navigateToLanguage(language) {
    const path = languagePaths[language];
    if (!path) return;

    window.location.replace(`${path}${window.location.search || ''}${window.location.hash || ''}`);
  }

  // A language-switcher or selector click is an explicit preference. Capture
  // it before navigation so that the visitor's choice persists on return.
  document.addEventListener('click', (event) => {
    if (!event.target || typeof event.target.closest !== 'function') return;

    const link = event.target.closest('a[data-language-preference]');
    if (!link) return;

    setLanguagePreference(link.dataset.languagePreference);
  }, true);

  // Only the non-canonical language-routing root performs automatic routing.
  // Localized pages remain stable, self-canonical destinations for visitors
  // and search crawlers. An explicit preference wins over browser detection.
  if (window.location.pathname !== '/') return;

  const language = getLanguagePreference() || languageFromBrowser();
  if (language) navigateToLanguage(language);
})();
