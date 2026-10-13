# Bing Bilingual Translator — Revenge Classic

Android 16、Discord 348.10 为目标环境。使用 Revenge **Classic** 的 Source URL 插件格式；无需 Root、悬浮窗或独立 APK。

此项目实际包含可编辑源码、构建脚本、可执行测试，以及构建出的 `dist/bing-translator/manifest.json` / `index.js`。它是 Android 移植，不加载 BetterDiscord 或网页 DOM。

## 0.1.1 安卓消息行修复

新增 Classic `RowManager.generate` 渲染接入，不再依赖手机必须暴露 `DCDChatManager`。支持延迟加载的消息模块，并检查已初始化 Metro 导出以应对缓存未找到结果。原文和原始节点不变，翻译完成后请求本地消息行重绘；清除、编辑、频道切换和卸载都有相应保护。

从已有 Source URL 更新插件并重启 Discord。先进入文字频道加载消息，再检查诊断：`pluginVersion` 应为 `0.1.1`，`nativeRowManagerActive` 或原生桥状态应为 true，消息观察数应随消息加载增加。0.1.1 已通过 65 项测试及构建，手机上的修复效果仍需用户验证。

安装 Source URL（保留末尾斜杠）：

```text
https://3311718265-hue.github.io/revenge-classic-bing-translator/bing-translator/
```

## 当前验证状态

- 翻译提供方、队列、消息状态及 React Native 组件有可运行测试；`npm run check` 执行 TypeScript 检查、测试、构建和 Classic 加载格式校验。
- 已对 Bing 网页接口执行实际多语种请求，包括当前源码的 `createTranslator`。详情见 [Bing 证据](docs/bing-evidence.md)。这不代表长期稳定，也不证明手机网络环境相同。
- 没有连接 Android 手机。Discord 348.10 上的渲染、历史滚动、应用切后台和卸载效果尚未实机验收。
- Microsoft 官方 API 的 HTTP 合约已测试；未使用真实订阅密钥执行请求。
- GitHub 仓库和 Pages 已发布；部署及本次更新状态以 Actions 结果和线上 manifest 版本为准。

## 功能与操作

默认使用免 Key 的 Bing 网页接口，自动检测原始语言，目标默认为简体中文。设置中可选择中文、英文、日文、韩文、德文、法文、俄文、西班牙文等语言。

- **自动翻译**：翻译当前频道的新消息、已加载消息及滚动后新进入消息 Store 的历史消息。
- **翻译当前频道已加载消息**：按消息 ID 的时间顺序处理整个本地集合。不请求额外 Discord 历史。
- **停止翻译**：停用自动模式并取消队列及在途请求；已经显示的译文保留。
- **清除译文**：取消工作，清除译文和缓存。已清除的旧内容不会立即被自动重新翻译；新消息仍可自动处理。点击“翻译当前频道”可重新翻译旧内容。
- **语言/提供方切换**：取消旧任务，清除旧语言显示，按新配置处理；旧请求不能覆盖新结果。

单个工作队列、精确文本去重、每个 HTTP 请求的频率限制、有限重试和内存缓存避免重复请求。初始间隔 1200 ms、单次 HTTP 超时 8000 ms；可在设置里调整。429 不会立即重试。相同原文、目标语言和提供方共享请求。代码、链接及 Discord 标记在提供方层受到保护。缓存有上限，卸载后释放，不保存聊天正文到插件磁盘设置。

## Android 渲染适配

首选独立 React Native 双语组件：保留原始 React 元素，译文作为下面的独立元素。组件绑定频道 ID、消息 ID 和原文修订，复用列表格不会沿用上一条的译文。

Discord 也使用原生消息列表。适配器提供受格式保护的 `DCDChatManager.updateRows` 桥接路径，对与 MessageStore 消息身份对应的原生正文节点数组创建新数组，把译文追加在原有节点下方；兼容的普通字符串格式也有严格校验。不更改消息 Store、不修改共享正文节点，不发出或编辑 Discord 消息。原生路径不是独立 RN 译文组件。实际格式不符合校验时保持原样，设置中的诊断会显示缺失的渲染能力，避免损坏消息列表。Classic 内部 API 和私有渲染通道的证据/限制见 [运行时说明](docs/runtime-evidence.md)。

