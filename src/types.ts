export type User = {
  id: string;
  name: string;
  email: string;
};

export type Vehicle = {
  id: string;
  icon: VehicleIconId;
  brand: string;
  model: string;
  year: number;
  plate: string;
  mileage: number;
  isPrimary?: boolean;
  createdAt?: string;
};

export type SubscriptionTier = 'FREE' | 'PREMIUM';

export type PlanOrigin = 'GRANT' | 'GOOGLE_PLAY' | 'FREE_TIER';

export type GrantType = 'DEVELOPER' | 'TESTER' | 'COLLABORATOR';

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELED'
  | 'IN_GRACE_PERIOD'
  | 'ON_HOLD'
  | 'PAUSED';

export type UserPlan = {
  tier: SubscriptionTier;
  isPremium: boolean;
  origin: PlanOrigin;
  grantType: GrantType | null;
  subscriptionStatus: SubscriptionStatus | null;
  productId: string | null;
  expiresAt: string | null;
  autoRenewing: boolean;
  isPermanent: boolean;
  primaryVehicleId: string | null;
  requiresPrimarySelection: boolean;
};

export type VehicleIconId = 'carFront' | 'car' | 'motorbike' | 'scooter' | 'truck' | 'van';

export type MaintenanceRecord = {
  id: string;
  vehicleId: string;
  type: string;
  date: string;
  mileage: number;
  cost: number;
  notes?: string;
  customDescription?: string;
  hasAttachment?: boolean;
};

export type AttachmentMetadata = {
  id: string;
  maintenanceId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
};
