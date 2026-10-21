import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ApiProblem } from './contracts';

const ACCESS_TOKEN_KEY = 'mygarage-access-token';
const REFRESH_TOKEN_KEY = 'mygarage-refresh-token';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly fieldErrors?: ApiProblem['fieldErrors'],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

export class ApiClient {
  private webAccessToken: string | null = null;
  private webRefreshToken: string | null = null;

  constructor(private readonly baseUrl = configuredBaseUrl) {}

  get isConfigured() {
    return Boolean(this.baseUrl);
  }

  async setTokens(accessToken: string, refreshToken: string) {
    if (Platform.OS === 'web') {
      this.webAccessToken = accessToken;
      this.webRefreshToken = refreshToken;
      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      ]);
      return;
    }

    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  }

  async clearTokens() {
    if (Platform.OS === 'web') {
      this.webAccessToken = null;
      this.webRefreshToken = null;
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      ]);
      return;
    }

    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  }

  async getRefreshToken() {
    if (Platform.OS === 'web') {
      this.webRefreshToken ??= await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      return this.webRefreshToken;
    }
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }

  async request<T>(path: string, options: RequestInit = {}, authenticated = true, retryAfterRefresh = true): Promise<T> {
    if (!this.baseUrl) {
      throw new ApiError('API non configurata: imposta EXPO_PUBLIC_API_URL.', 0, 'API_NOT_CONFIGURED');
    }

    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (authenticated) {
      const token = await this.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    } catch {
      throw new ApiError('Impossibile raggiungere il server. Controlla connessione e URL API.', 0, 'NETWORK_ERROR');
    }

    if (response.status === 401 && authenticated && retryAfterRefresh && path !== '/api/v1/auth/logout') {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) return this.request<T>(path, options, authenticated, false);
      await this.clearTokens();
    }

    if (response.status === 204) return undefined as T;

    const responseBody: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const problem = responseBody as ApiProblem | undefined;
      throw new ApiError(
        problem?.detail ?? problem?.title ?? `Richiesta non riuscita (${response.status}).`,
        response.status,
        problem?.code,
        problem?.fieldErrors,
      );
    }

    return responseBody as T;
  }

  private async getAccessToken() {
    if (Platform.OS === 'web') {
      this.webAccessToken ??= await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      return this.webAccessToken;
    }
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  }

  private async refreshAccessToken() {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken || !this.baseUrl) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;

      const tokens = await response.json() as { accessToken: string; refreshToken: string };
      await this.setTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
