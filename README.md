# ZCode Mobile

> ZCode Mobile 是一个基于 Expo 的 iOS / Android 薄封装应用。它本身不实现聊天、不实现会话同步，而是把 ZCode Desktop 已有的 HTTPS 远程同步页面包成一个全屏 WebView，让用户在手机上获得接近原生 App 的访问体验。

## 它是什么，不是什么

- **是什么**：ZCode 网页版（`zcode.z.ai/remote/v4`）的原生移动壳。扫码获取桌面端远程会话链接，在全屏 WebView 中加载原有页面，并加上原生顶部、扫码配对、设置入口、断开控制等必要的安全壳。
- **不是**：ZCode 网页的替代实现；不做本地 AI Agent、会话存储、消息流、推送通知、自有聊天协议，也不复制 ZCode 网页内容或将其迁移成另一份 UI。网页本身才是真正的产品，App 只是更好的入口。

## 当前能力

- **扫码配对**：用相机扫描 ZCode Desktop 远程同步页面的二维码。链接必须严格是 `https://zcode.z.ai/remote/v4` 且包含非空 `sid`、`mid`，否则会被拒绝。
- **会话 WebView**：扫码成功后保存链接，全屏加载远程页面，保留网页 JavaScript、Cookie、LocalStorage 等会话状态。
- **原生头部**：机器名称、二维码失效提示、设置入口；颜色跟随应用主题（深色 / 浅色 / 跟随网页）。
- **设置页**：主题切换（深色 / 浅色 / 跟随网页）；重新加载当前页面；重新扫码连接；断开本机连接（带二次确认）。
- **扫码页**：相机权限引导、QR 扫描、自动跳转到会话。
- **启动体验**：原生冷启动显示 ZCode Logo，过渡到应用内的呼吸动画，避免出现空屏。
- **导航保护**：Android 系统返回键优先返回网页历史；无历史时回到扫码界面。WebView 仅允许 `zcode.z.ai` 域内的导航，其它 HTTPS 外链交由系统浏览器。

## 安全边界

`https://zcode.z.ai/remote/v4?sid=…&mid=…&name=…` 中的 `sid`、`mid` 和完整链接都属于敏感凭据：

- 仅保存到 `expo-secure-store`，不会进入普通应用存储。
- 不会出现在 UI、日志、测试夹具或 README 中。
- `zcode.z.ai` host 和 `/remote/v4` path 必须精确匹配；非 HTTPS、子域名、端口、URL 用户名 / 密码、哈希片段、缺失参数或格式异常的二维码都会被拒绝。
- 点击“断开”只删除本机安全存储中的连接，不会影响桌面端会话。
- WebView 仅接收受约束的主题回传消息（明暗主题 + 单一背景色），不读取、上传或转发任务、消息、Cookie 等网页内容。

## 主题

- App 提供三档主题：**深色 / 浅色 / 跟随网页**，并在扫码页、设置页、会话页原生头部同步生效。
- 切换主题时会同时下发指令到 WebView，通过真实的指针事件触发 ZCode 网页（Radix 组件）主题菜单的对应选项（`深色主题` / `浅色主题` / `系统默认`）。
- 主题默认值持久化在 `expo-secure-store`，冷启动后仍能恢复。

## 运行环境

- Node.js 18+ 与 Expo CLI。
- 需要一部能访问 ZCode 远程链接的设备或模拟器。相机扫码无法在普通浏览器模拟器中完整验证，建议在 iOS 或 Android 真机运行。
- 当前机器上构建 Android 原生 APK 需要 JDK 17；本机如未满足可用 Expo Go 打开开发包进行验证。

## 本地运行

```bash
npm install
npm run start
```

随后使用 Expo Go 或开发构建扫描终端中的二维码：

```bash
npm run ios      # 启动 iOS 开发客户端
npm run android  # 启动 Android 开发客户端
npm run web      # 启动 Web（Web 仅用于调试，本 App 的目标平台是 iOS / Android）
```

首次启动会请求相机权限。然后在 ZCode Desktop 中打开“远程同步”，扫描其二维码即可开始会话。

## 校验

```bash
npm run typecheck   # TypeScript 静态检查
npm test            # 全部单元测试（URL 安全、WebView 桥接、DOM 行为）
npm run check       # typecheck + test
```

测试覆盖：

- URL 校验：有效连接、不可见字符清理、非 HTTPS、错误 host、子域名、错误路径、缺失 `sid` / `mid`、端口、URL 凭据、哈希片段、控制字符。
- 机器名提取：只取 `name` 用于显示，其它会话参数不会进入 UI。
- WebView 桥接：拒绝任意网页消息；只接受约束的主题消息。
- 主题脚本：注入脚本中只包含字面量，不会内联未受信的值。
- WebView DOM 行为：隐藏 ZCode 远程壳但不吞掉任务列表；SPA 重渲染后重新应用；空页熔断；主题按钮随隐藏等。

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
  mobile-settings.ts      本机主题偏好与刷新指令
  webview-bridge.ts       注入脚本（横幅隐藏 / 主题切换 / 主题回传）
  app-theme.tsx           全局主题上下文
tests/
  connection.test.ts            URL 安全测试
  webview-bridge.test.ts        桥接安全测试
  webview-dom.test.ts           DOM 行为回归测试
```

## 真机验收清单

需在能访问 ZCode 远程链接的真机上确认：

1. 扫描有效二维码后，ZCode 的远程页面能在全屏 WebView 中加载。
2. 流式回复、Cookie 与登录状态在 iOS `WKWebView` 和 Android WebView 中正常工作。
3. 软件键盘不会遮挡网页输入区。
4. iOS 返回手势、Android 系统返回键符合预期。
5. 设置页主题切换即时改变扫码页、设置页、会话页原生顶栏颜色，并同时切换网页自身主题。
6. 链接失效后 “重新扫码” 能恢复连接；网络恢复后“重新加载” 能回到会话页。

## 已知限制

- 这是网页的薄封装：ZCode 网页升级或结构调整后，部分注入脚本可能需要更新。当前所有 DOM 选择器（`header.bg-header`、说明卡的 `.bg-card`、主题菜单的 `role="menuitemradio"` 等）均通过真实远程页面验证。
- 主题切换依赖 Radix 菜单正常响应 pointerdown 事件；不会绕过 ZCode 自己的主题逻辑。
- 不会实现本地 Agent 控制、消息推送、账号体系或全功能聊天界面——这些都来自 ZCode Desktop 与网页本身。

## 演进方向（未来可能）

- 在 ZCode 网页支持 `?embed=mobile` 等官方渲染模式后，由 App 只携带模式标记，让网页自身渲染移动版 UI，进一步减少注入依赖。
- 接入推送通知（扫码成功、会话失效、远端有新消息等），仍由 ZCode 提供的事件接口支撑。
- 增加文件选择、剪贴板桥接等原生增强（依赖 ZCode 网页暴露对应能力）。

本项目不发布到应用商店，不修改 ZCode Desktop、远程同步协议或网页本身。所有操作均在本机执行，不上传二维码内容、会话链接、消息或文件。