export type TranslationResult = {text: string; detectedLanguage?: string};
export type TranslatorConfig = {provider: 'bing' | 'microsoft'; targetLanguage: string; officialFallback: boolean; microsoftKey: string; microsoftRegion: string; microsoftEndpoint: string; minIntervalMs: number; requestTimeoutMs: number};
export class TranslationError extends Error {
  code: string; retryable: boolean; retryAfterMs?: number;
  constructor(code: string, message: string, retryable = false, retryAfterMs?: number) {super(message); this.name = 'TranslationError'; this.code = code; this.retryable = retryable; this.retryAfterMs = retryAfterMs;}
}
// Bing's webpage endpoint is undocumented. 1000 UTF-16 units is a conservative
// client chunk size, not a promised server limit. Evidence: work/bing-research.md.
const CHUNK_SIZE = 1000;
const BING_UA = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
type Session = {base: string; key: string; token: string; ig: string; iid: string; expires: number};
type Part = {text: string; protected: boolean};

function aborted(): TranslationError {return new TranslationError('ABORTED', 'Translation cancelled');}
function checkAbort(signal: AbortSignal): void {if (signal.aborted) throw aborted();}
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {reject(aborted()); return;}
    const onAbort = () => {signal.removeEventListener('abort', onAbort); reject(aborted());};
    signal.addEventListener('abort', onAbort);
    promise.then(value => {signal.removeEventListener('abort', onAbort); resolve(value);}, error => {signal.removeEventListener('abort', onAbort); reject(error);});
  });
}
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    checkAbort(signal);
    const timer = setTimeout(() => {signal.removeEventListener('abort', onAbort); resolve();}, Math.max(0, ms));
    const onAbort = () => {clearTimeout(timer); signal.removeEventListener('abort', onAbort); reject(aborted());};
    signal.addEventListener('abort', onAbort);
  });
}
function mapLanguage(id: string): string {return ({'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', iw: 'he', jw: 'jv'} as Record<string, string>)[id] || id;}
function form(values: Record<string, string>): string {return Object.keys(values).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(values[key])).join('&');}
function protectedParts(text: string): Part[] {
  // Keep these exact bytes locally instead of trusting translated placeholders.
  const pattern = /```[\s\S]*?(?:```|$)|`[^`\n]*`|<(?:@!?\d+|@&\d+|#\d+|a?:[^:\s>]+:\d+)>|https?:\/\/[^\s<>`]+|@(?:everyone|here)\b/g;
  const parts: Part[] = []; let start = 0; let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > start) parts.push({text: text.slice(start, match.index), protected: false});
    parts.push({text: match[0], protected: true}); start = pattern.lastIndex;
  }
  if (start < text.length) parts.push({text: text.slice(start), protected: false});
  return parts;
}
function chunks(text: string): string[] {
  const output: string[] = [];
  while (text.length > CHUNK_SIZE) {
    const head = text.slice(0, CHUNK_SIZE); let cut = CHUNK_SIZE;
    const boundary = /(?:\n|[.!?。！？]\s*|\s+)/g; let match: RegExpExecArray | null;
    while ((match = boundary.exec(head))) if (boundary.lastIndex >= CHUNK_SIZE / 2) cut = boundary.lastIndex;
    if (/[\uD800-\uDBFF]/.test(text[cut - 1]) && /[\uDC00-\uDFFF]/.test(text[cut])) cut--;
    output.push(text.slice(0, cut)); text = text.slice(cut);
  }
  if (text) output.push(text);
  return output;
}
function retryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value); if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const when = Date.parse(value); return Number.isFinite(when) ? Math.max(0, when - Date.now()) : undefined;
}
function parseResult(body: string, target: string): TranslationResult {
  let value: any;
  try {value = JSON.parse(body);} catch {throw new TranslationError('BAD_RESPONSE', 'Translation service returned invalid JSON');}
  if (value?.statusCode === 205) throw new TranslationError('SESSION_EXPIRED', 'Bing session expired', true);
  if (value?.statusCode) throw new TranslationError('BING_' + String(value.statusCode), 'Bing rejected the translation request', value.statusCode === 429);
  const first = Array.isArray(value) ? value[0] : undefined;
  const item = first?.translations?.find((entry: any) => entry?.to === target && typeof entry.text === 'string');
  if (!item?.text) throw new TranslationError('NO_TRANSLATION', 'Translation service returned no matching translation');
  const result: TranslationResult = {text: item.text};
  if (typeof first.detectedLanguage?.language === 'string') result.detectedLanguage = first.detectedLanguage.language;
  return result;
}

