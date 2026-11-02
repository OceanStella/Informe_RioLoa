import { useConfig } from '../context/ConfigContext';
import { useReport } from '../context/ReportContext';
import type { Activity, EquipmentAssignment } from '../types/report';
import { calculateMachineryShareM3, calculateTruckOperationHours, formatMetric } from '../utils/calculations';
import { isRosterReady, resolveEquipmentOperationalData, usesRosterData } from '../utils/roster';
import type { FlatValidationErrors } from '../utils/validation';
import { ComputedField } from './ComputedField';
import { CollapseToggle } from './ui/CollapseToggle';
import { StatusChip } from './ui/StatusChip';
import { ValidationMessage } from './ValidationMessage';

interface MachineryAssignmentCardProps {
  activity: Activity;
  assignment: EquipmentAssignment;
  workZone: string;
  errors: FlatValidationErrors;
}

export function MachineryAssignmentCard({ activity, assignment, workZone, errors }: MachineryAssignmentCardProps) {
  const { config } = useConfig();
  const { report, dispatch } = useReport();
  const activityId = activity.id;
  const eqKey = `activity.${activityId}.equipment.${assignment.id}`;
  const inherited = usesRosterData(report.roster, assignment.equipmentId);
  const rosterItem = report.roster.find((item) => item.equipmentId === assignment.equipmentId);
  const ready = Boolean(inherited && rosterItem && isRosterReady(rosterItem));
  const ops = resolveEquipmentOperationalData(assignment, report.roster);
  const shareM3 = calculateMachineryShareM3(activity, config);
  const m3Display = shareM3 != null ? formatMetric(shareM3) : '-';
  const opHours = calculateTruckOperationHours(ops.hourmeterStart, ops.hourmeterEnd);
  const rosterError = errors[`${eqKey}.roster`];

  const toggle = () => dispatch({ type: 'TOGGLE_EQUIPMENT', activityId, assignmentId: assignment.id });

  return (
    <div className={`equipment-card${assignment.collapsed ? ' is-collapsed' : ''}`}>
      <div className="equipment-card-header">
        <div className="equipment-card-heading">
          <span className="equipment-card-code">{assignment.equipmentCode}</span>
          <span className="equipment-card-type">Maquinaria</span>
          {ready && <StatusChip status="ready" label="Datos desde Dotación activa" />}
          {!ready && rosterError && <StatusChip status="error" label="Sin datos válidos" />}
          {assignment.collapsed && (
            <span className="equipment-card-summary">
              Operador: <strong>{ops.operator || '—'}</strong> · M³ actividad: <strong>{m3Display}</strong>
            </span>
          )}
        </div>
        <CollapseToggle collapsed={assignment.collapsed} subject={assignment.equipmentCode} onToggle={toggle} />
      </div>

      {assignment.collapsed ? (
        <ValidationMessage message={rosterError} />
      ) : (
        <div className="equipment-card-body">
          <ValidationMessage message={rosterError} />
          <div className="form-grid cols-3" data-field={`${eqKey}.roster`}>
            <ComputedField label="Operador" displayValue={ops.operator || '—'} variant="inherited" />
            <ComputedField label="Zona de trabajo" displayValue={workZone || '—'} variant="inherited" />
            <div className="form-row-triple">
              <ComputedField label="Horómetro Inicial" displayValue={ops.hourmeterStart || '—'} variant="inherited" />
              <ComputedField label="Horómetro Final" displayValue={ops.hourmeterEnd || '—'} variant="inherited" />
              <ComputedField label="Horas de operación" displayValue={`${formatMetric(opHours)} h`} />
            </div>
            <div className="trips-row">
              <ComputedField
                label="M³ asociado a la actividad"
                displayValue={m3Display === '-' ? '-' : `${m3Display} m³`}
                highlight
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
