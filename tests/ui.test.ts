import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createComponents } from '../src/ui/components.js';

const RN = Object.fromEntries(['View', 'Text', 'ScrollView', 'TextInput', 'Switch', 'Pressable'].map(name => [name, name]));
const message = { id: 'a', channelId: 'channel', content: 'Original English' };

function fixture(hostOverrides: Record<string, unknown> = {}) {
  const listeners = new Set<() => void>();
  const translations = new Map<string, { text: string; detectedLanguage?: string }>();
  const calls: unknown[][] = [];
  let settings = { autoTranslate: false, targetLanguage: 'zh-CN', provider: 'bing' as 'bing' | 'microsoft', officialFallback: false, microsoftKey: '', microsoftRegion: '', microsoftEndpoint: 'https://api.cognitive.microsofttranslator.com', minIntervalMs: 1200, requestTimeoutMs: 15000 };
  let status = { pending: 0, active: true, lastError: null as string | null, translated: 0 };
  const emit = () => listeners.forEach(listener => listener());
  const service = {
    subscribe(callback: () => void) { listeners.add(callback); return () => { listeners.delete(callback); }; },
    getTranslation(msg: typeof message) { return translations.get(`${msg.id}:${msg.content}`); },
    consider(msg: typeof message) { calls.push(['consider', msg]); },
    getSettings() { return settings; },
    getStatus() { return status; },
    configure(patch: Record<string, unknown>) { calls.push(['configure', patch]); settings = { ...settings, ...patch }; emit(); },
    subscribeSelection(_callback: () => void) { return () => {}; },
    getSelectionSnapshot() { return {channelId: 'channel', messages: [message]}; },
    async translateSelected(channel: string, selected: typeof message[]) { calls.push(['selected', channel, selected]); },
    async translateLoaded() { calls.push(['loaded']); status = { ...status, pending: 3 }; emit(); },
    stop() { calls.push(['stop']); status = { ...status, active: false, pending: 0 }; emit(); },
    clear() { calls.push(['clear']); translations.clear(); status = { ...status, translated: 0 }; emit(); },
    enableAuto() { calls.push(['auto']); settings = { ...settings, autoTranslate: true }; emit(); },
  };
  return { components: createComponents({ React, RN, storage: {}, ...hostOverrides }, service), listeners, translations, calls, service, emit, setStatus(next: Partial<typeof status>) { status = { ...status, ...next }; emit(); } };
}

function renderedText(renderer: TestRenderer.ReactTestRenderer): string {
  return renderer.root.findAll(node => node.type === ('Text' as any)).map(node => node.children.filter(child => typeof child === 'string').join('')).join('\n');
}

test('wrapper preserves original element and renders translation below it without rewriting source', () => {
  const f = fixture();
  f.translations.set('a:Original English', { text: '中文译文', detectedLanguage: 'en' });
  const original = React.createElement('Text', { selectable: true }, message.content);
  const wrapped = f.components.wrapMessage(original, message);
  assert.equal(wrapped.props.original, original, 'the host element must be kept by reference');
  assert.equal(f.calls.length, 0, 'render construction must not queue network work');
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(wrapped); });
  const texts = renderer.root.findAll(node => node.type === ('Text' as any));
  assert.equal(texts[0].children.join(''), 'Original English');
  assert.ok(texts.findIndex(node => node.children.join('') === '中文译文') > 0);
  const originalComponent = renderer.root.findAllByProps({ selectable: true })[0];
  assert.equal(originalComponent.props.children, 'Original English');
  assert.equal(message.content, 'Original English');
  assert.equal(f.calls[0][0], 'consider');
  act(() => renderer.unmount());
  assert.equal(f.listeners.size, 0);
});

test('recycled message cell never keeps translation belonging to previous id or content', () => {
  const f = fixture();
  f.translations.set('a:Original English', { text: '旧译文' });
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(React.createElement(f.components.TranslationBlock, { message })); });
  assert.match(renderedText(renderer), /旧译文/);
  const next = { id: 'b', channelId: 'channel', content: 'New message' };
  act(() => renderer.update(React.createElement(f.components.TranslationBlock, { message: next })));
  assert.doesNotMatch(renderedText(renderer), /旧译文/);
  f.translations.set('b:New message', { text: '新译文' });
  act(f.emit);
  assert.match(renderedText(renderer), /新译文/);
  act(() => renderer.update(React.createElement(f.components.TranslationBlock, { message: { ...next, content: 'Edited message' } })));
  assert.doesNotMatch(renderedText(renderer), /新译文/);
  act(() => renderer.unmount());
});

