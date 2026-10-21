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
  createdAt?: string;
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
