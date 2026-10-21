import { MaintenanceRecord } from '../types';

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);

export const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

export const formatMileage = (value: number): string => `${value.toLocaleString('it-IT')} km`;

export const getRecentMaintenanceRecords = (records: MaintenanceRecord[]) =>
  [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const getVehicleRecords = (vehicleId: string, records: MaintenanceRecord[]) =>
  getRecentMaintenanceRecords(records).filter((record) => record.vehicleId === vehicleId);

export const getLastMaintenance = (vehicleId: string, records: MaintenanceRecord[]) => {
  const vehicleRecords = getVehicleRecords(vehicleId, records);
  return vehicleRecords[0] ?? null;
};

export const getVehicleTotalCost = (vehicleId: string, records: MaintenanceRecord[]) =>
  getVehicleRecords(vehicleId, records).reduce((sum, record) => sum + record.cost, 0);

