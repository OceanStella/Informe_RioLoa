import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import fallbackConfig from '../../config/default-config.json';
import type { AppConfig } from '../types/config';

interface ConfigContextValue {
  config: AppConfig;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  setConfig: (config: AppConfig) => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(fallbackConfig as AppConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config');
      const payload = (await response.json()) as { ok?: boolean; config?: AppConfig; message?: string };
      if (!response.ok || !payload.ok || !payload.config) {
        throw new Error(payload.message || 'No fue posible cargar la configuración.');
      }
      setConfig(payload.config);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('No fue posible cargar la configuración remota. Se usan los valores por defecto.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshConfig();
  }, [refreshConfig]);

  const value = useMemo(
    () => ({ config, loading, error, refreshConfig, setConfig }),
    [config, loading, error, refreshConfig],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig debe usarse dentro de ConfigProvider');
  return ctx;
}
