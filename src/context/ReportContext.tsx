import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { createInitialReport, reportReducer } from '../state/reportReducer';
import type { ReportAction, ReportData } from '../types/report';

interface ReportContextValue {
  report: ReportData;
  dispatch: (action: ReportAction) => void;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [report, dispatch] = useReducer(reportReducer, undefined, createInitialReport);
  const value = useMemo(() => ({ report, dispatch }), [report]);
  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport debe usarse dentro de ReportProvider');
  return ctx;
}
