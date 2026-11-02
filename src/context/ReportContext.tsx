import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { createInitialReport, reportReducer } from '../state/reportReducer';
import type { ReportAction, ReportData } from '../types/report';
import { clearDraft, hasReportContent, readDraft, saveDraft } from '../utils/reportDraft';

const DRAFT_SAVE_DELAY_MS = 400;

interface ReportContextValue {
  report: ReportData;
  dispatch: (action: ReportAction) => void;
  /** Photos the recovered draft had. They live in memory only, so a reload loses them. */
  lostPhotos: number;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [draft] = useState(readDraft);
  const [report, dispatch] = useReducer(reportReducer, undefined, () => draft?.form ?? createInitialReport());
  const [lostPhotos, setLostPhotos] = useState(draft?.photos ?? 0);

  useEffect(() => {
    // A correction rebuilds from its rejected report, photos included: it needs no draft.
    if (report.revisedFrom) return undefined;
    const timer = setTimeout(() => {
      if (hasReportContent(report)) {
        saveDraft(report);
      } else {
        clearDraft();
        setLostPhotos(0);
      }
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [report]);

  const value = useMemo(() => ({ report, dispatch, lostPhotos }), [report, lostPhotos]);
  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport debe usarse dentro de ReportProvider');
  return ctx;
}
