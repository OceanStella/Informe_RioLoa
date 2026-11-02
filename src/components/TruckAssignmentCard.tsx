import { useConfig } from '../context/ConfigContext';
import { useReport } from '../context/ReportContext';
import type { EquipmentAssignment } from '../types/report';
import {
  calculateAssignmentTruckM3,
  calculateTruckKm,
  calculateTruckOperationHours,
  formatMetric,
  getTruckCapacity,
} from '../utils/calculations';
import { isRosterReady, resolveEquipmentOperationalData } from '../utils/roster';
import type { FlatValidationErrors } from '../utils/validation';
import { ComputedField } from './ComputedField';
import { invalidFieldClass } from './fieldUtils';
import { CollapseToggle } from './ui/CollapseToggle';
import { StatusChip } from './ui/StatusChip';
import { ValidationMessage } from './ValidationMessage';

interface TruckAssignmentCardProps {
  activityId: string;
  assignment: EquipmentAssignment;
  workZone: string;
  errors: FlatValidationErrors;
}

export function TruckAssignmentCard({ activityId, assignment, workZone, errors }: TruckAssignmentCardProps) {
  const { config } = useConfig();
  const { report, dispatch } = useReport();
  const eqKey = `activity.${activityId}.equipment.${assignment.id}`;
  const rosterItem = report.roster.find((item) => item.equipmentId === assignment.equipmentId);
  const ready = Boolean(rosterItem && isRosterReady(rosterItem));
  const ops = resolveEquipmentOperationalData(assignment, report.roster);
  const capacity = getTruckCapacity(assignment.equipmentId, config);
  const totalM3 = calculateAssignmentTruckM3(assignment, config);
  const opHours = calculateTruckOperationHours(ops.hourmeterStart, ops.hourmeterEnd);
  const km = calculateTruckKm(ops.kmStart ?? '', ops.kmEnd ?? '');
  const rosterError = errors[`${eqKey}.roster`];
  const tripsId = `${eqKey}-trips`;

  const toggle = () => dispatch({ type: 'TOGGLE_EQUIPMENT', activityId, assignmentId: assignment.id });

  return (
    <div className={`equipment-card${assignment.collapsed ? ' is-collapsed' : ''}`}>
      <div className="equipment-card-header">
        <div className="equipment-card-heading">
          <span className="equipment-card-code">{assignment.equipmentCode}</span>
          <span className="equipment-card-type">Camión tolva</span>
          {ready && <StatusChip status="ready" label="Datos desde Dotación activa" />}
          {!ready && rosterError && <StatusChip status="error" label="Sin datos válidos" />}
          {assignment.collapsed && (
            <span className="equipment-card-summary">
              Operador: <strong>{ops.operator || '—'}</strong> · Total: <strong>{formatMetric(totalM3)} m³</strong>
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
            <div className="form-row-triple">
              <ComputedField label="KM Inicial" displayValue={ops.kmStart || '—'} variant="inherited" />
              <ComputedField label="KM Final" displayValue={ops.kmEnd || '—'} variant="inherited" />
              <ComputedField label="KM recorridos" displayValue={`${formatMetric(km)} km`} />
            </div>
            <div className="trips-row">
              <div className="form-field" data-field={`${eqKey}.trips`}>
                <label className="field-label" htmlFor={tripsId}>N° de Vueltas</label>
                <input
                  id={tripsId}
                  type="number"
                  step="any"
                  className={invalidFieldClass(Boolean(errors[`${eqKey}.trips`]))}
                  value={assignment.trips ?? ''}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_EQUIPMENT',
                      activityId,
                      assignmentId: assignment.id,
                      field: 'trips',
                      value: e.target.value,
                    })
                  }
                />
                <ValidationMessage message={errors[`${eqKey}.trips`]} />
              </div>
              <ComputedField label="Capacidad por vuelta" displayValue={`${capacity} m³`} variant="inherited" />
              <ComputedField label="Total M³" displayValue={`${formatMetric(totalM3)} m³`} highlight />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
