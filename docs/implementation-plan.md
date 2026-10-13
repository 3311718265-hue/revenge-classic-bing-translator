# Implementation plan

Goal: a built Revenge Classic plugin with local loaded-message bilingual translation and reproducible verification.

Global constraints: Android 16; Discord 348.10; Classic Source URL manifest/index expression format; Bing default; optional Microsoft API; no Google, root, overlay or APK. User explicitly requested implementation and local delivery without another approval checkpoint.

- [x] Pin and inspect official Classic source/API; record evidence and compatibility limits.
- [x] Write executable regression tests for ordered queue deduplication, stop/clear/channel/edit/delete isolation and cache.
- [x] Implement providers with real Bing probes and fake-transport error/abort tests.
- [x] Implement queue/state and confirm tests turn from failing to passing.
- [x] Build a Classic adapter and independent React Native component; test module discovery, hooks, event subscriptions and unloading through a Classic-compatible host harness.
- [x] Add settings, language controls and diagnostics; test target changes and list identity reuse.
- [x] Build the expression bundle, validate manifest and ensure no external imports/DOM/desktop dependencies leak.
- [x] Create Pages deployment workflow, install guide and test evidence.
- [x] Copy verified source and built distribution to the requested local delivery directory and compare hashes.

File responsibilities: src/core/providers.ts owns HTTP; src/core/queue.ts owns ordering/cancellation; src/core/service.ts owns message state/cache; src/runtime/classic.ts owns host APIs; src/ui/components.ts owns RN output/settings; src/index.ts owns lifecycle. Tests use node:test with bundled test entry points and a fake Classic host. Build scripts use esbuild and TypeScript; the generated script is evaluated with the same return-expression contract as Classic's loader.


