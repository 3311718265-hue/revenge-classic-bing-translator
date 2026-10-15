type Message = { id: string; channelId: string; content: string };
type SettingsState = {
  autoTranslate: boolean;
  targetLanguage: string;
  provider: 'bing' | 'microsoft';
  officialFallback: boolean;
  microsoftKey: string;
  microsoftRegion: string;
  microsoftEndpoint: string;
  minIntervalMs: number;
  requestTimeoutMs: number;
};
type SelectionState = { channelId: string; messages: Map<string, Message>; visible: number };
type Service = {
  subscribe: (callback: () => void) => () => void;
  getTranslation: (message: Message) => { text: string; detectedLanguage?: string } | undefined;
  consider: (message: Message) => void;
  getStatus: () => { pending: number; active: boolean; lastError: string | null; translated: number; diagnostics?: unknown };
  getSettings: () => SettingsState;
  configure: (patch: Record<string, unknown>) => void;
  translateLoaded: () => Promise<void>;
  subscribeSelection: (callback: () => void) => () => void;
  getSelectionSnapshot: () => {channelId: string | null; messages: Message[]};
  translateSelected: (channelId: string, messages: Message[]) => Promise<void>;
  stop: () => void;
  clear: () => void;
  enableAuto: () => void;
};
type Host = { React: any; RN: any; storage: any; diagnostics?: () => unknown };

