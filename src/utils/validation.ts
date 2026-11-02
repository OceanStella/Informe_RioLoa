import type { ReportData } from '../types/report';
import {
  getHourmeterDifferenceError,
  getKmDifferenceError,
  getRosterAssignment,
  HOURMETER_ORDER_MESSAGE,
  HOURMETER_RANGE_MESSAGE,
  isRosterReady,
  ROSTER_INVALID_MESSAGE,
  ROSTER_MISSING_MESSAGE,
} from './roster';

export type FlatValidationErrors = Record<string, string>;

export interface WatermasterValidationErrors {
  sector?: string;
  operator?: string;
  hourmeterStart?: string;
  hourmeterEnd?: string;
  pumpHourmeterStart?: string;
  pumpHourmeterEnd?: string;
  depth?: string;
  hardness?: string;
  manufacturerPerformance?: string;
}

export interface EquipmentValidationErrors {
  operator?: string;
  hourmeterStart?: string;
  hourmeterEnd?: string;
  kmStart?: string;
  kmEnd?: string;
  trips?: string;
  roster?: string;
}

export interface ActivityValidationErrors {
  area?: string;
  customArea?: string;
  type?: string;
  customType?: string;
  description?: string;
  equipment?: string;
  wm?: WatermasterValidationErrors;
  equipmentAssignments?: Record<string, EquipmentValidationErrors>;
}

export interface ReportValidationErrors {
  general: {
    date?: string;
    supervisor?: string;
    area?: string;
    apr?: string;
  };
  roster: Record<string, EquipmentValidationErrors>;
  activities: Record<string, ActivityValidationErrors>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ReportValidationErrors;
  flatErrors: FlatValidationErrors;
  firstErrorPath: string | null;
}

const firstTracker = { path: null as string | null };

function trackFirst(flatKey: string): void {
  if (!firstTracker.path) firstTracker.path = flatKey;
}

function setGeneralError(
  errors: ReportValidationErrors,
  flat: FlatValidationErrors,
  field: keyof ReportValidationErrors['general'],
  flatKey: string,
  message: string,
): void {
  if (!errors.general[field]) {
    errors.general[field] = message;
    flat[flatKey] = message;
    trackFirst(flatKey);
  }
}

function ensureActivity(errors: ReportValidationErrors, activityId: string): ActivityValidationErrors {
  if (!errors.activities[activityId]) {
    errors.activities[activityId] = {};
  }
  return errors.activities[activityId];
}

function setWmError(
  errors: ReportValidationErrors,
  flat: FlatValidationErrors,
  activityId: string,
  field: keyof WatermasterValidationErrors,
  flatKey: string,
  message: string,
): void {
  const act = ensureActivity(errors, activityId);
  if (!act.wm) act.wm = {};
  if (!act.wm[field]) {
    act.wm[field] = message;
    flat[flatKey] = message;
    trackFirst(flatKey);
  }
}

function setEquipmentError(
  errors: ReportValidationErrors,
  flat: FlatValidationErrors,
  activityId: string,
  assignmentId: string,
  field: keyof EquipmentValidationErrors,
  flatKey: string,
  message: string,
): void {
  const act = ensureActivity(errors, activityId);
  if (!act.equipmentAssignments) act.equipmentAssignments = {};
  if (!act.equipmentAssignments[assignmentId]) act.equipmentAssignments[assignmentId] = {};
  if (!act.equipmentAssignments[assignmentId][field]) {
    act.equipmentAssignments[assignmentId][field] = message;
    flat[flatKey] = message;
    trackFirst(flatKey);
  }
}

function setRosterError(
  errors: ReportValidationErrors,
  flat: FlatValidationErrors,
  equipmentId: string,
  field: keyof EquipmentValidationErrors,
  flatKey: string,
  message: string,
): void {
  if (!errors.roster[equipmentId]) errors.roster[equipmentId] = {};
  if (!errors.roster[equipmentId][field]) {
    errors.roster[equipmentId][field] = message;
    flat[flatKey] = message;
    trackFirst(flatKey);
  }
}

function isEmpty(value: string | null | undefined): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

function validateOptionalHourmeterPair(
  start: string,
  end: string,
  onStartMissing: () => void,
  onEndMissing: () => void,
  onDiffError: (message: string) => void,
  checkMaxHours: boolean,
): void {
  const startFilled = !isEmpty(start);
  const endFilled = !isEmpty(end);
  if (startFilled && !endFilled) {
    onEndMissing();
    return;
  }
  if (!startFilled && endFilled) {
    onStartMissing();
    return;
  }
  if (!startFilled && !endFilled) return;
  const message = getHourmeterDifferenceError(start, end);
  if (!message) return;
  if (!checkMaxHours && message !== HOURMETER_ORDER_MESSAGE) return;
  onDiffError(message);
}

