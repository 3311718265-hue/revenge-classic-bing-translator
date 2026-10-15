(function(){
var ClassicBingPlugin = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // src/runtime/message-menu.ts
  function installClassicMessageMenu(api, host, source, stats) {
    let active = true, unpatch, stopLazy, lazyAttempted = false;
    const busy = /* @__PURE__ */ new Set(), React = host.React, globals = globalThis;
    const safe = (fn) => {
      try {
        return fn();
      } catch {
        return void 0;
      }
    };
    const find = (...keys) => {
      const modules = api?.metro?.modules ?? globals.modules;
      const matches = (value) => !!value && safe(() => value[Symbol.toStringTag] !== "IntlMessagesProxy" && keys.every((key) => {
        const member = value[key];
        return typeof member === "function" || !!member && typeof member === "object" && ["react.memo", "react.forward_ref", "react.lazy"].some((tag) => member.$$typeof === Symbol.for(tag));
      }));
      if (modules && typeof modules === "object") for (const entry of Object.values(modules)) {
        if (!entry?.isInitialized || entry.hasError) continue;
        for (const value of [safe(() => entry.publicModule?.exports), safe(() => entry.publicModule?.exports?.default)]) if (matches(value)) return value;
      }
      const found = safe(() => api?.metro?.findByProps?.(...keys));
      return matches(found) ? found : void 0;
    };
    const current = (message) => host.getCurrentChannel() === message.channelId ? host.getLoadedMessages(message.channelId).find((m) => m.id === message.id && m.content === message.content) : void 0;
    const messageFor = (props) => {
      const record = props?.message, channel = record?.channel_id ?? record?.channelId ?? props?.channel?.id;
      return typeof channel === "string" ? host.getLoadedMessages(channel).find((m) => m.id === record?.id && m.channelId === channel && m.content === record?.content) : void 0;
    };
    const notify = (text) => safe(() => api.ui?.toasts?.showToast?.(text));
    const addRow = (tree, message) => {
      const components = find("ActionSheetRow"), Row = components?.ActionSheetRow, Sheet = components?.ActionSheet ?? find("ActionSheet")?.ActionSheet, Group = Row?.Group;
      if (!Row || !Sheet || !Group) {
        stats.messageMenuMissingComponents++;
        return tree;
      }
      const target = source.getSettings().targetLanguage;
      const onPress = async () => {
        if (!active || !current(message) || busy.has(message.id)) return;
        if (source.getSettings().targetLanguage !== target) {
          notify("\u76EE\u6807\u8BED\u8A00\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u6D88\u606F\u83DC\u5355\u3002");
          return;
        }
        busy.add(message.id);
        safe(() => find("hideActionSheet")?.hideActionSheet());
        try {
          const result2 = await source.translateMessage(message);
          if (!active || !current(message) || source.getSettings().targetLanguage !== target) return;
          if (!result2?.text) {
            notify(source.getStatus().lastError ?? "\u6CA1\u6709\u53D6\u5F97\u8BD1\u6587\uFF0C\u8BF7\u5728\u63D2\u4EF6\u8BBE\u7F6E\u67E5\u770B\u72B6\u6001\u3002");
            return;
          }
        } catch {
          if (active) notify("\u7FFB\u8BD1\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u5728\u63D2\u4EF6\u8BBE\u7F6E\u67E5\u770B\u72B6\u6001\u3002");
        } finally {
          busy.delete(message.id);
        }
      };
      const Boundary = api.ui?.components?.ErrorBoundary;
      const group = React.createElement(Group, { key: "classic-bing-translate" }, React.createElement(Row, { label: "\u7FFB\u8BD1\u8FD9\u6761\u6D88\u606F", subLabel: "\u76EE\u6807\u8BED\u8A00\uFF1A" + target, onPress }));
      const entry = Boundary ? React.createElement(Boundary, { key: "classic-bing-translate" }, group) : group;
      let inserted = false, visited = 0;
      const walk = (node, inside = false, depth = 0) => {
        if (++visited > 400 || depth > 40 || !node) return node;
        if (Array.isArray(node)) {
          let changed = false;
          const next2 = node.map((child) => {
            const value = walk(child, inside, depth + 1);
            changed || (changed = value !== child);
            return value;
          });
          return changed ? next2 : node;
        }
        if (!React.isValidElement(node)) return node;
        const within = inside || node.type === Sheet, children = node.props.children, list = Array.isArray(children) ? children : [children];
        if (!inserted && within && list.some((child) => child?.type === Group)) {
          inserted = true;
          return React.cloneElement(node, {}, [entry, ...list]);
        }
        const next = walk(children, within, depth + 1);
        return next === children ? node : React.cloneElement(node, {}, next);
      };
      const result = walk(tree);
      if (inserted) stats.messageMenuInjections++;
      else stats.messageMenuNoContainer++;
      return result;
    };
    const before = api?.patcher?.before ?? globals.bunny?.api?.patcher?.before;
    stats.messageMenuDiscoveryAttempts = 0;
    stats.messageMenuDiscoveryStatus = "waiting";
    stats.messageMenuReactAvailable = typeof safe(() => React?.cloneElement) === "function";
    stats.messageMenuPatcherAvailable = typeof before === "function";
    stats.messageMenuLazyAvailable = false;
    stats.messageMenuLazyPending = false;
    const attach = (sheets) => {
      if (!active || unpatch || typeof safe(() => sheets?.openLazy) !== "function" || typeof safe(() => sheets?.hideActionSheet) !== "function") return;
      try {
        unpatch = before("openLazy", sheets, (args) => {
          if (!active) return;
          stats.messageMenuCalls++;
          const [lazy, key, props] = args;
          if (typeof key !== "string" || !/message/i.test(key) || /channel|forum|guild|thread/i.test(key)) return;
          stats.messageMenuObserved++;
          const message = messageFor(props);
          if (!message || !current(message) || !lazy || typeof lazy.then !== "function") {
            stats.messageMenuRejected++;
            return;
          }
          const next = [...args];
          next[0] = lazy.then((mod) => {
            if (!active || typeof mod?.default !== "function") return mod;
            const Original = mod.default;
            return { ...mod, default: function ClassicBingMessageSheet(componentProps) {
              const tree = Original(componentProps);
              if (!active) return tree;
              try {
                const actual = messageFor(componentProps);
                if (!actual || !current(actual)) {
                  stats.messageMenuRejected++;
                  return tree;
                }
                return addRow(tree, actual);
              } catch {
                stats.messageMenuInjectionErrors++;
                return tree;
              }
            } };
          });
          return next;
        });
        stats.messageMenuHookAvailable = true;
        stats.messageMenuDiscoveryStatus = "hooked";
        stats.messageMenuLazyPending = false;
      } catch {
        stats.messageMenuInjectionErrors++;
        stats.messageMenuDiscoveryStatus = "patch-failed";
      }
    };
    const discover = () => {
      if (!active || unpatch) return;
      stats.messageMenuDiscoveryAttempts++;
      if (!stats.messageMenuReactAvailable) {
        stats.messageMenuDiscoveryStatus = "react-unavailable";
        return;
      }
      if (!stats.messageMenuPatcherAvailable) {
        stats.messageMenuDiscoveryStatus = "patcher-unavailable";
        return;
      }
      attach(find("openLazy", "hideActionSheet"));
      if (unpatch || stats.messageMenuDiscoveryStatus === "patch-failed") return;
      stats.messageMenuDiscoveryStatus = stats.messageMenuLazyPending ? "waiting-for-classic-module" : "message-sheet-not-found";
      const metro = globals.bunny?.metro;
      if (lazyAttempted || typeof metro?.findByPropsLazy !== "function" || typeof metro?.lazy?.getLazyContext !== "function") return;
      lazyAttempted = true;
      stats.messageMenuLazyAvailable = true;
      try {
        const proxy = metro.findByPropsLazy("openLazy", "hideActionSheet"), context = metro.lazy.getLazyContext(proxy);
        if (typeof context?.getExports !== "function") {
          stats.messageMenuDiscoveryStatus = "classic-lazy-context-unavailable";
          return;
        }
        stats.messageMenuLazyPending = true;
        stats.messageMenuDiscoveryStatus = "waiting-for-classic-module";
        stopLazy = context.getExports((sheets) => {
          if (active) {
            stats.messageMenuLazyPending = false;
            attach(sheets);
            if (!unpatch && stats.messageMenuDiscoveryStatus !== "patch-failed") stats.messageMenuDiscoveryStatus = "classic-module-missing-sheet-methods";
          }
        });
      } catch {
        stats.messageMenuLazyPending = false;
        stats.messageMenuDiscoveryStatus = "classic-lazy-resolution-failed";
      }
    };
    discover();
    const stopObserve = host.observe(discover);
    return () => {
      if (!active) return;
      active = false;
      stopObserve();
      safe(() => stopLazy?.());
      unpatch?.();
      busy.clear();
      stats.messageMenuHookAvailable = false;
      stats.messageMenuLazyPending = false;
      stats.messageMenuDiscoveryStatus = "stopped";
    };
  }

  // src/runtime/classic.ts
  function createClassicHost(api, storage, logger) {
    const globals = globalThis;
    const metro = api?.metro ?? {};
    const common = metro.common ?? {};
    const log = logger ?? console;
    const safely = (fn) => {
      try {
        return fn();
      } catch {
        return void 0;
      }
    };
    const findProps = (...props) => safely(() => metro.findByProps?.(...props));
    const findStore = (name) => safely(() => metro.findByStoreName?.(name));
    const messageStore = findStore("MessageStore") ?? findProps("getMessages", "getMessage");
    const channelStore = findStore("SelectedChannelStore") ?? findProps("getChannelId");
    const dispatcher = common.FluxDispatcher ?? findProps("dispatch", "subscribe", "unsubscribe");
    const jsx = api?.api?.react?.jsx ?? globals.bunny?.api?.react?.jsx;
    const React = common.React ?? globals.bunny?.metro?.common?.React;
    const RN = common.ReactNative ?? globals.bunny?.metro?.common?.ReactNative;
    const stats = { observedMessageRenders: 0, rejectedMessageProps: 0, rendererErrors: 0, registeredNames: [], observedComponent: null, activeRenderer: false };
    const menuStats = { messageMenuHookAvailable: false, messageMenuCalls: 0, messageMenuObserved: 0, messageMenuInjections: 0, messageMenuRejected: 0, messageMenuMissingComponents: 0, messageMenuNoContainer: 0, messageMenuInjectionErrors: 0 };
    const generateRejected = {};
    let lastGenerateShape = null, nativeGenerateCalls = 0;
    const nativeStats = { nativeHookAvailable: false, nativeRowsObserved: 0, nativeRowsTranslated: 0, nativeUnsupportedRows: 0, nativeReplayCount: 0, nativeOriginalsLimitReached: false, nativeActive: false, nativeContentNodeRows: 0, nativeLocalRepaints: 0, nativeRepaintUnavailable: false, nativeRepaintLimitReached: false, nativeRowManagerActive: false, nativeRowManagerHooks: 0, nativeDiscoveryAttempts: 0, nativeDiscoveryStatus: "waiting" };
    let restoreNative;
    const snowflake = (value) => typeof value === "string" && /^\d{15,22}$/.test(value);
    const ref = (record) => {
      if (!record || typeof record !== "object") return null;
      const channelId = record.channel_id ?? record.channelId;
      return snowflake(record.id) && snowflake(channelId) && typeof record.content === "string" ? { id: record.id, channelId, content: record.content } : null;
    };
    const getCurrentChannel = () => {
      const id = safely(() => channelStore?.getChannelId?.());
      return snowflake(id) ? id : null;
    };
    const getLoadedMessages = (channelId) => {
      if (!snowflake(channelId)) return [];
      const result = safely(() => {
        const collection = messageStore?.getMessages?.(channelId);
        const rows = Array.isArray(collection) ? collection : Array.isArray(collection?._array) ? collection._array : typeof collection?.toArray === "function" ? collection.toArray() : collection instanceof Map ? Array.from(collection.values()) : [];
        if (!Array.isArray(rows)) return [];
        const found = /* @__PURE__ */ new Map();
        for (const row of rows) {
          const message = ref(row);
          if (message?.channelId === channelId) found.set(message.id, message);
        }
        return Array.from(found.values());
      });
      return result ?? [];
    };
    const observe = (callback) => {
      let active = true;
      const disposers = [];
      const emit = (event) => {
        Promise.resolve().then(() => {
          if (active) callback(event);
        }).catch((e) => log.warn("Classic observation callback failed", e));
      };
      const eventChannel = (payload) => {
        const id = payload?.channelId ?? payload?.channel_id ?? payload?.message?.channel_id ?? payload?.message?.channelId;
        return snowflake(id) ? id : void 0;
      };
      const subscribe = (name, fn) => {
        if (typeof dispatcher?.subscribe !== "function" || typeof dispatcher?.unsubscribe !== "function") return;
        try {
          dispatcher.subscribe(name, fn);
          disposers.push(() => dispatcher.unsubscribe(name, fn));
        } catch (e) {
          log.warn("Classic event unavailable", name, e);
        }
      };
      for (const type of ["MESSAGE_CREATE", "MESSAGE_UPDATE", "LOAD_MESSAGES_SUCCESS", "LOAD_MESSAGES_AROUND_SUCCESS", "LOAD_RECENT_MESSAGES_SUCCESS", "LOAD_MESSAGES_FOR_CHANNEL_SUCCESS"])
        subscribe(type, (p) => emit({ type: "messages", channelId: eventChannel(p) ?? getCurrentChannel() ?? void 0 }));
      subscribe("CHANNEL_SELECT", (p) => emit({ type: "channel", channelId: eventChannel(p) ?? getCurrentChannel() ?? void 0 }));
      subscribe("MESSAGE_DELETE", (p) => {
        const id = p?.id ?? p?.messageId;
        if (snowflake(id)) emit({ type: "delete", channelId: eventChannel(p), messageId: id });
      });
      subscribe("MESSAGE_DELETE_BULK", (p) => {
        for (const id of Array.isArray(p?.ids) ? p.ids : []) if (snowflake(id)) emit({ type: "delete", channelId: eventChannel(p), messageId: id });
      });
      const listen = (store, fn) => {
        if (typeof store?.addChangeListener !== "function" || typeof store?.removeChangeListener !== "function") return;
        try {
          store.addChangeListener(fn);
          disposers.push(() => store.removeChangeListener(fn));
        } catch (e) {
          log.warn("Classic store listener unavailable", e);
        }
      };
      listen(messageStore, () => emit({ type: "messages", channelId: getCurrentChannel() ?? void 0 }));
      listen(channelStore, () => emit({ type: "channel", channelId: getCurrentChannel() ?? void 0 }));
      return () => {
        if (!active) return;
        active = false;
        for (const dispose of disposers.splice(0)) try {
          dispose();
        } catch (e) {
          log.warn("Classic observer cleanup failed", e);
        }
      };
    };
    const installMessageRenderer = (render) => {
      if (typeof jsx?.onJsxCreate !== "function" || typeof jsx?.deleteJsxCreate !== "function") {
        log.warn("Classic JSX hook API unavailable; checking the native message bridge separately");
        return () => {
        };
      }
      let active = true;
      const registrations = [];
      const candidates = ["MessageContent", "MessageBody", "ChatMessage", "MessageRow"];
      for (const name of candidates) {
        const cb = (_component, original) => {
          if (!active || !original?.props || stats.observedComponent && stats.observedComponent !== name) return original;
          const props = original.props;
          const candidate = ref(props.message) ?? ref(props.item?.message) ?? ref(props.messageRecord);
          if (!candidate) return original;
          const stored = ref(safely(() => messageStore?.getMessage?.(candidate.channelId, candidate.id)));
          if (!stored || stored.content !== candidate.content) {
            stats.rejectedMessageProps++;
            return original;
          }
          try {
            const result = render(original, stored);
            if (result === void 0 || result === null) return original;
            const wasUnobserved = stats.observedMessageRenders === 0;
            stats.observedComponent = name;
            stats.observedMessageRenders++;
            if (wasUnobserved) restoreNative?.();
            return result;
          } catch (e) {
            stats.rendererErrors++;
            log.warn("Classic translation renderer failed safely", e);
            return original;
          }
        };
        try {
          jsx.onJsxCreate(name, cb);
          registrations.push([name, cb]);
        } catch (e) {
          log.warn("Classic JSX candidate unavailable", name, e);
        }
      }
      stats.registeredNames = registrations.map(([name]) => name);
      stats.activeRenderer = registrations.length > 0;
      return () => {
        if (!active) return;
        active = false;
        stats.activeRenderer = false;
        for (const [name, cb] of registrations.splice(0)) try {
          jsx.deleteJsxCreate(name, cb);
        } catch (e) {
          log.warn("Classic JSX cleanup failed", name, e);
        }
        stats.registeredNames = [];
        stats.observedComponent = null;
      };
    };
    const installBridgeTranslations = (source, bridge) => {
      const before = api?.patcher?.before ?? globals.bunny?.api?.patcher?.before;
      nativeStats.nativeHookAvailable = typeof bridge?.updateRows === "function" && typeof before === "function";
      if (!nativeStats.nativeHookAvailable) return () => {
      };
      let active = true, replaying = false, timer;
      let channel = null, lastArgs;
      const originals = /* @__PURE__ */ new Map();
      const sourceRevisions = /* @__PURE__ */ new Map();
      const repaintKeys = /* @__PURE__ */ new Set();
      const originalMethod = bridge.updateRows;
      const reset = (next) => {
        originals.clear();
        sourceRevisions.clear();
        repaintKeys.clear();
        lastArgs = void 0;
        channel = next;
      };
      const storedForRow = (row) => {
        if (row?.type !== 1 || !Number.isSafeInteger(row.index) || row.index < 0 || !row.message || typeof row.message !== "object") return null;
        const id = row.message.id, channelId = row.message.channelId ?? row.message.channel_id;
        if (!snowflake(id) || !snowflake(channelId) || channelId !== getCurrentChannel()) return null;
        const stored = ref(safely(() => messageStore?.getMessage?.(channelId, id)));
        if (!stored || stored.id !== id || stored.channelId !== channelId) return null;
        const content = row.message.content;
        if (typeof content === "string") return content === stored.content ? stored : null;
        return Array.isArray(content) && content.every((node) => typeof node === "string" || node && typeof node === "object" && !Array.isArray(node) && typeof node.type === "string") ? stored : null;
      };
      const decorate = (row, message) => {
        if (stats.observedMessageRenders > 0) return row;
        const translation = safely(() => source.getTranslation(message));
        if (!translation || typeof translation.text !== "string" || !translation.text.trim()) return row;
        const target = safely(() => source.getSettings().targetLanguage);
        if (typeof target !== "string" || target.length > 40 || /[\r\n]/.test(target)) return row;
        nativeStats.nativeRowsTranslated++;
        const content = Array.isArray(row.message.content) ? [...row.message.content, "\n", { type: "subtext", content: ["\u8BD1\u6587 \xB7 " + target] }, "\n", translation.text] : row.message.content + "\n\n[\u8BD1\u6587 \xB7 " + target + "]\n" + translation.text;
        return { ...row, message: { ...row.message, content } };
      };
      const replay = (restoreOnly = false) => {
        if (!active || !lastArgs || !channel || getCurrentChannel() !== channel) return;
        const rows = [];
        for (const [index, row] of originals) {
          const stored = storedForRow(row);
          if (!stored || stored.content !== sourceRevisions.get(index)) {
            originals.delete(index);
            sourceRevisions.delete(index);
            continue;
          }
          const repaint = restoreOnly ? row : decorate(row, stored);
          rows.push(Number.isInteger(row.changeType) ? { ...repaint, index, changeType: 2 } : repaint);
        }
        if (!rows.length) return;
        const args = [...lastArgs];
        args[1] = JSON.stringify(rows);
        if (typeof args[2] === "boolean") args[2] = false;
        try {
          replaying = true;
          originalMethod.apply(bridge, args);
          nativeStats.nativeReplayCount++;
        } catch (e) {
          log.warn("Classic native translation replay failed", e);
        } finally {
          replaying = false;
        }
      };
      const scheduleReplay = () => {
        if (!active) return;
        if (timer !== void 0) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = void 0;
          replay();
        }, 75);
        Promise.resolve().then(() => {
          if (!active || stats.observedMessageRenders > 0) return;
          const current = getCurrentChannel();
          if (!current) return;
          if (channel !== current) reset(current);
          for (const message of getLoadedMessages(current)) {
            if (!active || getCurrentChannel() !== current) return;
            const captured = Array.from(originals.entries()).some(([index, row]) => row.message?.id === message.id && sourceRevisions.get(index) === message.content);
            if (captured) continue;
            const translation = safely(() => source.getTranslation(message));
            const target = safely(() => source.getSettings().targetLanguage);
            if (typeof translation?.text !== "string" || !translation.text.trim() || typeof target !== "string") continue;
            const key = JSON.stringify([current, message.id, message.content, target, translation.text]);
            if (repaintKeys.has(key)) continue;
            if (repaintKeys.size >= 500) {
              nativeStats.nativeRepaintLimitReached = true;
              continue;
            }
            if (typeof dispatcher?.dispatch !== "function") {
              nativeStats.nativeRepaintUnavailable = true;
              continue;
            }
            const record = safely(() => messageStore?.getMessage?.(current, message.id));
            const latest = ref(record);
            if (!latest || latest.id !== message.id || latest.channelId !== current || latest.content !== message.content || !active || getCurrentChannel() !== current) continue;
            repaintKeys.add(key);
            nativeStats.nativeLocalRepaints++;
            try {
              Promise.resolve(dispatcher.dispatch({ type: "MESSAGE_UPDATE", message: record })).catch((e) => log.warn("Classic local native repaint failed", e));
            } catch (e) {
              log.warn("Classic local native repaint failed", e);
            }
          }
        }).catch((e) => log.warn("Classic loaded-message repaint scan failed", e));
      };
      restoreNative = () => {
        if (!active) return;
        if (timer !== void 0) {
          clearTimeout(timer);
          timer = void 0;
        }
        Promise.resolve().then(() => {
          if (active) replay(true);
        });
      };
      let unpatch, unpatchClear = () => {
      };
      try {
        unpatch = before("updateRows", bridge, (args) => {
          if (!active || replaying || typeof args?.[1] !== "string") return;
          const rows = safely(() => JSON.parse(args[1]));
          if (!Array.isArray(rows) || rows.length > 2e3) {
            nativeStats.nativeUnsupportedRows++;
            return;
          }
          const current = getCurrentChannel();
          if (!current) return;
          if (channel !== current || lastArgs && lastArgs[0] !== args[0]) reset(current);
          lastArgs = [...args];
          const consider = /* @__PURE__ */ new Map();
          const admitted = /* @__PURE__ */ new Set();
          const shift = (at, delta) => {
            const entries = Array.from(originals.entries());
            const revisions = new Map(sourceRevisions);
            originals.clear();
            sourceRevisions.clear();
            for (const [index, row] of entries) {
              const next = index >= at ? index + delta : index;
              originals.set(next, next === index ? row : { ...row, index: next });
              sourceRevisions.set(next, revisions.get(index));
            }
          };
          const remember = (row) => {
            const message = storedForRow(row);
            if (!message) return;
            if (!originals.has(row.index) && originals.size >= 1e3) {
              nativeStats.nativeOriginalsLimitReached = true;
              return;
            }
            originals.set(row.index, row);
            sourceRevisions.set(row.index, message.content);
            admitted.add(row);
          };
          for (const row of rows) if (row?.changeType === 1 && Number.isSafeInteger(row.index) && row.index >= 0) {
            shift(row.index, 1);
            remember(row);
          }
          for (const row of [...rows].reverse()) if ((row?.changeType === 2 || row?.changeType === 3) && Number.isSafeInteger(row.index) && row.index >= 0) {
            originals.delete(row.index);
            sourceRevisions.delete(row.index);
            if (row.changeType === 3) shift(row.index + 1, -1);
            else remember(row);
          }
          for (const row of rows) if (row?.changeType === void 0) remember(row);
          let changed = false;
          const replacement = rows.map((row) => {
            const message = storedForRow(row);
            if (!message || !admitted.has(row)) {
              nativeStats.nativeUnsupportedRows++;
              return row;
            }
            nativeStats.nativeRowsObserved++;
            if (Array.isArray(row.message.content)) nativeStats.nativeContentNodeRows++;
            consider.set(message.channelId + ":" + message.id, message);
            const result = decorate(row, message);
            if (result !== row) changed = true;
            return result;
          });
          if (consider.size) Promise.resolve().then(() => {
            if (active && getCurrentChannel() === current) for (const message of consider.values()) source.consider(message);
          }).catch((e) => log.warn("Classic native queue consideration failed", e));
          if (changed) {
            const replacementArgs = [...args];
            replacementArgs[1] = JSON.stringify(replacement);
            return replacementArgs;
          }
        });
        if (typeof bridge.clearRows === "function") unpatchClear = before("clearRows", bridge, (args) => {
          if (active && !replaying && (!lastArgs || args?.[0] === lastArgs[0])) reset(getCurrentChannel());
        });
      } catch (e) {
        try {
          unpatchClear();
          unpatch?.();
        } catch {
        }
        log.warn("Classic native hook unavailable", e);
        restoreNative = void 0;
        return () => {
        };
      }
      let unsubscribe;
      try {
        unsubscribe = source.subscribe(scheduleReplay);
      } catch (e) {
        unpatchClear();
        unpatch();
        restoreNative = void 0;
        log.warn("Classic native source subscription unavailable", e);
        return () => {
        };
      }
      nativeStats.nativeActive = true;
      return () => {
        if (!active) return;
        if (timer !== void 0) {
          clearTimeout(timer);
          timer = void 0;
        }
        replay(true);
        active = false;
        nativeStats.nativeActive = false;
        restoreNative = void 0;
        try {
          unsubscribe();
        } catch (e) {
          log.warn("Classic native service cleanup failed", e);
        }
        try {
          unpatch();
        } catch (e) {
          log.warn("Classic native hook cleanup failed", e);
        }
        try {
          unpatchClear();
        } catch (e) {
          log.warn("Classic native clear-hook cleanup failed", e);
        }
        originals.clear();
        sourceRevisions.clear();
        repaintKeys.clear();
        lastArgs = void 0;
      };
    };
    const installNativeTranslations = (source) => {
      let active = true, installed = false, refreshPending = false, attempts = 0;
      let stopBridge;
      const patches = [], seen = /* @__PURE__ */ new Set();
      const tracked = /* @__PURE__ */ new Map(), painted = /* @__PURE__ */ new Map();
      const generatedContent = /* @__PURE__ */ new Map();
      const after = api?.patcher?.after ?? globals.bunny?.api?.patcher?.after;
      const before = api?.patcher?.before ?? globals.bunny?.api?.patcher?.before;
      const stored = (message) => ref(safely(() => messageStore?.getMessage?.(message.channelId, message.id)));
      const restoreGenerated = (all = false) => {
        for (const [nativeMessage, entry] of generatedContent) {
          const current = stored(entry.message);
          const translation = !all && current && current.content === entry.message.content && current.channelId === getCurrentChannel() && stats.observedMessageRenders === 0 ? safely(() => source.getTranslation(current)) : void 0;
          const signature = translation?.text ? JSON.stringify([current.content, source.getSettings().targetLanguage, translation.text]) : "";
          if (!all && signature === entry.signature && nativeMessage.content === entry.replacement) continue;
          if (nativeMessage.content === entry.replacement) nativeMessage.content = entry.original;
          generatedContent.delete(nativeMessage);
        }
      };
      const refreshRows = (restoreOnly = false) => {
        if (!active || !nativeStats.nativeRowManagerActive) return;
        restoreGenerated(restoreOnly);
        const channel = getCurrentChannel();
        if (!channel) return;
        const messages = /* @__PURE__ */ new Map();
        for (const message of [...tracked.values(), ...getLoadedMessages(channel)]) if (message.channelId === channel) messages.set(message.id, message);
        for (const message of messages.values()) {
          const current = stored(message);
          if (!current || current.channelId !== channel) continue;
          const translation = restoreOnly || stats.observedMessageRenders > 0 ? void 0 : safely(() => source.getTranslation(current));
          const signature = translation?.text ? JSON.stringify([current.content, source.getSettings().targetLanguage, translation.text]) : "";
          if (!painted.has(current.id) && !signature) continue;
          if (!restoreOnly && painted.get(current.id) === signature) continue;
          if (typeof dispatcher?.dispatch !== "function") {
            nativeStats.nativeRepaintUnavailable = true;
            continue;
          }
          painted.set(current.id, signature);
          nativeStats.nativeLocalRepaints++;
          try {
            Promise.resolve(dispatcher.dispatch({ type: "MESSAGE_UPDATE", message: safely(() => messageStore.getMessage(channel, current.id)) })).catch(() => log.warn("Classic RowManager repaint failed"));
          } catch {
            log.warn("Classic RowManager repaint failed");
          }
        }
        while (painted.size > 500) painted.delete(painted.keys().next().value);
      };
      const scheduleRefresh = () => {
        if (!active || refreshPending) return;
        refreshPending = true;
        Promise.resolve().then(() => {
          refreshPending = false;
          if (active) refreshRows();
        }).catch(() => log.warn("Classic RowManager refresh failed"));
      };
      const patchRowManager = (manager) => {
        const parent = manager?.prototype;
        if (typeof parent?.generate !== "function" || typeof after !== "function" || seen.has(parent) || seen.size >= 10) return;
        try {
          const unpatch = after("generate", parent, (args, row) => {
            if (!active) return row;
            nativeGenerateCalls++;
            lastGenerateShape = { argumentCount: args?.length ?? 0, inputHasMessage: !!args?.[0]?.message, inputContentKind: typeof args?.[0]?.message?.content, rowTypeIsMessage: args?.[0]?.rowType === 1, resultKind: typeof row, resultHasMessage: !!row?.message, resultContentIsArray: Array.isArray(row?.message?.content) };
            const reject = (reason) => {
              generateRejected[reason] = (generateRejected[reason] ?? 0) + 1;
              return row;
            };
            if (args?.[0]?.rowType !== 1) return reject("rowKind");
            if (!row?.message) return reject("rowShape");
            const message = ref(args[0].message), current = message && stored(message);
            if (!message) return reject("sourceShape");
            if (!current) return reject("storeRecord");
            if (message.channelId !== getCurrentChannel() || current.content !== message.content) return reject("sourceMismatch");
            if (row.message.id !== current.id) return reject("rowIdentity");
            const rowChannel = row.message.channelId ?? row.message.channel_id;
            if (rowChannel !== void 0 && rowChannel !== current.channelId) return reject("rowChannel");
            const nativeMessage = row.message;
            if (nativeMessage === args[0].message || nativeMessage === safely(() => messageStore.getMessage(current.channelId, current.id))) {
              nativeStats.nativeUnsupportedRows++;
              return reject("sourceAlias");
            }
            const previous = generatedContent.get(nativeMessage);
            const content = previous && nativeMessage.content === previous.replacement ? previous.original : nativeMessage.content;
            if (!(typeof content === "string" && content === current.content) && !(Array.isArray(content) && content.every((node) => typeof node === "string" || node && typeof node === "object" && !Array.isArray(node) && typeof node.type === "string"))) {
              nativeStats.nativeUnsupportedRows++;
              return reject("contentShape");
            }
            nativeStats.nativeRowsObserved++;
            if (Array.isArray(content)) nativeStats.nativeContentNodeRows++;
            tracked.set(current.id, current);
            while (tracked.size > 500) tracked.delete(tracked.keys().next().value);
            Promise.resolve().then(() => {
              if (active && getCurrentChannel() === current.channelId) source.consider(current);
            }).catch(() => log.warn("Classic RowManager translation consideration failed"));
            if (stats.observedMessageRenders > 0) {
              restoreGenerated(true);
              return row;
            }
            const translation = safely(() => source.getTranslation(current)), target = safely(() => source.getSettings().targetLanguage);
            if (typeof translation?.text !== "string" || !translation.text.trim() || typeof target !== "string" || target.length > 40 || /[\r\n]/.test(target)) {
              if (previous && nativeMessage.content === previous.replacement) nativeMessage.content = previous.original;
              generatedContent.delete(nativeMessage);
              return row;
            }
            if (!generatedContent.has(nativeMessage) && generatedContent.size >= 500) {
              nativeStats.nativeOriginalsLimitReached = true;
              return row;
            }
            const signature = JSON.stringify([current.content, target, translation.text]);
            const next = Array.isArray(content) ? [...content, "\n", { type: "subtext", content: ["\u8BD1\u6587 \xB7 " + target] }, "\n", translation.text] : content + "\n\n[\u8BD1\u6587 \xB7 " + target + "]\n" + translation.text;
            try {
              nativeMessage.content = next;
            } catch {
              nativeStats.nativeUnsupportedRows++;
              return row;
            }
            if (nativeMessage.content !== next) {
              nativeStats.nativeUnsupportedRows++;
              return row;
            }
            generatedContent.set(nativeMessage, { message: current, original: content, replacement: next, signature });
            nativeStats.nativeRowsTranslated++;
            painted.set(current.id, signature);
            return row;
          });
          seen.add(parent);
          patches.push(unpatch);
          nativeStats.nativeRowManagerHooks = seen.size;
          nativeStats.nativeRowManagerActive = true;
          nativeStats.nativeActive = true;
          nativeStats.nativeDiscoveryStatus = "row-manager";
          installed = true;
          restoreNative = () => refreshRows(true);
          scheduleRefresh();
        } catch {
          log.warn("Classic RowManager hook unavailable");
        }
      };
      const discover = () => {
        if (!active || stopBridge) return;
        nativeStats.nativeDiscoveryAttempts++;
        const initializedManagers = [], initializedBridges = [];
        const modules = metro.modules ?? globals.modules;
        if (modules && typeof modules === "object") for (const key of Object.keys(modules)) {
          const entry = safely(() => modules[key]);
          if (!entry?.isInitialized || entry.hasError) continue;
          const exports = safely(() => entry.publicModule?.exports);
          for (const value of [exports, safely(() => exports?.default), safely(() => exports?.RowManager)])
            if (typeof value === "function" && value.name === "RowManager" && typeof value.prototype?.generate === "function") initializedManagers.push(value);
          const bridge2 = safely(() => exports?.DCDChatManager);
          if (typeof bridge2?.updateRows === "function") initializedBridges.push(bridge2);
        }
        const found = safely(() => metro.findByNameAll?.("RowManager"));
        const managers = [...initializedManagers, ...Array.isArray(found) ? found : [], safely(() => metro.findByName?.("RowManager")), findProps("RowManager")?.RowManager];
        for (const manager of managers) patchRowManager(manager?.default ?? manager);
        if (nativeStats.nativeRowManagerActive) return;
        const candidates = [...initializedBridges, safely(() => RN?.NativeModules?.DCDChatManager), safely(() => findProps("DCDChatManager")?.DCDChatManager), safely(() => globals.nativeModuleProxy?.DCDChatManager), safely(() => globals.__turboModuleProxy?.("DCDChatManager"))];
        const bridge = candidates.find((manager) => typeof manager?.updateRows === "function");
        if (!bridge || typeof before !== "function") return;
        const stop = installBridgeTranslations(source, bridge);
        if (nativeStats.nativeActive) {
          stopBridge = stop;
          installed = true;
          nativeStats.nativeDiscoveryStatus = "native-bridge";
        } else stop();
      };
      discover();
      let discoveryPending = false;
      const requestDiscovery = () => {
        if (!active || discoveryPending || stopBridge) return;
        discoveryPending = true;
        Promise.resolve().then(() => {
          discoveryPending = false;
          if (active) discover();
        }).catch(() => log.warn("Classic deferred message discovery failed"));
      };
      const retry = () => {
        requestDiscovery();
        scheduleRefresh();
      };
      const stopObserve = observe((event) => {
        if (!installed || nativeStats.nativeRowsObserved === 0 || event.type === "channel") retry();
      });
      const stopSource = source.subscribe(() => {
        if (!installed || nativeStats.nativeRowsObserved === 0) requestDiscovery();
        scheduleRefresh();
      });
      let retryTimer;
      const waitForChat = () => {
        retryTimer = setTimeout(() => {
          retryTimer = void 0;
          if (!active || stopBridge || nativeStats.nativeRowsObserved > 0 || ++attempts >= 15) return;
          retry();
          if (nativeStats.nativeRowsObserved === 0) waitForChat();
        }, 1e3);
      };
      if (!stopBridge && nativeStats.nativeRowsObserved === 0) waitForChat();
      return () => {
        if (!active) return;
        restoreGenerated(true);
        refreshRows(true);
        active = false;
        if (retryTimer !== void 0) clearTimeout(retryTimer);
        stopObserve();
        stopSource();
        stopBridge?.();
        for (const stop of patches.reverse()) try {
          stop();
        } catch {
          log.warn("Classic RowManager cleanup failed");
        }
        tracked.clear();
        painted.clear();
        generatedContent.clear();
        nativeStats.nativeRowManagerActive = false;
        nativeStats.nativeRowManagerHooks = 0;
        nativeStats.nativeActive = false;
        nativeStats.nativeDiscoveryStatus = "stopped";
        restoreNative = void 0;
      };
    };
    const installMessageMenu = (source) => installClassicMessageMenu(api, { React, getCurrentChannel, getLoadedMessages, observe }, source, menuStats);
    return {
      React,
      RN,
      storage: storage ?? {},
      logger: log,
      getCurrentChannel,
      getLoadedMessages,
      observe,
      installMessageRenderer,
      installMessageMenu,
      installNativeTranslations,
      diagnostics: () => ({
        pluginVersion: "0.1.7",
        classicApi: "vendetta + bunny.api.react.jsx",
        currentChannelAvailable: !!getCurrentChannel(),
        loadedMessageCount: getCurrentChannel() ? getLoadedMessages(getCurrentChannel()).length : 0,
        messageStore: typeof messageStore?.getMessages === "function" && typeof messageStore?.getMessage === "function",
        selectedChannelStore: typeof channelStore?.getChannelId === "function",
        fluxDispatcher: typeof dispatcher?.subscribe === "function" && typeof dispatcher?.unsubscribe === "function",
        jsxHookApi: typeof jsx?.onJsxCreate === "function" && typeof jsx?.deleteJsxCreate === "function",
        rendererStatus: stats.observedMessageRenders > 0 ? "observed" : nativeStats.nativeRowsObserved > 0 ? "native-observed" : stats.activeRenderer ? "unobserved" : "unsupported",
        rendererExplanation: stats.observedMessageRenders > 0 ? "Validated message JSX observed; phone display still requires verification." : nativeStats.nativeRowsObserved > 0 ? "Native message rows observed; generated content was processed, but actual phone display is not verified." : "No validated message rows observed yet. Open a text channel, load messages, then return to diagnostics.",
        nativeContentDelivery: "generated-message-property",
        nativeDisplayVerified: false,
        nativeGenerateCalls,
        nativeGenerateRejected: { ...generateRejected },
        nativeLastGenerateShape: lastGenerateShape ? { ...lastGenerateShape } : null,
        ...menuStats,
        ...stats,
        ...nativeStats,
        registeredNames: [...stats.registeredNames],
        nativeChatBridge: nativeStats.nativeHookAvailable || typeof RN?.NativeModules?.DCDChatManager?.updateRows === "function",
        nativeSchema: "Classic RowManager.generate(data) or DCDChatManager.updateRows(tag, JSON rows, flag); verified record identity and copied native content; phone verification pending."
      })
    };
  }

  // src/core/providers.ts
  var TranslationError = class extends Error {
    constructor(code, message, retryable = false, retryAfterMs) {
      super(message);
      this.name = "TranslationError";
      this.code = code;
      this.retryable = retryable;
      this.retryAfterMs = retryAfterMs;
    }
  };
  var CHUNK_SIZE = 1e3;
  var BING_UA = "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
  function aborted() {
    return new TranslationError("ABORTED", "Translation cancelled");
  }
  function checkAbort(signal) {
    if (signal.aborted) throw aborted();
  }
  function abortable(promise, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(aborted());
        return;
      }
      const onAbort = () => {
        signal.removeEventListener("abort", onAbort);
        reject(aborted());
      };
      signal.addEventListener("abort", onAbort);
      promise.then((value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      }, (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      });
    });
  }
  function delay(ms, signal) {
    return new Promise((resolve, reject) => {
      checkAbort(signal);
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, Math.max(0, ms));
      const onAbort = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        reject(aborted());
      };
      signal.addEventListener("abort", onAbort);
    });
  }
  function mapLanguage(id) {
    return { "zh-CN": "zh-Hans", "zh-TW": "zh-Hant", iw: "he", jw: "jv" }[id] || id;
  }
  function form(values) {
    return Object.keys(values).map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(values[key])).join("&");
  }
  function protectedParts(text) {
    const pattern = /```[\s\S]*?(?:```|$)|`[^`\n]*`|<(?:@!?\d+|@&\d+|#\d+|a?:[^:\s>]+:\d+)>|https?:\/\/[^\s<>`]+|@(?:everyone|here)\b/g;
    const parts = [];
    let start = 0;
    let match;
    while (match = pattern.exec(text)) {
      if (match.index > start) parts.push({ text: text.slice(start, match.index), protected: false });
      parts.push({ text: match[0], protected: true });
      start = pattern.lastIndex;
    }
    if (start < text.length) parts.push({ text: text.slice(start), protected: false });
    return parts;
  }
  function chunks(text) {
    const output = [];
    while (text.length > CHUNK_SIZE) {
      const head = text.slice(0, CHUNK_SIZE);
      let cut = CHUNK_SIZE;
      const boundary = /(?:\n|[.!?。！？]\s*|\s+)/g;
      let match;
      while (match = boundary.exec(head)) if (boundary.lastIndex >= CHUNK_SIZE / 2) cut = boundary.lastIndex;
      if (/[\uD800-\uDBFF]/.test(text[cut - 1]) && /[\uDC00-\uDFFF]/.test(text[cut])) cut--;
      output.push(text.slice(0, cut));
      text = text.slice(cut);
    }
    if (text) output.push(text);
    return output;
  }
  function retryAfter(value) {
    if (!value) return void 0;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1e3;
    const when = Date.parse(value);
    return Number.isFinite(when) ? Math.max(0, when - Date.now()) : void 0;
  }
  function parseResult(body, target) {
    let value;
    try {
      value = JSON.parse(body);
    } catch {
      throw new TranslationError("BAD_RESPONSE", "Translation service returned invalid JSON");
    }
    if (value?.statusCode === 205) throw new TranslationError("SESSION_EXPIRED", "Bing session expired", true);
    if (value?.statusCode) throw new TranslationError("BING_" + String(value.statusCode), "Bing rejected the translation request", value.statusCode === 429);
    const first = Array.isArray(value) ? value[0] : void 0;
    const item = first?.translations?.find((entry) => entry?.to === target && typeof entry.text === "string");
    if (!item?.text) throw new TranslationError("NO_TRANSLATION", "Translation service returned no matching translation");
    const result = { text: item.text };
    if (typeof first.detectedLanguage?.language === "string") result.detectedLanguage = first.detectedLanguage.language;
    return result;
  }
  function createTranslator(config, deps) {
    const settings = { ...config };
    const fetcher = deps?.fetch || fetch;
    let session;
    let queue = Promise.resolve();
    let lastRequest = 0;
    const timeoutMs = Number.isFinite(settings.requestTimeoutMs) && settings.requestTimeoutMs > 0 ? settings.requestTimeoutMs : 12e3;
    const intervalMs = Number.isFinite(settings.minIntervalMs) ? Math.max(0, settings.minIntervalMs) : 700;
    const gate = deps?.gate || (async (signal) => {
      await delay(Math.max(0, lastRequest + intervalMs - Date.now()), signal);
      lastRequest = Date.now();
    });
    async function request(url, options, callerSignal) {
      checkAbort(callerSignal);
      await abortable(gate(callerSignal), callerSignal);
      checkAbort(callerSignal);
      const controller = new AbortController();
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error, value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          callerSignal.removeEventListener("abort", onAbort);
          if (error) {
            controller.abort();
            reject(error);
          } else resolve(value);
        };
        const onAbort = () => finish(aborted());
        const timer = setTimeout(() => finish(new TranslationError("TIMEOUT", "Translation request timed out", true)), timeoutMs);
        callerSignal.addEventListener("abort", onAbort);
        if (callerSignal.aborted) {
          onAbort();
          return;
        }
        Promise.resolve().then(async () => {
          if (controller.signal.aborted) return;
          try {
            const response = await fetcher(url, { ...options, signal: controller.signal });
            if (!response.ok) throw new TranslationError("HTTP_" + response.status, "Translation service HTTP " + response.status, response.status === 408 || response.status === 429 || response.status >= 500, retryAfter(response.headers.get("Retry-After")));
            const body = await response.text();
            finish(void 0, { body, url: response.url || url });
          } catch (error) {
            finish(error instanceof TranslationError ? error : new TranslationError("NETWORK", "Translation network request failed", true));
          }
        });
      });
    }
    async function getSession(signal) {
      if (session && Date.now() < session.expires) return session;
      const page = await request("https://www.bing.com/translator", { headers: { "User-Agent": BING_UA } }, signal);
      const origin = page.url.match(/^https:\/\/((?:[a-z0-9-]+\.)*bing\.com)(?:[/:?#]|$)/i);
      const helper = page.body.match(/params_AbusePreventionHelper\s*=\s*(\[[^\]]+\])/);
      const ig = page.body.match(/IG:\s*"([^"]+)"/);
      const iid = page.body.match(/data-iid=["']([^"']+)["']/);
      if (!origin || !helper || !ig || !iid) throw new TranslationError("SESSION_UNAVAILABLE", "Bing webpage session is unavailable");
      let params;
      try {
        params = JSON.parse(helper[1]);
      } catch {
        throw new TranslationError("SESSION_UNAVAILABLE", "Bing webpage session is unavailable");
      }
      if (!Array.isArray(params) || !Number.isFinite(params[0]) || typeof params[1] !== "string" || !params[1]) throw new TranslationError("SESSION_UNAVAILABLE", "Bing webpage session is unavailable");
      session = { base: "https://" + origin[1], key: String(params[0]), token: params[1], ig: ig[1], iid: iid[1], expires: Date.now() + 54e4 };
      return session;
    }
    function officialURL(target) {
      const endpoint = (settings.microsoftEndpoint || "https://api.cognitive.microsofttranslator.com").trim().replace(/\/+$/, "");
      const parts = endpoint.match(/^https:\/\/([^/?#]+)(\/[^?#]*)?$/i);
      if (!parts || !/^(?:api(?:-(?:nam|eur|apc))?\.cognitive\.microsofttranslator\.com|[a-z0-9-]+\.cognitiveservices\.azure\.com)$/i.test(parts[1])) throw new TranslationError("INVALID_ENDPOINT", "Enter a valid HTTPS Microsoft Translator endpoint");
      let path = parts[2] || "";
      if (/\.cognitiveservices\.azure\.com$/i.test(parts[1]) && !path) path = "/translator/text/v3.0";
      if (!path.endsWith("/translate")) path += "/translate";
      return "https://" + parts[1] + path + "?api-version=3.0&to=" + encodeURIComponent(target);
    }
    async function official(text, target, signal) {
      if (!settings.microsoftKey.trim()) throw new TranslationError("MISSING_KEY", "Microsoft Translator requires an API key");
      const headers = { "Content-Type": "application/json; charset=UTF-8", "Ocp-Apim-Subscription-Key": settings.microsoftKey.trim() };
      if (settings.microsoftRegion.trim() && settings.microsoftRegion.trim() !== "global") headers["Ocp-Apim-Subscription-Region"] = settings.microsoftRegion.trim();
      const response = await request(officialURL(target), { method: "POST", headers, body: JSON.stringify([{ Text: text }]) }, signal);
      return parseResult(response.body, target);
    }
    async function bing(text, target, signal) {
      const current = await getSession(signal);
      const response = await request(current.base + "/ttranslatev3?isVertical=1&IG=" + encodeURIComponent(current.ig) + "&IID=" + encodeURIComponent(current.iid + ".1"), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": BING_UA }, body: form({ fromLang: "auto-detect", to: target, text, key: current.key, token: current.token }) }, signal);
      return parseResult(response.body, target);
    }
    async function withRetry(provider, text, target, signal) {
      for (let attempt = 0; ; attempt++) {
        try {
          return await provider(text, target, signal);
        } catch (error) {
          checkAbort(signal);
          const failure = error instanceof TranslationError ? error : new TranslationError("NETWORK", "Translation request failed", true);
          if (failure.code === "SESSION_EXPIRED") session = void 0;
          const transient = failure.code === "SESSION_EXPIRED" || failure.code === "NETWORK" || /^HTTP_(408|5\d\d)$/.test(failure.code);
          if (attempt || !transient) throw failure;
          await delay(300, signal);
        }
      }
    }
    async function translateChunk(text, target, signal) {
      if (settings.provider === "microsoft") return withRetry(official, text, target, signal);
      try {
        return await withRetry(bing, text, target, signal);
      } catch (error) {
        checkAbort(signal);
        const code = error instanceof TranslationError ? error.code : "";
        if (settings.officialFallback === true && settings.microsoftKey.trim() && !["ABORTED", "TIMEOUT", "HTTP_429", "BING_429"].includes(code)) return withRetry(official, text, target, signal);
        throw error;
      }
    }
    async function execute(text, target, signal) {
      checkAbort(signal);
      target = mapLanguage(target || settings.targetLanguage);
      if (!target || target === "auto" || target === "auto-detect") throw new TranslationError("INVALID_LANGUAGE", "Choose a target language");
      const result = { text: "" };
      for (const part of protectedParts(text)) {
        if (part.protected) {
          result.text += part.text;
          continue;
        }
        for (const chunk of chunks(part.text)) {
          checkAbort(signal);
          const match = chunk.match(/^(\s*)([\s\S]*?)(\s*)$/);
          if (!match[2]) {
            result.text += chunk;
            continue;
          }
          const translated = await translateChunk(match[2], target, signal);
          result.text += match[1] + translated.text + match[3];
          if (!result.detectedLanguage && translated.detectedLanguage) result.detectedLanguage = translated.detectedLanguage;
        }
      }
      checkAbort(signal);
      return result;
    }
    return { translate(text, target, signal) {
      const pending = queue.then(() => execute(text, target, signal));
      queue = pending.catch(() => void 0);
      return abortable(pending, signal);
    } };
  }

  // src/core/queue.ts
  function abortError() {
    return Object.assign(new Error("Translation cancelled"), { name: "AbortError" });
  }
  function delay2(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(abortError());
      const abort = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        reject(abortError());
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, Math.max(0, ms));
      signal.addEventListener("abort", abort, { once: true });
    });
  }
  var RateGate = class {
    constructor(interval) {
      this.interval = interval;
      this.nextAt = 0;
      this.pausedUntil = 0;
    }
    pauseUntil(timestamp) {
      if (Number.isFinite(timestamp)) this.pausedUntil = Math.max(this.pausedUntil, timestamp);
    }
    async wait(signal) {
      if (signal.aborted) throw abortError();
      const now = Date.now(), start = Math.max(now, this.nextAt, this.pausedUntil);
      this.nextAt = start + Math.max(0, this.interval);
      if (start > now) await delay2(start - now, signal);
      while (Date.now() < this.pausedUntil) await delay2(this.pausedUntil - Date.now(), signal);
      if (signal.aborted) throw abortError();
    }
  };
  var OrderedQueue = class {
    constructor(maximum = 500) {
      this.maximum = maximum;
      this.waiting = [];
      this.all = /* @__PURE__ */ new Map();
      this.running = false;
    }
    get pending() {
      return this.all.size;
    }
    get isActive() {
      return !!this.active;
    }
    enqueue(key, run) {
      const existing = this.all.get(key);
      if (existing) return existing.promise;
      if (this.waiting.length >= this.maximum) return Promise.reject(new Error("Translation queue is full"));
      let resolve, reject;
      const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      const job = { key, run, promise, resolve, reject, controller: new AbortController() };
      this.all.set(key, job);
      this.waiting.push(job);
      void Promise.resolve().then(() => this.pump());
      return promise;
    }
    cancelKey(key) {
      const job = this.all.get(key);
      if (!job) return;
      this.all.delete(key);
      this.waiting = this.waiting.filter((waiting) => waiting !== job);
      job.controller.abort();
      job.reject(abortError());
    }
    cancel() {
      for (const job of this.waiting) {
        job.controller.abort();
        job.reject(abortError());
        if (this.all.get(job.key) === job) this.all.delete(job.key);
      }
      this.waiting = [];
      if (this.active) {
        this.active.controller.abort();
        this.active.reject(abortError());
        if (this.all.get(this.active.key) === this.active) this.all.delete(this.active.key);
      }
    }
    async pump() {
      if (this.running) return;
      this.running = true;
      try {
        while (this.waiting.length) {
          const job = this.waiting.shift();
          this.active = job;
          const signal = job.controller.signal;
          let onAbort;
          const aborted2 = new Promise((_, reject) => {
            onAbort = () => reject(abortError());
            signal.addEventListener("abort", onAbort, { once: true });
            if (signal.aborted) onAbort();
          });
          try {
            job.resolve(await Promise.race([Promise.resolve().then(() => {
              if (signal.aborted) throw abortError();
              return job.run(signal);
            }), aborted2]));
          } catch (error) {
            job.reject(error);
          } finally {
            signal.removeEventListener("abort", onAbort);
            if (this.all.get(job.key) === job) this.all.delete(job.key);
            if (this.active === job) this.active = void 0;
          }
        }
      } finally {
        this.running = false;
      }
    }
  };

  // src/core/languages.ts
  var LANGUAGES = [
    { id: "zh-CN", name: "\u7B80\u4F53\u4E2D\u6587" },
    { id: "zh-TW", name: "\u7E41\u9AD4\u4E2D\u6587" },
    { id: "en", name: "English" },
    { id: "ja", name: "\u65E5\u672C\u8A9E" },
    { id: "ko", name: "\uD55C\uAD6D\uC5B4" },
    { id: "de", name: "Deutsch" },
    { id: "fr", name: "Fran\xE7ais" },
    { id: "ru", name: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" },
    { id: "es", name: "Espa\xF1ol" },
    { id: "it", name: "Italiano" },
    { id: "pt", name: "Portugu\xEAs" },
    { id: "ar", name: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
    { id: "hi", name: "\u0939\u093F\u0928\u094D\u0926\u0940" },
    { id: "id", name: "Bahasa Indonesia" },
    { id: "vi", name: "Ti\u1EBFng Vi\u1EC7t" },
    { id: "th", name: "\u0E44\u0E17\u0E22" },
    { id: "tr", name: "T\xFCrk\xE7e" },
    { id: "uk", name: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430" },
    { id: "pl", name: "Polski" },
    { id: "nl", name: "Nederlands" },
    { id: "sv", name: "Svenska" },
    { id: "fi", name: "Suomi" },
    { id: "da", name: "Dansk" },
    { id: "no", name: "Norsk" },
    { id: "cs", name: "\u010Ce\u0161tina" },
    { id: "el", name: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC" },
    { id: "he", name: "\u05E2\u05D1\u05E8\u05D9\u05EA" },
    { id: "ms", name: "Bahasa Melayu" },
    { id: "ro", name: "Rom\xE2n\u0103" },
    { id: "hu", name: "Magyar" },
    { id: "bg", name: "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438" },
    { id: "bn", name: "\u09AC\u09BE\u0982\u09B2\u09BE" },
    { id: "ta", name: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD" },
    { id: "te", name: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41" },
    { id: "fa", name: "\u0641\u0627\u0631\u0633\u06CC" },
    { id: "ur", name: "\u0627\u0631\u062F\u0648" },
    { id: "af", name: "Afrikaans" },
    { id: "sw", name: "Kiswahili" },
    { id: "fil", name: "Filipino" },
    { id: "sk", name: "Sloven\u010Dina" }
  ];

  // src/core/service.ts
  var DEFAULT_SETTINGS = { autoTranslate: true, provider: "bing", targetLanguage: "zh-CN", officialFallback: false, microsoftKey: "", microsoftRegion: "", microsoftEndpoint: "https://api.cognitive.microsofttranslator.com", minIntervalMs: 1200, requestTimeoutMs: 8e3 };
  function byId(a, b) {
    return a.id.length - b.id.length || a.id.localeCompare(b.id);
  }
  var TranslationService = class {
    constructor(options) {
      this.options = options;
      this.queue = new OrderedQueue(500);
      this.cooldown = new RateGate(0);
      this.records = /* @__PURE__ */ new Map();
      this.cache = /* @__PURE__ */ new Map();
      this.pending = /* @__PURE__ */ new Map();
      this.seen = /* @__PURE__ */ new Map();
      this.suppressed = /* @__PURE__ */ new Set();
      this.failed = /* @__PURE__ */ new Map();
      this.selectionListeners = /* @__PURE__ */ new Set();
      this.selectionSignature = null;
      this.listeners = /* @__PURE__ */ new Set();
      this.epoch = 0;
      this.lastError = null;
      this.disposed = false;
      this.scanRunning = false;
      this.scanAgain = false;
      this.settings = this.validate({ ...DEFAULT_SETTINGS, ...options.persistedSettings, ...options.settings });
      this.current = options.getCurrentChannel();
      this.makeProvider();
    }
    validate(value) {
      const number = (v, fallback, min, max) => Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
      return {
        ...DEFAULT_SETTINGS,
        autoTranslate: typeof value.autoTranslate === "boolean" ? value.autoTranslate : true,
        provider: value.provider === "microsoft" ? "microsoft" : "bing",
        targetLanguage: LANGUAGES.some((lang) => lang.id === value.targetLanguage) ? value.targetLanguage : "zh-CN",
        officialFallback: value.officialFallback === true,
        microsoftKey: typeof value.microsoftKey === "string" ? value.microsoftKey.trim() : "",
        microsoftRegion: typeof value.microsoftRegion === "string" ? value.microsoftRegion.trim() : "",
        microsoftEndpoint: typeof value.microsoftEndpoint === "string" ? value.microsoftEndpoint.trim() : DEFAULT_SETTINGS.microsoftEndpoint,
        minIntervalMs: number(value.minIntervalMs, 1200, 500, 1e4),
        requestTimeoutMs: number(value.requestTimeoutMs, 8e3, 2e3, 2e4)
      };
    }
    makeProvider() {
      const gate = new RateGate(this.settings.minIntervalMs);
      this.provider = this.options.createProvider ? this.options.createProvider({ ...this.settings }) : createTranslator({ ...this.settings }, { gate: async (signal) => {
        await gate.wait(signal);
        await this.cooldown.wait(signal);
      } });
    }
    persist() {
      if (this.options.persistedSettings) Object.assign(this.options.persistedSettings, this.settings);
    }
    messageKey(message) {
      return JSON.stringify([message.channelId, message.id]);
    }
    contentKey(content) {
      return JSON.stringify([this.settings.provider, this.settings.targetLanguage, content]);
    }
    emit() {
      for (const listener of [...this.listeners]) listener();
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    getSettings() {
      return { ...this.settings };
    }
    getStatus() {
      return { pending: this.pending.size, active: this.queue.isActive, lastError: this.lastError, translated: this.records.size, diagnostics: this.options.diagnostics?.() };
    }
    getTranslation(message) {
      if (this.disposed || message.channelId !== this.current) return;
      const item = this.records.get(this.messageKey(message));
      if (item?.source === message.content && item.target === this.settings.targetLanguage) return item.result;
    }
    consider(message) {
      if (this.settings.autoTranslate && !this.disposed) void this.schedule(message, false);
    }
    scan() {
      this.channelChanged();
      this.refreshSelection();
      if (this.disposed || !this.current) return;
      this.reconcile(this.options.getLoadedMessages(this.current));
      if (!this.settings.autoTranslate) return;
      if (this.scanRunning) {
        this.scanAgain = true;
        return;
      }
      this.scanRunning = true;
      void (async () => {
        try {
          do {
            this.scanAgain = false;
            const epoch = this.epoch, channel = this.current;
            if (!channel) break;
            const messages = this.options.getLoadedMessages(channel).slice().sort(byId);
            for (let offset = 0; offset < messages.length; offset += 100) {
              if (this.disposed || !this.settings.autoTranslate || this.current !== channel || this.epoch !== epoch) break;
              await Promise.all(messages.slice(offset, offset + 100).map((message) => this.schedule(message, false, true)));
            }
          } while (this.scanAgain && !this.disposed && this.settings.autoTranslate);
        } finally {
          this.scanRunning = false;
        }
      })();
    }
    channelChanged() {
      const channel = this.options.getCurrentChannel();
      if (channel === this.current) return;
      this.cancel();
      this.current = channel;
      this.seen.clear();
      this.suppressed.clear();
      this.lastError = null;
      this.emit();
    }
    cancel() {
      this.epoch++;
      this.queue.cancel();
      this.pending.clear();
    }
    release(key) {
      const pending = this.pending.get(key);
      if (!pending) return;
      this.pending.delete(key);
      if (![...this.pending.values()].some((other) => other.jobKey === pending.jobKey)) this.queue.cancelKey(pending.jobKey);
    }
    reconcile(messages) {
      const loaded = new Map(messages.filter((message) => message.channelId === this.current).map((message) => [this.messageKey(message), message]));
      let changed = false;
      for (const [key, previous] of this.seen) {
        if (previous.channelId !== this.current) continue;
        const latest = loaded.get(key);
        if (latest?.content === previous.content) continue;
        this.release(key);
        this.records.delete(key);
        if (latest) this.seen.set(key, { ...latest });
        else this.seen.delete(key);
        changed = true;
      }
      if (changed) this.emit();
    }
    trim() {
      while (this.records.size > 600) this.records.delete(this.records.keys().next().value);
      while (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value);
      while (this.seen.size > 1e3) this.seen.delete(this.seen.keys().next().value);
      while (this.failed.size > 500) this.failed.delete(this.failed.keys().next().value);
      while (this.suppressed.size > 1e3) this.suppressed.delete(this.suppressed.values().next().value);
    }
    schedule(message, force, fromLoaded = false) {
      if (this.disposed || !message.id || !message.channelId) return Promise.resolve();
      this.channelChanged();
      if (message.channelId !== this.current) return Promise.resolve();
      const latest = this.options.getLoadedMessages(message.channelId).find((candidate) => candidate.id === message.id && candidate.channelId === message.channelId);
      if (latest) message = latest;
      else if (fromLoaded) return Promise.resolve();
      const key = this.messageKey(message), source = message.content, target = this.settings.targetLanguage, epoch = this.epoch;
      const previous = this.seen.get(key);
      if (previous && previous.content !== source) {
        this.release(key);
        this.records.delete(key);
      }
      this.seen.set(key, { ...message });
      this.trim();
      if (!source?.trim()) {
        this.release(key);
        this.records.delete(key);
        this.emit();
        return Promise.resolve();
      }
      const contentKey = this.contentKey(source), signature = JSON.stringify([key, target, source]);
      if (!force && (this.suppressed.has(signature) || (this.failed.get(contentKey) || 0) > Date.now())) return Promise.resolve();
      if (force) this.suppressed.delete(signature);
      if (this.getTranslation(message)) return Promise.resolve();
      const waiting = this.pending.get(key);
      if (waiting?.source === source && waiting.target === target && waiting.epoch === epoch) return waiting.promise;
      const cached = this.cache.get(contentKey);
      if (cached && Date.now() - cached.time < 864e5) {
        this.records.set(key, { source, target, result: cached.result });
        this.emit();
        return Promise.resolve();
      }
      if (this.records.has(key)) this.records.delete(key);
      const provider = this.provider;
      const request = this.queue.enqueue(contentKey, async (signal) => {
        await this.cooldown.wait(signal);
        try {
          return await provider.translate(source, target, signal);
        } catch (error) {
          const failure = error;
          if (!signal.aborted && ["RATE_LIMIT", "HTTP_429", "BING_429"].includes(failure?.code || "")) this.cooldown.pauseUntil(Date.now() + Math.max(6e4, failure.retryAfterMs || 0));
          throw error;
        }
      });
      const pending = { source, target, epoch, jobKey: contentKey, promise: Promise.resolve() };
      this.pending.set(key, pending);
      pending.promise = request.then((result) => {
        if (this.disposed || epoch !== this.epoch || this.pending.get(key) !== pending || this.seen.get(key)?.content !== source || target !== this.settings.targetLanguage || message.channelId !== this.current) return;
        this.cache.delete(contentKey);
        this.cache.set(contentKey, { time: Date.now(), result });
        if (result.text && result.text !== source) this.records.set(key, { source, target, result });
        this.lastError = null;
        this.failed.delete(contentKey);
        this.trim();
      }, (error) => {
        if (this.disposed || epoch !== this.epoch || this.pending.get(key) !== pending || error?.name === "AbortError") return;
        const code = error?.code, limited = ["RATE_LIMIT", "HTTP_429", "BING_429"].includes(code), auth = ["AUTH", "HTTP_401", "HTTP_403", "SESSION_EXPIRED"].includes(code), config = ["CONFIG", "MISSING_KEY", "INVALID_ENDPOINT", "INVALID_LANGUAGE"].includes(code);
        this.lastError = limited ? "\u7FFB\u8BD1\u670D\u52A1\u9650\u5236\u8BF7\u6C42\u9891\u7387\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002" : auth ? "\u7FFB\u8BD1\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u63A5\u53E3\u548C\u53EF\u9009\u5B98\u65B9 API \u914D\u7F6E\u3002" : code === "TIMEOUT" ? "\u7FFB\u8BD1\u8BF7\u6C42\u8D85\u65F6\uFF0C\u539F\u6587\u5DF2\u4FDD\u7559\u3002" : config ? "\u8BF7\u68C0\u67E5 Microsoft API \u5BC6\u94A5\u3001\u533A\u57DF\u53CA HTTPS \u5730\u5740\u3002" : "\u7FFB\u8BD1\u8BF7\u6C42\u5931\u8D25\uFF0C\u539F\u6587\u5DF2\u4FDD\u7559\uFF1B\u53EF\u5728\u8BBE\u7F6E\u4E2D\u91CD\u8BD5\u3002";
        this.failed.set(contentKey, Date.now() + (limited ? Math.max(6e4, error?.retryAfterMs || 0) : 3e4));
        this.trim();
      }).finally(() => {
        if (this.pending.get(key) === pending) this.pending.delete(key);
        if (!this.disposed) this.emit();
      });
      this.emit();
      return pending.promise;
    }
    async translateLoaded() {
      if (this.disposed) return;
      this.channelChanged();
      if (!this.current) {
        this.lastError = "\u5C1A\u672A\u53D6\u5F97\u5F53\u524D\u9891\u9053\uFF0C\u8BF7\u5148\u8FDB\u5165\u6587\u5B57\u9891\u9053\u5E76\u52A0\u8F7D\u6D88\u606F\uFF0C\u518D\u8FD4\u56DE\u63D2\u4EF6\u8BBE\u7F6E\u3002";
        this.emit();
        return;
      }
      this.lastError = null;
      const channel = this.current, epoch = this.epoch;
      const messages = this.options.getLoadedMessages(channel).slice().sort(byId);
      if (!messages.length) {
        this.lastError = "\u5F53\u524D\u9891\u9053\u6CA1\u6709\u53EF\u8BFB\u53D6\u7684\u5DF2\u52A0\u8F7D\u6D88\u606F\uFF0C\u8BF7\u6253\u5F00\u6587\u5B57\u9891\u9053\u5E76\u6EDA\u52A8\u52A0\u8F7D\uFF0C\u518D\u91CD\u8BD5\u3002";
        this.emit();
        return;
      }
      for (let offset = 0; offset < messages.length; offset += 100) {
        if (this.epoch !== epoch || this.current !== channel || this.disposed) return;
        await Promise.all(messages.slice(offset, offset + 100).map((message) => this.schedule(message, true, true)));
      }
    }
    configure(patch) {
      const previous = this.settings;
      this.settings = this.validate({ ...this.settings, ...patch });
      this.persist();
      const providerChange = ["provider", "targetLanguage", "officialFallback", "microsoftKey", "microsoftRegion", "microsoftEndpoint", "minIntervalMs", "requestTimeoutMs"].some((key) => previous[key] !== patch[key] && Object.prototype.hasOwnProperty.call(patch, key));
      if (providerChange) {
        this.cancel();
        this.records.clear();
        this.cache.clear();
        this.failed.clear();
        this.suppressed.clear();
        this.makeProvider();
      }
      if (!this.settings.autoTranslate && previous.autoTranslate) this.cancel();
      this.emit();
      if (this.settings.autoTranslate) this.scan();
    }
    subscribeSelection(listener) {
      if (this.disposed) return () => {
      };
      this.selectionListeners.add(listener);
      if (this.selectionListeners.size === 1) this.selectionSignature = this.selectionFingerprint();
      listener();
      return () => {
        this.selectionListeners.delete(listener);
        if (!this.selectionListeners.size) this.selectionSignature = null;
      };
    }
    selectionFingerprint() {
      const snapshot = this.getSelectionSnapshot();
      return JSON.stringify([snapshot.channelId, snapshot.messages.map((m) => [m.id, m.content])]);
    }
    refreshSelection() {
      if (!this.selectionListeners.size) return;
      const next = this.selectionFingerprint();
      if (next === this.selectionSignature) return;
      this.selectionSignature = next;
      for (const listener of [...this.selectionListeners]) listener();
    }
    getSelectionSnapshot() {
      const channelId = this.disposed ? null : this.options.getCurrentChannel();
      return { channelId, messages: channelId ? this.options.getLoadedMessages(channelId).filter((m) => m.channelId === channelId && m.content.trim()).map((m) => ({ ...m })).sort(byId) : [] };
    }
    async translateSelected(channelId, messages) {
      if (this.disposed) return;
      this.channelChanged();
      if (!this.current || channelId !== this.current) {
        this.lastError = "\u6240\u9009\u6D88\u606F\u4E0D\u5C5E\u4E8E\u5F53\u524D\u9891\u9053\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002";
        this.emit();
        return;
      }
      const loaded = new Map(this.options.getLoadedMessages(channelId).map((m) => [m.id, m]));
      const chosen = /* @__PURE__ */ new Map();
      for (const message of messages) {
        const latest = message && loaded.get(message.id);
        if (!latest || message.channelId !== channelId || latest.channelId !== channelId || latest.content !== message.content) {
          this.lastError = "\u6240\u9009\u6D88\u606F\u5DF2\u66F4\u6539\u6216\u79FB\u9664\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002";
          this.emit();
          return;
        }
        if (latest.content.trim()) chosen.set(latest.id, { ...latest });
      }
      if (!chosen.size) {
        this.lastError = "\u8BF7\u5148\u52FE\u9009\u9700\u8981\u7FFB\u8BD1\u7684\u6D88\u606F\u3002";
        this.emit();
        return;
      }
      const epoch = this.epoch;
      let skipped = 0;
      this.lastError = null;
      this.emit();
      for (const message of [...chosen.values()].sort(byId)) {
        if (this.disposed || this.epoch !== epoch || this.current !== channelId || this.options.getCurrentChannel() !== channelId) return;
        const latest = this.options.getLoadedMessages(channelId).find((m) => m.id === message.id && m.channelId === channelId);
        if (!latest || latest.content !== message.content) {
          skipped++;
          continue;
        }
        await this.schedule(message, true, true);
      }
      if (skipped && this.epoch === epoch && !this.disposed) {
        this.lastError = "\u5DF2\u8DF3\u8FC7 " + skipped + " \u6761\u5DF2\u66F4\u6539\u6216\u79FB\u9664\u7684\u6D88\u606F\uFF0C\u8BF7\u91CD\u65B0\u52FE\u9009\u3002";
        this.emit();
      }
    }
    async translateMessage(message) {
      if (this.disposed) return;
      this.channelChanged();
      if (message.channelId !== this.current) return;
      const latest = this.options.getLoadedMessages(message.channelId).find((m) => m.id === message.id && m.channelId === message.channelId);
      if (!latest) return;
      const epoch = this.epoch;
      await this.schedule(latest, true, true);
      if (this.disposed || this.epoch !== epoch || this.current !== latest.channelId || !this.options.getLoadedMessages(latest.channelId).some((m) => m.id === latest.id && m.content === latest.content)) return;
      const shown = this.getTranslation(latest);
      if (shown) return shown;
      const cached = this.cache.get(this.contentKey(latest.content));
      if (cached && Date.now() - cached.time < 864e5) return cached.result;
    }
    enableAuto() {
      this.suppressed.clear();
      this.configure({ autoTranslate: true });
    }
    stop() {
      this.settings.autoTranslate = false;
      this.persist();
      this.cancel();
      this.emit();
    }
    clear() {
      for (const [key, message] of this.seen) this.suppressed.add(JSON.stringify([key, this.settings.targetLanguage, message.content]));
      this.cancel();
      this.records.clear();
      this.cache.clear();
      this.failed.clear();
      this.lastError = null;
      this.emit();
    }
    deleted(channelId, messageId) {
      const key = this.messageKey({ id: messageId, channelId });
      this.records.delete(key);
      this.seen.delete(key);
      this.release(key);
      this.emit();
    }
    dispose() {
      this.disposed = true;
      this.selectionListeners.clear();
      this.selectionSignature = null;
      this.cancel();
      this.records.clear();
      this.cache.clear();
      this.seen.clear();
      this.failed.clear();
      this.suppressed.clear();
      this.emit();
      this.listeners.clear();
    }
  };

  // src/ui/components.ts
  var LANGUAGES2 = [
    ["zh-CN", "\u7B80\u4F53\u4E2D\u6587"],
    ["zh-TW", "\u7E41\u9AD4\u4E2D\u6587"],
    ["en", "English"],
    ["ja", "\u65E5\u672C\u8A9E"],
    ["ko", "\uD55C\uAD6D\uC5B4"],
    ["de", "Deutsch"],
    ["fr", "Fran\xE7ais"],
    ["ru", "\u0420\u0443\u0441\u0441\u043A\u0438\u0439"],
    ["es", "Espa\xF1ol"],
    ["pt", "Portugu\xEAs"],
    ["it", "Italiano"],
    ["ar", "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"],
    ["hi", "\u0939\u093F\u0928\u094D\u0926\u0940"],
    ["tr", "T\xFCrk\xE7e"],
    ["vi", "Ti\u1EBFng Vi\u1EC7t"],
    ["id", "Bahasa Indonesia"],
    ["th", "\u0E44\u0E17\u0E22"],
    ["uk", "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430"],
    ["nl", "Nederlands"]
  ];
  function createComponents(host, service) {
    const { React, RN } = host;
    const h = React.createElement;
    const WrapperContext = React.createContext(null);
    const Button = RN.Pressable ?? RN.TouchableOpacity;
    const colors = { foreground: "#f2f3f5", muted: "#b5bac1", background: "#1e1f22", card: "#2b2d31", accent: "#8ea1ff", error: "#ffb4b4" };
    const styles = {
      page: { flex: 1, backgroundColor: colors.background },
      content: { padding: 16, paddingBottom: 40 },
      heading: { color: colors.foreground, fontSize: 20, fontWeight: "700", marginBottom: 12 },
      title: { color: colors.foreground, fontSize: 16, fontWeight: "600", marginBottom: 8 },
      text: { color: colors.foreground, fontSize: 14, lineHeight: 21 },
      hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
      card: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 12 },
      row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
      button: { minHeight: 44, justifyContent: "center", paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#383a40", borderRadius: 6, marginRight: 8, marginBottom: 8 },
      selected: { backgroundColor: "#404b78", borderColor: colors.accent, borderWidth: 1 },
      buttonText: { color: colors.foreground, fontSize: 14 },
      wrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
      input: { color: colors.foreground, backgroundColor: colors.background, borderColor: "#4e5058", borderWidth: 1, borderRadius: 6, padding: 10, minHeight: 44, marginTop: 6, marginBottom: 12 }
    };
    function useServiceUpdates() {
      const [, setRevision] = React.useState(0);
      React.useEffect(() => {
        let mounted = true;
        const update = () => {
          if (mounted) setRevision((revision) => revision + 1);
        };
        const unsubscribe = service.subscribe(update);
        update();
        return () => {
          mounted = false;
          unsubscribe();
        };
      }, []);
    }
    function TranslationBlock({ message }) {
      useServiceUpdates();
      const { id, channelId, content } = message;
      React.useEffect(() => {
        service.consider({ id, channelId, content });
      }, [id, channelId, content]);
      const translation = service.getTranslation({ id, channelId, content });
      if (!translation?.text) return null;
      const target = service.getSettings().targetLanguage;
      return h(
        RN.View,
        {
          testID: "bing-translation-block",
          style: { marginTop: 6, paddingVertical: 6, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.accent, backgroundColor: colors.background }
        },
        h(RN.Text, { style: { color: colors.muted, fontSize: 11, marginBottom: 3 } }, `\u8BD1\u6587 \xB7 ${target}${translation.detectedLanguage ? ` \xB7 ${translation.detectedLanguage} \u2192 ${target}` : ""}`),
        h(RN.Text, { selectable: true, style: { color: colors.foreground, fontSize: 14, lineHeight: 21 } }, translation.text)
      );
    }
    function MessageWrapper({ original, message }) {
      const parentIdentity = React.useContext(WrapperContext);
      const identity = JSON.stringify([message.channelId, message.id, message.content]);
      if (parentIdentity === identity) return original;
      return h(
        WrapperContext.Provider,
        { value: identity },
        h(
          RN.View,
          { testID: "bing-bilingual-message", style: { alignSelf: "stretch" } },
          original,
          h(TranslationBlock, { message })
        )
      );
    }
    function wrapMessage(original, message) {
      return h(MessageWrapper, { original, message });
    }
    function Settings() {
      useServiceUpdates();
      const settings = service.getSettings();
      const status = service.getStatus();
      const [localError, setLocalError] = React.useState(null);
      const [selection, setSelection] = React.useState(null);
      const [selectionBusy, setSelectionBusy] = React.useState(false);
      const [, setSelectionRevision] = React.useState(0);
      React.useEffect(() => {
        if (!selection) return;
        let mounted = true;
        const stop = service.subscribeSelection(() => {
          if (mounted) setSelectionRevision((value) => value + 1);
        });
        return () => {
          mounted = false;
          stop();
        };
      }, [!!selection]);
      const snapshot = selection ? service.getSelectionSnapshot() : { channelId: null, messages: [] };
      const selectionSignature = JSON.stringify(snapshot.messages.map((m) => [m.id, m.content]));
      const chosenMessages = selection?.channelId === snapshot.channelId ? snapshot.messages.filter((m) => selection.messages.get(m.id)?.content === m.content) : [];
      React.useEffect(() => {
        if (!selection) return;
        if (selection.channelId !== snapshot.channelId) {
          setSelection(null);
          return;
        }
        const live = new Map(snapshot.messages.map((m) => [m.id, m.content]));
        const kept = new Map([...selection.messages.entries()].filter(([id, m]) => live.get(id) === m.content));
        if (kept.size !== selection.messages.size) setSelection((current) => current === selection ? { ...current, messages: kept } : current);
      }, [snapshot.channelId, selectionSignature, selection]);
      function openSelection() {
        const current = service.getSelectionSnapshot();
        if (!current.channelId || !current.messages.length) {
          setLocalError("\u5F53\u524D\u9891\u9053\u6CA1\u6709\u53EF\u9009\u7684\u5DF2\u52A0\u8F7D\u6587\u5B57\u6D88\u606F\uFF0C\u8BF7\u5148\u6253\u5F00\u6587\u5B57\u9891\u9053\u3002");
          return;
        }
        service.stop();
        setLocalError(null);
        setSelection({ channelId: current.channelId, messages: /* @__PURE__ */ new Map(), visible: 25 });
      }
      function chooseMessage(message) {
        setSelection((current) => {
          if (!current || selectionBusy) return current;
          const live = service.getSelectionSnapshot();
          if (live.channelId !== current.channelId) return null;
          if (!live.messages.some((m) => m.id === message.id && m.content === message.content)) return current;
          const messages = new Map(current.messages);
          if (messages.get(message.id)?.content === message.content) messages.delete(message.id);
          else messages.set(message.id, { ...message });
          return { ...current, messages };
        });
      }
      async function translateSelection() {
        if (!selection || selectionBusy || !chosenMessages.length) return;
        setLocalError(null);
        setSelectionBusy(true);
        try {
          await service.translateSelected(selection.channelId, chosenMessages);
        } catch (error) {
          setLocalError(redact(error instanceof Error ? error.message : String(error)));
        } finally {
          setSelectionBusy(false);
        }
      }
      function redact(text) {
        return settings.microsoftKey ? text.split(settings.microsoftKey).join("[redacted]") : text;
      }
      function reportDiagnostics() {
        try {
          const diagnostics = { service: status.diagnostics, host: host.diagnostics?.() };
          const json = JSON.stringify(diagnostics, (key, value) => /key|token|password|authorization|secret/i.test(key) ? "[redacted]" : value, 2);
          return redact(json === "{}" ? "\u5C1A\u65E0\u8BCA\u65AD\u4FE1\u606F" : json);
        } catch {
          return "\u8BCA\u65AD\u4FE1\u606F\u6682\u4E0D\u53EF\u7528";
        }
      }
      function button(id, label, onPress, selected = false, disabled = false) {
        return h(Button, {
          key: id,
          testID: id,
          accessibilityRole: "button",
          accessibilityLabel: label,
          accessibilityState: { selected, disabled },
          disabled,
          onPress,
          style: [styles.button, selected ? styles.selected : null, disabled ? { opacity: 0.5 } : null]
        }, h(RN.Text, { style: styles.buttonText }, label));
      }
      function textInput(id, label, value, onChangeText, extra = {}) {
        return h(
          RN.View,
          { key: id },
          h(RN.Text, { style: styles.text }, label),
          h(RN.TextInput, { testID: id, accessibilityLabel: label, value, onChangeText, autoCapitalize: "none", autoCorrect: false, placeholderTextColor: colors.muted, style: styles.input, ...extra })
        );
      }
      function toggle(id, label, value, onValueChange) {
        return h(
          RN.View,
          { style: styles.row },
          h(RN.Text, { style: [styles.text, { flex: 1, paddingRight: 8 }] }, label),
          h(RN.Switch, { testID: id, accessibilityLabel: label, value, onValueChange, trackColor: { false: "#4e5058", true: "#5865f2" }, thumbColor: colors.foreground })
        );
      }
      async function translateLoaded() {
        setLocalError(null);
        setSelection(null);
        try {
          await service.translateLoaded();
        } catch (error) {
          setLocalError(redact(error instanceof Error ? error.message : String(error)));
        }
      }
      const showMicrosoft = settings.provider === "microsoft" || settings.officialFallback;
      return h(
        RN.ScrollView,
        { style: styles.page, contentContainerStyle: styles.content, keyboardShouldPersistTaps: "handled" },
        h(RN.Text, { style: styles.heading }, "Bing \u53CC\u8BED\u7FFB\u8BD1"),
        h(
          RN.View,
          { style: styles.card },
          toggle("auto-translate", "\u81EA\u52A8\u7FFB\u8BD1\u65B0\u6D88\u606F", settings.autoTranslate, (enabled) => {
            if (enabled) {
              setSelection(null);
              service.enableAuto();
            } else service.configure({ autoTranslate: false });
          }),
          h(RN.Text, { style: styles.hint }, "\u539F\u6587\u4FDD\u7559\uFF0C\u8BD1\u6587\u663E\u793A\u5728\u4E0B\u65B9\u3002\u53EA\u5904\u7406\u5F53\u524D\u9891\u9053\u5DF2\u52A0\u8F7D\u7684\u6D88\u606F\u3002"),
          h(
            RN.View,
            { style: styles.wrap },
            button("translate-loaded", "\u7FFB\u8BD1\u672C\u9891\u9053\u5DF2\u52A0\u8F7D\u6D88\u606F", translateLoaded),
            button("open-selection", "\u9009\u62E9\u591A\u6761\u6D88\u606F", openSelection),
            button("stop-translation", "\u505C\u6B62\u7FFB\u8BD1", () => service.stop()),
            button("clear-translations", "\u6E05\u9664\u8BD1\u6587", () => service.clear())
          ),
          h(RN.Text, { style: styles.text, accessibilityLiveRegion: "polite" }, `${status.active ? "\u8FD0\u884C\u4E2D" : settings.autoTranslate ? "\u81EA\u52A8\u7FFB\u8BD1\u5F85\u547D" : "\u5DF2\u505C\u6B62"} \xB7 \u7B49\u5F85 ${status.pending} \xB7 \u5DF2\u53D6\u5F97\u8BD1\u6587 ${status.translated}`),
          status.lastError || localError ? h(RN.Text, { style: { color: colors.error, fontSize: 13, marginTop: 8 }, accessibilityLiveRegion: "polite" }, redact(status.lastError || localError)) : null
        ),
        h(RN.Text, { style: [styles.hint, { marginBottom: 12 }] }, "\u8FDB\u5165\u591A\u9009\u4F1A\u6682\u505C\u81EA\u52A8\u7FFB\u8BD1\u548C\u6B63\u5728\u5904\u7406\u7684\u8BF7\u6C42\u3002\u5DF2\u6709\u8BD1\u6587\u4FDD\u7559\uFF0C\u53EF\u968F\u65F6\u91CD\u65B0\u5F00\u542F\u81EA\u52A8\u7FFB\u8BD1\u3002"),
        selection ? h(
          RN.View,
          { testID: "selection-panel", style: styles.card },
          h(RN.Text, { style: styles.title }, "\u52FE\u9009\u6D88\u606F \xB7 \u5DF2\u9009 " + chosenMessages.length + " \u6761"),
          h(RN.Text, { style: styles.hint }, "\u4EC5\u7FFB\u8BD1\u52FE\u9009\u7684\u666E\u901A\u6587\u5B57\u6D88\u606F\uFF0C\u8BD1\u6587\u663E\u793A\u5728\u5BF9\u5E94\u539F\u6587\u4E0B\u65B9\u3002\u81EA\u52A8\u7FFB\u8BD1\u5DF2\u6682\u505C\u3002"),
          h(
            RN.View,
            { style: styles.wrap },
            button("translate-selected", selectionBusy ? "\u6B63\u5728\u7FFB\u8BD1\u6240\u9009" : "\u7FFB\u8BD1\u6240\u9009\uFF08" + chosenMessages.length + "\uFF09", translateSelection, false, selectionBusy || !chosenMessages.length),
            button("clear-selection", "\u6E05\u7A7A\u9009\u62E9", () => setSelection((current) => current ? { ...current, messages: /* @__PURE__ */ new Map() } : null), false, selectionBusy),
            button("close-selection", "\u6536\u8D77", () => setSelection(null), false, selectionBusy)
          ),
          ...snapshot.messages.slice(0, selection.visible).map((message, index) => {
            const checked = selection.messages.get(message.id)?.content === message.content;
            return h(
              Button,
              { key: message.id, testID: "select-message-" + message.id, accessibilityRole: "checkbox", accessibilityLabel: index + 1 + ". " + message.content, accessibilityState: { checked, disabled: selectionBusy }, disabled: selectionBusy, onPress: () => chooseMessage(message), style: [styles.button, checked ? styles.selected : null] },
              h(RN.Text, { style: styles.buttonText }, (checked ? "\u2611 " : "\u2610 ") + (index + 1) + ". " + message.content)
            );
          }),
          selection.visible < snapshot.messages.length ? button("more-selection-messages", "\u663E\u793A\u66F4\u591A\uFF08" + Math.min(selection.visible, snapshot.messages.length) + "/" + snapshot.messages.length + "\uFF09", () => setSelection((current) => current ? { ...current, visible: current.visible + 25 } : null), false, selectionBusy) : null
        ) : null,
        h(
          RN.View,
          { style: styles.card },
          h(RN.Text, { style: styles.title }, `\u76EE\u6807\u8BED\u8A00\uFF1A${settings.targetLanguage}`),
          h(RN.View, { style: styles.wrap }, ...LANGUAGES2.map(([code, label]) => button(`target-${code}`, label, () => service.configure({ targetLanguage: code }), settings.targetLanguage === code)))
        ),
        h(
          RN.View,
          { style: styles.card },
          h(RN.Text, { style: styles.title }, "\u7FFB\u8BD1\u670D\u52A1"),
          h(
            RN.View,
            { style: styles.wrap },
            button("provider-bing", "Bing \u7F51\u9875\u7FFB\u8BD1", () => service.configure({ provider: "bing" }), settings.provider === "bing"),
            button("provider-microsoft", "Microsoft \u5B98\u65B9 API", () => service.configure({ provider: "microsoft" }), settings.provider === "microsoft")
          ),
          toggle("official-fallback", "Bing \u5931\u8D25\u65F6\u4F7F\u7528\u5B98\u65B9 API", settings.officialFallback, (enabled) => service.configure({ officialFallback: enabled })),
          showMicrosoft ? h(
            RN.View,
            null,
            h(RN.Text, { style: styles.hint }, "\u53EF\u9009\uFF1A\u5B98\u65B9 API \u9700\u8981\u4F60\u81EA\u5DF1\u7684\u5BC6\u94A5\uFF0C\u53EF\u80FD\u4EA7\u751F\u8D39\u7528\u3002\u5BC6\u94A5\u4EC5\u4FDD\u5B58\u5728\u672C\u673A\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u3002"),
            textInput("microsoft-key", "Microsoft \u5BC6\u94A5", settings.microsoftKey, (value) => service.configure({ microsoftKey: value }), { secureTextEntry: true }),
            textInput("microsoft-region", "\u8D44\u6E90\u533A\u57DF\uFF08\u5982 eastasia\uFF09", settings.microsoftRegion, (value) => service.configure({ microsoftRegion: value })),
            textInput("microsoft-endpoint", "API \u5730\u5740", settings.microsoftEndpoint, (value) => service.configure({ microsoftEndpoint: value }), { keyboardType: "url" })
          ) : null
        ),
        h(
          RN.View,
          { style: styles.card },
          h(RN.Text, { style: styles.title }, "\u8BF7\u6C42\u8282\u594F"),
          textInput("request-interval", "\u8BF7\u6C42\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09", String(settings.minIntervalMs), (value) => {
            if (/^\d+$/.test(value)) service.configure({ minIntervalMs: Number(value) });
          }, { keyboardType: "number-pad" }),
          textInput("request-timeout", "\u8BF7\u6C42\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09", String(settings.requestTimeoutMs), (value) => {
            if (/^\d+$/.test(value)) service.configure({ requestTimeoutMs: Number(value) });
          }, { keyboardType: "number-pad" })
        ),
        h(
          RN.View,
          { style: styles.card },
          h(RN.Text, { style: styles.title }, "\u672C\u673A\u8BCA\u65AD"),
          h(RN.Text, { style: styles.hint, selectable: true }, reportDiagnostics())
        )
      );
    }
    return { TranslationBlock, wrapMessage, Settings };
  }

  // src/index.ts
  var runtime;
  function unload() {
    if (!runtime) return;
    const active = runtime;
    runtime = void 0;
    active.service.dispose();
    for (const dispose of active.cleanup.reverse()) {
      try {
        dispose();
      } catch {
        active.host.logger.warn("[Bing Translator] Cleanup failed");
      }
    }
  }
  var index_default = {
    onLoad() {
      unload();
      if (typeof vendetta === "undefined" || !vendetta.plugin?.storage) throw new Error("This plugin requires Revenge Classic with the Vendetta compatibility API.");
      const logger = vendetta.plugin.logger ?? console;
      const host = createClassicHost(vendetta, vendetta.plugin.storage, logger);
      const settings = vendetta.plugin.storage.settings ?? (vendetta.plugin.storage.settings = {});
      const service = new TranslationService({ persistedSettings: settings, getCurrentChannel: () => host.getCurrentChannel(), getLoadedMessages: (id) => host.getLoadedMessages(id), diagnostics: () => host.diagnostics() });
      const components = createComponents(host, service);
      const cleanup = [];
      runtime = { host, service, components, cleanup };
      try {
        cleanup.push(host.installMessageRenderer(components.wrapMessage));
        cleanup.push(host.installMessageMenu(service));
        if (host.installNativeTranslations) cleanup.push(host.installNativeTranslations(service));
        cleanup.push(host.observe((event) => {
          if (event.type === "delete" && event.messageId) service.deleted(event.channelId ?? host.getCurrentChannel() ?? "", event.messageId);
          service.scan();
        }));
        service.scan();
        logger.log("[Bing Translator] Classic adapter loaded; see settings for observed renderer diagnostics.");
      } catch (error) {
        unload();
        throw error;
      }
    },
    onUnload: unload,
    settings() {
      return runtime ? runtime.host.React.createElement(runtime.components.Settings) : null;
    }
  };
  return __toCommonJS(index_exports);
})();

return ClassicBingPlugin.default;
})()
