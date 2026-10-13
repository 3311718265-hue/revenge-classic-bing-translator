<div align="center">

<h1>Bing Bilingual Translator</h1>
<h3>在 Discord 原文下方，直接阅读译文</h3>
<p>Revenge Classic 安卓插件 · 自动翻译新消息与已加载历史 · 自由选择目标语言</p>

<p>
  <a href="https://3311718265-hue.github.io/revenge-classic-bing-translator/bing-translator/manifest.json"><img src="https://img.shields.io/badge/version-0.1.1-5865F2?style=flat" alt="版本 0.1.1"></a>
  <a href="#完整使用指南"><img src="https://img.shields.io/badge/Revenge-Classic-5865F2?style=flat" alt="Revenge Classic"></a>
  <a href="#当前验证状态"><img src="https://img.shields.io/badge/Bing-experimental-b58115?style=flat" alt="Bing 网页接口为实验性接口"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2da44e?style=flat" alt="MIT License"></a>
</p>

<p>
  <a href="https://3311718265-hue.github.io/revenge-classic-bing-translator/"><b>安装页面</b></a> ·
  <a href="#完整使用指南"><b>完整使用指南</b></a> ·
  <a href="https://github.com/3311718265-hue/revenge-classic-bing-translator/issues"><b>问题反馈</b></a>
</p>
<p>
  <a href="#快速入门">快速入门</a> ·
  <a href="#4-自动翻译新消息和历史消息">自动翻译</a> ·
  <a href="#5-每个按钮的作用">按钮说明</a> ·
  <a href="#9-能安装但不显示译文按顺序排查">常见问题</a> ·
  <a href="#开发与实现说明">开发说明</a>
</p>

<br>
<table align="center">
  <tr><td align="left"><b>原文</b><br>Hello, welcome to the community.</td></tr>
  <tr><td align="left"><b>译文 · 简体中文</b><br>你好，欢迎来到社区。</td></tr>
</table>
<p><sub>双语显示示意：保留原文，在对应消息下方增加译文。</sub></p>

</div>

---

这是一个通过 **Source URL** 安装的 Discord 安卓翻译插件。翻译在 Discord 内完成，操作入口位于 Revenge Classic 的插件设置页面；无需 Root、悬浮窗或独立 APK。

> 目标环境为 Android 16 / Discord 348.10 / Revenge Classic。Bing 网页接口为实验性接口；0.1.1 的构建和 65 项测试已通过，手机上的实际显示仍需验证。

## 快速入门

### 安装插件

打开 **Discord 设置 → Revenge Classic → Plugins → 添加插件**，粘贴下面的完整 Source URL，安装并启用：

```text
https://3311718265-hue.github.io/revenge-classic-bing-translator/bing-translator/
```

保留末尾 `/`。已安装的用户先更新插件并重启 Discord，在底部“本机诊断”确认 `pluginVersion` 为 `0.1.1`；不要重复安装两份。

### 开始翻译

1. 先进入一个文字频道，等待聊天消息加载。
2. 打开 **Bing Bilingual Translator** 插件设置，选择 **简体中文** 和 **Bing 网页翻译**。
3. 开启 **自动翻译新消息**，点击一次 **翻译本频道已加载消息**。
4. 返回频道，查看外语原文下方的译文。之后可正常聊天或滚动加载历史。

Bing 模式无需 API Key。当前版本没有新增消息长按菜单里的翻译按钮，直接从插件设置操作。