test('clear and unload notifications remove translated blocks and subscriptions', () => {
  const f = fixture();
  f.translations.set('a:Original English', { text: '译文' });
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(f.components.wrapMessage(React.createElement('Text', {}, message.content), message)); });
  assert.match(renderedText(renderer), /译文/);
  assert.ok(f.listeners.size > 0);
  act(() => f.service.clear());
  assert.equal(renderedText(renderer), message.content);
  act(() => renderer.unmount());
  assert.equal(f.listeners.size, 0);
});

test('nested wrappers render each original only once and inject one translation', () => {
  const f = fixture();
  f.translations.set('a:Original English', { text: '唯一译文' });
  const original = React.createElement('Text', {}, message.content);
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(f.components.wrapMessage(f.components.wrapMessage(original, message), message)); });
  assert.equal(renderedText(renderer).split('唯一译文').length - 1, 1);
  assert.equal(renderedText(renderer).split('Original English').length - 1, 1);
  act(() => renderer.unmount());
});

test('settings controls update settings and loaded/stop/clear actions render live progress', async () => {
  const f = fixture();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(React.createElement(f.components.Settings)); });
  const byID = (id: string) => renderer.root.findByProps({ testID: id });
  act(() => byID('auto-translate').props.onValueChange(true));
  assert.ok(f.calls.some(call => call[0] === 'auto'));
  act(() => byID('target-ja').props.onPress());
  assert.equal(f.service.getSettings().targetLanguage, 'ja');
  act(() => byID('provider-microsoft').props.onPress());
  assert.equal(f.service.getSettings().provider, 'microsoft');
  act(() => byID('official-fallback').props.onValueChange(true));
  assert.equal(f.service.getSettings().officialFallback, true);
  assert.equal(byID('microsoft-key').props.secureTextEntry, true);
  act(() => byID('microsoft-key').props.onChangeText('secret-key'));
  assert.equal(f.service.getSettings().microsoftKey, 'secret-key');
  assert.doesNotMatch(renderedText(renderer), /secret-key/);
  await act(async () => { await byID('translate-loaded').props.onPress(); });
  assert.match(renderedText(renderer), /3/);
  act(() => byID('stop-translation').props.onPress());
  assert.equal(f.service.getStatus().active, false);
  act(() => byID('clear-translations').props.onPress());
  assert.ok(f.calls.some(call => call[0] === 'clear'));
  act(() => f.setStatus({ lastError: 'Provider unavailable' }));
  assert.match(renderedText(renderer), /Provider unavailable/);
  act(() => renderer.unmount());
  assert.equal(f.listeners.size, 0);
});

test('diagnostics and error views mask credentials including values under innocent property names', () => {
  const f = fixture({ diagnostics: () => ({ component: 'MessageRow', apiKey: 'another-secret', message: 'secret-key' }) });
  f.service.configure({ microsoftKey: 'secret-key', provider: 'microsoft' });
  f.setStatus({ lastError: 'Failed with secret-key' });
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(React.createElement(f.components.Settings)); });
  assert.match(renderedText(renderer), /MessageRow/);
  assert.match(renderedText(renderer), /\[redacted\]/);
  assert.doesNotMatch(renderedText(renderer), /secret-key|another-secret/);
  act(() => renderer.unmount());
});

test('settings retain working action buttons when host exposes TouchableOpacity instead of Pressable', () => {
  const { Pressable: _pressable, ...primitives } = RN;
  const f = fixture({ RN: { ...primitives, TouchableOpacity: 'TouchableOpacity' } });
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(React.createElement(f.components.Settings)); });
  const button = renderer.root.findByProps({ testID: 'target-en' });
  assert.equal(button.type, 'TouchableOpacity');
  act(() => button.props.onPress());
  assert.equal(f.service.getSettings().targetLanguage, 'en');
  act(() => renderer.root.findByProps({ testID: 'auto-translate' }).props.onValueChange(false));
  assert.equal(f.service.getSettings().autoTranslate, false);
  act(() => renderer.unmount());
});
