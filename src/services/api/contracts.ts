import { VehicleIconId } from '../../types';

export type ApiMaintenanceType =
  | 'OIL_CHANGE'
  | 'SERVICE'
  | 'BRAKES'
  | 'TIRE_CHANGE'
  | 'WIPER_CHANGE'
  | 'INSPECTION'
  | 'BATTERY'
  | 'TIMING_BELT'
  | 'OTHER';

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

export type ApiTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: ApiUser;
};

export type ApiRefreshTokens = Omit<ApiTokens, 'user'>;

export type ApiVehicleSummary = {
  id: string;
  icon: VehicleIconId;
  brand: string;
  model: string;
  year: number;
  plate: string;
  mileage: number;
  lastMaintenance: ApiMaintenanceSummary | null;
};

export type ApiMaintenanceSummary = {
  id: string;
  type: ApiMaintenanceType;
  typeLabel: string;
  date: string;
  mileage: number;
  cost: number;
  hasAttachment?: boolean;
};

export type ApiVehicle = ApiVehicleSummary & {
  createdAt: string;
  updatedAt: string;
};

export type ApiMaintenance = ApiMaintenanceSummary & {
  vehicleId: string;
  customDescription: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  hasAttachment?: boolean;
};

export type ApiAttachmentMetadata = {
  id: string;
  maintenanceId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiDashboard = {
  vehicleCount: number;
  maintenanceCount: number;
  totalSpent: number;
  vehicles: ApiVehicleSummary[];
  recentMaintenances: ApiMaintenance[];
};

export type ApiCostsSummary = {
  currency: 'EUR';
  totalSpent: number;
  year: number;
  yearSpent: number;
  byType: Array<{
    type: ApiMaintenanceType;
    typeLabel: string;
    count: number;
    total: number;
  }>;
  recentMaintenances: ApiMaintenance[];
};

export type ApiPage<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type CreateVehicleRequest = {
  icon: VehicleIconId;
  brand: string;
  model: string;
  year: number;
  plate: string;
  mileage: number;
};

export type UpdateVehicleRequest = Partial<CreateVehicleRequest>;

export type CreateMaintenanceRequest = {
  type: ApiMaintenanceType;
  customDescription?: string | null;
  date: string;
  mileage: number;
  cost: number;
  notes?: string | null;
};

export type UpdateMaintenanceRequest = Partial<CreateMaintenanceRequest>;

export type ApiProblem = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  instance?: string;
  fieldErrors?: Array<{ field: string; code: string; message: string }>;
  traceId?: string;
};
