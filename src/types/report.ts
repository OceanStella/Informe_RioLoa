import type { EquipmentType } from './config';

export type HardnessValue = 25 | 50 | 75 | 100;

export interface PhotoData {
  file: File;
  previewUrl: string;
  dataUrl?: string;
}

export interface WatermasterData {
  sector: string;
  operator: string;
  hourmeterStart: string;
  hourmeterEnd: string;
  pumpHourmeterStart: string;
  pumpHourmeterEnd: string;
  depth: number | null;
  hardness: HardnessValue | null;
  manufacturerPerformance: string;
}

export interface OperationalData {
  operator: string;
  hourmeterStart: string;
  hourmeterEnd: string;
  kmStart?: string;
  kmEnd?: string;
}

export interface ActiveRosterAssignment extends OperationalData {
  equipmentId: string;
  equipmentCode: string;
  equipmentType: EquipmentType;
  collapsed: boolean;
}

export interface EquipmentAssignment {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentType: EquipmentType;
  collapsed: boolean;
  trips?: string;
  localOperationalData?: OperationalData;
}

export interface Activity {
  id: string;
  kind: 'watermaster' | 'generic';
  area: string;
  customArea?: string;
  type: string;
  customType?: string;
  description: string;
  equipmentAssignments: EquipmentAssignment[];
  supportEquipment: string;
  beforePhoto?: PhotoData;
  afterPhoto?: PhotoData;
  collapsed: boolean;
  watermaster?: WatermasterData;
}

/** The rejected report this form was rebuilt from. The original is never modified. */
export interface ReportRevisionSource {
  reportId: string;
  reportDate: string;
  comment: string | null;
}

export interface ReportData {
  date: string;
  supervisor: string;
  area: string;
  apr: string;
  roster: ActiveRosterAssignment[];
  activities: Activity[];
  revisedFrom?: ReportRevisionSource;
}

export type OperationalField = keyof OperationalData;

export type ReportAction =
  | { type: 'UPDATE_GENERAL_INFO'; field: keyof Pick<ReportData, 'date' | 'supervisor' | 'area' | 'apr'>; value: string }
  | { type: 'ADD_ACTIVITY' }
  | { type: 'REMOVE_ACTIVITY'; activityId: string }
  | { type: 'UPDATE_ACTIVITY'; activityId: string; patch: Partial<Activity> }
  | { type: 'TOGGLE_ACTIVITY'; activityId: string }
  | { type: 'UPDATE_WATERMASTER'; activityId: string; field: keyof WatermasterData; value: string | number | HardnessValue | null }
  | { type: 'SELECT_EQUIPMENT'; activityId: string; equipmentId: string; equipmentCode: string; equipmentType: EquipmentType }
  | { type: 'UNSELECT_EQUIPMENT'; activityId: string; equipmentId: string }
  | { type: 'UPDATE_EQUIPMENT'; activityId: string; assignmentId: string; field: 'collapsed' | 'trips' | OperationalField; value: string | boolean }
  | { type: 'TOGGLE_EQUIPMENT'; activityId: string; assignmentId: string }
  | { type: 'SELECT_ROSTER_EQUIPMENT'; equipmentId: string; equipmentCode: string; equipmentType: EquipmentType }
  | { type: 'UNSELECT_ROSTER_EQUIPMENT'; equipmentId: string }
  | { type: 'UPDATE_ROSTER'; equipmentId: string; field: 'collapsed' | OperationalField; value: string | boolean }
  | { type: 'TOGGLE_ROSTER'; equipmentId: string }
  | { type: 'SET_PHOTO'; activityId: string; which: 'before' | 'after'; photo: PhotoData }
  | { type: 'REMOVE_PHOTO'; activityId: string; which: 'before' | 'after' }
  | { type: 'RESET_REPORT' }
  | { type: 'LOAD_REPORT'; report: ReportData };

export interface PdfReportData extends ReportData {
  activities: Array<
    Activity & {
      beforePhoto?: PhotoData & { dataUrl: string };
      afterPhoto?: PhotoData & { dataUrl: string };
    }
  >;
}
