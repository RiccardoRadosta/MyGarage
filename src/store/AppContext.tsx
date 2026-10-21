import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { MaintenanceRecord, User, Vehicle } from '../types';
import { ApiCostsSummary } from '../services/api/contracts';
import { ApiError, apiClient } from '../services/api/ApiClient';
import { authApi, costsApi, maintenancesApi, usersApi, vehiclesApi } from '../services/api/api';
import { fromApiMaintenance, fromApiUser, fromApiVehicle, toApiMaintenancePayload } from '../services/api/mappers';

const INITIAL_USER: User = {
  id: 'u-1',
  name: 'Marco',
  email: 'marco@ilmioGarage.it',
};

const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'v-1', icon: 'carFront', brand: 'BMW', model: 'Serie 1', year: 2021, plate: 'AB123CD', mileage: 68420, createdAt: '2023-01-18' },
  { id: 'v-2', icon: 'car', brand: 'Mercedes', model: 'A 180', year: 2019, plate: 'CD456EF', mileage: 93120, createdAt: '2022-06-20' },
];

const INITIAL_RECORDS: MaintenanceRecord[] = [
  { id: 'm-1', vehicleId: 'v-1', type: 'Cambio olio', date: '2025-05-18', mileage: 62000, cost: 89, notes: 'Cambio olio sintetico e filtro oleo.' },
  { id: 'm-2', vehicleId: 'v-1', type: 'Freni / pastiglie', date: '2025-02-10', mileage: 57800, cost: 360, notes: 'Cambio pastiglie anteriori.' },
  { id: 'm-3', vehicleId: 'v-2', type: 'Tagliando', date: '2025-01-09', mileage: 88800, cost: 420, notes: 'Tagliando straordinario con controllo fluidi.' },
  { id: 'm-4', vehicleId: 'v-2', type: 'Pneumatici', date: '2024-11-17', mileage: 85000, cost: 540, notes: 'Set di pneumatici estate.' },
];

type AppContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  vehicles: Vehicle[];
  maintenanceRecords: MaintenanceRecord[];
  costSummary: ApiCostsSummary | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<boolean>;
  updateProfile: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<Vehicle>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  addMaintenance: (record: Omit<MaintenanceRecord, 'id'>) => Promise<MaintenanceRecord>;
  updateMaintenance: (record: MaintenanceRecord) => Promise<void>;
  deleteMaintenance: (maintenanceId: string) => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(apiClient.isConfigured);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(INITIAL_RECORDS);
  const [costSummary, setCostSummary] = useState<ApiCostsSummary | null>(null);

  const loadRemoteData = async () => {
    const [remoteVehicles, firstMaintenancePage, remoteCostSummary] = await Promise.all([
      vehiclesApi.list(),
      maintenancesApi.list({ page: 0, size: 100 }),
      costsApi.summary(),
    ]);

    const maintenancePages = await Promise.all(
      Array.from({ length: Math.max(0, firstMaintenancePage.totalPages - 1) }, (_, index) =>
        maintenancesApi.list({ page: index + 1, size: 100 }),
      ),
    );

    return {
      vehicles: remoteVehicles.map(fromApiVehicle),
      maintenanceRecords: [firstMaintenancePage, ...maintenancePages]
        .flatMap((page) => page.items)
        .map(fromApiMaintenance),
      costSummary: remoteCostSummary,
    };
  };

  const applyRemoteData = (data: Awaited<ReturnType<typeof loadRemoteData>>) => {
    setVehicles(data.vehicles);
    setMaintenanceRecords(data.maintenanceRecords);
    setCostSummary(data.costSummary);
  };

  useEffect(() => {
    if (!apiClient.isConfigured) return undefined;

    let cancelled = false;
    const restoreSession = async () => {
      try {
        const remoteUser = await usersApi.me();
        const data = await loadRemoteData();
        if (!cancelled) {
          setUser(fromApiUser(remoteUser));
          applyRemoteData(data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await apiClient.clearTokens();
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const minimumPasswordLength = apiClient.isConfigured ? 8 : 6;
    if (!email.trim() || !password.trim() || password.length < minimumPasswordLength) {
      return false;
    }

    if (apiClient.isConfigured) {
      const result = await authApi.login(email.trim(), password);
      const data = await loadRemoteData();
      setUser(fromApiUser(result.user));
      applyRemoteData(data);
      setIsAuthenticated(true);
      return true;
    }

    setUser({
      id: 'u-1',
      name: 'Marco',
      email: email.trim(),
    });
    setIsAuthenticated(true);
    return true;
  };

  const register = async (name: string, email: string, password: string, confirmPassword: string) => {
    const minimumPasswordLength = apiClient.isConfigured ? 8 : 6;
    if (!name.trim() || !email.trim() || password.length < minimumPasswordLength || password !== confirmPassword) {
      return false;
    }

    if (apiClient.isConfigured) {
      const result = await authApi.register(name.trim(), email.trim(), password);
      const data = await loadRemoteData();
      setUser(fromApiUser(result.user));
      applyRemoteData(data);
      setIsAuthenticated(true);
      return true;
    }

    setUser({
      id: 'u-2',
      name: name.trim(),
      email: email.trim(),
    });
    setIsAuthenticated(true);
    return true;
  };

  const logout = async () => {
    if (apiClient.isConfigured) {
      try {
        await authApi.logout();
      } catch {
        await apiClient.clearTokens();
      }
    }
    setIsAuthenticated(false);
    setUser(null);
  };

  const updateProfile = async (name: string, email: string) => {
    if (!user) throw new Error('Devi accedere prima di modificare il profilo.');

    if (apiClient.isConfigured) {
      const updatedUser = fromApiUser(await usersApi.updateMe({ name: name.trim(), email: email.trim() }));
      setUser(updatedUser);
      return;
    }

    setUser((current) => current ? { ...current, name: name.trim(), email: email.trim() } : current);
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
    if (apiClient.isConfigured) {
      const created = fromApiVehicle(await vehiclesApi.create(vehicle));
      setVehicles((current) => [created, ...current]);
      return created;
    }

    const newVehicle: Vehicle = {
      ...vehicle,
      id: `v-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setVehicles((current) => [newVehicle, ...current]);
    return newVehicle;
  };

  const updateVehicle = async (vehicle: Vehicle) => {
    if (apiClient.isConfigured) {
      const updated = fromApiVehicle(await vehiclesApi.update(vehicle.id, {
        icon: vehicle.icon,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        mileage: vehicle.mileage,
      }));
      setVehicles((current) => current.map((item) => (item.id === vehicle.id ? updated : item)));
      return;
    }
    setVehicles((current) => current.map((item) => (item.id === vehicle.id ? vehicle : item)));
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (apiClient.isConfigured) await vehiclesApi.delete(vehicleId);
    setVehicles((current) => current.filter((vehicle) => vehicle.id !== vehicleId));
    setMaintenanceRecords((current) => current.filter((record) => record.vehicleId !== vehicleId));
    if (apiClient.isConfigured) {
      void costsApi.summary().then(setCostSummary).catch(() => setCostSummary(null));
    }
  };

  const addMaintenance = async (record: Omit<MaintenanceRecord, 'id'>) => {
    if (apiClient.isConfigured) {
      const created = fromApiMaintenance(await maintenancesApi.createForVehicle(
        record.vehicleId,
        toApiMaintenancePayload(record),
      ));
      setMaintenanceRecords((current) => [created, ...current]);
      setVehicles((current) => current.map((vehicle) =>
        vehicle.id === created.vehicleId && created.mileage > vehicle.mileage
          ? { ...vehicle, mileage: created.mileage }
          : vehicle,
      ));
      void costsApi.summary().then(setCostSummary).catch(() => setCostSummary(null));
      return created;
    }

    const newRecord: MaintenanceRecord = {
      ...record,
      id: `m-${Date.now()}`,
    };

    setMaintenanceRecords((current) => [newRecord, ...current]);

    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === record.vehicleId && record.mileage > vehicle.mileage
          ? { ...vehicle, mileage: record.mileage }
          : vehicle,
      ),
    );

    return newRecord;
  };

  const updateMaintenance = async (record: MaintenanceRecord) => {
    if (apiClient.isConfigured) {
      const updated = fromApiMaintenance(await maintenancesApi.update(
        record.id,
        toApiMaintenancePayload(record),
      ));
      setMaintenanceRecords((current) => current.map((item) => item.id === updated.id ? updated : item));
      setVehicles((current) => current.map((vehicle) =>
        vehicle.id === updated.vehicleId && updated.mileage > vehicle.mileage
          ? { ...vehicle, mileage: updated.mileage }
          : vehicle,
      ));
      void costsApi.summary().then(setCostSummary).catch(() => setCostSummary(null));
      return;
    }
    setMaintenanceRecords((current) => current.map((item) => (item.id === record.id ? record : item)));

    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === record.vehicleId && record.mileage > vehicle.mileage
          ? { ...vehicle, mileage: record.mileage }
          : vehicle,
      ),
    );
  };

  const deleteMaintenance = async (maintenanceId: string) => {
    if (apiClient.isConfigured) await maintenancesApi.delete(maintenanceId);
    setMaintenanceRecords((current) => current.filter((record) => record.id !== maintenanceId));
    if (apiClient.isConfigured) {
      void costsApi.summary().then(setCostSummary).catch(() => setCostSummary(null));
    }
  };

  const value = useMemo<AppContextType>(
    () => ({
      user,
      isAuthenticated,
      isInitializing,
      vehicles,
      maintenanceRecords,
      costSummary,
      login,
      register,
      updateProfile,
      logout,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      addMaintenance,
      updateMaintenance,
      deleteMaintenance,
    }),
    [user, isAuthenticated, isInitializing, vehicles, maintenanceRecords, costSummary],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
