import * as SecureStore from 'expo-secure-store';

import { parseZCodeConnection } from './connection';

const connectionStorageKey = 'zcode.remote.connection.v1';

export async function saveConnection(url: string): Promise<void> {
  await SecureStore.setItemAsync(connectionStorageKey, url, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getSavedConnection(): Promise<string | null> {
  const savedConnection = await SecureStore.getItemAsync(connectionStorageKey);

  if (!savedConnection) {
    return null;
  }

  const result = parseZCodeConnection(savedConnection);

  if (result.ok) {
    return result.url;
  }

  await SecureStore.deleteItemAsync(connectionStorageKey);
  return null;
}

export async function clearSavedConnection(): Promise<void> {
  await SecureStore.deleteItemAsync(connectionStorageKey);
}
