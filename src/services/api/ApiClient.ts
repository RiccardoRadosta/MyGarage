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

const safeUrlForDiagnostics = (value: string) => {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '[URL non valida]';
  }
};

export class ApiClient {
  private webAccessToken: string | null = null;
  private webRefreshToken: string | null = null;

  constructor(private readonly baseUrl = configuredBaseUrl) {}

  get isConfigured() {
    return Boolean(this.baseUrl);
  }

  getBaseUrl() {
    return this.baseUrl;
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

  async getAuthorizationHeader() {
    const token = await this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }

  async request<T>(path: string, options: RequestInit = {}, authenticated = true, retryAfterRefresh = true): Promise<T> {
    if (!this.baseUrl) {
      throw new ApiError('API non configurata: imposta EXPO_PUBLIC_API_URL.', 0, 'API_NOT_CONFIGURED');
    }

    const headers = new Headers(options.headers);
    const method = (options.method ?? 'GET').toUpperCase();
    const url = `${this.baseUrl}${path}`;
    const isAttachmentRequest = path.includes('/attachment');
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (options.body && !isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (authenticated) {
      const token = await this.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    if (__DEV__ && isAttachmentRequest) {
      console.info('[Allegati API] richiesta', {
        method,
        url: safeUrlForDiagnostics(url),
        hasBearerToken: headers.has('Authorization'),
        isFormData,
        contentTypeHeader: headers.get('Content-Type'),
      });
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (error) {
      if (__DEV__ && isAttachmentRequest) {
        console.error('[Allegati API] errore di rete', {
          method,
          url: safeUrlForDiagnostics(url),
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
      throw new ApiError('Impossibile raggiungere il server. Controlla connessione e URL API.', 0, 'NETWORK_ERROR');
    }

    if (__DEV__ && isAttachmentRequest) {
      console.info('[Allegati API] risposta', { method, url: safeUrlForDiagnostics(url), status: response.status });
    }

    if (response.status === 401 && authenticated && path !== '/api/v1/auth/logout') {
      if (retryAfterRefresh) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) return this.request<T>(path, options, authenticated, false);
      }
      await this.clearTokens();
    }

    if (response.status === 204) return undefined as T;

    const responseBody: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const problem = responseBody as ApiProblem | undefined;
      const isExpected404 = isAttachmentRequest && method === 'GET' && response.status === 404;
      if (__DEV__ && isAttachmentRequest && !isExpected404) {
        console.warn('[Allegati API] risposta HTTP non riuscita', {
          method,
          url: safeUrlForDiagnostics(url),
          status: response.status,
          message: problem?.detail ?? problem?.title ?? `Richiesta non riuscita (${response.status}).`,
        });
      } else if (__DEV__ && isExpected404) {
        console.info('[Allegati API] nessun allegato presente per questo intervento (404)');
      }
      throw new ApiError(
        problem?.detail ?? problem?.title ?? `Richiesta non riuscita (${response.status}).`,
        response.status,
        problem?.code,
        problem?.fieldErrors,
      );
    }

    return responseBody as T;
  }

  async requestBinary(path: string, retryAfterRefresh = true): Promise<{ bytes: Uint8Array; contentType: string }> {
    if (!this.baseUrl) {
      throw new ApiError('API non configurata: imposta EXPO_PUBLIC_API_URL.', 0, 'API_NOT_CONFIGURED');
    }

    const url = `${this.baseUrl}${path}`;
    const headers = new Headers({ Accept: 'application/pdf, image/jpeg, application/octet-stream' });
    const token = await this.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    if (__DEV__) {
      console.info('[Allegati API] richiesta binaria', {
        method: 'GET',
        url: safeUrlForDiagnostics(url),
        hasBearerToken: Boolean(token),
      });
    }

    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch (error) {
      if (__DEV__) {
        console.error('[Allegati API] errore di rete richiesta binaria', {
          url: safeUrlForDiagnostics(url),
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
      throw new ApiError('Impossibile raggiungere il server. Controlla connessione e URL API.', 0, 'NETWORK_ERROR');
    }

    const rawContentType = response.headers.get('Content-Type') || response.headers.get('content-type') || 'application/octet-stream';
    const rawContentLength = response.headers.get('Content-Length') || response.headers.get('content-length');

    if (__DEV__) {
      console.info('[Allegati API] risposta binaria', {
        method: 'GET',
        url: safeUrlForDiagnostics(url),
        status: response.status,
        contentTypeHeader: rawContentType,
        contentLengthHeader: rawContentLength,
      });
    }

    if (response.status === 401) {
      if (retryAfterRefresh) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) return this.requestBinary(path, false);
      }
      await this.clearTokens();
    }

    if (!response.ok) {
      const problem = await response.json().catch(() => undefined) as ApiProblem | undefined;
      throw new ApiError(
        problem?.detail ?? problem?.title ?? `Richiesta non riuscita (${response.status}).`,
        response.status,
        problem?.code,
        problem?.fieldErrors,
      );
    }

    const contentType = rawContentType.split(';')[0].trim();
    const arrayBuffer = await response.arrayBuffer();

    return {
      bytes: new Uint8Array(arrayBuffer),
      contentType,
    };
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
