const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'web/node_modules/typescript'));

// Exercise the real normalizers without loading local environment files or CMS.
function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = {
    exports: {},
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw Error(`Unexpected import ${name}`);
    },
    process: { cwd: () => '/tmp', env: { DIRECTUS_URL: 'http://localhost:8055' } },
    URL,
    URLSearchParams,
    Response,
    fetch: () => { throw Error('Network not allowed in URL test'); },
  };
  vm.runInNewContext(source, context, { filename: file });
  return context.exports;
}

const client = load('web/lib/cms/client.ts', {
  'node:fs': { existsSync: () => false },
  'node:path': path,
  './api-store': {},
});

const cases = [
  ['https://gzjtjt.cn/admin-api/assets/id-1', '/api/public/cms/assets/id-1'],
  ['https://gwdev.gzjtjt.cn/assets/id-2', '/api/public/cms/assets/id-2'],
  ['/admin-api/assets/id-3', '/api/public/cms/assets/id-3'],
  ['https://another.example/admin-api/assets/id-4', 'https://another.example/admin-api/assets/id-4'],
  ['https://evilgzjtjt.cn/admin-api/assets/id-5', 'https://evilgzjtjt.cn/admin-api/assets/id-5'],
  ['/api/public/cms/assets/id-6', '/api/public/cms/assets/id-6'],
];
for (const [input, expected] of cases) {
  assert.equal(client.normalizePublicAssetUrl(input), expected, input);
}

const articles = load('web/lib/cms/articles.ts', { './client': client, './channels': {} });
const input = '<p style="font-size:18px;text-align:center">Original text</p>'
  + '<img src="https://gzjtjt.cn/admin-api/assets/id-1" width="320">'
  + '<a href="https://another.example/assets/id-2">source</a>';
const expected = '<p style="font-size:18px;text-align:center">Original text</p>'
  + '<img src="/api/public/cms/assets/id-1" width="320">'
  + '<a href="https://another.example/assets/id-2">source</a>';
assert.equal(articles.normalizeRichTextAssetUrls(input), expected);
console.log('PASS: 6 URL boundary cases and rich-text attribute/content preservation');
