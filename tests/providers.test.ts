import test from 'node:test';
import assert from 'node:assert/strict';
import {createTranslator, TranslationError, type TranslatorConfig} from '../src/core/providers';

const config: TranslatorConfig = {provider: 'bing', targetLanguage: 'zh-Hans', officialFallback: false, microsoftKey: '', microsoftRegion: '', microsoftEndpoint: 'https://api.cognitive.microsofttranslator.com', minIntervalMs: 0, requestTimeoutMs: 50};
const signal = () => new AbortController().signal;
const page = 'IG:"fixture-ig"; params_AbusePreventionHelper = [123,"fixture-token",3600000]; <div data-iid="translator.fixture">';
function response(body: unknown, status = 200, url = 'https://cn.bing.com/translator', headers: Record<string, string> = {}) {
  return {ok: status >= 200 && status < 300, status, url, headers: new Headers(headers), text: async () => typeof body === 'string' ? body : JSON.stringify(body)} as Response;
}
function translated(text = '欢迎', target = 'zh-Hans') {return [{detectedLanguage: {language: 'en', score: 1}, translations: [{text, to: target}]}];}
function fixture(fn?: (url: string, options: RequestInit) => Response | Promise<Response>) {
  const calls: {url: string; options: RequestInit}[] = [];
  const fakeFetch = (async (url: string | URL | Request, options: RequestInit = {}) => {
    calls.push({url: String(url), options});
    return fn ? fn(String(url), options) : response(String(url).includes('/translator') ? page : translated());
  }) as typeof fetch;
  return {calls, fakeFetch};
}
const errorCode = (code: string) => (error: unknown) => error instanceof TranslationError && error.code === code;

test('Bing uses redirected origin, required IDs and consistent UA without API key', async () => {
  const {calls, fakeFetch} = fixture(); let gates = 0;
  const result = await createTranslator(config, {fetch: fakeFetch, gate: async () => {gates++;}}).translate('Welcome', 'zh-CN', signal());
  assert.deepEqual(result, {text: '欢迎', detectedLanguage: 'en'});
  assert.match(calls[1].url, /^https:\/\/cn\.bing\.com\/ttranslatev3\?/);
  assert.match(calls[1].url, /IG=fixture-ig/); assert.match(calls[1].url, /IID=translator.fixture.1/);
  const form = new URLSearchParams(String(calls[1].options.body));
  assert.equal(form.get('fromLang'), 'auto-detect'); assert.equal(form.get('to'), 'zh-Hans');
  const getHeaders = new Headers(calls[0].options.headers), postHeaders = new Headers(calls[1].options.headers);
  assert.match(getHeaders.get('User-Agent') || '', /Mozilla/); assert.equal(getHeaders.get('User-Agent'), postHeaders.get('User-Agent'));
  assert.equal(postHeaders.has('Ocp-Apim-Subscription-Key'), false); assert.equal(gates, 2);
});

test('session is reused across concurrent translations and config is snapshotted', async () => {
  const {calls, fakeFetch} = fixture(); const settings = {...config}; const client = createTranslator(settings, {fetch: fakeFetch}); settings.provider = 'microsoft';
  await Promise.all([client.translate('First', 'zh-Hans', signal()), client.translate('Second', 'zh-Hans', signal())]);
  assert.equal(calls.filter(c => c.url.endsWith('/translator')).length, 1); assert.equal(calls.length, 3);
});

test('205 refreshes session once, and every refresh/retry passes the gate', async () => {
  let posts = 0, gates = 0;
  const {calls, fakeFetch} = fixture(url => response(url.endsWith('/translator') ? page : ++posts === 1 ? {statusCode: 205} : translated()));
  const result = await createTranslator(config, {fetch: fakeFetch, gate: async () => {gates++;}}).translate('Hello', 'zh-Hans', signal());
  assert.equal(result.text, '欢迎'); assert.equal(calls.length, 4); assert.equal(gates, 4);
});

test('persistent 205 stops after one refresh without infinite retry', async () => {
  const {calls, fakeFetch} = fixture(url => response(url.endsWith('/translator') ? page : {statusCode: 205}));
  await assert.rejects(createTranslator(config, {fetch: fakeFetch}).translate('Hello', 'zh-Hans', signal()), errorCode('SESSION_EXPIRED'));
  assert.equal(calls.length, 4);
});

