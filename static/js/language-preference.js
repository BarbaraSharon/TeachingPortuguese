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
      // Fall through to browser-language detection.
    }

    return '';
  }

  function languageFromPath(pathname) {
    if (pathname === '/pt-br' || pathname.startsWith('/pt-br/')) return 'pt-br';
    if (pathname === '/en' || pathname.startsWith('/en/')) return 'en';
    if (pathname === '/es' || pathname.startsWith('/es/')) return 'es';
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

    // English is the deliberate fallback for every other or unavailable language.
    return 'en';
  }

  // A language-switcher click is an explicit preference. Capture it before
  // navigation so the choice persists when the visitor returns to "/".
  document.addEventListener('click', (event) => {
    if (!event.target || typeof event.target.closest !== 'function') return;

    const link = event.target.closest('a[data-language-preference]');
    if (!link) return;

    const language = link.dataset.languagePreference;
    if (language) setLanguagePreference(language);
  }, true);

  // The root page always falls back to /en/ without JavaScript. Automatic
  // detection runs only after that safe fallback reaches the English homepage.
  // Direct visits to any other page or language are always respected.
  const isEnglishHomepage = window.location.pathname === '/en/' || window.location.pathname === '/en';
  const savedLanguage = getLanguagePreference();

  if (!isEnglishHomepage) {
    const currentLanguage = languageFromPath(window.location.pathname);
    if (!savedLanguage && currentLanguage) setLanguagePreference(currentLanguage);
    return;
  }

  const language = languagePaths[savedLanguage] ? savedLanguage : languageFromBrowser();
  setLanguagePreference(language);

  if (language !== 'en') {
    window.location.replace(languagePaths[language]);
  }
})();
