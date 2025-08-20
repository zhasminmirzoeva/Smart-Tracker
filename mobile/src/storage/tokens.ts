import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export type StoredTokens = {
  access_token: string;
  refresh_token: string;
};

/** Сохранение пары токенов */
export async function saveTokens(tokens: StoredTokens) {
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.access_token);
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token);
}

/** Получение токенов, либо null если их нет */
export async function getTokens(): Promise<StoredTokens | null> {
  try {
    const access_token = await SecureStore.getItemAsync(ACCESS_KEY);
    const refresh_token = await SecureStore.getItemAsync(REFRESH_KEY);
    if (access_token && refresh_token) {
      return { access_token, refresh_token };
    }
    return null;
  } catch {
    return null;
  }
}

/** Очистка обоих токенов */
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
