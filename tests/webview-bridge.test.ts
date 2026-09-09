import assert from 'node:assert/strict';
import test from 'node:test';

import { mobileWebViewThemeScript, parseWebThemeMessage } from '../lib/webview-bridge';

test('accepts a constrained theme message from the trusted WebView bridge', () => {
  assert.deepEqual(
    parseWebThemeMessage(
      JSON.stringify({
        type: 'zcode-mobile-theme',
        theme: 'dark',
        backgroundColor: 'rgb(12, 14, 15)',
      }),
    ),
    {
      type: 'zcode-mobile-theme',
      theme: 'dark',
      backgroundColor: 'rgb(12, 14, 15)',
    },
  );
});

test('rejects arbitrary, malformed, and unsafe bridge messages', () => {
  assert.equal(parseWebThemeMessage('not-json'), null);
  assert.equal(parseWebThemeMessage(JSON.stringify({ type: 'other', theme: 'dark' })), null);
  assert.equal(
    parseWebThemeMessage(
      JSON.stringify({
        type: 'zcode-mobile-theme',
        theme: 'dark',
        backgroundColor: 'url(javascript:alert(1))',
      }),
    ),
    null,
  );
});

test('creates explicit theme scripts without interpolating untrusted values', () => {
  assert.match(mobileWebViewThemeScript('light'), /var requested = "light";/);
  assert.match(mobileWebViewThemeScript('dark'), /var requested = "dark";/);
  assert.match(mobileWebViewThemeScript('system'), /var requested = "system";/);
});
