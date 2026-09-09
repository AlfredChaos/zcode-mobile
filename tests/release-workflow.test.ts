import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const easConfig = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url).pathname, 'utf8')) as {
  build?: Record<string, { extends?: string; distribution?: string; android?: { buildType?: string } }>;
};

const releaseWorkflow = readFileSync(
  new URL('../.github/workflows/release-android.yml', import.meta.url).pathname,
  'utf8',
);

test('release-android build profile does not extend a missing profile', () => {
  const buildProfiles = easConfig.build ?? {};
  const releaseAndroid = buildProfiles['release-android'];

  assert.ok(releaseAndroid, 'release-android profile must exist');

  if (releaseAndroid.extends) {
    assert.ok(
      buildProfiles[releaseAndroid.extends],
      `release-android extends missing profile "${releaseAndroid.extends}"`,
    );
  }
});

test('internal Android release builds produce an APK artifact', () => {
  const releaseAndroid = easConfig.build?.['release-android'];

  assert.equal(releaseAndroid?.distribution, 'internal');
  assert.equal(releaseAndroid?.android?.buildType, 'apk');
});

test('release workflow preserves EAS CLI errors in GitHub Actions logs', () => {
  assert.equal(
    releaseWorkflow.includes('2>/dev/null'),
    false,
    'release workflow must not discard EAS CLI stderr',
  );
});

test('release workflow bootstraps EAS project linkage before non-interactive builds', () => {
  assert.match(
    releaseWorkflow,
    /eas-cli@latest init[\s\S]*--account\s+(?:"\$EXPO_ACCOUNT"|alfredchaos)[\s\S]*--non-interactive/,
    'release workflow must link or create the EAS project before eas build',
  );
});
