<div align="center">

<h1>Bing Bilingual Translator</h1>
<h3>为 Discord 安卓消息提供双语显示</h3>
<p>Revenge Classic 安卓插件 · 自动翻译新消息与已加载历史 · 自由选择目标语言</p>

<p>
  <a href="https://3311718265-hue.github.io/revenge-classic-bing-translator/bing-translator/manifest.json"><img src="https://img.shields.io/badge/version-0.1.4-5865F2?style=flat" alt="版本 0.1.4"></a>
  <a href="#完整使用指南"><img src="https://img.shields.io/badge/Revenge-Classic-5865F2?style=flat" alt="Revenge Classic"></a>
  <a href="#兼容性与验证范围"><img src="https://img.shields.io/badge/Bing-experimental-b58115?style=flat" alt="Bing 网页接口为实验性接口"></a>
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
  <a href="#运行环境与插件">运行环境</a>
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

> 目标环境为 Android 16 / Discord 348.10 / Revenge Classic。当前为实验性版本，手机上的译文显示尚未完成实机验收。构建或安装成功不代表已完全适配。

## 运行环境与插件

本插件配合 [Revenge Manager](https://github.com/revenge-mod/revenge-manager) 安装的 Discord 修改版使用。三个部分的关系如下：

| 部分 | 作用 | 在哪里操作 |
| --- | --- | --- |
| Revenge Manager | 安装和更新 Revenge 修改版 Discord | 手机上的 Manager 应用 |
| Discord 中的 Revenge Classic | 加载插件，提供 Plugins、Source URL 和插件设置 | 修改版 Discord 的设置 |
| Bing Bilingual Translator | 翻译当前频道消息，尝试在原文下方显示译文 | Classic 的插件设置 |

**Source URL 要添加到 Discord 内的 Classic → Plugins，不是粘贴到 Revenge Manager 中。** Manager 是安装管理工具；翻译插件使用 Classic 的插件接口。

已经能打开 Classic 的 Plugins 页面，可以直接看下面的安装步骤。尚未安装运行环境：

1. 从 [Revenge Manager 官方 Releases](https://github.com/revenge-mod/revenge-manager/releases/latest) 获取 Manager APK，按 Android 提示安装。
2. 打开 Manager，按其界面安装 Revenge 修改版 Discord，然后启动安装完成的 Discord。
3. 在 Discord 设置中确认有 **Revenge Classic → Plugins → Source URL** 添加入口，再安装本插件。本指南只适用于 Classic；如果你的界面只有插件仓库或 ZIP 安装入口，需要先核对框架版本。

Manager 和翻译插件各自更新。出现 **Revenge Update Failed** 时，按下面的故障说明处理框架更新。

## 快速入门

### 安装插件

打开 **Discord 设置 → Revenge Classic → Plugins → 添加插件**，粘贴下面的完整 Source URL，安装并启用：

```text
https://3311718265-hue.github.io/revenge-classic-bing-translator/bing-translator/
```

保留末尾 `/`。已安装的用户先更新插件并重启 Discord，在底部“本机诊断”确认 `pluginVersion` 为 `0.1.4`；不要重复安装两份。

### 开始翻译

1. 先进入一个文字频道，等待聊天消息加载。
2. 打开 **Bing Bilingual Translator** 插件设置，选择 **简体中文** 和 **Bing 网页翻译**。
3. 开启 **自动翻译新消息**，点击一次 **翻译本频道已加载消息**。
4. 返回频道，查看外语原文下方的译文。之后可正常聊天或滚动加载历史。

Bing 模式无需 API Key。消息长按菜单的“翻译这条消息”：长按一条文字消息，点此项，此入口接入成功并取得结果后会在 Discord 内打开译文查看窗口。0.1.3 手机反馈尚未接入菜单，0.1.4 修复延迟菜单模块订阅，仍需手机确认。自动双语显示仍属于实验性适配。

> 安装成功但没有译文？查看下方[完整排查步骤](#9-能安装但不显示译文按顺序排查)，先确认版本、当前频道和已加载消息数。

---

## 完整使用指南

适用插件：Bing Bilingual Translator 0.1.4。目标环境：Android 16、Discord 348.10、Revenge Classic。

本教程使用 Revenge Classic 的 Source URL 安装方式。无需 Root、悬浮窗或独立 APK。0.1.4 的构建和 82 项测试已通过；手机上的实际译文显示仍需要安装后确认。Bing 网页接口属于实验性接口，可能受网络、地区、风控和限流影响。

### 1. 已安装的用户：先更新

如果你已经装了这个插件，不需要添加第二个相同插件。

1. 打开 Discord 设置中的 Revenge Classic → Plugins，找到 **Bing Bilingual Translator**。
2. 如果插件菜单提供更新或刷新操作，执行更新；确认插件处于启用状态。不同 Classic 版本的按钮位置和文字可能不同。
3. 完全关闭 Discord 并重新打开。仅关闭设置页不会重新加载插件代码。Classic 在允许插件自动更新时，会在启动时检查 Source URL。
4. 打开此插件的设置，拉到底部“本机诊断”，查看 `pluginVersion`，应显示 **`0.1.4`**。
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

### 2.1 安装报错或框架更新失败

**报错：Plugin already installed**

这个报错表示 Classic 仍保存了相同 Source URL 的安装记录。加载器会先检查记录，然后才开始下载，所以此报错不等于下载地址失效。

1. 点 **Okay** 关闭提示，完全关闭并重新打开 Discord。
2. 在 Plugins 清空搜索内容，再搜索 **Bing** 或 **Bilingual**。
3. 找到插件后，打开它的菜单，选择 **Refetch（重新获取）**，启用插件并重启 Discord。无需再点加号安装相同地址。
4. 如果确实要重新安装，使用插件菜单里的 **Delete（删除）** 并确认。**Clear Data（清除数据）** 只重置插件设置，**关闭开关** 只停用插件，都不等于删除安装记录。
5. 若列表仍没有插件卡片，点击 **Unproxied Plugins Found** 右侧的 **ⓘ**，检查保留的 Source URL。记录提示和框架版本后反馈；不要为绕过报错换地址安装第二份，也不要清除整个 Discord 的应用数据。

**报错：Revenge Update Failed / Request timeout**

先看报错中的 URL。如果指向官方 `revenge-mod/revenge-bundle/releases/.../revenge.min.js`，失败的是 **Revenge 框架更新**，与本插件的 `bing-translator/` 下载地址属于不同请求。

- 可以先点 **Dismiss** 关闭提示；已有缓存能否继续运行，以 Classic 设置和插件列表是否正常打开为准。
- 检查手机访问 GitHub Releases 的网络，恢复后选择 **Retry Update**。浏览器能打开 GitHub 首页不代表发布文件下载也能成功。
- 无需因此删除翻译插件、清除 Discord 数据或改装 Revenge Next。
- 若没有可用缓存、Classic 设置也打不开，应先修复框架下载，再进行插件安装。

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

也可以**长按文字消息 → 翻译这条消息**，单独翻译这一条。菜单动作复用同一队列、缓存和频率限制；自动开关关闭时仍可手动翻译。只有这次手动点击会打开译文查看窗口，自动处理消息不会反复弹窗。

Android 无需选中句子，长按整条文字消息即可。如果长按菜单没有按钮，先看 `messageMenuDiscoveryStatus`：`hooked` 表示已挂上实际模块，`waiting-for-classic-module` 表示等待延迟模块，`message-sheet-not-found` / `classic-lazy-resolution-failed` 表示尚未找到兼容入口，`patch-failed` 表示模块找到但挂钩失败。再查看诊断中的 `messageMenuHookAvailable`、`messageMenuObserved`、`messageMenuInjections`、`messageMenuMissingComponents` 和 `messageMenuNoContainer`。钩子可用只表示找到了接口；注入数增加后仍需实际查看菜单。**译文查看窗口能显示结果，也不等于原文下方的自动显示已适配。**

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

状态栏示例：`运行中 · 等待 5 · 已取得译文 12`。

- **运行中**：队列正在执行任务。
- **自动翻译待命**：自动开关已开启，当前没有正在执行的任务；它本身不能证明渲染适配成功。
- **已停止**：自动开关关闭，当前没有运行中的任务。
- **等待**：还未结束的消息任务数量，可能包含当前活动任务；相同文字可以共享一次请求。
- **已取得译文**：当前保留的译文记录数量，不一定等于屏幕上可见的消息行数。清除、语言切换和缓存上限会影响它。

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

先看 `pluginVersion` 是否为 `0.1.4`。再返回文字频道，等消息显示并稍微往上滚动，然后回到插件设置。

旧版 0.1.0 曾出现 JSX 未观察到消息、原生桥找不到的情况。0.1.1 增加 `RowManager` 路径，0.1.3 继续发现尚未产生有效消息行的延迟模块；不要继续拿 0.1.0 的诊断判断新版本效果。

#### 第二步：看本机诊断

“本机诊断”中的 `service` 和 `host` 会显示相近的宿主信息。回报时保留其中一份完整信息也有用。

| 字段 | 如何理解 |
| --- | --- |
| `pluginVersion` | 当前实际执行的代码版本，应为 `0.1.4` |
| `currentChannelAvailable` | 是否读到了当前文字频道；false 时先进入频道 |
| `loadedMessageCount` | 读到的已加载消息数；0 时先加载消息，再检查是否报读取问题 |
| `messageStore` / `selectedChannelStore` | 对应 Store 接口是否找到；true 不代表其中一定有消息 |
| `nativeRowManagerActive` | 是否已安装安卓消息行生成钩子 |
| `nativeHookAvailable` | DCDChatManager 桥是否可用；false 但 RowManager 正常时，不一定是错误 |
| `nativeDiscoveryStatus` | `row-manager` 或 `native-bridge` 表示已接入一路；`waiting` 表示仍未发现 |
| `nativeRowsObserved` | 累计捕获到的有效原生消息行数，加载消息后应增加 |
| `nativeGenerateCalls` | 被钩住的生成方法实际调用数；0 表示这些钩子尚未调用 |
| `nativeGenerateRejected` | 参数、消息身份、频道或原文校验被拒绝的原因计数，不含正文 |
| `nativeLastGenerateShape` | 最近生成调用的结构布尔值和类型，不含聊天内容 |
| `messageMenuHookAvailable` / `messageMenuInjections` | 菜单接口接入状态 / 实际插入按钮的次数 |
| `nativeRowsTranslated` | 累计生成含译文的原生消息行次数；不是唯一消息数量 |
| `observedMessageRenders` | 捕获到的 React 消息渲染次数；原生路径工作时它可以为 0 |
| `rendererStatus` | `native-observed` / `observed` 表示已观察到消息；仍需肉眼确认译文 |

#### 第三步：区分“没读取到”“翻译失败”“没有显示”

| 现象 | 接下来检查什么 |
| --- | --- |
| 点击后等待 0、已取得译文 0，并提示未取得频道 | 先进入文字频道加载消息，再回来操作 |
| 提示没有可读取的已加载消息 | 看 `currentChannelAvailable`、`loadedMessageCount`，确认不是语音页或还没加载消息 |
| 自动待命、已取得译文 0，所有消息观察数也为 0 | 看版本、模块接入状态和完整诊断；不应直接归因于 Bing |
| 已取得译文有数值，但频道看不到译文 | 看原生/React 渲染观察数和译文生成数，可能仍有当前客户端渲染适配问题 |
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

## 兼容性与验证范围

**当前状态：实验性版本，尚未确认完整适配 Android 16 / Discord 348.10。**

手机实测反馈：0.1.3 能读取 25 条消息，观察到 50 次原生消息行、处理过 1 次译文行，但用户仍看不到中文，且消息菜单钩子为 false。0.1.4 增加 Classic 延迟菜单模块订阅，沿用官方 openLazy + hideActionSheet 签名，避免误接弹窗，并补上具体接入失败原因。82 项自动测试覆盖代码行为；尚未确认 0.1.4 手机菜单和原文下方显示效果。诊断中的已取得译文数、`nativeRowsObserved` 和 `nativeRowsTranslated` 是处理和渲染数据计数，重复渲染也可能累计，不能替代肉眼确认。

正式使用前，请按上面的五项验收检查译文显示、历史滚动、频道切换、编辑消息、停止及清除。尚未通过这些检查时，不应把该手机标为兼容。

Bing 网页接口已经做过有界限的实际请求验证，但仍可能受地区、网络和限流影响，不保证长期稳定。Microsoft 官方 API 为可选配置；没有使用真实订阅密钥完成端到端验证。
