# 构建与验证记录

日期：2026-10-13（Asia/Hong_Kong）。版本：0.1.0。

## 已执行并通过

`npm run check`，退出码 0，实际包含：

1. TypeScript 严格静态检查：`tsc --noEmit`。
2. **59 项可运行测试，59 通过，0 失败**。
3. esbuild 编译到 ES2020 JavaScript；不把 React/RN 打进插件，使用 Classic 宿主版本。
4. 构建后验证 manifest/hash、Classic `return <expression>` 加载格式、生命周期导出，以及不存在网页 DOM、BetterDiscord、Google 翻译和外部框架导入。
5. 对生成的 `index.js` 执行 `onLoad`、settings 和 `onUnload`，验证 JSX/Flux/Store 注册及清理。

完整命令输出在 [checks.log](checks.log)。最终 `index.js` SHA-256：`4cf47910912a9a56087dd4308c6a15c0652fd76b8c5cc3b67e9051d79bf4bb8c`，与 `manifest.json` 的 `hash` 一致。

测试按责任划分：提供方 18、队列/消息状态 21、Classic 适配器 13、React Native 组件/设置 7。覆盖 FIFO、去重、缓存、长文本、会话过期、HTTP/JSON 错误、超时/取消、429 全局冷却、编辑/删除取消与共享请求、频道/语言切换、原生节点保留、增量列表索引变化、原生更新/还原、局部重绘、列表复用和卸载。

这些测试执行真实生产方法，HTTP/宿主部分使用受控替身。修复前已观察到队列冷却及旧请求取消的回归失败；修复后通过。宿主替身验证 API 合约与输出数据，不证明手机原生布局。

## Bing 真实网络测试

`npm run probe:bing`，退出码 0：**8/8 通过**。当前发布源码实际请求并检测了简体中文、英语、日语、韩语、德语、法语、俄语、西班牙语；中文译为英语，其余七种译为简体中文。结果、耗时与 UTC 时间见 [live-bing-results.json](live-bing-results.json)。测试使用公开固定样例，没有私人聊天或 API Key。

首次验证脚本把简体中文的预期代码写成 `zh`，Bing 实际返回 `zh-Hans`，译文本身成功。已修正预期为服务真实代码并重新执行全部样例，8/8 通过。不能把修正测试标签当作修复翻译服务。

请求运行在 Windows Node Fetch，并设置一致的 Android 浏览器 User-Agent。它不是 Android 手机测试，样例成功也不是稳定性或可用率保证。限流、风控、地区和服务变化仍可能导致失败。

## 尚未验证

- Android 16 / Discord 348.10 / 用户安装的 Revenge Classic 的实际运行。
- 手机原生模块名称、列表布局、滚动重测、切后台和卸载后的实际显示。
- 真实 Microsoft Translator 订阅 Key 的鉴权和计费。
- GitHub Actions / Pages 公开部署（没有仓库）；所提供工作流尚未在 GitHub 执行。

项目提供原生/RN 格式保护与诊断。若手机没有观察到支持的渲染通道，不能声称移植已在该手机成功，需按 README 收集版本及不含密钥的诊断继续适配。
