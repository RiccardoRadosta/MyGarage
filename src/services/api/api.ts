import { apiClient } from './ApiClient';
import {
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
