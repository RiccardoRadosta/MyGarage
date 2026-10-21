import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import { ApiError, apiClient } from './ApiClient';
import {
  ApiAttachmentMetadata,
  ApiCostsSummary,
  ApiDashboard,
  ApiMaintenance,
  ApiPage,
  ApiRefreshTokens,
  ApiTokens,
  ApiUser,
  ApiVehicle,
  ApiVehicleSummary,
  CreateMaintenanceRequest,
  CreateVehicleRequest,
  UpdateMaintenanceRequest,
  UpdateVehicleRequest,
} from './contracts';

const jsonBody = (value: unknown) => JSON.stringify(value);

export const authApi = {
  async register(name: string, email: string, password: string) {
    const result = await apiClient.request<ApiTokens>('/api/v1/auth/register', {
      method: 'POST',
      body: jsonBody({ name, email, password }),
    }, false);
    await apiClient.setTokens(result.accessToken, result.refreshToken);
    return result;
  },

  async login(email: string, password: string) {
    const result = await apiClient.request<ApiTokens>('/api/v1/auth/login', {
      method: 'POST',
      body: jsonBody({ email, password }),
    }, false);
    await apiClient.setTokens(result.accessToken, result.refreshToken);
    return result;
  },

  async refresh() {
    const refreshToken = await apiClient.getRefreshToken();
    if (!refreshToken) return null;

    const result = await apiClient.request<ApiRefreshTokens>('/api/v1/auth/refresh', {
      method: 'POST',
      body: jsonBody({ refreshToken }),
    }, false);
    await apiClient.setTokens(result.accessToken, result.refreshToken);
    return result;
  },

  async logout() {
    const refreshToken = await apiClient.getRefreshToken();
    try {
      await apiClient.request<void>('/api/v1/auth/logout', {
        method: 'POST',
        body: jsonBody({ refreshToken }),
      });
    } finally {
      await apiClient.clearTokens();
    }
  },
};

export const usersApi = {
  me: () => apiClient.request<ApiUser>('/api/v1/users/me'),
  updateMe: (payload: Partial<Pick<ApiUser, 'name' | 'email'>>) =>
    apiClient.request<ApiUser>('/api/v1/users/me', { method: 'PATCH', body: jsonBody(payload) }),
};

export const dashboardApi = {
  get: () => apiClient.request<ApiDashboard>('/api/v1/dashboard'),
};

export const vehiclesApi = {
  list: () => apiClient.request<ApiVehicle[]>('/api/v1/vehicles'),
  get: (vehicleId: string) => apiClient.request<ApiVehicle>(`/api/v1/vehicles/${encodeURIComponent(vehicleId)}`),
  create: (payload: CreateVehicleRequest) => apiClient.request<ApiVehicle>('/api/v1/vehicles', {
    method: 'POST',
    body: jsonBody(payload),
  }),
  update: (vehicleId: string, payload: UpdateVehicleRequest) => apiClient.request<ApiVehicle>(
    `/api/v1/vehicles/${encodeURIComponent(vehicleId)}`,
    { method: 'PATCH', body: jsonBody(payload) },
  ),
  delete: (vehicleId: string) => apiClient.request<void>(
    `/api/v1/vehicles/${encodeURIComponent(vehicleId)}`,
    { method: 'DELETE' },
  ),
};

export type MaintenanceListQuery = {
  vehicleId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
};

