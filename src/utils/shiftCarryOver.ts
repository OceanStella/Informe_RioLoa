import { createInitialReport } from '../state/reportReducer';
import type { ReportData } from '../types/report';

/**
 * A new report that starts where the previous one ended: same people and equipment, and each
 * meter opens at the reading it closed with. What happened on the shift is left blank.
 */
export function carryOverShift(previous: ReportData, reportDate: string, equipmentIds: string[]): ReportData {
  const report = createInitialReport();
  const known = new Set(equipmentIds);
  const wm = previous.activities.find((activity) => activity.kind === 'watermaster')?.watermaster;
  const [firstActivity, ...others] = report.activities;

  return {
    ...report,
    supervisor: previous.supervisor,
    area: previous.area,
    apr: previous.apr,
    roster: previous.roster
      .filter((item) => known.has(item.equipmentId))
      .map((item) => ({
        ...item,
        hourmeterStart: item.hourmeterEnd,
        hourmeterEnd: '',
        ...(item.equipmentType === 'truck' ? { kmStart: item.kmEnd ?? '', kmEnd: '' } : {}),
        collapsed: false,
      })),
    activities: [
      {
        ...firstActivity,
        watermaster:
          wm && firstActivity.watermaster
            ? {
                ...firstActivity.watermaster,
                sector: wm.sector,
                operator: wm.operator,
                hourmeterStart: wm.hourmeterEnd,
                pumpHourmeterStart: wm.pumpHourmeterEnd,
                manufacturerPerformance: wm.manufacturerPerformance,
              }
            : firstActivity.watermaster,
      },
      ...others,
    ],
    carriedFrom: reportDate,
  };
}
