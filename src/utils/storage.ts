/**
 * Cross-platform storage wrapper
 * Uses SecureStore on native, localStorage on web
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export default {
  setItem,
  getItem,
  deleteItem,
};

