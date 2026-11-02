import { Check, Info, Tractor, Truck } from 'lucide-react';
import { getMachinery, getTrucks, sortEquipmentForActivity } from '../data/equipment';
import { useConfig } from '../context/ConfigContext';
import { useReport } from '../context/ReportContext';
import type { Activity } from '../types/report';
import { MachineryAssignmentCard } from './MachineryAssignmentCard';
import { TruckAssignmentCard } from './TruckAssignmentCard';
import { ValidationMessage } from './ValidationMessage';
import { calculateActivityTruckM3, formatMetric, resolveActivityArea } from '../utils/calculations';
import { formatRosterTooltip, getRosterAssignment, isRosterReady } from '../utils/roster';
import type { FlatValidationErrors } from '../utils/validation';
import { EquipmentOption } from './ui/EquipmentOption';

interface EquipmentSelectorProps {
  activity: Activity;
  errors: FlatValidationErrors;
}

export function EquipmentSelector({ activity, errors }: EquipmentSelectorProps) {
  const { config } = useConfig();
  const { report, dispatch } = useReport();
  const workZone = resolveActivityArea(activity);
  const prefix = `activity.${activity.id}`;
  const rosterIds = new Set(report.roster.map((item) => item.equipmentId));
  const trucks = sortEquipmentForActivity(getTrucks(config), rosterIds);
  const machinery = sortEquipmentForActivity(getMachinery(config), rosterIds);

  const isSelected = (equipmentId: string) =>
    activity.equipmentAssignments.some((a) => a.equipmentId === equipmentId);

  const toggle = (equipmentId: string, code: string, type: 'truck' | 'machinery', checked: boolean) => {
    if (checked) {
      dispatch({ type: 'SELECT_EQUIPMENT', activityId: activity.id, equipmentId, equipmentCode: code, equipmentType: type });
    } else {
      dispatch({ type: 'UNSELECT_EQUIPMENT', activityId: activity.id, equipmentId });
    }
  };

  const selectedTrucks = activity.equipmentAssignments.filter((a) => a.equipmentType === 'truck');
  const selectedMachinery = activity.equipmentAssignments.filter((a) => a.equipmentType === 'machinery');
  const activityTotalM3 = calculateActivityTruckM3(activity, config);
  const supportId = `activity-${activity.id}-support`;

  const renderOption = (eq: { id: string; code: string }, type: 'truck' | 'machinery') => {
    const rosterItem = getRosterAssignment(report.roster, eq.id);
    const ready = rosterItem ? isRosterReady(rosterItem) : false;
    return (
      <EquipmentOption
        key={eq.id}
        code={eq.code}
        checked={isSelected(eq.id)}
        onChange={(checked) => toggle(eq.id, eq.code, type, checked)}
        readyTooltip={ready && rosterItem ? formatRosterTooltip(rosterItem) : undefined}
      />
    );
  };

  return (
    <div className="subsection equipment-section">
      <div className="subsection-header">
        <h4 className="subsection-title">Equipos asignados a esta actividad</h4>
        <span className="equipment-legend">
          <span className="roster-ready-badge" aria-hidden="true">
            <Info size={18} className="roster-ready-info" />
            <span className="roster-ready-check">
              <Check size={9} strokeWidth={4} />
            </span>
          </span>
          Con datos en Dotación activa
        </span>
      </div>
      <div
        className={`equipment-picker${errors[`${prefix}.equipment`] ? ' field-invalid-group' : ''}`}
        data-field={`${prefix}.equipment`}
      >
        <div>
          <div className="equipment-group-header">
            <p className="equipment-category">
              <Truck size={15} aria-hidden="true" />
              Camiones Tolva
            </p>
            <span className="equipment-group-count">{selectedTrucks.length} seleccionados</span>
          </div>
          <ul className="equipment-checklist">{trucks.map((eq) => renderOption(eq, 'truck'))}</ul>
        </div>
        <div>
          <div className="equipment-group-header">
            <p className="equipment-category">
              <Tractor size={15} aria-hidden="true" />
              Maquinaria
            </p>
            <span className="equipment-group-count">{selectedMachinery.length} seleccionados</span>
          </div>
          <ul className="equipment-checklist">{machinery.map((eq) => renderOption(eq, 'machinery'))}</ul>
        </div>
      </div>
      <ValidationMessage message={errors[`${prefix}.equipment`]} />

      {activity.equipmentAssignments.length > 0 && (
        <div className="equipment-assignments">
          {selectedTrucks.map((a) => (
            <TruckAssignmentCard
              key={a.id}
              activityId={activity.id}
              assignment={a}
              workZone={workZone}
              errors={errors}
            />
          ))}
          {selectedMachinery.map((a) => (
            <MachineryAssignmentCard
              key={a.id}
              activity={activity}
              assignment={a}
              workZone={workZone}
              errors={errors}
            />
          ))}
          {selectedTrucks.length > 0 && (
            <p className="activity-m3-total">
              <span>Total M³ actividad (camiones)</span>
              <strong>{formatMetric(activityTotalM3)} m³</strong>
            </p>
          )}
        </div>
      )}

      <div className="form-field support-equipment">
        <label className="field-label" htmlFor={supportId}>
          <span>
            Equipos de apoyo <span className="field-hint">(opcional)</span>
          </span>
        </label>
        <input
          id={supportId}
          type="text"
          placeholder="Ej: TYGB-99, VCCW73"
          value={activity.supportEquipment}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_ACTIVITY',
              activityId: activity.id,
              patch: { supportEquipment: e.target.value },
            })
          }
        />
      </div>
    </div>
  );
}
