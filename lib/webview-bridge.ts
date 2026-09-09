export type WebTheme = 'light' | 'dark';

export type WebThemeMessage = {
  readonly type: 'zcode-mobile-theme';
  readonly theme: WebTheme;
  readonly backgroundColor: string;
};

const themeMessagePattern = /^\{.*\}$/;
const safeBackgroundColorPattern = /^(#[0-9a-f]{3,8}|rgba?\([^)]{1,80}\))$/i;

export function parseWebThemeMessage(data: string): WebThemeMessage | null {
  if (!themeMessagePattern.test(data)) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(data);

    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const message = value as Partial<WebThemeMessage>;

    if (
      message.type !== 'zcode-mobile-theme' ||
      (message.theme !== 'light' && message.theme !== 'dark') ||
      typeof message.backgroundColor !== 'string' ||
      !safeBackgroundColorPattern.test(message.backgroundColor)
    ) {
      return null;
    }

    return {
      type: 'zcode-mobile-theme',
      theme: message.theme,
      backgroundColor: message.backgroundColor,
    };
  } catch {
    return null;
  }
}

// Selectors below were validated against the real zcode.z.ai/remote/v4 page
// layout (header banner ~74px + details card as .bg-card under the scroll area).
export const mobileWebViewSetupScript = `
(function() {
  var bridgeVersion = 'zcode-mobile-shell-v8';
  var root = document.documentElement;
  var styleId = 'zcode-mobile-overrides';
  var hiddenAttribute = 'data-zcode-mobile-hidden';
  var cssText = [
    '[' + hiddenAttribute + '] { display: none !important; }',
    '[data-zcode-mobile-theme-control="true"] { display: none !important; }',
    'html, body { overscroll-behavior-y: none; }',
    'body { padding-bottom: env(safe-area-inset-bottom); }',
    'textarea, input, button { font-size: 16px; }',
    '[role="dialog"] { max-width: calc(100vw - 24px) !important; }'
  ].join('\\n');
  var norm = function(text) {
    return (text || '').replace(/\\s+/g, ' ').trim();
  };
  var markHidden = function(element) {
    if (element && element !== document.body && element !== document.documentElement) {
      element.setAttribute(hiddenAttribute, 'true');
    }
  };
  var hideBannerHeader = function() {
    return Array.from(document.querySelectorAll('header')).some(function(header) {
      var text = norm(header.textContent);
      if (text.indexOf('远程控制') === -1 && text.indexOf('已连接到当前桌面窗口') === -1) {
        return false;
      }
      markHidden(header);
      return true;
    });
  };
  var hideConnectionDetailsCard = function() {
    var detailsLeaf = Array.from(document.querySelectorAll('body *')).find(function(element) {
      if (element.children.length !== 0) return false;
      return norm(element.textContent).indexOf('本次连接可以查看') !== -1;
    });
    if (!detailsLeaf) return false;
    var node = detailsLeaf;
    for (var depth = 0; node && node !== document.body && depth < 4; depth += 1) {
      if (node.classList && (node.classList.contains('bg-card') || node.classList.contains('rounded-lg'))) {
        markHidden(node);
        return true;
      }
      node = node.parentElement;
    }
    return false;
  };
  var clearLocalMarks = function() {
    Array.from(document.querySelectorAll('[' + hiddenAttribute + '], [data-zcode-mobile-theme-control]')).forEach(function(element) {
      element.removeAttribute(hiddenAttribute);
      element.removeAttribute('data-zcode-mobile-theme-control');
    });
  };
  var visibleTextLength = function() {
    return Array.from(document.body.querySelectorAll('h1, h2, h3, p, li')).reduce(function(total, element) {
      if (element.closest('[' + hiddenAttribute + ']')) return total;
      return total + norm(element.textContent).length;
    }, 0);
  };
  var applyOverrides = function() {
    if (!document.body) return;
    clearLocalMarks();
    hideBannerHeader();
    hideConnectionDetailsCard();
    Array.from(document.querySelectorAll('button, [role="button"], a')).forEach(function(element) {
      var label = (element.getAttribute('aria-label') || '') + ' ' + (element.getAttribute('title') || '');
      if (/^(选择)?主题$|theme/i.test(norm(label))) {
        element.setAttribute('data-zcode-mobile-theme-control', 'true');
      }
    });
    if (document.querySelectorAll('[' + hiddenAttribute + ']').length > 0 && visibleTextLength() === 0) {
      clearLocalMarks();
    }
    var style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    if (style.textContent !== cssText) style.textContent = cssText;
    var bodyBackground = getComputedStyle(document.body).backgroundColor;
    var rootBackground = getComputedStyle(root).backgroundColor;
    var background = bodyBackground && bodyBackground !== 'rgba(0, 0, 0, 0)' ? bodyBackground : rootBackground;
    var dark = !background || background === 'rgba(0, 0, 0, 0)' || /rgb\\(\\s*(?:0|[0-7]\\d)\\s*,\\s*(?:0|[0-7]\\d)\\s*,\\s*(?:0|[0-7]\\d)\\s*\\)/.test(background);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'zcode-mobile-theme',
      theme: dark ? 'dark' : 'light',
      backgroundColor: background || (dark ? '#0C0E0F' : '#FFFFFF')
    }));
  };
  var scheduleOverrides = function() {
    if (window.__zcodeMobileApplyPending) return;
    window.__zcodeMobileApplyPending = true;
    window.requestAnimationFrame(function() {
      window.__zcodeMobileApplyPending = false;
      applyOverrides();
    });
  };
  if (window.__zcodeMobileBridgeVersion !== bridgeVersion) {
    window.__zcodeMobileBridgeVersion = bridgeVersion;
    window.__zcodeMobileObserver && window.__zcodeMobileObserver.disconnect();
    window.__zcodeMobileObserver = new MutationObserver(scheduleOverrides);
    var start = function() {
      if (!document.head || !document.body) return;
      window.__zcodeMobileObserver.observe(document.body, { childList: true, subtree: true });
      applyOverrides();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  } else {
    applyOverrides();
  }
  window.__zcodeMobileApplyOverrides = applyOverrides;
})();
true;
`;