test('429 is surfaced with Retry-After and does not immediately retry or fallback', async () => {
  const {calls, fakeFetch} = fixture(url => response(url.endsWith('/translator') ? page : {}, url.endsWith('/translator') ? 200 : 429, undefined, {'Retry-After': '3'}));
  const client = createTranslator({...config, officialFallback: true, microsoftKey: 'fixture-key'}, {fetch: fakeFetch});
  await assert.rejects(client.translate('Hello', 'zh-Hans', signal()), e => e instanceof TranslationError && e.code === 'HTTP_429' && e.retryable && e.retryAfterMs === 3000);
  assert.equal(calls.length, 2);
});

test('server failure gets only one delayed retry and each request is gated', async () => {
  let attempts = 0, gates = 0;
  const {fakeFetch} = fixture(url => response(url.endsWith('/translator') ? page : ++attempts === 1 ? {} : translated(), !url.endsWith('/translator') && attempts === 1 ? 503 : 200));
  assert.equal((await createTranslator(config, {fetch: fakeFetch, gate: async () => {gates++;}}).translate('Hello', 'zh-Hans', signal())).text, '欢迎');
  assert.equal(attempts, 2); assert.equal(gates, 3);
});

test('timeout rejects and aborts underlying fetch even if fetch ignores abort', async () => {
  let requestSignal: AbortSignal | undefined;
  const fakeFetch = ((_url: unknown, options: RequestInit) => {requestSignal = options.signal as AbortSignal; return new Promise<Response>(() => {});}) as typeof fetch;
  await assert.rejects(createTranslator({...config, requestTimeoutMs: 15}, {fetch: fakeFetch}).translate('Hello', 'zh-Hans', signal()), errorCode('TIMEOUT'));
  assert.equal(requestSignal?.aborted, true);
});

test('timeout also covers response body consumption', async () => {
  const fakeFetch = (async () => ({...response(page), text: () => new Promise<string>(() => {})})) as typeof fetch;
  await assert.rejects(createTranslator({...config, requestTimeoutMs: 15}, {fetch: fakeFetch}).translate('Hello', 'zh-Hans', signal()), errorCode('TIMEOUT'));
});

test('caller abort cancels request without retry or official fallback', async () => {
  const controller = new AbortController(); let calls = 0, requestSignal: AbortSignal | undefined;
  const fakeFetch = ((_url: unknown, options: RequestInit) => {calls++; requestSignal = options.signal as AbortSignal; return new Promise<Response>(() => {});}) as typeof fetch;
  const promise = createTranslator({...config, officialFallback: true, microsoftKey: 'fixture-key'}, {fetch: fakeFetch}).translate('Hello', 'zh-Hans', controller.signal);
  setTimeout(() => controller.abort(), 5); await assert.rejects(promise, errorCode('ABORTED')); assert.equal(calls, 1); assert.equal(requestSignal?.aborted, true);
});

test('abort while gate stalls rejects before any network request', async () => {
  const {calls, fakeFetch} = fixture(); const controller = new AbortController();
  const promise = createTranslator(config, {fetch: fakeFetch, gate: () => new Promise<void>(() => {})}).translate('Hello', 'zh-Hans', controller.signal);
  setTimeout(() => controller.abort(), 5); await assert.rejects(promise, errorCode('ABORTED')); assert.equal(calls.length, 0);
});

test('long text chunks are ordered, at most 1000 UTF-16 units, and preserve protected tokens', async () => {
  let active = 0, peak = 0;
  const {calls, fakeFetch} = fixture(async (url, options) => {
    if (url.endsWith('/translator')) return response(page);
    active++; peak = Math.max(peak, active); await new Promise(r => setTimeout(r, 1)); active--;
    return response(translated(new URLSearchParams(String(options.body)).get('text') || ''));
  });
  const original = 'Hello. '.repeat(200) + '\n<@123456> https://example.com/path `keep code` ```js\nprivate code\n``` @everyone';
  const result = await createTranslator(config, {fetch: fakeFetch}).translate(original, 'zh-Hans', signal());
  assert.equal(result.text, original); assert.equal(peak, 1);
  const sent = calls.slice(1).map(c => new URLSearchParams(String(c.options.body)).get('text')!);
  assert.ok(sent.length > 1); assert.ok(sent.every(t => t.length <= 1000));
  assert.equal(sent.some(t => /123456|https:|keep code|private code|@everyone/.test(t)), false);
});