export function validateReport(report: ReportData): ValidationResult {
  firstTracker.path = null;
  const errors: ReportValidationErrors = { general: {}, roster: {}, activities: {} };
  const flat: FlatValidationErrors = {};

  if (isEmpty(report.date)) {
    setGeneralError(errors, flat, 'date', 'general.date', 'La fecha es obligatoria.');
  }
  if (isEmpty(report.supervisor)) {
    setGeneralError(errors, flat, 'supervisor', 'general.supervisor', 'El supervisor es obligatorio.');
  }
  if (isEmpty(report.area)) {
    setGeneralError(errors, flat, 'area', 'general.area', 'Debes seleccionar un área.');
  }
  if (isEmpty(report.apr)) {
    setGeneralError(errors, flat, 'apr', 'general.apr', 'El APR / Responsable es obligatorio.');
  }

  for (const item of report.roster) {
    const prefix = `roster.${item.equipmentId}`;
    const hourmeterError = getHourmeterDifferenceError(item.hourmeterStart, item.hourmeterEnd);
    if (hourmeterError) {
      setRosterError(errors, flat, item.equipmentId, 'hourmeterEnd', `${prefix}.hourmeterEnd`, hourmeterError);
    }
    if (item.equipmentType === 'truck') {
      const kmError = getKmDifferenceError(item.kmStart, item.kmEnd);
      if (kmError) {
        setRosterError(errors, flat, item.equipmentId, 'kmEnd', `${prefix}.kmEnd`, kmError);
      }
    }
  }

  report.activities.forEach((activity) => {
    const prefix = `activity.${activity.id}`;

    if (activity.kind === 'watermaster' && activity.watermaster) {
      const wm = activity.watermaster;
      const wmPrefix = `${prefix}.wm`;

      validateOptionalHourmeterPair(
        wm.hourmeterStart,
        wm.hourmeterEnd,
        () =>
          setWmError(
            errors,
            flat,
            activity.id,
            'hourmeterStart',
            `${wmPrefix}.hourmeterStart`,
            'Debes completar ambos horómetros de la Draga.',
          ),
        () =>
          setWmError(
            errors,
            flat,
            activity.id,
            'hourmeterEnd',
            `${wmPrefix}.hourmeterEnd`,
            'Debes completar ambos horómetros de la Draga.',
          ),
        (message) => setWmError(errors, flat, activity.id, 'hourmeterEnd', `${wmPrefix}.hourmeterEnd`, message),
        false,
      );

      validateOptionalHourmeterPair(
        wm.pumpHourmeterStart,
        wm.pumpHourmeterEnd,
        () =>
          setWmError(
            errors,
            flat,
            activity.id,
            'pumpHourmeterStart',
            `${wmPrefix}.pumpHourmeterStart`,
            'Debes completar ambos horómetros de la Bomba.',
          ),
        () =>
          setWmError(
            errors,
            flat,
            activity.id,
            'pumpHourmeterEnd',
            `${wmPrefix}.pumpHourmeterEnd`,
            'Debes completar ambos horómetros de la Bomba.',
          ),
        (message) =>
          setWmError(errors, flat, activity.id, 'pumpHourmeterEnd', `${wmPrefix}.pumpHourmeterEnd`, message),
        false,
      );
    }

    activity.equipmentAssignments.forEach((assignment) => {
      const eqKey = `${prefix}.equipment.${assignment.id}`;
      const rosterItem = getRosterAssignment(report.roster, assignment.equipmentId);
      if (!rosterItem) {
        setEquipmentError(
          errors,
          flat,
          activity.id,
          assignment.id,
          'roster',
          `${eqKey}.roster`,
          ROSTER_MISSING_MESSAGE,
        );
        return;
      }
      if (!isRosterReady(rosterItem)) {
        const rosterErrors = errors.roster[assignment.equipmentId];
        const message =
          rosterErrors && Object.keys(rosterErrors).length > 0 ? ROSTER_INVALID_MESSAGE : ROSTER_MISSING_MESSAGE;
        setEquipmentError(errors, flat, activity.id, assignment.id, 'roster', `${eqKey}.roster`, message);
      }
    });
  });

  return {
    valid: Object.keys(flat).length === 0,
    errors,
    flatErrors: flat,
    firstErrorPath: firstTracker.path,
  };
}

export function activityHasErrors(errors: ReportValidationErrors, activityId: string): boolean {
  return Boolean(errors.activities[activityId]);
}

export function assignmentHasErrors(
  errors: ReportValidationErrors,
  activityId: string,
  assignmentId: string,
): boolean {
  return Boolean(errors.activities[activityId]?.equipmentAssignments?.[assignmentId]);
}

export function rosterHasErrors(errors: ReportValidationErrors, equipmentId: string): boolean {
  return Boolean(errors.roster[equipmentId]);
}

const LIVE_MESSAGES = new Set([
  HOURMETER_RANGE_MESSAGE,
  HOURMETER_ORDER_MESSAGE,
  ROSTER_INVALID_MESSAGE,
  ROSTER_MISSING_MESSAGE,
  'El kilometraje final debe ser igual o mayor al inicial.',
]);

export function collectLiveErrors(report: ReportData): FlatValidationErrors {
  const { flatErrors } = validateReport(report);
  const live: FlatValidationErrors = {};
  for (const [key, message] of Object.entries(flatErrors)) {
    if (LIVE_MESSAGES.has(message)) {
      live[key] = message;
    }
  }
  return live;
}

/** @deprecated Use flatErrors from ValidationResult */
export type ValidationErrors = FlatValidationErrors;
