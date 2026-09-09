export const ZCODE_REMOTE_HOST = 'zcode.z.ai';
export const ZCODE_REMOTE_PATH = '/remote/v4';

const requiredParameters = ['sid', 'mid'] as const;
const invisibleCharacters = /[\u200B-\u200D\uFEFF]/g;
const controlCharacters = /[\u0000-\u001F\u007F]/;
const trustedAuthority = /^https:\/\/zcode\.z\.ai(?:[/?#]|$)/i;

export type ConnectionValidationResult =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false };

function normalizeQrPayload(payload: string): string | null {
  const payloadWithoutInvisibleCharacters = payload.replace(invisibleCharacters, '');

  if (controlCharacters.test(payloadWithoutInvisibleCharacters)) {
    return null;
  }

  const normalized = payloadWithoutInvisibleCharacters.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

export function parseZCodeConnection(payload: string): ConnectionValidationResult {
  const normalizedPayload = normalizeQrPayload(payload);

  if (!normalizedPayload || !trustedAuthority.test(normalizedPayload)) {
    return { ok: false };
  }

  try {
    const url = new URL(normalizedPayload);
    const hasRequiredParameters = requiredParameters.every((parameter) =>
      Boolean(url.searchParams.get(parameter)?.trim()),
    );

    if (
      url.protocol !== 'https:' ||
      url.hostname !== ZCODE_REMOTE_HOST ||
      url.port ||
      url.pathname !== ZCODE_REMOTE_PATH ||
      url.username ||
      url.password ||
      url.hash ||
      !hasRequiredParameters
    ) {
      return { ok: false };
    }

    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false };
  }
}

export function getConnectionDisplayName(connection: string): string {
  const result = parseZCodeConnection(connection);

  if (!result.ok) {
    return 'ZCode Desktop';
  }

  const name = new URL(result.url)
    .searchParams.get('name')
    ?.replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return name ? name.slice(0, 80) : 'ZCode Desktop';
}

export function isTrustedZCodeNavigation(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && url.hostname === ZCODE_REMOTE_HOST;
  } catch {
    return false;
  }
}
