# ZCode Mobile

简体中文 | [English](README.en.md)

[![Release](https://img.shields.io/github/v/release/AlfredChaos/zcode-mobile?include_prereleases=true)](https://github.com/AlfredChaos/zcode-mobile/releases)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey)](https://github.com/AlfredChaos/zcode-mobile)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-57-000000)](https://docs.expo.dev/versions/v57.0.0/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**[⬇️ 下载 Android 安装包 v0.1.2](https://github.com/AlfredChaos/zcode-mobile/releases/download/v0.1.2/app-release.apk)** · [全部版本](https://github.com/AlfredChaos/zcode-mobile/releases)

> **把桌面端的 ZCode 远程会话装进手机。**
> ZCode Mobile 是基于 Expo 的 iOS / Android 薄封装应用：扫码配对 ZCode Desktop 的远程同步页面，在全屏 WebView 中安全访问 `zcode.z.ai`，获得接近原生 App 的移动体验。
>
> *Pair with ZCode Desktop by QR code and drive your remote coding sessions from your phone — a thin native wrapper around the official ZCode web remote.*

| 任务列表 | 会话聊天 | 技能调用（`/`） | 模型与额度 |
| :---: | :---: | :---: | :---: |
| <img src="docs/screenshots/task-list.jpg" width="180" /> | <img src="docs/screenshots/chat.jpg" width="180" /> | <img src="docs/screenshots/skills.jpg" width="180" /> | <img src="docs/screenshots/models.jpg" width="180" /> |

## 目录

- [它是什么，不是什么](#它是什么不是什么)
- [安装](#安装)
- [应用功能](#应用功能)
- [手机上可用的 ZCode 能力](#手机上可用的-zcode-能力)
- [安全设计](#安全设计)
- [主题](#主题)
- [开发指南](#开发指南)
- [项目结构](#项目结构)
- [真机验收清单](#真机验收清单)
- [已知限制与演进方向](#已知限制与演进方向)
- [许可证](#许可证)

## 它是什么，不是什么

- **是什么**：ZCode 网页版（`zcode.z.ai/remote/v4`）的原生移动壳。扫码获取桌面端远程会话链接，在全屏 WebView 中加载原有页面，外加原生顶栏、扫码配对、设置入口、断开控制等必要的安全壳。**网页本身才是真正的产品，App 只是更好的入口。**
- **不是**：ZCode 网页的替代实现。不做本地 AI Agent、会话存储、消息流、推送通知、自有聊天协议，也不复制网页内容或将其重写成另一份 UI。

> 本项目为非官方社区作品，与 Z.ai（智谱）无隶属或合作关系；「ZCode」名称及相关标识的权利归原权利方所有。

## 安装

### Android（推荐）

1. 下载并安装 [ZCode Mobile v0.1.2（Android APK，约 118 MB）](https://github.com/AlfredChaos/zcode-mobile/releases/download/v0.1.2/app-release.apk)，可核对 [SHA-256 校验文件](https://github.com/AlfredChaos/zcode-mobile/releases/download/v0.1.2/app-release.apk.sha256)；历史版本见 [Releases](https://github.com/AlfredChaos/zcode-mobile/releases)。
2. 安装时允许「未知来源 / 安装未知应用」。
3. 打开 App，在 ZCode Desktop 中打开「远程同步」，扫描其二维码即可开始。

### iOS

iOS 暂不提供签名安装包，两种方式：

- **Expo Go**：在 App Store 安装 [Expo Go](https://apps.apple.com/app/expo-go/id982107779)，电脑上运行 `npm run start`，手机 Expo Go 扫描终端二维码（需同一局域网）。
- **自行构建**：具备 Apple 开发者账号时，用 EAS internal distribution 或本地 Xcode 构建。

### 从源码运行（开发）

要求 Node.js 18+。相机扫码无法在普通浏览器模拟器中完整验证，建议真机运行；本机构建 Android 原生 APK 需要 JDK 17，不满足时可用 Expo Go 验证。

```bash
npm install
npm run start     # Expo 开发服务器
npm run ios       # 启动 iOS 开发客户端
npm run android   # 启动 Android 开发客户端
```

首次启动会请求相机权限。

## 应用功能

- **扫码配对**：相机扫描 ZCode Desktop 远程同步页面的二维码。链接必须严格是 `https://zcode.z.ai/remote/v4` 且包含非空 `sid`、`mid`，否则会被拒绝。
- **会话 WebView**：扫码成功后保存链接，全屏加载远程页面，保留网页 JavaScript、Cookie、LocalStorage 等会话状态。
- **原生头部**：机器名称、二维码失效提示、设置入口；颜色跟随应用主题。
- **设置页**：主题切换、重新加载当前页面、重新扫码连接、断开本机连接（带二次确认）。
- **启动体验**：原生冷启动显示 ZCode Logo，过渡到应用内的呼吸动画，避免空屏。
- **导航保护**：Android 返回键优先返回网页历史，无历史时回到扫码界面；WebView 仅允许 `zcode.z.ai` 域内导航，其它 HTTPS 外链交由系统浏览器。

## 手机上可用的 ZCode 能力

App 不实现聊天能力，但 ZCode 网页在远程会话里提供的功能几乎都可以直接使用：

| 分类 | 能力 |
| --- | --- |
| 会话与消息 | 新建 / 继续对话、流式回复、Markdown 与代码块渲染、附件预览、消息复制 / 重发 / 收藏 |
| 项目与工作区 | 查看 / 切换 / 创建项目、会话绑定工作区、按项目查看任务与文件 |
| 任务与计划 | 创建 / 编辑任务、查看运行与等待输入状态与历史、置顶与排序 |
| 命令面板 | `⌘K` / 顶栏入口唤出，执行新建会话、切换模型、打开文件等快捷命令 |
| 技能（Skills） | 消息里通过 `/` 触发技能，桌面端已配置的工具在远程会话仍可用，输出与中间步骤在消息流展示 |
| 文件与附件 | 上传图片 / 文档 / 代码片段并引用到会话，查看历史会话生成的附件 |
| 历史与搜索 | 浏览历史会话、关键字检索、继续或导出之前的对话 |
| 桌面端控制 | 查看电脑上已打开的项目 / 任务 / 会话，触发打开任务、切换工作区等桌面端动作 |
| 主题与登录 | 网页主题菜单切换外观（原生部分跟随）；复用桌面端登录态与账号上下文 |

以上功能均不在 App 内重复实现。ZCode 网页后续新增能力通常只要 WebView 能渲染即可直接使用，无需单独适配。

## 安全设计

`https://zcode.z.ai/remote/v4?sid=…&mid=…&name=…` 中的 `sid`、`mid` 和完整链接都属于敏感凭据：

- 仅保存到 `expo-secure-store`，不进入普通应用存储。
- 不出现在 UI、日志、测试夹具或 README 中。
- host 与 path 必须精确匹配；非 HTTPS、子域名、端口、URL 凭据、哈希片段、缺失参数或格式异常的二维码一律拒绝。
- 「断开」只删除本机安全存储中的连接，不影响桌面端会话。
- WebView 仅接收受约束的主题回传消息（明暗主题 + 单一背景色），不读取、上传或转发任务、消息、Cookie 等网页内容。

## 主题

- 三档主题：**深色 / 浅色 / 跟随网页**，在扫码页、设置页、会话页原生头部同步生效。
- 切换时通过真实指针事件触发 ZCode 网页（Radix 组件）主题菜单的对应选项，不绕过网页自身的主题逻辑。
- 偏好持久化在 `expo-secure-store`，冷启动后恢复。

## 开发指南

```bash
npm run typecheck   # TypeScript 静态检查
npm test            # 全部单元测试
npm run check       # typecheck + test
```

测试覆盖四块：

- **URL 校验**：有效连接、不可见字符清理、非 HTTPS、错误 host / 路径、缺失 `sid` / `mid`、端口、URL 凭据、哈希片段、控制字符。
- **凭据边界**：机器名只取 `name` 用于显示，其它会话参数不进入 UI。
- **WebView 桥接**：拒绝任意网页消息，只接受约束的主题消息；注入脚本只含字面量，不内联未受信的值。
- **DOM 行为**：隐藏 ZCode 远程壳但不吞掉任务列表、SPA 重渲染后重新应用、空页熔断、主题按钮随隐藏等。

## 项目结构

```
app/                Expo Router 路由
  _layout.tsx       全局 Provider、Splash 交接、状态栏
  index.tsx         入口：检测已保存连接 → 跳转
  scanner.tsx       相机扫码 + 权限引导
  remote.tsx        全屏 WebView 会话 + 原生头部
  settings.tsx      二级设置页（主题、刷新、断开）
assets/             应用图标与原生启动屏资源
components/
  zcode-mark.tsx          Logo SVG 包装
  zcode-loading-mark.tsx  启动 / 加载时的呼吸动画标志
lib/
  connection.ts            二维码 URL 校验 + 机器名提取
  connection-store.ts      SecureStore 连接读写
  mobile-settings.ts       本机主题偏好与刷新指令
  webview-bridge.ts        注入脚本（横幅隐藏 / 主题切换 / 主题回传）
  app-theme.tsx            全局主题上下文
tests/
  connection.test.ts       URL 安全测试
  webview-bridge.test.ts   桥接安全测试
  webview-dom.test.ts      DOM 行为回归测试
```

## 真机验收清单

1. 扫描有效二维码后，远程页面能在全屏 WebView 中加载。
2. 流式回复、Cookie 与登录状态在 iOS `WKWebView` 和 Android WebView 中正常工作。
3. 软件键盘不遮挡网页输入区。
4. iOS 返回手势、Android 系统返回键符合预期。
5. 设置页主题切换即时改变扫码页、设置页、会话页原生顶栏颜色，并同时切换网页自身主题。
6. 链接失效后「重新扫码」能恢复连接；网络恢复后「重新加载」能回到会话页。

## 已知限制与演进方向

**限制**

- 这是网页的薄封装：ZCode 网页升级或结构调整后，部分注入脚本可能需要更新。当前所有 DOM 选择器（`header.bg-header`、说明卡的 `.bg-card`、主题菜单的 `role="menuitemradio"` 等）均通过真实远程页面验证。
- 主题切换依赖 Radix 菜单正常响应 pointerdown 事件。
- 不实现本地 Agent 控制、消息推送、账号体系或全功能聊天界面——这些来自 ZCode Desktop 与网页本身。

**演进方向**

- ZCode 网页支持 `?embed=mobile` 等官方渲染模式后，由 App 只携带模式标记，让网页自身渲染移动版 UI，减少注入依赖。
- 接入推送通知（扫码成功、会话失效、远端新消息），由 ZCode 提供的事件接口支撑。
- 增加文件选择、剪贴板桥接等原生增强（依赖 ZCode 网页暴露对应能力）。

本项目不上架应用商店，不修改 ZCode Desktop、远程同步协议或网页本身。所有操作均在本机执行，不上传二维码内容、会话链接、消息或文件。问题反馈请前往 [Issues](https://github.com/AlfredChaos/zcode-mobile/issues)。

## 许可证

[MIT](LICENSE)
