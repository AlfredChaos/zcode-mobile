import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

import { mobileWebViewSetupScript } from '../lib/webview-bridge';

function runSetupScript(bodyMarkup: string) {
  const { document, window } = parseHTML(`<!doctype html><html><head></head><body>${bodyMarkup}</body></html>`);
  const messages: string[] = [];

  class MutationObserverStub {
    observe() {}
    disconnect() {}
  }

  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  };
  window.MutationObserver = MutationObserverStub as unknown as typeof MutationObserver;
  window.getComputedStyle = () => ({ backgroundColor: 'rgb(255, 255, 255)' }) as CSSStyleDeclaration;
  (window as unknown as { ReactNativeWebView: { postMessage: (message: string) => void } }).ReactNativeWebView = {
    postMessage: (message: string) => messages.push(message),
  };

  const context = vm.createContext({
    Array,
    JSON,
    MutationObserver: MutationObserverStub,
    document,
    getComputedStyle: window.getComputedStyle,
    setTimeout,
    window,
  });

  new vm.Script(mobileWebViewSetupScript).runInContext(context);

  const rerun = () => {
    new vm.Script('window.__zcodeMobileApplyOverrides()').runInContext(context);
  };

  return { document, messages, rerun };
}

// Mirrors the real zcode.z.ai/remote/v4 structure measured in the browser:
// a <header> banner (~74px) and a .bg-card details card above the task list.
const remotePageMarkup = `
  <div id="root">
    <div class="flex h-dvh flex-col overflow-hidden">
      <section class="flex h-full min-h-0 flex-col">
        <header class="shrink-0 border-b bg-header">
          <div class="flex items-start justify-between">
            <div class="min-w-0">
              <div class="truncate">ZCode 远程控制</div>
              <div class="mt-1">已连接到当前桌面窗口</div>
            </div>
            <div class="flex shrink-0">
              <button aria-label="选择主题"></button>
            </div>
          </div>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto px-3">
          <div class="rounded-lg border bg-card">
            <p>本次连接可以查看当前设备上已打开的项目、任务和会话；二维码失效后需要回到桌面端重新连接。</p>
          </div>
          <div class="mt-4 flex items-start justify-between">
            <div class="min-w-0">
              <h1>当前设备上的工作区和任务</h1>
              <p class="mt-1">30 个工作区 · 142 个任务</p>
            </div>
            <button aria-label="收起全部工作区"></button>
          </div>
          <ul class="mt-3 space-y-2">
            <li class="rounded-lg border bg-card">
              <button aria-label="打开任务 项目 A">
                <span class="block truncate">项目 A · 运行中</span>
              </button>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
`;

test('hides the banner header and details card while keeping the task list', () => {
  const { document } = runSetupScript(remotePageMarkup);

  const header = document.querySelector('header');
  const detailsCard = document.querySelector('.overflow-y-auto > .bg-card');
  const taskHeading = document.querySelector('h1');
  const taskItem = document.querySelector('[aria-label="打开任务 项目 A"]');
  const collapseButton = document.querySelector('[aria-label="收起全部工作区"]');
  const themeButton = document.querySelector('[aria-label="选择主题"]');

  assert.equal(header?.getAttribute('data-zcode-mobile-hidden'), 'true');
  assert.equal(detailsCard?.getAttribute('data-zcode-mobile-hidden'), 'true');
  assert.equal(taskHeading?.closest('[data-zcode-mobile-hidden]'), null);
  assert.equal(taskItem?.closest('[data-zcode-mobile-hidden]'), null);
  assert.equal(collapseButton?.closest('[data-zcode-mobile-hidden]'), null);
  assert.equal(themeButton?.closest('[data-zcode-mobile-hidden]') !== null, true);
});

test('keeps everything visible when no remote chrome is present', () => {
  const { document } = runSetupScript(`
    <main>
      <h1>当前设备上的工作区和任务</h1>
      <article>项目 A · 运行中</article>
    </main>
  `);

  assert.equal(document.querySelectorAll('[data-zcode-mobile-hidden]').length, 0);
  assert.equal(document.querySelectorAll('[data-zcode-mobile-theme-control]').length, 0);
});

test('reverts every hide when hiding would leave the page empty', () => {
  const { document } = runSetupScript(`
    <header class="bg-header">
      <div>ZCode 远程控制</div>
      <div>已连接到当前桌面窗口</div>
    </header>
  `);

  assert.equal(document.querySelectorAll('[data-zcode-mobile-hidden]').length, 0);
});

test('reapplies hiding after the SPA re-renders the banner', () => {
  const { document, rerun } = runSetupScript(remotePageMarkup);

  assert.equal(document.querySelector('header')?.getAttribute('data-zcode-mobile-hidden'), 'true');

  const freshHeader = document.createElement('header');
  freshHeader.className = 'shrink-0 border-b bg-header';
  freshHeader.innerHTML = '<div>ZCode 远程控制</div>';
  document.querySelector('section')?.prepend(freshHeader);

  assert.equal(freshHeader.getAttribute('data-zcode-mobile-hidden'), null);

  rerun();

  assert.equal(freshHeader.getAttribute('data-zcode-mobile-hidden'), 'true');
});
