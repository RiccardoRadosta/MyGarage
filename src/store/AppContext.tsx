import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { MaintenanceRecord, SubscriptionTier, User, UserPlan, Vehicle } from '../types';
import { ApiCostsSummary } from '../services/api/contracts';
import { ApiError, apiClient } from '../services/api/ApiClient';
import { authApi, costsApi, maintenancesApi, usersApi, vehiclesApi } from '../services/api/api';
import { fromApiMaintenance, fromApiUser, fromApiUserPlan, fromApiVehicle, toApiMaintenancePayload } from '../services/api/mappers';
import { signOutGoogle } from '../services/googleAuth';

const INITIAL_USER: User = {
  id: 'u-1',
  name: 'Marco',
  email: 'marco@ilmioGarage.it',
};

const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'v-1', icon: 'carFront', brand: 'BMW', model: 'Serie 1', year: 2021, plate: 'AB123CD', mileage: 68420, isPrimary: true, createdAt: '2023-01-18' },
  { id: 'v-2', icon: 'car', brand: 'Mercedes', model: 'A 180', year: 2019, plate: 'CD456EF', mileage: 93120, isPrimary: false, createdAt: '2022-06-20' },
];

const INITIAL_PLAN: UserPlan = {
  tier: 'FREE',
  isPremium: false,
  origin: 'FREE_TIER',
  grantType: null,
  subscriptionStatus: null,
  productId: null,
  expiresAt: null,
  autoRenewing: false,
  isPermanent: false,
  primaryVehicleId: 'v-1',
  requiresPrimarySelection: false,
};

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
  plan: UserPlan | null;
  tier: SubscriptionTier | undefined;
  isPremium: boolean;
  primaryVehicleId: string | null;
  requiresPrimarySelection: boolean;
  canAddVehicle: boolean;
  canDeleteVehicle: boolean;
  canChangePrimaryVehicle: boolean;
  canWriteVehicle: (vehicleId: string) => boolean;
  canWriteMaintenanceForVehicle: (vehicleId: string) => boolean;
  canManageAttachments: boolean;
  canExportPdf: boolean;
  setPrimaryVehicle: (vehicleId: string) => Promise<void>;
  isSettingPrimary: boolean;
  refreshPlan: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<boolean>;
  updateProfile: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<Vehicle>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  addMaintenance: (record: Omit<MaintenanceRecord, 'id'>) => Promise<MaintenanceRecord>;
  updateMaintenance: (record: MaintenanceRecord) => Promise<void>;
  deleteMaintenance: (maintenanceId: string) => Promise<void>;
  setMaintenanceAttachmentState: (maintenanceId: string, hasAttachment: boolean) => void;
  welcomePending: boolean;
  dismissWelcome: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(apiClient.isConfigured);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(INITIAL_RECORDS);
  const [costSummary, setCostSummary] = useState<ApiCostsSummary | null>(null);
  const [plan, setPlan] = useState<UserPlan | null>(apiClient.isConfigured ? null : INITIAL_PLAN);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [welcomePending, setWelcomePending] = useState(false);

  // Identificativo univoco della sessione attiva per proteggere gli aggiornamenti asincroni da logout e cambi account
  const activeSessionKeyRef = useRef<string | null>(null);

  const startSession = useCallback((userId: string) => {
    activeSessionKeyRef.current = `${userId}_${Date.now()}_${Math.random()}`;
  }, []);

  const endSession = useCallback(() => {
    activeSessionKeyRef.current = null;
  }, []);

  const dismissWelcome = useCallback(() => {
    setWelcomePending(false);
  }, []);

  const loadRemoteData = async () => {
    const [remoteVehicles, firstMaintenancePage, remoteCostSummary, remotePlan] = await Promise.all([
      vehiclesApi.list(),
      maintenancesApi.list({ page: 0, size: 100 }),
      costsApi.summary(),
      usersApi.plan().catch((err) => {
        console.warn('Failed to fetch user plan:', err);
        return null;
      }),
    ]);

    const maintenancePages = await Promise.all(
      Array.from({ length: Math.max(0, firstMaintenancePage.totalPages - 1) }, (_, index) =>
        maintenancesApi.list({ page: index + 1, size: 100 }),
      ),
    );

    const planData = remotePlan ? fromApiUserPlan(remotePlan) : null;
    const mappedVehicles = remoteVehicles.map(fromApiVehicle);
    const vehiclesWithPrimary = planData?.primaryVehicleId
      ? mappedVehicles.map((v) => ({
          ...v,
          isPrimary: v.id === planData.primaryVehicleId || Boolean(v.isPrimary),
        }))
      : mappedVehicles;

    return {
      vehicles: vehiclesWithPrimary,
      maintenanceRecords: [firstMaintenancePage, ...maintenancePages]
        .flatMap((page) => page.items)
        .map(fromApiMaintenance),
      costSummary: remoteCostSummary,
      plan: planData,
    };
  };

  const applyRemoteData = (data: Awaited<ReturnType<typeof loadRemoteData>>) => {
    setVehicles(data.vehicles);
    setMaintenanceRecords(data.maintenanceRecords);
    setCostSummary(data.costSummary);
    setPlan(data.plan);
  };

  useEffect(() => {
    if (!apiClient.isConfigured) return undefined;

    let cancelled = false;
    const restoreSession = async () => {
      try {
        const remoteUser = await usersApi.me();
        const data = await loadRemoteData();
        if (!cancelled) {
          const mappedUser = fromApiUser(remoteUser);
          startSession(mappedUser.id);
          setUser(mappedUser);
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
      const mappedUser = fromApiUser(result.user);
      startSession(mappedUser.id);
      setUser(mappedUser);
      applyRemoteData(data);
      setIsAuthenticated(true);
      return true;
    }

    startSession('u-1');
    setUser({
      id: 'u-1',
      name: 'Marco',
      email: email.trim(),
    });
    setIsAuthenticated(true);
    return true;
  };

  const loginWithGoogle = async (idToken: string) => {
    if (!idToken.trim()) {
      return false;
    }

    if (apiClient.isConfigured) {
      try {
        const result = await authApi.googleLogin(idToken.trim());
        const data = await loadRemoteData();
        const mappedUser = fromApiUser(result.user);
        startSession(mappedUser.id);
        setUser(mappedUser);
        applyRemoteData(data);
        setIsAuthenticated(true);
        return true;
      } catch (error) {
        // Se il backend rifiuta l'accesso (es. 409 Conflict, 401, ecc.), resetta la sessione Google locale
        await signOutGoogle();
        throw error;
      }
    }

    return false;
  };

  const register = async (name: string, email: string, password: string, confirmPassword: string) => {
    const minimumPasswordLength = apiClient.isConfigured ? 8 : 6;
    if (!name.trim() || !email.trim() || password.length < minimumPasswordLength || password !== confirmPassword) {
      return false;
    }

    if (apiClient.isConfigured) {
      const result = await authApi.register(name.trim(), email.trim(), password);
      const data = await loadRemoteData();
      const mappedUser = fromApiUser(result.user);
      startSession(mappedUser.id);
      setUser(mappedUser);
      applyRemoteData(data);
      setWelcomePending(true);
      setIsAuthenticated(true);
      return true;
    }

    startSession('u-2');
    setUser({
      id: 'u-2',
      name: name.trim(),
      email: email.trim(),
    });
      setWelcomePending(true);
    setIsAuthenticated(true);
    return true;
  };

  const logout = async () => {
    endSession();
    if (apiClient.isConfigured) {
      try {
        await authApi.logout();
      } catch {
        await apiClient.clearTokens();
      }
    }
    await signOutGoogle();
    setWelcomePending(false);
    setIsAuthenticated(false);
    setUser(null);
    setPlan(null);
    setVehicles([]);
    setMaintenanceRecords([]);
    setCostSummary(null);
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
    setPlan((current) =>
      current && current.primaryVehicleId === vehicleId
        ? { ...current, primaryVehicleId: null }
        : current,
    );
    if (apiClient.isConfigured) {
      void costsApi.summary().then(setCostSummary).catch(() => setCostSummary(null));
    }
  };

  const setPrimaryVehicle = async (vehicleId: string) => {
    if (isSettingPrimary) return;

    const target = vehicles.find((v) => v.id === vehicleId);
    if (!plan?.requiresPrimarySelection && (target?.isPrimary || plan?.primaryVehicleId === vehicleId)) {
      return;
    }

    const requestSessionKey = activeSessionKeyRef.current;
    setIsSettingPrimary(true);
    try {
      if (apiClient.isConfigured) {
        await vehiclesApi.setPrimary(vehicleId);
        if (activeSessionKeyRef.current !== requestSessionKey) return;
        setVehicles((current) =>
          current.map((v) => ({
            ...v,
            isPrimary: v.id === vehicleId,
          })),
        );
        try {
          const remotePlan = await usersApi.plan();
          if (activeSessionKeyRef.current !== requestSessionKey) return;
          setPlan(fromApiUserPlan(remotePlan));
        } catch {
          if (activeSessionKeyRef.current !== requestSessionKey) return;
          setPlan((current) =>
            current
              ? { ...current, primaryVehicleId: vehicleId, requiresPrimarySelection: false }
              : {
                  tier: 'FREE',
                  isPremium: false,
                  origin: 'FREE_TIER',
                  grantType: null,
                  subscriptionStatus: null,
                  productId: null,
                  expiresAt: null,
                  autoRenewing: false,
                  isPermanent: false,
                  primaryVehicleId: vehicleId,
                  requiresPrimarySelection: false,
                },
          );
        }
        return;
      }

      setVehicles((current) =>
        current.map((v) => ({
          ...v,
          isPrimary: v.id === vehicleId,
        })),
      );
      setPlan((current) => (current ? { ...current, primaryVehicleId: vehicleId, requiresPrimarySelection: false } : null));
    } catch (error) {
      throw error;
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const refreshPlan = useCallback(async () => {
    if (!apiClient.isConfigured) return;
    const requestSessionKey = activeSessionKeyRef.current;
    if (!requestSessionKey) return;

    try {
      const remotePlan = await usersApi.plan();
      if (activeSessionKeyRef.current !== requestSessionKey) {
        return;
      }
      const mapped = fromApiUserPlan(remotePlan);
      setPlan(mapped);
      if (mapped.primaryVehicleId) {
        setVehicles((current) =>
          current.map((v) => ({
            ...v,
            isPrimary: v.id === mapped.primaryVehicleId,
          })),
        );
      }
    } catch (error) {
      console.warn('Failed to refresh plan:', error);
    }
  }, []);

  useEffect(() => {
    if (!apiClient.isConfigured) return undefined;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isAuthenticated) {
        void refreshPlan();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, refreshPlan]);

  const requiresPrimarySelection = Boolean(plan?.requiresPrimarySelection);
  const isPremium = Boolean(plan?.isPremium);
  const primaryVehicleId = plan?.primaryVehicleId ?? null;

  const canAddVehicle = (isPremium || vehicles.length === 0) && !requiresPrimarySelection;
  const canDeleteVehicle = isPremium && !requiresPrimarySelection;
  const canChangePrimaryVehicle = isPremium || requiresPrimarySelection;
  const canManageAttachments = isPremium && !requiresPrimarySelection;
  const canExportPdf = isPremium && !requiresPrimarySelection;

  const canWriteVehicle = useCallback(
    (vehicleId: string) => {
      if (requiresPrimarySelection) return false;
      if (isPremium) return true;
      return vehicleId === primaryVehicleId;
    },
    [requiresPrimarySelection, isPremium, primaryVehicleId],
  );

  const canWriteMaintenanceForVehicle = useCallback(
    (vehicleId: string) => {
      if (requiresPrimarySelection) return false;
      if (isPremium) return true;
      return vehicleId === primaryVehicleId;
    },
    [requiresPrimarySelection, isPremium, primaryVehicleId],
  );

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
      setMaintenanceRecords((current) =>
        current.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                ...updated,
                hasAttachment: updated.hasAttachment !== undefined ? updated.hasAttachment : item.hasAttachment,
              }
            : item,
        ),
      );
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

  const setMaintenanceAttachmentState = useCallback((maintenanceId: string, hasAttachment: boolean) => {
    setMaintenanceRecords((current) => {
      const target = current.find((item) => item.id === maintenanceId);
      if (!target || target.hasAttachment === hasAttachment) {
        return current;
      }
      return current.map((item) => (item.id === maintenanceId ? { ...item, hasAttachment } : item));
    });
  }, []);

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
      plan,
      tier: plan?.tier,
      isPremium,
      primaryVehicleId,
      requiresPrimarySelection,
      canAddVehicle,
      canDeleteVehicle,
      canChangePrimaryVehicle,
      canWriteVehicle,
      canWriteMaintenanceForVehicle,
      canManageAttachments,
      canExportPdf,
      setPrimaryVehicle,
      isSettingPrimary,
      refreshPlan,
      login,
      loginWithGoogle,
      register,
      updateProfile,
      logout,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      addMaintenance,
      updateMaintenance,
      deleteMaintenance,
      setMaintenanceAttachmentState,
      welcomePending,
      dismissWelcome,
    }),
    [
      user,
      isAuthenticated,
      isInitializing,
      vehicles,
      maintenanceRecords,
      costSummary,
      plan,
      isPremium,
      primaryVehicleId,
      requiresPrimarySelection,
      canAddVehicle,
      canDeleteVehicle,
      canChangePrimaryVehicle,
      canWriteVehicle,
      canWriteMaintenanceForVehicle,
      canManageAttachments,
      canExportPdf,
      isSettingPrimary,
      refreshPlan,
      setMaintenanceAttachmentState,
      welcomePending,
      dismissWelcome,
    ],
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
