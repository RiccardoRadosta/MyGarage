import { MaintenanceRecord, User, UserPlan, Vehicle } from '../../types';
import { ApiMaintenance, ApiMaintenanceType, ApiUser, ApiUserPlan, ApiVehicle } from './contracts';

const apiTypeByLabel: Record<string, ApiMaintenanceType> = {
  'Cambio olio': 'OIL_CHANGE',
  Tagliando: 'SERVICE',
  'Freni / pastiglie': 'BRAKES',
  'Cambio gomme': 'TIRE_CHANGE',
  Pneumatici: 'TIRE_CHANGE',
  'Cambio tergicristalli': 'WIPER_CHANGE',
  Revisione: 'INSPECTION',
  Batteria: 'BATTERY',
  Distribuzione: 'TIMING_BELT',
  Bollo: 'BOLLO',
  Assicurazione: 'INSURANCE',
};

export const toApiMaintenanceType = (label: string): ApiMaintenanceType =>
  apiTypeByLabel[label] ?? 'OTHER';

export const toApiMaintenancePayload = (record: Omit<MaintenanceRecord, 'id'>) => {
  const type = toApiMaintenanceType(record.type);
  const customDescription = type === 'OTHER'
    ? record.customDescription?.trim() || record.type.trim()
    : undefined;

  return {
    type,
    customDescription,
    date: record.date,
    mileage: record.mileage,
    cost: record.cost,
    notes: record.notes?.trim() || null,
  };
};

export const fromApiUser = (user: ApiUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

export const fromApiVehicle = (vehicle: ApiVehicle): Vehicle => ({
  id: vehicle.id,
  icon: vehicle.icon,
  brand: vehicle.brand,
  model: vehicle.model,
  year: vehicle.year,
  plate: vehicle.plate,
  mileage: vehicle.mileage,
  isPrimary: Boolean(vehicle.isPrimary),
  createdAt: vehicle.createdAt,
});

export const fromApiUserPlan = (plan: ApiUserPlan): UserPlan => ({
  tier: plan.tier,
  isPremium: Boolean(plan.isPremium),
  origin: plan.origin,
  grantType: plan.grantType,
  subscriptionStatus: plan.subscriptionStatus,
  productId: plan.productId,
  expiresAt: plan.expiresAt,
  autoRenewing: Boolean(plan.autoRenewing),
  isPermanent: Boolean(plan.isPermanent),
  primaryVehicleId: plan.primaryVehicleId,
  requiresPrimarySelection: Boolean(plan.requiresPrimarySelection),
});

export const fromApiMaintenance = (record: ApiMaintenance): MaintenanceRecord => ({
  id: record.id,
  vehicleId: record.vehicleId,
  type: record.type === 'OTHER'
    ? record.customDescription ?? record.typeLabel
    : record.typeLabel,
  date: record.date,
  mileage: record.mileage,
  cost: record.cost,
  notes: record.notes ?? undefined,
  customDescription: record.customDescription ?? undefined,
  hasAttachment: record.hasAttachment,
});
