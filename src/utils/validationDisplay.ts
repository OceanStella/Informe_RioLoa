import type { ReportData } from '../types/report';
import { validateReport, type FlatValidationErrors } from './validation';

/** Tras un intento fallido, solo actualiza errores ya mostrados (no marca campos nuevos en rojo). */
export function refreshDisplayedErrors(
  report: ReportData,
  previousErrors: FlatValidationErrors,
): FlatValidationErrors {
  const fresh = validateReport(report).flatErrors;
  const next: FlatValidationErrors = {};
  for (const key of Object.keys(previousErrors)) {
    if (fresh[key]) {
      next[key] = fresh[key];
    }
  }
  return next;
}