> 安装成功但没有译文？查看下方[完整排查步骤](#9-能安装但不显示译文按顺序排查)，先确认版本、当前频道和已加载消息数。

---

## 完整使用指南

适用插件：Bing Bilingual Translator 0.1.1。目标环境：Android 16、Discord 348.10、Revenge Classic。

本教程使用 Revenge Classic 的 Source URL 安装方式。无需 Root、悬浮窗或独立 APK。0.1.1 的构建和 65 项测试已通过；手机上的实际译文显示仍需要安装后确认。Bing 网页接口属于实验性接口，可能受网络、地区、风控和限流影响。

### 1. 已安装的用户：先更新

如果你已经装了这个插件，不需要添加第二个相同插件。

1. 打开 Discord 设置中的 Revenge Classic → Plugins，找到 **Bing Bilingual Translator**。
2. 如果插件菜单提供更新或刷新操作，执行更新；确认插件处于启用状态。不同 Classic 版本的按钮位置和文字可能不同。
3. 完全关闭 Discord 并重新打开。仅关闭设置页不会重新加载插件代码。Classic 在允许插件自动更新时，会在启动时检查 Source URL。
4. 打开此插件的设置，拉到底部“本机诊断”，查看 `pluginVersion`，应显示 **`0.1.1`**。
5. 如果仍显示 `0.1.0`，先确认手机能够打开下面的 manifest 链接；记录自己的目标语言等设置，再卸载这个插件、从原 Source URL 重新安装并重启 Discord。

重新安装可能需要重新填写设置。不要为了更新而清除整个 Discord 应用的数据，也不要安装名称相同但来源不同的插件来替代。

### 2. 首次安装

在手机 Revenge Classic 的 Plugins 页面点击添加插件，粘贴以下完整地址，保留末尾 `/`：

```text
https://3311718265-hue.github.io/revenge-classic-bing-translator/bing-translator/
```

插件名称应为 **Bing Bilingual Translator**。安装后启用插件并重启 Discord。

安装时填写上面的文件夹 URL，不要填写 GitHub 仓库主页、Pages 首页、`index.js` 文件地址或 ZIP 下载地址。

可以用手机浏览器检查安装地址是否可访问：

- [Pages 安装首页](https://3311718265-hue.github.io/revenge-classic-bing-translator/)
- [manifest.json：检查版本](https://3311718265-hue.github.io/revenge-classic-bing-translator/bing-translator/manifest.json)
- [index.js：插件程序文件](https://3311718265-hue.github.io/revenge-classic-bing-translator/bing-translator/index.js)

如果 Pages 地址无法访问，可以使用这个备用 Source URL：

```text
https://raw.githubusercontent.com/3311718265-hue/revenge-classic-bing-translator/main/bing-translator/
```

这两个地址提供同一插件。切换安装地址前先卸载原来的那一份，避免两份插件同时翻译。备用地址只能解决安装文件访问问题，不能解决手机无法访问 Bing 的问题。

### 3. 第一次翻译：按这个顺序操作

1. 先进入一个**文字频道**，等聊天消息显示出来。可以往上滚动一点，让更多历史消息加载到手机里。
2. 打开 Revenge Classic → Plugins → Bing Bilingual Translator 的插件设置。
3. 在“目标语言”中选 **简体中文**，确认顶部显示 `目标语言：zh-CN`。
4. 在“翻译服务”中选 **Bing 网页翻译**。第一次测试保持“Bing 失败时使用官方 API”关闭，不需要填写任何密钥。
5. 打开 **自动翻译新消息**。如果它已经开启，无需重复切换。
6. 点击一次 **翻译本频道已加载消息**，等待队列处理。不要连续重复点击。
7. 返回刚才的文字频道，查看外语消息下方是否出现译文；原文应保留。

可以找一条已有的英文消息测试，例如：

```text
Hello, welcome to the community.
```

期望看到原文下面增加对应的中文译文，具体翻译措辞可能不同。如果翻译结果与原文完全一致，插件不会另加一块相同译文；因此第一次应使用明确的外语句子测试。

当前安卓版本的操作入口在**插件设置页面**。它没有新增消息长按菜单里的“翻译”按钮，也不需要先选中文字。

### 4. 自动翻译新消息和历史消息

首次测试成功后，保持“自动翻译新消息”开启，返回频道正常聊天即可。

- 新消息进入当前频道后，插件会尝试自动翻译。
- 往上滚动时，Discord 加载到本机的历史消息会进入处理范围。
- 切换频道后，处理范围随当前频道改变；旧频道请求的迟到结果不会贴到新频道消息上。
- 编辑过的消息会按新的原文处理；旧修订的译文不能覆盖新修订。

“本频道已加载消息”指手机当前已经读到的消息集合，不代表整个频道从创建以来的全部记录。插件不会自行下载所有 Discord 历史，也不需要离开 Discord 操作。

已有消息的批量翻译会按消息 ID 的时间顺序入队；译文放在各自消息下方，消息本身不会重新排序。长消息可能拆成多次请求，且队列有频率限制，因此大量历史不会瞬间完成。

### 5. 每个按钮的作用

| 控件 | 使用场景 | 操作后的行为 |
| --- | --- | --- |
| 自动翻译新消息 | 日常浏览聊天 | 开启后处理当前频道消息及加载的历史；关闭后停止自动安排新任务 |
| 翻译本频道已加载消息 | 翻译已经显示的消息、重试失败消息 | 手动处理当前频道已加载集合，不主动下载额外历史 |
| 停止翻译 | 暂停当前批次 | 关闭自动模式，取消等待及在途请求；已经显示的译文保留 |
| 清除译文 | 想恢复只看原文 | 取消工作、移除译文和内存缓存；自动模式的开关状态不变 |
| 目标语言按钮 | 改为中文、日文等 | 清理旧语言结果，按新语言处理；自动模式关闭时需再点击批量翻译 |
| Bing 网页翻译 | 默认免 Key 的服务 | 使用实验性 Bing 网页接口 |
| Microsoft 官方 API | 使用自己的 Azure Translator 资源 | 需要自己的 Key、区域和正确 API 地址 |

清除译文后，已清除的旧消息不会立即被自动翻译回来。要重新翻译它们，点击“翻译本频道已加载消息”；也可以先停止，再重新开启自动翻译。新进入的消息仍可按自动模式处理。

**想暂停且移除译文**：先点“停止翻译”，再点“清除译文”。

**想重新开始**：重新打开“自动翻译新消息”；需要重做当前历史时再点一次批量翻译。

### 6. 目标语言与状态数字

目标语言是“你想看哪种语言的译文”，不是原文语言。原文语言由服务自动检测。

| 界面选项 | 代码 |
| --- | --- |
| 简体中文 / 繁體中文 | `zh-CN` / `zh-TW` |
| English / 日本語 / 한국어 | `en` / `ja` / `ko` |
| Deutsch / Français / Русский / Español | `de` / `fr` / `ru` / `es` |
| Português / Italiano / العربية / हिन्दी | `pt` / `it` / `ar` / `hi` |
| Türkçe / Tiếng Việt / Bahasa Indonesia / ไทย | `tr` / `vi` / `id` / `th` |
| Українська / Nederlands | `uk` / `nl` |

状态栏示例：`运行中 · 等待 5 · 已翻译 12`。

- **运行中**：队列正在执行任务。
- **自动翻译待命**：自动开关已开启，当前没有正在执行的任务；它本身不能证明渲染适配成功。
- **已停止**：自动开关关闭，当前没有运行中的任务。
- **等待**：还未结束的消息任务数量，可能包含当前活动任务；相同文字可以共享一次请求。
- **已翻译**：当前保留的译文记录数量，不一定等于屏幕上可见的消息行数。清除、语言切换和缓存上限会影响它。

不要只看“已启用”或计数判断成功：最终要返回频道，确认译文确实出现在对应原文下方。

### 7. 请求间隔和超时

先用默认值测试：请求间隔 **1200 毫秒**，请求超时 **8000 毫秒**。

| 情况 | 可以怎样调整 |
| --- | --- |
| 少量消息能翻译，大量消息开始失败 | 先停止批量任务；把间隔改为 `2000` 或 `3000`，稍后重试 |
| 明确出现超时，网络本来就慢 | 可把超时改为 `15000`；这只能延长等待，不能修复接口不可用 |
| 出现频率限制 | 停止反复点击，等待冷却后重试；插件会至少暂停约一分钟，并尊重服务要求的更长等待时间 |
| 只是处理得慢，没有报错 | 等队列完成，或减少一次加载的历史消息数量 |

有效间隔范围为 500–10000 毫秒，超时范围为 2000–20000 毫秒；超出范围会按代码限制调整。请求间隔限制的是 HTTP 请求启动速度，一条长消息可能需要多次 HTTP 请求。

切换语言、清除译文或重新点击批量翻译，不能绕过服务的频率限制。Bing 接口不是稳定性承诺，增加超时和间隔也不能保证恢复。

### 8. 可选：配置 Microsoft 官方 API

普通 Bing 模式不用配置这一节。只有你已经有自己的 Azure Translator 资源，并希望使用它时才需要操作。

1. 在自己的 Azure 资源中查看“Keys and Endpoint”及区域信息。不要把 Key 发到 Discord、GitHub Issue 或截图中。
2. 在插件设置选 **Microsoft 官方 API**，填写 **Microsoft 密钥**。
3. “资源区域”按你的资源配置填写，如 `eastasia`；是否需要区域以资源和 Microsoft 的鉴权说明为准。
4. 默认“API 地址”保持：

   ```text
   https://api.cognitive.microsofttranslator.com
   ```

5. 先用少量已加载消息测试，再决定是否启用自动翻译。

如果希望“平时用 Bing，失败时才用官方 API”，选回 **Bing 网页翻译**，填写自己的官方配置并开启 **Bing 失败时使用官方 API**。只开启开关而不填 Key，无法使用官方服务。遇到 Bing 429 限流时，插件不会立即切换服务反复重试。

官方服务按你的订阅和资源配置使用配额或产生费用，插件没有附送 Key。不要随意填写第三方代理地址；代码只允许所支持的 Microsoft HTTPS 端点接收 Key。

官方参考：[Translator Translate 接口与自动检测](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/v3/translate)、[Translator 鉴权](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/authentication)。

### 9. 能安装、但不显示译文：按顺序排查

#### 第一步：确认版本和消息已加载

先看 `pluginVersion` 是否为 `0.1.1`。再返回文字频道，等消息显示并稍微往上滚动，然后回到插件设置。

旧版 0.1.0 曾出现 JSX 未观察到消息、原生桥找不到的情况。0.1.1 增加 `RowManager` 路径；不要继续拿 0.1.0 的诊断判断新版本效果。

#### 第二步：看本机诊断

“本机诊断”中的 `service` 和 `host` 会显示相近的宿主信息。回报时保留其中一份完整信息也有用。

| 字段 | 如何理解 |
| --- | --- |
| `pluginVersion` | 当前实际执行的代码版本，应为 `0.1.1` |
| `currentChannelAvailable` | 是否读到了当前文字频道；false 时先进入频道 |
| `loadedMessageCount` | 读到的已加载消息数；0 时先加载消息，再检查是否报读取问题 |
| `messageStore` / `selectedChannelStore` | 对应 Store 接口是否找到；true 不代表其中一定有消息 |
| `nativeRowManagerActive` | 是否已安装安卓消息行生成钩子 |
| `nativeHookAvailable` | DCDChatManager 桥是否可用；false 但 RowManager 正常时，不一定是错误 |
| `nativeDiscoveryStatus` | `row-manager` 或 `native-bridge` 表示已接入一路；`waiting` 表示仍未发现 |
| `nativeRowsObserved` | 累计捕获到的有效原生消息行数，加载消息后应增加 |
| `nativeRowsTranslated` | 累计生成含译文的原生消息行次数；不是唯一消息数量 |
| `observedMessageRenders` | 捕获到的 React 消息渲染次数；原生路径工作时它可以为 0 |
| `rendererStatus` | `native-observed` / `observed` 表示已观察到消息；仍需肉眼确认译文 |

#### 第三步：区分“没读取到”“翻译失败”“没有显示”

| 现象 | 接下来检查什么 |
| --- | --- |
| 点击后等待 0、已翻译 0，并提示未取得频道 | 先进入文字频道加载消息，再回来操作 |
| 提示没有可读取的已加载消息 | 看 `currentChannelAvailable`、`loadedMessageCount`，确认不是语音页或还没加载消息 |
| 自动待命、已翻译 0，所有消息观察数也为 0 | 看版本、模块接入状态和完整诊断；不应直接归因于 Bing |
| 已翻译有数值，但频道看不到译文 | 看原生/React 渲染观察数和译文生成数，可能仍有当前客户端渲染适配问题 |
| 显示翻译超时或请求失败 | 先停止批量任务，用一条外语消息重试，检查手机网络能否访问 Bing |
| 显示频率限制 | 等待冷却；不要连续切换语言或反复点击 |
| 显示鉴权失败 | Bing 模式可能是网页会话/服务拒绝；官方模式则检查自己的 Key、区域及端点 |
| 切换目标语言后没有重做历史 | 自动模式关闭时，再点一次批量翻译 |
| 清除后旧消息没有马上重新翻译 | 这是预期行为；手动点击批量翻译可重新处理 |

手机浏览器能打开 Bing 网页，只能证明基本网页访问正常，不能单独证明插件的翻译请求被接受。

#### 第四步：提交有效反馈

在 [GitHub Issues](https://github.com/3311718265-hue/revenge-classic-bing-translator/issues) 提供：

```text
Android 版本：
Discord 完整版本：
Revenge Classic 版本：
插件 pluginVersion：
提供方与目标语言（不含 Key）：
是否先进入文字频道加载了消息：
自动翻译 / 手动批量，哪一个失败：
点击后状态栏与报错：
本机诊断（去掉私人信息）：
实际现象：没有译文 / 部分译文 / 错配 / 卡住等
```

不要发送 API Key、Discord Token、账号密码、私人聊天全文。截图可以只截状态栏和诊断区。如果新版本仍显示 `waiting` 或没有观察到消息，需继续针对实际手机模块适配；教程不能保证所有 Discord 构建都可用。

### 10. 停用、卸载和隐私

暂时不想用：点击“停止翻译”；若想把已经显示的译文也移除，再点击“清除译文”。

完全移除：在 Revenge Classic 的 Plugins 中停用并卸载 **Bing Bilingual Translator**。插件卸载会取消请求并撤销自己的钩子；如界面仍残留之前的显示，重新进入频道或重启 Discord。

插件不会把译文作为新 Discord 消息发送，不会替你修改聊天消息，也不会上传 Discord 登录凭据。需要翻译的正文会发送给选择的 Bing/Microsoft 服务；不能把它当作聊天隐私脱敏工具。

消息缓存仅保留在内存。目标语言等配置、以及你自己输入的 Microsoft Key 保存在手机本地插件设置中，不会自动同步到 GitHub。本地保存不等于硬件加密保管，其他有相应权限的插件或代码可能访问设置。

### 11. 完成一次验收

正常使用前，在一个你能安全测试的频道确认：

1. 外语原文保留，译文在正确消息下方。
2. 新消息和滚动加载的历史能进入翻译队列。
3. 改目标语言后，没有把旧语言结果贴到新结果上。
4. 停止后不继续安排请求；清除后原文还在。
5. 切换频道、编辑/删除消息时不出现错配或旧译文残留。

这五项在你的手机通过，才算该手机上的使用验收完成。安装成功、GitHub 构建成功和模拟测试通过各自只证明其中一部分。

---

## 开发与实现说明

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
