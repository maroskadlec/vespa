import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vespa_tracker_data';

export interface ServiceCompletion {
  completedAt: string; // ISO date string
  completedKm: number;
}

export interface VespaData {
  commissioningDate: string; // ISO date string
  currentKm: number;
  completedServices: Record<string, ServiceCompletion>;
}

interface UseVespaDataReturn {
  data: VespaData | null;
  isLoading: boolean;
  saveData: (data: Omit<VespaData, 'completedServices'>) => Promise<void>;
  updateKm: (km: number) => Promise<void>;
  markServiceDone: (milestoneId: string) => Promise<void>;
  clearData: () => Promise<void>;
  reloadData: () => Promise<void>;
}

function migrateData(raw: unknown): VespaData {
  const obj = raw as Record<string, unknown>;
  return {
    commissioningDate: obj.commissioningDate as string,
    currentKm: obj.currentKm as number,
    completedServices:
      (obj.completedServices as Record<string, ServiceCompletion>) ?? {},
  };
}

export function useVespaData(): UseVespaDataReturn {
  const [data, setData] = useState<VespaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setData(migrateData(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Failed to load Vespa data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const persist = useCallback(async (newData: VespaData) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    setData(newData);
  }, []);

  const saveData = useCallback(
    async (partial: Omit<VespaData, 'completedServices'>) => {
      const newData: VespaData = {
        ...partial,
        completedServices: data?.completedServices ?? {},
      };
      await persist(newData);
    },
    [data, persist]
  );

  const updateKm = useCallback(
    async (km: number) => {
      if (!data) return;
      await persist({ ...data, currentKm: km });
    },
    [data, persist]
  );

  const markServiceDone = useCallback(
    async (milestoneId: string) => {
      if (!data) return;
      const completion: ServiceCompletion = {
        completedAt: new Date().toISOString(),
        completedKm: data.currentKm,
      };
      await persist({
        ...data,
        completedServices: {
          ...data.completedServices,
          [milestoneId]: completion,
        },
      });
    },
    [data, persist]
  );

  const clearData = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setData(null);
  }, []);

  return { data, isLoading, saveData, updateKm, markServiceDone, clearData, reloadData: loadData };
}