仅看到“插件已启用”不等于成功显示译文。安装后检查“诊断”中的 `observedMessageRenders`、`nativeRowsObserved` 和 `nativeRowsTranslated`，再按下方实机步骤验收。这些计数表示代码观察到/生成了展示数据，仍需肉眼确认手机上实际显示。若没有观察到支持的渲染通道，当前构建需要该 Discord 构建的模块诊断才能继续适配；不要把不支持的格式当作普通字符串强行追加。

## 可选 Microsoft Translator 官方 API

默认不开启，也不需要 Key。网页接口不能满足需求时，可在插件设置中选择 **Microsoft Translator**，填写 Azure Translator 订阅 Key 和相应区域。也可在填写 Key 后明确开启“网页接口失败时使用官方服务”；未开启不会自动使用付费订阅。

默认 Endpoint 为 `https://api.cognitive.microsofttranslator.com`。支持正确的 Microsoft Translator 资源 HTTPS Endpoint；发送订阅 Key 的地址受 Microsoft 域名校验约束。请求省略 `from` 以自动检测语言，中文目标映射为 `zh-Hans` / `zh-Hant`。

密钥输入会遮罩。密钥保存在 Classic 插件的本地设置，不写入发布文件或日志；客户端内其他有权限的代码仍可读取插件设置，不能当作硬件密钥库。不要上传自己的设置文件。所选聊天正文会提交至 Bing/Microsoft 翻译服务，代码及受保护标记按实现跳过。

## 构建与本地检查

需要 Node.js 22 或更新版本：

```sh
npm ci --ignore-scripts
npm run check
npm run probe:bing
```

`probe:bing` 是有界限的真实网络测试，不包含私人聊天。若出现限流、鉴权失败或网络失败，命令会报告失败，不能改成固定“通过”。普通测试使用受控 HTTP 响应，覆盖超时、取消、429、会话失效、长文本和格式校验，不能替代真实网络测试。

修改源码后重新构建。构建会更新 manifest 的 SHA-256 `hash`；Classic 用它判断是否需要下载更新的 `index.js`。

## GitHub Pages 发布与 Source URL 安装

1. 创建自己的 GitHub 仓库，把本目录的源码、`package-lock.json`、`site` 和 `.github/workflows/pages.yml` 提交到 `main`。不要上传 `node_modules`、测试临时目录或私人设置。
2. 仓库 Settings → Pages → Source 选择 **GitHub Actions**。
3. 运行“Build and deploy Revenge Classic plugin”工作流，检查构建及部署成功。
4. 打开工作流输出的 Pages 首页，复制该页计算出的 **Source URL**。地址的最后一段是 `/bing-translator/`，而不是 `index.js`、仓库主页或 ZIP。
5. 在手机 Revenge Classic → Settings → Plugins → 添加插件，粘贴 Source URL 并启用。切勿按 Revenge Next 的“插件仓库/ZIP”格式安装。

`dist` 已可直接部署到兼容的 HTTPS 静态文件主机。应能公开访问 Source URL 下的 `manifest.json` 和 `index.js`，不要使用登录后才能访问的链接。`the local delivery directory` 本地路径不能直接填为手机 Source URL。

## 手机验收

1. 确认 Revenge Classic 版本及 Android/Discord 版本；从 HTTPS Source URL 安装。
2. 进入含英、日、韩文的测试频道，确认原文还在，译文位于对应原文下方；诊断应记录实际渲染匹配。
3. 打开自动模式，新消息到达和滚动加载旧消息应各翻译一次，不能串到列表复用后的其他消息。
4. 改目标为日语，再改回中文；编辑或删除一条消息，检查旧译文不残留。
5. 测试停止、清除、切换频道和卸载。清除/卸载要移除译文，原文及聊天操作保持正常。
6. 若失败，记录 Classic 版本、诊断和现象。不要发送订阅 Key、Discord Token 或私人聊天全文。

## 来源

桌面参考：DevilBro 的 Translator 2.8.6，以及此聊天中修复的 Bing 会话、语言映射及重试逻辑。原插件为 [BetterDiscordAddons/Translator](https://github.com/mwittrien/BetterDiscordAddons/tree/master/Plugins/Translator)。Android 代码重写框架与渲染集成，仅携带 Bing/Microsoft 两种提供方。

Classic 官方 API 基线：[revenge-mod/revenge-bundle v1.11.6](https://github.com/revenge-mod/revenge-bundle/tree/1b1d297416594087769987908e5fc09af36b7e6e)。此基线不是对 Discord 348.10 实机兼容性的声明。