test('hard chunk boundaries never split surrogate pairs', async () => {
  const {calls, fakeFetch} = fixture((url, options) => response(url.endsWith('/translator') ? page : translated(new URLSearchParams(String(options.body)).get('text') || '')));
  const original = 'x'.repeat(999) + '😀' + 'z'.repeat(999);
  assert.equal((await createTranslator(config, {fetch: fakeFetch}).translate(original, 'zh-Hans', signal())).text, original);
  for (const c of calls.slice(1)) {const text = new URLSearchParams(String(c.options.body)).get('text')!; assert.ok(!/[\uD800-\uDBFF]$/.test(text)); assert.ok(!/^[\uDC00-\uDFFF]/.test(text));}
});

test('only protected code and whitespace returns locally without network', async () => {
  const {calls, fakeFetch} = fixture(); const text = '  ```\n' + 'x'.repeat(2000) + '\n```\n';
  assert.equal((await createTranslator(config, {fetch: fakeFetch}).translate(text, 'en', signal())).text, text); assert.equal(calls.length, 0);
});

test('Microsoft sends JSON, key and regional header, and omits from for autodetection', async () => {
  const {calls, fakeFetch} = fixture(() => response(translated('Bonjour', 'fr')));
  const result = await createTranslator({...config, provider: 'microsoft', microsoftKey: 'fixture-key', microsoftRegion: 'eastasia'}, {fetch: fakeFetch}).translate('Hello', 'fr', signal());
  assert.equal(result.text, 'Bonjour'); const url = new URL(calls[0].url); assert.equal(url.searchParams.has('from'), false); assert.equal(url.searchParams.get('to'), 'fr');
  assert.deepEqual(JSON.parse(String(calls[0].options.body)), [{Text: 'Hello'}]);
  const headers = new Headers(calls[0].options.headers); assert.equal(headers.get('Ocp-Apim-Subscription-Key'), 'fixture-key'); assert.equal(headers.get('Ocp-Apim-Subscription-Region'), 'eastasia');
});

test('missing Microsoft key is a local configuration error', async () => {
  const {calls, fakeFetch} = fixture();
  await assert.rejects(createTranslator({...config, provider: 'microsoft'}, {fetch: fakeFetch}).translate('Hello', 'en', signal()), errorCode('MISSING_KEY')); assert.equal(calls.length, 0);
});

test('official fallback requires explicit setting and key', async () => {
  for (const settings of [{officialFallback: false, microsoftKey: 'fixture-key'}, {officialFallback: true, microsoftKey: ''}]) {
    const {calls, fakeFetch} = fixture(() => response('challenge page'));
    await assert.rejects(createTranslator({...config, ...settings}, {fetch: fakeFetch}).translate('Hello', 'zh-Hans', signal()), errorCode('SESSION_UNAVAILABLE'));
    assert.equal(calls.length, 1);
  }
  const {calls, fakeFetch} = fixture(url => response(url.includes('microsofttranslator') ? translated() : 'challenge page'));
  assert.equal((await createTranslator({...config, officialFallback: true, microsoftKey: 'fixture-key'}, {fetch: fakeFetch}).translate('Hello', 'zh-Hans', signal())).text, '欢迎'); assert.equal(calls.length, 2);
});

test('Microsoft custom resource URL retains text API path and disallows non-Microsoft credential destinations', async () => {
  const {calls, fakeFetch} = fixture(() => response(translated()));
  await createTranslator({...config, provider: 'microsoft', microsoftKey: 'fixture-key', microsoftEndpoint: 'https://fixture.cognitiveservices.azure.com/translator/text/v3.0'}, {fetch: fakeFetch}).translate('Hello', 'zh-Hans', signal());
  assert.match(calls[0].url, /^https:\/\/fixture\.cognitiveservices\.azure\.com\/translator\/text\/v3.0\/translate\?/);
  await assert.rejects(createTranslator({...config, provider: 'microsoft', microsoftKey: 'fixture-key', microsoftEndpoint: 'https://attacker.example'}, {fetch: fakeFetch}).translate('Hello', 'zh-Hans', signal()), errorCode('INVALID_ENDPOINT')); assert.equal(calls.length, 1);
});

test('invalid JSON, empty and wrong-target results produce sanitized errors', async () => {
  for (const body of ['not-json fixture-key', [], translated('wrong', 'fr')]) {
    const {fakeFetch} = fixture(url => response(url.endsWith('/translator') ? page : body));
    await assert.rejects(createTranslator(config, {fetch: fakeFetch}).translate('Hello', 'zh-Hans', signal()), e => e instanceof TranslationError && ['BAD_RESPONSE', 'NO_TRANSLATION'].includes(e.code) && !e.message.includes('fixture-key'));
  }
});