const queryString = (query: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

export const maintenancesApi = {
  listForVehicle: (vehicleId: string, query: Omit<MaintenanceListQuery, 'vehicleId'> = {}) => {
    const suffix = queryString({ page: query.page ?? 0, size: query.size ?? 100, sort: query.sort ?? 'date,desc' });
    return apiClient.request<ApiPage<ApiMaintenance>>(
      `/api/v1/vehicles/${encodeURIComponent(vehicleId)}/maintenances${suffix}`,
    );
  },
  list: (query: MaintenanceListQuery = {}) => apiClient.request<ApiPage<ApiMaintenance>>(
    `/api/v1/maintenances${queryString({
      vehicleId: query.vehicleId,
      type: query.type,
      from: query.from,
      to: query.to,
      page: query.page ?? 0,
      size: query.size ?? 20,
      sort: query.sort ?? 'date,desc',
    })}`,
  ),
  get: (maintenanceId: string) => apiClient.request<ApiMaintenance>(
    `/api/v1/maintenances/${encodeURIComponent(maintenanceId)}`,
  ),
  createForVehicle: (vehicleId: string, payload: CreateMaintenanceRequest) =>
    apiClient.request<ApiMaintenance>(`/api/v1/vehicles/${encodeURIComponent(vehicleId)}/maintenances`, {
      method: 'POST',
      body: jsonBody(payload),
    }),
  update: (maintenanceId: string, payload: UpdateMaintenanceRequest) =>
    apiClient.request<ApiMaintenance>(`/api/v1/maintenances/${encodeURIComponent(maintenanceId)}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    }),
  delete: (maintenanceId: string) => apiClient.request<void>(
    `/api/v1/maintenances/${encodeURIComponent(maintenanceId)}`,
    { method: 'DELETE' },
  ),
};

export const costsApi = {
  summary: (year = new Date().getFullYear()) =>
    apiClient.request<ApiCostsSummary>(`/api/v1/costs/summary?year=${year}`),
};

export type AttachmentUploadFile = {
  uri: string;
  name: string;
  type: string;
  webFile?: Blob;
};

export type UploadFileInput = AttachmentUploadFile;

export const attachmentsApi = {
  metadata: async (maintenanceId: string): Promise<ApiAttachmentMetadata | null> => {
    try {
      return await apiClient.request<ApiAttachmentMetadata>(
        `/api/v1/maintenances/${encodeURIComponent(maintenanceId)}/attachment`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  get: async (maintenanceId: string): Promise<ApiAttachmentMetadata | null> => {
    return attachmentsApi.metadata(maintenanceId);
  },

  upload: async (maintenanceId: string, file: AttachmentUploadFile) => {
    const path = `/api/v1/maintenances/${encodeURIComponent(maintenanceId)}/attachment`;
    if (__DEV__) {
      console.info('[Allegati upload] avvio', {
        method: 'PUT',
        path,
        maintenanceId,
        filePresent: Boolean(file.uri),
        uriScheme: file.uri.split(':', 1)[0],
        mimeType: file.type,
        fileSizeBytes: 'size' in file ? file.size : undefined,
        multipartField: 'file',
      });
    }

    const formData = new FormData();
    try {
      if (Platform.OS === 'web' && file.webFile) {
        formData.append('file', file.webFile, file.name);
      } else if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        if (!response.ok) throw new Error(`Lettura del file non riuscita (${response.status}).`);
        const blob = await response.blob();
        formData.append('file', blob, file.name);
      } else {
        const localFile = new ExpoFile(file.uri);
        // Expo SDK 57's native fetch serializes multipart entries through its
        // WinterCG converter, which requires file parts to expose bytes().
        // React Native's { uri, name, type } part is rejected by that converter.
        formData.append('file', {
          bytes: () => localFile.bytes(),
          name: file.name,
          type: file.type,
        } as unknown as Blob);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[Allegati upload] preparazione multipart non riuscita', {
          maintenanceId,
          mimeType: file.type,
          uriScheme: file.uri.split(':', 1)[0],
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }

    return apiClient.request<ApiAttachmentMetadata>(path, {
      method: 'PUT',
      body: formData,
    });
  },

  remove: (maintenanceId: string) =>
    apiClient.request<void>(
      `/api/v1/maintenances/${encodeURIComponent(maintenanceId)}/attachment`,
      { method: 'DELETE' },
    ),

  delete: (maintenanceId: string) =>
    apiClient.request<void>(
      `/api/v1/maintenances/${encodeURIComponent(maintenanceId)}/attachment`,
      { method: 'DELETE' },
    ),

  content: async (maintenanceId: string) => {
    const path = `/api/v1/maintenances/${encodeURIComponent(maintenanceId)}/attachment/content`;
    return apiClient.requestBinary(path);
  },

  getContentUrl: (maintenanceId: string) => {
    const base = apiClient.getBaseUrl();
    return `${base}/api/v1/maintenances/${encodeURIComponent(maintenanceId)}/attachment/content`;
  },
};

export const attachmentApi = attachmentsApi;