export function createTranslator(config: TranslatorConfig, deps?: {fetch?: typeof fetch; gate?: (signal: AbortSignal) => Promise<void>}): {translate(text: string, target: string, signal: AbortSignal): Promise<TranslationResult>} {
  const settings = {...config}; const fetcher = deps?.fetch || fetch;
  let session: Session | undefined; let queue: Promise<unknown> = Promise.resolve(); let lastRequest = 0;
  const timeoutMs = Number.isFinite(settings.requestTimeoutMs) && settings.requestTimeoutMs > 0 ? settings.requestTimeoutMs : 12000;
  const intervalMs = Number.isFinite(settings.minIntervalMs) ? Math.max(0, settings.minIntervalMs) : 700;
  const gate = deps?.gate || (async (signal: AbortSignal) => {await delay(Math.max(0, lastRequest + intervalMs - Date.now()), signal); lastRequest = Date.now();});

  async function request(url: string, options: RequestInit, callerSignal: AbortSignal): Promise<{body: string; url: string}> {
    checkAbort(callerSignal); await abortable(gate(callerSignal), callerSignal); checkAbort(callerSignal);
    const controller = new AbortController();
    // Own deadline covers fetch + body and still rejects non-cooperative polyfills.
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: unknown, value?: {body: string; url: string}) => {
        if (settled) return; settled = true; clearTimeout(timer); callerSignal.removeEventListener('abort', onAbort);
        if (error) {controller.abort(); reject(error);} else resolve(value!);
      };
      const onAbort = () => finish(aborted());
      const timer = setTimeout(() => finish(new TranslationError('TIMEOUT', 'Translation request timed out', true)), timeoutMs);
      callerSignal.addEventListener('abort', onAbort);
      if (callerSignal.aborted) {onAbort(); return;}
      Promise.resolve().then(async () => {
        if (controller.signal.aborted) return;
        try {
          const response = await fetcher(url, {...options, signal: controller.signal});
          if (!response.ok) throw new TranslationError('HTTP_' + response.status, 'Translation service HTTP ' + response.status, response.status === 408 || response.status === 429 || response.status >= 500, retryAfter(response.headers.get('Retry-After')));
          const body = await response.text(); finish(undefined, {body, url: response.url || url});
        } catch (error) {
          finish(error instanceof TranslationError ? error : new TranslationError('NETWORK', 'Translation network request failed', true));
        }
      });
    });
  }

  async function getSession(signal: AbortSignal): Promise<Session> {
    if (session && Date.now() < session.expires) return session;
    const page = await request('https://www.bing.com/translator', {headers: {'User-Agent': BING_UA}}, signal);
    const origin = page.url.match(/^https:\/\/((?:[a-z0-9-]+\.)*bing\.com)(?:[/:?#]|$)/i);
    const helper = page.body.match(/params_AbusePreventionHelper\s*=\s*(\[[^\]]+\])/);
    const ig = page.body.match(/IG:\s*"([^"]+)"/); const iid = page.body.match(/data-iid=["']([^"']+)["']/);
    if (!origin || !helper || !ig || !iid) throw new TranslationError('SESSION_UNAVAILABLE', 'Bing webpage session is unavailable');
    let params: any;
    try {params = JSON.parse(helper[1]);} catch {throw new TranslationError('SESSION_UNAVAILABLE', 'Bing webpage session is unavailable');}
    if (!Array.isArray(params) || !Number.isFinite(params[0]) || typeof params[1] !== 'string' || !params[1]) throw new TranslationError('SESSION_UNAVAILABLE', 'Bing webpage session is unavailable');
    // Refresh conservatively in 9 minutes; helper TTL is not a stability promise.
    session = {base: 'https://' + origin[1], key: String(params[0]), token: params[1], ig: ig[1], iid: iid[1], expires: Date.now() + 540000};
    return session;
  }

  function officialURL(target: string): string {
    const endpoint = (settings.microsoftEndpoint || 'https://api.cognitive.microsofttranslator.com').trim().replace(/\/+$/, '');
    const parts = endpoint.match(/^https:\/\/([^/?#]+)(\/[^?#]*)?$/i);
    if (!parts || !/^(?:api(?:-(?:nam|eur|apc))?\.cognitive\.microsofttranslator\.com|[a-z0-9-]+\.cognitiveservices\.azure\.com)$/i.test(parts[1])) throw new TranslationError('INVALID_ENDPOINT', 'Enter a valid HTTPS Microsoft Translator endpoint');
    let path = parts[2] || '';
    if (/\.cognitiveservices\.azure\.com$/i.test(parts[1]) && !path) path = '/translator/text/v3.0';
    if (!path.endsWith('/translate')) path += '/translate';
    return 'https://' + parts[1] + path + '?api-version=3.0&to=' + encodeURIComponent(target);
  }
  async function official(text: string, target: string, signal: AbortSignal): Promise<TranslationResult> {
    if (!settings.microsoftKey.trim()) throw new TranslationError('MISSING_KEY', 'Microsoft Translator requires an API key');
    const headers: Record<string, string> = {'Content-Type': 'application/json; charset=UTF-8', 'Ocp-Apim-Subscription-Key': settings.microsoftKey.trim()};
    if (settings.microsoftRegion.trim() && settings.microsoftRegion.trim() !== 'global') headers['Ocp-Apim-Subscription-Region'] = settings.microsoftRegion.trim();
    const response = await request(officialURL(target), {method: 'POST', headers, body: JSON.stringify([{Text: text}])}, signal);
    return parseResult(response.body, target);
  }
  async function bing(text: string, target: string, signal: AbortSignal): Promise<TranslationResult> {
    const current = await getSession(signal);
    const response = await request(current.base + '/ttranslatev3?isVertical=1&IG=' + encodeURIComponent(current.ig) + '&IID=' + encodeURIComponent(current.iid + '.1'), {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': BING_UA}, body: form({fromLang: 'auto-detect', to: target, text, key: current.key, token: current.token})}, signal);
    return parseResult(response.body, target);
  }
  async function withRetry(provider: (text: string, target: string, signal: AbortSignal) => Promise<TranslationResult>, text: string, target: string, signal: AbortSignal): Promise<TranslationResult> {
    for (let attempt = 0; ; attempt++) {
      try {return await provider(text, target, signal);} catch (error) {
        checkAbort(signal);
        const failure = error instanceof TranslationError ? error : new TranslationError('NETWORK', 'Translation request failed', true);
        if (failure.code === 'SESSION_EXPIRED') session = undefined;
        const transient = failure.code === 'SESSION_EXPIRED' || failure.code === 'NETWORK' || /^HTTP_(408|5\d\d)$/.test(failure.code);
        if (attempt || !transient) throw failure;
        await delay(300, signal);
      }
    }
  }
  async function translateChunk(text: string, target: string, signal: AbortSignal): Promise<TranslationResult> {
    if (settings.provider === 'microsoft') return withRetry(official, text, target, signal);
    try {return await withRetry(bing, text, target, signal);} catch (error) {
      checkAbort(signal);
      const code = error instanceof TranslationError ? error.code : '';
      if (settings.officialFallback === true && settings.microsoftKey.trim() && !['ABORTED', 'TIMEOUT', 'HTTP_429', 'BING_429'].includes(code)) return withRetry(official, text, target, signal);
      throw error;
    }
  }
  async function execute(text: string, target: string, signal: AbortSignal): Promise<TranslationResult> {
    checkAbort(signal);
    target = mapLanguage(target || settings.targetLanguage);
    if (!target || target === 'auto' || target === 'auto-detect') throw new TranslationError('INVALID_LANGUAGE', 'Choose a target language');
    const result: TranslationResult = {text: ''};
    for (const part of protectedParts(text)) {
      if (part.protected) {result.text += part.text; continue;}
      for (const chunk of chunks(part.text)) {
        checkAbort(signal);
        const match = chunk.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
        if (!match[2]) {result.text += chunk; continue;}
        const translated = await translateChunk(match[2], target, signal);
        result.text += match[1] + translated.text + match[3];
        if (!result.detectedLanguage && translated.detectedLanguage) result.detectedLanguage = translated.detectedLanguage;
      }
    }
    checkAbort(signal); return result;
  }
  return {translate(text: string, target: string, signal: AbortSignal): Promise<TranslationResult> {
    const pending = queue.then(() => execute(text, target, signal));
    queue = pending.catch(() => undefined);
    return abortable(pending, signal);
  }};
}
