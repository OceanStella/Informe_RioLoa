import type { ReportAction, ReportData } from '../types/report';
import type { ReportValidationErrors } from './validation';
import { activityHasErrors, assignmentHasErrors, rosterHasErrors } from './validation';

export function buildExpandActions(
  report: ReportData,
  validationErrors: ReportValidationErrors,
): ReportAction[] {
  const actions: ReportAction[] = [];

  for (const item of report.roster) {
    if (!rosterHasErrors(validationErrors, item.equipmentId)) continue;
    if (item.collapsed) {
      actions.push({
        type: 'UPDATE_ROSTER',
        equipmentId: item.equipmentId,
        field: 'collapsed',
        value: false,
      });
    }
  }

  for (const activity of report.activities) {
    if (!activityHasErrors(validationErrors, activity.id)) continue;

    if (activity.collapsed) {
      actions.push({
        type: 'UPDATE_ACTIVITY',
        activityId: activity.id,
        patch: { collapsed: false },
      });
    }

    for (const assignment of activity.equipmentAssignments) {
      if (!assignmentHasErrors(validationErrors, activity.id, assignment.id)) continue;
      if (assignment.collapsed) {
        actions.push({
          type: 'UPDATE_EQUIPMENT',
          activityId: activity.id,
          assignmentId: assignment.id,
          field: 'collapsed',
          value: false,
        });
      }
    }
  }

  return actions;
}
