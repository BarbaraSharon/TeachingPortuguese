import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../static/js/language-preference.js', import.meta.url), 'utf8');

function runRouter({
  pathname = '/',
  search = '',
  hash = '',
  cookie = '',
  storedLanguage = '',
  languages = [],
  language = '',
  storageThrows = false,
} = {}) {
  const redirects = [];
  const writes = [];
  let clickHandler;
  const localStorage = {
    getItem: () => {
      if (storageThrows) throw new Error('storage blocked');
      return storedLanguage;
    },
    setItem: (key, value) => writes.push(['storage', key, value]),
  };
  const document = {
    get cookie() { return cookie; },
    set cookie(value) { writes.push(['cookie', value]); },
    addEventListener: (type, handler) => {
      if (type === 'click') clickHandler = handler;
    },
  };
  const context = {
    window: {
      location: { pathname, search, hash, replace: (url) => redirects.push(url) },
      localStorage,
    },
    document,
    navigator: { languages, language },
    decodeURIComponent,
    encodeURIComponent,
  };

  vm.runInNewContext(source, context);
  return { redirects, writes, clickHandler };
}

assert.deepEqual(runRouter({ cookie: 'barbara-language=pt-br' }).redirects, ['/pt-br/']);
assert.deepEqual(runRouter({ storedLanguage: 'es' }).redirects, ['/es/']);
assert.deepEqual(runRouter({ cookie: 'barbara-language=en', languages: ['es-MX'] }).redirects, ['/en/']);
assert.deepEqual(runRouter({ languages: ['fr-CA', 'pt-PT'] }).redirects, ['/pt-br/']);
assert.deepEqual(runRouter({ languages: ['es-MX'], search: '?utm_source=test', hash: '#top' }).redirects, ['/es/?utm_source=test#top']);
assert.deepEqual(runRouter({ languages: ['en-AU'] }).redirects, ['/en/']);
assert.deepEqual(runRouter({ languages: ['fr-CA'] }).redirects, []);
assert.deepEqual(runRouter({ pathname: '/en/', cookie: 'barbara-language=es' }).redirects, []);
assert.deepEqual(runRouter({ cookie: 'barbara-language=invalid', languages: ['en-AU'] }).redirects, ['/en/']);
assert.deepEqual(runRouter({ storageThrows: true, languages: ['pt-BR'] }).redirects, ['/pt-br/']);

const explicitChoice = runRouter();
explicitChoice.clickHandler({
  target: {
    closest: (selector) => selector === 'a[data-language-preference]'
      ? { dataset: { languagePreference: 'es' } }
      : null,
  },
});
assert.equal(explicitChoice.writes.some((entry) => entry[0] === 'cookie' && entry[1].startsWith('barbara-language=es;')), true);
assert.deepEqual(explicitChoice.writes.find((entry) => entry[0] === 'storage'), ['storage', 'barbara-language', 'es']);

console.log('Language-routing checks passed.');