const LANGUAGES = [
  ['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['en', 'English'], ['ja', '日本語'],
  ['ko', '한국어'], ['de', 'Deutsch'], ['fr', 'Français'], ['ru', 'Русский'], ['es', 'Español'],
  ['pt', 'Português'], ['it', 'Italiano'], ['ar', 'العربية'], ['hi', 'हिन्दी'], ['tr', 'Türkçe'],
  ['vi', 'Tiếng Việt'], ['id', 'Bahasa Indonesia'], ['th', 'ไทย'], ['uk', 'Українська'], ['nl', 'Nederlands'],
] as const;

/** Host React/RN are injected so this plugin does not ship a second React runtime. */
export function createComponents(host: Host, service: Service): {
  TranslationBlock: any;
  wrapMessage: (original: any, message: Message) => any;
  Settings: any;
} {
  const { React, RN } = host;
  const h = React.createElement;
  const WrapperContext = React.createContext(null);
  const Button = RN.Pressable ?? RN.TouchableOpacity;
  const colors = { foreground: '#f2f3f5', muted: '#b5bac1', background: '#1e1f22', card: '#2b2d31', accent: '#8ea1ff', error: '#ffb4b4' };
  const styles = {
    page: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    heading: { color: colors.foreground, fontSize: 20, fontWeight: '700', marginBottom: 12 },
    title: { color: colors.foreground, fontSize: 16, fontWeight: '600', marginBottom: 8 },
    text: { color: colors.foreground, fontSize: 14, lineHeight: 21 },
    hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
    card: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    button: { minHeight: 44, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#383a40', borderRadius: 6, marginRight: 8, marginBottom: 8 },
    selected: { backgroundColor: '#404b78', borderColor: colors.accent, borderWidth: 1 },
    buttonText: { color: colors.foreground, fontSize: 14 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    input: { color: colors.foreground, backgroundColor: colors.background, borderColor: '#4e5058', borderWidth: 1, borderRadius: 6, padding: 10, minHeight: 44, marginTop: 6, marginBottom: 12 },
  };

  function useServiceUpdates(): void {
    const [, setRevision] = React.useState(0);
    React.useEffect(() => {
      let mounted = true;
      const update = () => { if (mounted) setRevision((revision: number) => revision + 1); };
      const unsubscribe = service.subscribe(update);
      // Re-read after subscribing to cover a change between render and commit.
      update();
      return () => { mounted = false; unsubscribe(); };
    }, []);
  }

  function TranslationBlock({ message }: { message: Message }): any {
    useServiceUpdates();
    const { id, channelId, content } = message;
    React.useEffect(() => { service.consider({ id, channelId, content }); }, [id, channelId, content]);
    // Do not keep a message result in local state: Discord can recycle this cell.
    const translation = service.getTranslation({ id, channelId, content });
    if (!translation?.text) return null;
    const target = service.getSettings().targetLanguage;
    return h(RN.View, {
      testID: 'bing-translation-block',
      style: { marginTop: 6, paddingVertical: 6, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.accent, backgroundColor: colors.background },
    },
    h(RN.Text, { style: { color: colors.muted, fontSize: 11, marginBottom: 3 } }, `译文 · ${target}${translation.detectedLanguage ? ` · ${translation.detectedLanguage} → ${target}` : ''}`),
    h(RN.Text, { selectable: true, style: { color: colors.foreground, fontSize: 14, lineHeight: 21 } }, translation.text));
  }

  function MessageWrapper({ original, message }: { original: any; message: Message }): any {
    const parentIdentity = React.useContext(WrapperContext);
    const identity = JSON.stringify([message.channelId, message.id, message.content]);
    if (parentIdentity === identity) return original;
    return h(WrapperContext.Provider, { value: identity },
      h(RN.View, { testID: 'bing-bilingual-message', style: { alignSelf: 'stretch' } },
        original,
        h(TranslationBlock, { message })));
  }

  function wrapMessage(original: any, message: Message): any {
    return h(MessageWrapper, { original, message });
  }

  function Settings(): any {
    useServiceUpdates();
    const settings = service.getSettings();
    const status = service.getStatus();
    const [localError, setLocalError] = React.useState(null);
    const [selection, setSelection] = React.useState(null as SelectionState | null);
    const [selectionBusy, setSelectionBusy] = React.useState(false);
    const [, setSelectionRevision] = React.useState(0);
    React.useEffect(() => {
      if (!selection) return;
      let mounted = true;
      const stop = service.subscribeSelection(() => { if (mounted) setSelectionRevision((value: number) => value+1); });
      return () => { mounted = false; stop(); };
    }, [!!selection]);
    const snapshot = selection ? service.getSelectionSnapshot() : {channelId: null, messages: [] as Message[]};
    const selectionSignature = JSON.stringify(snapshot.messages.map(m => [m.id, m.content]));
    const chosenMessages = selection?.channelId === snapshot.channelId ? snapshot.messages.filter(m => selection.messages.get(m.id)?.content === m.content) : [];
    React.useEffect(() => {
      if (!selection) return;
      if (selection.channelId !== snapshot.channelId) { setSelection(null); return; }
      const live = new Map(snapshot.messages.map(m => [m.id, m.content]));
      const kept = new Map([...selection.messages.entries()].filter(([id, m]: [string, Message]) => live.get(id) === m.content));
      if (kept.size !== selection.messages.size) setSelection((current: SelectionState | null) => current === selection ? {...current, messages: kept} : current);
    }, [snapshot.channelId, selectionSignature, selection]);
    function openSelection(): void {
      const current = service.getSelectionSnapshot();
      if (!current.channelId || !current.messages.length) { setLocalError('当前频道没有可选的已加载文字消息，请先打开文字频道。'); return; }
      service.stop();
      setLocalError(null);
      setSelection({channelId: current.channelId, messages: new Map(), visible: 25});
    }
    function chooseMessage(message: Message): void {
      setSelection((current: SelectionState | null) => {
        if (!current || selectionBusy) return current;
        const live = service.getSelectionSnapshot();
        if (live.channelId !== current.channelId) return null;
        if (!live.messages.some(m => m.id === message.id && m.content === message.content)) return current;
        const messages = new Map(current.messages);
        if (messages.get(message.id)?.content === message.content) messages.delete(message.id); else messages.set(message.id, {...message});
        return {...current, messages};
      });
    }
    async function translateSelection(): Promise<void> {
      if (!selection || selectionBusy || !chosenMessages.length) return;
      setLocalError(null); setSelectionBusy(true);
      try { await service.translateSelected(selection.channelId, chosenMessages); }
      catch (error) { setLocalError(redact(error instanceof Error ? error.message : String(error))); }
      finally { setSelectionBusy(false); }
    }
    function redact(text: string): string {
      return settings.microsoftKey ? text.split(settings.microsoftKey).join('[redacted]') : text;
    }
    function reportDiagnostics(): string {
      try {
        const diagnostics = { service: status.diagnostics, host: host.diagnostics?.() };
        const json = JSON.stringify(diagnostics, (key, value) => /key|token|password|authorization|secret/i.test(key) ? '[redacted]' : value, 2);
        return redact(json === '{}' ? '尚无诊断信息' : json);
      } catch { return '诊断信息暂不可用'; }
    }
    function button(id: string, label: string, onPress: () => unknown, selected = false, disabled = false): any {
      return h(Button, {
        key: id, testID: id, accessibilityRole: 'button', accessibilityLabel: label,
        accessibilityState: { selected, disabled }, disabled, onPress, style: [styles.button, selected ? styles.selected : null, disabled ? {opacity: 0.5} : null],
      }, h(RN.Text, { style: styles.buttonText }, label));
    }
    function textInput(id: string, label: string, value: string, onChangeText: (text: string) => void, extra: Record<string, unknown> = {}): any {
      return h(RN.View, { key: id },
        h(RN.Text, { style: styles.text }, label),
        h(RN.TextInput, { testID: id, accessibilityLabel: label, value, onChangeText, autoCapitalize: 'none', autoCorrect: false, placeholderTextColor: colors.muted, style: styles.input, ...extra }));
    }
    function toggle(id: string, label: string, value: boolean, onValueChange: (value: boolean) => void): any {
      return h(RN.View, { style: styles.row },
        h(RN.Text, { style: [styles.text, { flex: 1, paddingRight: 8 }] }, label),
        h(RN.Switch, { testID: id, accessibilityLabel: label, value, onValueChange, trackColor: { false: '#4e5058', true: '#5865f2' }, thumbColor: colors.foreground }));
    }
    async function translateLoaded(): Promise<void> {
      setLocalError(null); setSelection(null);
      try { await service.translateLoaded(); }
      catch (error) { setLocalError(redact(error instanceof Error ? error.message : String(error))); }
    }
    const showMicrosoft = settings.provider === 'microsoft' || settings.officialFallback;
    return h(RN.ScrollView, { style: styles.page, contentContainerStyle: styles.content, keyboardShouldPersistTaps: 'handled' },
      h(RN.Text, { style: styles.heading }, 'Bing 双语翻译'),
      h(RN.View, { style: styles.card },
        toggle('auto-translate', '自动翻译新消息', settings.autoTranslate, (enabled) => { if (enabled) { setSelection(null); service.enableAuto(); } else service.configure({ autoTranslate: false }); }),
        h(RN.Text, { style: styles.hint }, '原文保留，译文显示在下方。只处理当前频道已加载的消息。'),
        h(RN.View, { style: styles.wrap },
          button('translate-loaded', '翻译本频道已加载消息', translateLoaded),
          button('open-selection', '选择多条消息', openSelection),
          button('stop-translation', '停止翻译', () => service.stop()),
          button('clear-translations', '清除译文', () => service.clear())),
        h(RN.Text, { style: styles.text, accessibilityLiveRegion: 'polite' }, `${status.active ? '运行中' : settings.autoTranslate ? '自动翻译待命' : '已停止'} · 等待 ${status.pending} · 已取得译文 ${status.translated}`),
        status.lastError || localError ? h(RN.Text, { style: { color: colors.error, fontSize: 13, marginTop: 8 }, accessibilityLiveRegion: 'polite' }, redact(status.lastError || localError)) : null),
      h(RN.Text, { style: [styles.hint, {marginBottom: 12}] }, '进入多选会暂停自动翻译和正在处理的请求。已有译文保留，可随时重新开启自动翻译。'),
      selection ? h(RN.View, { testID: 'selection-panel', style: styles.card },
        h(RN.Text, { style: styles.title }, '勾选消息 · 已选 '+chosenMessages.length+' 条'),
        h(RN.Text, { style: styles.hint }, '仅翻译勾选的普通文字消息，译文显示在对应原文下方。自动翻译已暂停。'),
        h(RN.View, { style: styles.wrap },
          button('translate-selected', selectionBusy ? '正在翻译所选' : '翻译所选（'+chosenMessages.length+'）', translateSelection, false, selectionBusy || !chosenMessages.length),
          button('clear-selection', '清空选择', () => setSelection((current: SelectionState | null) => current ? {...current, messages: new Map()} : null), false, selectionBusy),
          button('close-selection', '收起', () => setSelection(null), false, selectionBusy)),
        ...snapshot.messages.slice(0, selection.visible).map((message, index) => {
          const checked = selection.messages.get(message.id)?.content === message.content;
          return h(Button, { key: message.id, testID: 'select-message-'+message.id, accessibilityRole: 'checkbox', accessibilityLabel: (index+1)+'. '+message.content, accessibilityState: {checked, disabled: selectionBusy}, disabled: selectionBusy, onPress: () => chooseMessage(message), style: [styles.button, checked ? styles.selected : null] },
            h(RN.Text, {style: styles.buttonText}, (checked ? '☑ ' : '☐ ')+(index+1)+'. '+message.content));
        }),
        selection.visible < snapshot.messages.length ? button('more-selection-messages', '显示更多（'+Math.min(selection.visible,snapshot.messages.length)+'/'+snapshot.messages.length+'）', () => setSelection((current: SelectionState | null) => current ? {...current, visible: current.visible+25} : null), false, selectionBusy) : null) : null,
      h(RN.View, { style: styles.card },
        h(RN.Text, { style: styles.title }, `目标语言：${settings.targetLanguage}`),
        h(RN.View, { style: styles.wrap }, ...LANGUAGES.map(([code, label]) => button(`target-${code}`, label, () => service.configure({ targetLanguage: code }), settings.targetLanguage === code)))),
      h(RN.View, { style: styles.card },
        h(RN.Text, { style: styles.title }, '翻译服务'),
        h(RN.View, { style: styles.wrap },
          button('provider-bing', 'Bing 网页翻译', () => service.configure({ provider: 'bing' }), settings.provider === 'bing'),
          button('provider-microsoft', 'Microsoft 官方 API', () => service.configure({ provider: 'microsoft' }), settings.provider === 'microsoft')),
        toggle('official-fallback', 'Bing 失败时使用官方 API', settings.officialFallback, (enabled) => service.configure({ officialFallback: enabled })),
        showMicrosoft ? h(RN.View, null,
          h(RN.Text, { style: styles.hint }, '可选：官方 API 需要你自己的密钥，可能产生费用。密钥仅保存在本机插件设置中。'),
          textInput('microsoft-key', 'Microsoft 密钥', settings.microsoftKey, (value) => service.configure({ microsoftKey: value }), { secureTextEntry: true }),
          textInput('microsoft-region', '资源区域（如 eastasia）', settings.microsoftRegion, (value) => service.configure({ microsoftRegion: value })),
          textInput('microsoft-endpoint', 'API 地址', settings.microsoftEndpoint, (value) => service.configure({ microsoftEndpoint: value }), { keyboardType: 'url' })) : null),
      h(RN.View, { style: styles.card },
        h(RN.Text, { style: styles.title }, '请求节奏'),
        textInput('request-interval', '请求间隔（毫秒）', String(settings.minIntervalMs), (value) => { if (/^\d+$/.test(value)) service.configure({ minIntervalMs: Number(value) }); }, { keyboardType: 'number-pad' }),
        textInput('request-timeout', '请求超时（毫秒）', String(settings.requestTimeoutMs), (value) => { if (/^\d+$/.test(value)) service.configure({ requestTimeoutMs: Number(value) }); }, { keyboardType: 'number-pad' })),
      h(RN.View, { style: styles.card },
        h(RN.Text, { style: styles.title }, '本机诊断'),
        h(RN.Text, { style: styles.hint, selectable: true }, reportDiagnostics())));
  }

  return { TranslationBlock, wrapMessage, Settings };
}
