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
type Service = {
  subscribe: (callback: () => void) => () => void;
  getTranslation: (message: Message) => { text: string; detectedLanguage?: string } | undefined;
  consider: (message: Message) => void;
  getStatus: () => { pending: number; active: boolean; lastError: string | null; translated: number; diagnostics?: unknown };
  getSettings: () => SettingsState;
  configure: (patch: Record<string, unknown>) => void;
  translateLoaded: () => Promise<void>;
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
    function button(id: string, label: string, onPress: () => unknown, selected = false): any {
      return h(Button, {
        key: id, testID: id, accessibilityRole: 'button', accessibilityLabel: label,
        accessibilityState: { selected }, onPress, style: [styles.button, selected ? styles.selected : null],
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
      setLocalError(null);
      try { await service.translateLoaded(); }
      catch (error) { setLocalError(redact(error instanceof Error ? error.message : String(error))); }
    }
    const showMicrosoft = settings.provider === 'microsoft' || settings.officialFallback;
    return h(RN.ScrollView, { style: styles.page, contentContainerStyle: styles.content, keyboardShouldPersistTaps: 'handled' },
      h(RN.Text, { style: styles.heading }, 'Bing 双语翻译'),
      h(RN.View, { style: styles.card },
        toggle('auto-translate', '自动翻译新消息', settings.autoTranslate, (enabled) => enabled ? service.enableAuto() : service.configure({ autoTranslate: false })),
        h(RN.Text, { style: styles.hint }, '原文保留，译文显示在下方。只处理当前频道已加载的消息。'),
        h(RN.View, { style: styles.wrap },
          button('translate-loaded', '翻译本频道已加载消息', translateLoaded),
          button('stop-translation', '停止翻译', () => service.stop()),
          button('clear-translations', '清除译文', () => service.clear())),
        h(RN.Text, { style: styles.text, accessibilityLiveRegion: 'polite' }, `${status.active ? '运行中' : settings.autoTranslate ? '自动翻译待命' : '已停止'} · 等待 ${status.pending} · 已取得译文 ${status.translated}`),
        status.lastError || localError ? h(RN.Text, { style: { color: colors.error, fontSize: 13, marginTop: 8 }, accessibilityLiveRegion: 'polite' }, redact(status.lastError || localError)) : null),
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