// The remote page uses Radix UI: the theme trigger and its menu items only
// respond to pointer events, options are role="menuitemradio" and read
// 系统默认 / 深色主题 / 浅色主题. Theme state lives on <html> classes
// (theme-zai-dark / theme-zai-light). All verified on the live page.
export const mobileWebViewThemeScript = (theme: WebTheme | 'system') => `
(function() {
  var requested = ${JSON.stringify(theme)};
  var norm = function(text) {
    return (text || '').replace(/\\s+/g, ' ').trim();
  };
  var firePointer = function(element) {
    var rect = element.getBoundingClientRect();
    var init = {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: rect.x + rect.width / 2,
      clientY: rect.y + rect.height / 2,
      isPrimary: true
    };
    element.dispatchEvent(new PointerEvent('pointerdown', init));
    element.dispatchEvent(new PointerEvent('pointerup', init));
    element.dispatchEvent(new MouseEvent('click', init));
  };
  var htmlClass = document.documentElement.className || '';
  if (requested === 'light' && htmlClass.indexOf('theme-zai-light') !== -1) return true;
  if (requested === 'dark' && htmlClass.indexOf('theme-zai-dark') !== -1) return true;
  var attempt = function() {
    var trigger = Array.from(document.querySelectorAll('button, [role="button"]')).find(function(element) {
      var label = (element.getAttribute('aria-label') || '') + ' ' +
        (element.getAttribute('title') || '') + ' ' + norm(element.textContent);
      return /主题|theme/i.test(label);
    });
    if (!trigger) return false;
    firePointer(trigger);
    setTimeout(function() {
      var keyword = requested === 'dark' ? '深色' : requested === 'light' ? '浅色' : '系统默认';
      var option = Array.from(document.querySelectorAll('[role="menuitemradio"], [role="menuitem"], [role="option"]')).find(function(element) {
        return norm(element.textContent).indexOf(keyword) !== -1;
      });
      if (option) firePointer(option);
      window.__zcodeMobileApplyOverrides && window.__zcodeMobileApplyOverrides();
    }, 450);
    return true;
  };
  if (!attempt()) setTimeout(attempt, 800);
})();
true;
`;
