import type { Activity, ReportAction, ReportData, WatermasterData } from '../types/report';
import { revokePhotoPreview } from '../utils/images';

function createWatermasterActivity(): Activity {
  return {
    id: crypto.randomUUID(),
    kind: 'watermaster',
    area: '',
    type: 'Draga Watermaster',
    description: '',
    equipmentAssignments: [],
    supportEquipment: '',
    collapsed: false,
    watermaster: {
      sector: '',
      operator: '',
      hourmeterStart: '',
      hourmeterEnd: '',
      pumpHourmeterStart: '',
      pumpHourmeterEnd: '',
      depth: null,
      hardness: null,
      manufacturerPerformance: '',
    },
  };
}

function createGenericActivity(): Activity {
  return {
    id: crypto.randomUUID(),
    kind: 'generic',
    area: '',
    type: '',
    description: '',
    equipmentAssignments: [],
    supportEquipment: '',
    collapsed: false,
  };
}

export function createInitialReport(): ReportData {
  const today = new Date().toISOString().split('T')[0];
  return {
    date: today,
    supervisor: '',
    area: '',
    apr: '',
    roster: [],
    activities: [createWatermasterActivity()],
  };
}

function revokeReportPhotos(report: ReportData): void {
  for (const activity of report.activities) {
    revokePhotoPreview(activity.beforePhoto);
    revokePhotoPreview(activity.afterPhoto);
  }
}

export function reportReducer(state: ReportData, action: ReportAction): ReportData {
  switch (action.type) {
    case 'RESET_REPORT':
      revokeReportPhotos(state);
      return createInitialReport();

    case 'LOAD_REPORT':
      revokeReportPhotos(state);
      return action.report;

    case 'UPDATE_GENERAL_INFO':
      return { ...state, [action.field]: action.value };

    case 'ADD_ACTIVITY':
      return { ...state, activities: [...state.activities, createGenericActivity()] };

    case 'REMOVE_ACTIVITY':
      if (state.activities.length <= 1 || state.activities[0]?.id === action.activityId) return state;
      const removed = state.activities.find((a) => a.id === action.activityId);
      if (removed) {
        revokePhotoPreview(removed.beforePhoto);
        revokePhotoPreview(removed.afterPhoto);
      }
      return {
        ...state,
        activities: state.activities.filter((a) => a.id !== action.activityId),
      };

    case 'UPDATE_ACTIVITY':
      return {
        ...state,
        activities: state.activities.map((a) =>
          a.id === action.activityId ? { ...a, ...action.patch } : a,
        ),
      };

    case 'TOGGLE_ACTIVITY':
      return {
        ...state,
        activities: state.activities.map((a) =>
          a.id === action.activityId ? { ...a, collapsed: !a.collapsed } : a,
        ),
      };

    case 'UPDATE_WATERMASTER':
      return {
        ...state,
        activities: state.activities.map((a) => {
          if (a.id !== action.activityId || !a.watermaster) return a;
          const wm: WatermasterData = { ...a.watermaster, [action.field]: action.value };
          return { ...a, watermaster: wm };
        }),
      };

    case 'SELECT_EQUIPMENT': {
      return {
        ...state,
        activities: state.activities.map((a) => {
          if (a.id !== action.activityId) return a;
          if (a.equipmentAssignments.some((eq) => eq.equipmentId === action.equipmentId)) {
            return a;
          }
          const assignment = {
            id: crypto.randomUUID(),
            equipmentId: action.equipmentId,
            equipmentCode: action.equipmentCode,
            equipmentType: action.equipmentType,
            collapsed: false,
            ...(action.equipmentType === 'truck' ? { trips: '' } : {}),
          };
          return {
            ...a,
            equipmentAssignments: [...a.equipmentAssignments, assignment],
          };
        }),
      };
    }

    case 'UNSELECT_EQUIPMENT':
      return {
        ...state,
        activities: state.activities.map((a) => {
          if (a.id !== action.activityId) return a;
          return {
            ...a,
            equipmentAssignments: a.equipmentAssignments.filter(
              (eq) => eq.equipmentId !== action.equipmentId,
            ),
          };
        }),
      };

    case 'UPDATE_EQUIPMENT':
      return {
        ...state,
        activities: state.activities.map((a) => {
          if (a.id !== action.activityId) return a;
          return {
            ...a,
            equipmentAssignments: a.equipmentAssignments.map((eq) => {
              if (eq.id !== action.assignmentId) return eq;
              if (action.field === 'collapsed' || action.field === 'trips') {
                return { ...eq, [action.field]: action.value };
              }
              return eq;
            }),
          };
        }),
      };

    case 'TOGGLE_EQUIPMENT':
      return {
        ...state,
        activities: state.activities.map((a) => {
          if (a.id !== action.activityId) return a;
          return {
            ...a,
            equipmentAssignments: a.equipmentAssignments.map((eq) =>
              eq.id === action.assignmentId ? { ...eq, collapsed: !eq.collapsed } : eq,
            ),
          };
        }),
      };

    case 'SELECT_ROSTER_EQUIPMENT': {
      if (state.roster.some((item) => item.equipmentId === action.equipmentId)) return state;
      return {
        ...state,
        roster: [
          ...state.roster,
          {
            equipmentId: action.equipmentId,
            equipmentCode: action.equipmentCode,
            equipmentType: action.equipmentType,
            operator: '',
            hourmeterStart: '',
            hourmeterEnd: '',
            ...(action.equipmentType === 'truck' ? { kmStart: '', kmEnd: '' } : {}),
            collapsed: false,
          },
        ],
      };
    }

    case 'UNSELECT_ROSTER_EQUIPMENT': {
      if (!state.roster.some((entry) => entry.equipmentId === action.equipmentId)) return state;
      return {
        ...state,
        roster: state.roster.filter((entry) => entry.equipmentId !== action.equipmentId),
        activities: state.activities.map((activity) => ({
          ...activity,
          equipmentAssignments: activity.equipmentAssignments.map((eq) =>
            eq.equipmentId === action.equipmentId ? { ...eq, localOperationalData: undefined } : eq,
          ),
        })),
      };
    }

    case 'UPDATE_ROSTER':
      return {
        ...state,
        roster: state.roster.map((item) =>
          item.equipmentId === action.equipmentId ? { ...item, [action.field]: action.value } : item,
        ),
      };

    case 'TOGGLE_ROSTER':
      return {
        ...state,
        roster: state.roster.map((item) =>
          item.equipmentId === action.equipmentId ? { ...item, collapsed: !item.collapsed } : item,
        ),
      };

    case 'SET_PHOTO':
      return {
        ...state,
        activities: state.activities.map((a) => {
          if (a.id !== action.activityId) return a;
          const field = action.which === 'before' ? 'beforePhoto' : 'afterPhoto';
          const existing = a[field];
          revokePhotoPreview(existing);
          return { ...a, [field]: action.photo };
        }),
      };

    case 'REMOVE_PHOTO':
      return {
        ...state,
        activities: state.activities.map((a) => {
          if (a.id !== action.activityId) return a;
          const field = action.which === 'before' ? 'beforePhoto' : 'afterPhoto';
          revokePhotoPreview(a[field]);
          const next = { ...a };
          delete next[field];
          return next;
        }),
      };

    default:
      return state;
  }
}
