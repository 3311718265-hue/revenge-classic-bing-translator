# Revenge Classic Bing Translator design

Target: Android 16, Discord 348.10, Revenge **Classic**. A JavaScript plugin installed from a static Source URL, without root, overlays or a separate APK.

The existing desktop Translator is the reference, not an Android runtime dependency. Reuse the Bing session extraction, language mapping, automatic detection and bounded retry approach. Rewrite all BetterDiscord, DOM, selection and renderer integrations. Only Bing and the explicitly configured Microsoft Translator provider ship.

Three boundaries:

1. Translation providers: abort-aware fetch, regional session origin, token expiry, bounded retries, per-request rate gate and safe long-text splitting. Official Microsoft credentials are optional local settings. Web Bing is experimental and must not be described as guaranteed or stable.
2. Queue and state: a single FIFO worker, bounded queue/cache, deduplication by exact text/provider/target, message/channel identity, revision guards, clear/stop/edit/delete/channel-switch cancellation. Only locally loaded messages are scanned; the plugin does not fetch additional Discord history itself.
3. Classic adapter: Vendetta compatibility API, Flux stores/events and Classic JSX hooks, independent React Native translation component below the untouched original. Component state follows message identity, never recycled list position. Settings offer automatic translation, loaded-channel translation, stop, clear, language and optional official provider configuration.

Renderer discovery must be checked at runtime. Discord internals are private and 348.10 has no connected phone in this environment. Do not assert compatibility based on registration alone: diagnostics distinguish installed hooks from observed message render matches. Unsupported rendering must remain safe and produce a useful diagnostic instead of changing message data.

Verification: typecheck/build; executable queue/provider/state/renderer lifecycle tests; evaluation of the generated Classic expression bundle; live public Bing translation probes with fixed multilingual samples. Deliver source, manifest.json, index.js, GitHub Pages workflow/site and instructions. Record live failures honestly. User requested final files in the requested local delivery directory; work is prepared here and copied there after verification. No public repository or phone is available, so public publication and Android end-to-end verification remain outside the completed local checks.
