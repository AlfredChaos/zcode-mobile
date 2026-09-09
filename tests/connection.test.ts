import assert from 'node:assert/strict';
import test from 'node:test';

import { getConnectionDisplayName, isTrustedZCodeNavigation, parseZCodeConnection } from '../lib/connection';

const validConnection =
  'https://zcode.z.ai/remote/v4?sid=redacted-session&mid=redacted-machine&name=Desktop&app_version=3.11.2';

test('accepts a valid ZCode remote connection', () => {
  const result = parseZCodeConnection(validConnection);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(new URL(result.url).hostname, 'zcode.z.ai');
    assert.equal(new URL(result.url).pathname, '/remote/v4');
  }
});

test('normalizes invisible characters surrounding a valid connection', () => {
  const result = parseZCodeConnection(`\u200B ${validConnection} \uFEFF`);

  assert.equal(result.ok, true);
});

test('rejects non-HTTPS connections', () => {
  assert.deepEqual(
    parseZCodeConnection('http://zcode.z.ai/remote/v4?sid=session&mid=machine'),
    { ok: false },
  );
});

test('rejects another host and ZCode subdomains', () => {
  assert.deepEqual(
    parseZCodeConnection('https://example.com/remote/v4?sid=session&mid=machine'),
    { ok: false },
  );
  assert.deepEqual(
    parseZCodeConnection('https://remote.zcode.z.ai/remote/v4?sid=session&mid=machine'),
    { ok: false },
  );
});

test('rejects a different remote path', () => {
  assert.deepEqual(
    parseZCodeConnection('https://zcode.z.ai/remote/v3?sid=session&mid=machine'),
    { ok: false },
  );
});

test('rejects missing required connection parameters', () => {
  assert.deepEqual(parseZCodeConnection('https://zcode.z.ai/remote/v4?sid=session'), { ok: false });
  assert.deepEqual(parseZCodeConnection('https://zcode.z.ai/remote/v4?mid=machine'), { ok: false });
  assert.deepEqual(parseZCodeConnection('https://zcode.z.ai/remote/v4?sid=%20&mid=machine'), {
    ok: false,
  });
});

test('rejects URL credential tricks, ports, fragments, and control characters', () => {
  assert.deepEqual(
    parseZCodeConnection('https://attacker@zcode.z.ai/remote/v4?sid=session&mid=machine'),
    { ok: false },
  );
  assert.deepEqual(
    parseZCodeConnection('https://zcode.z.ai:443/remote/v4?sid=session&mid=machine'),
    { ok: false },
  );
  assert.deepEqual(
    parseZCodeConnection('https://zcode.z.ai/remote/v4?sid=session&mid=machine#fragment'),
    { ok: false },
  );
  assert.deepEqual(parseZCodeConnection(`${validConnection}\n`), { ok: false });
});

test('extracts only the QR machine name for native display', () => {
  assert.equal(getConnectionDisplayName(validConnection), 'Desktop');
  assert.equal(
    getConnectionDisplayName('https://zcode.z.ai/remote/v4?sid=session&mid=machine'),
    'ZCode Desktop',
  );
});

test('allows trusted ZCode navigations but rejects untrusted WebView destinations', () => {
  assert.equal(isTrustedZCodeNavigation('https://zcode.z.ai/account'), true);
  assert.equal(isTrustedZCodeNavigation('http://zcode.z.ai/account'), false);
  assert.equal(isTrustedZCodeNavigation('https://zcode.z.ai.evil.example/account'), false);
  assert.equal(isTrustedZCodeNavigation('not a url'), false);
});
