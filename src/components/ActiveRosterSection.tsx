import { Tractor, Truck } from 'lucide-react';
import { getMachinery, getTrucks } from '../data/equipment';
import { useConfig } from '../context/ConfigContext';
import { useReport } from '../context/ReportContext';
import {
  calculateTruckKm,
  calculateTruckOperationHours,
  formatMetric,
} from '../utils/calculations';
import {
  formatRosterTooltip,
  hasRosterOperationalData,
  isRosterReady,
} from '../utils/roster';
import type { FlatValidationErrors } from '../utils/validation';
import { ComputedField } from './ComputedField';
import { invalidFieldClass } from './fieldUtils';
import { CollapseToggle } from './ui/CollapseToggle';
import { EquipmentOption } from './ui/EquipmentOption';
import { SectionHeader } from './ui/SectionHeader';
import { StatusChip } from './ui/StatusChip';
import { ValidationMessage } from './ValidationMessage';

interface ActiveRosterSectionProps {
  errors: FlatValidationErrors;
}

export function ActiveRosterSection({ errors }: ActiveRosterSectionProps) {
  const { config } = useConfig();
  const { report, dispatch } = useReport();
  const trucks = getTrucks(config);
  const machinery = getMachinery(config);
  const selectedIds = new Set(report.roster.map((item) => item.equipmentId));
  const selectedTruckCount = trucks.filter((eq) => selectedIds.has(eq.id)).length;
  const selectedMachineryCount = machinery.filter((eq) => selectedIds.has(eq.id)).length;
  const readyCount = report.roster.filter((item) => isRosterReady(item)).length;

  const toggleEquipment = (
    equipmentId: string,
    code: string,
    type: 'truck' | 'machinery',
    checked: boolean,
  ) => {
    if (checked) {
      dispatch({ type: 'SELECT_ROSTER_EQUIPMENT', equipmentId, equipmentCode: code, equipmentType: type });
      return;
    }
    const current = report.roster.find((item) => item.equipmentId === equipmentId);
    if (current && hasRosterOperationalData(current)) {
      const ok = window.confirm(
        `¿Quitar ${code} de Dotación activa? Se perderá la reutilización automática en las actividades.`,
      );
      if (!ok) return;
    }
    dispatch({ type: 'UNSELECT_ROSTER_EQUIPMENT', equipmentId });
  };

  return (
    <section className="report-section" id="sec-roster" aria-labelledby="sec-roster-title">
      <SectionHeader
        title="Dotación activa"
        titleId="sec-roster-title"
        description="Completa aquí cada equipo una sola vez. Las actividades reutilizan estos datos."
      />
      <div className="panel">
        <div className="equipment-picker">
          <div>
            <div className="equipment-group-header">
              <p className="equipment-category">
                <Truck size={15} aria-hidden="true" />
                Camiones Tolva
              </p>
              <span className="equipment-group-count">
                {selectedTruckCount} de {trucks.length} seleccionados
              </span>
            </div>
            <ul className="equipment-checklist">
              {trucks.map((eq) => {
                const rosterItem = report.roster.find((item) => item.equipmentId === eq.id);
                const ready = rosterItem ? isRosterReady(rosterItem) : false;
                return (
                  <EquipmentOption
                    key={eq.id}
                    code={eq.code}
                    checked={selectedIds.has(eq.id)}
                    onChange={(checked) => toggleEquipment(eq.id, eq.code, 'truck', checked)}
                    readyTooltip={ready && rosterItem ? formatRosterTooltip(rosterItem) : undefined}
                  />
                );
              })}
            </ul>
          </div>
          <div>
            <div className="equipment-group-header">
              <p className="equipment-category">
                <Tractor size={15} aria-hidden="true" />
                Maquinaria
              </p>
              <span className="equipment-group-count">
                {selectedMachineryCount} de {machinery.length} seleccionados
              </span>
            </div>
            <ul className="equipment-checklist">
              {machinery.map((eq) => {
                const rosterItem = report.roster.find((item) => item.equipmentId === eq.id);
                const ready = rosterItem ? isRosterReady(rosterItem) : false;
                return (
                  <EquipmentOption
                    key={eq.id}
                    code={eq.code}
                    checked={selectedIds.has(eq.id)}
                    onChange={(checked) => toggleEquipment(eq.id, eq.code, 'machinery', checked)}
                    readyTooltip={ready && rosterItem ? formatRosterTooltip(rosterItem) : undefined}
                  />
                );
              })}
            </ul>
          </div>
        </div>

        {report.roster.length === 0 ? (
          <p className="empty-state">
            Aún no hay equipos en la dotación. Marca los camiones y la maquinaria que operan en el turno para
            completar sus datos.
          </p>
        ) : (
          <div className="equipment-assignments">
            <div className="equipment-assignments-header">
              <h3 className="equipment-assignments-title">Fichas de equipo</h3>
              <span className="equipment-group-count">
                {readyCount} de {report.roster.length} completas
              </span>
            </div>
            {report.roster.map((item) => {
              const prefix = `roster.${item.equipmentId}`;
              const opHours = calculateTruckOperationHours(item.hourmeterStart, item.hourmeterEnd);
              const km = item.equipmentType === 'truck'
                ? calculateTruckKm(item.kmStart ?? '', item.kmEnd ?? '')
                : null;
              const ready = isRosterReady(item);
              const hasError = Object.keys(errors).some((key) => key.startsWith(`${prefix}.`));
              const fieldId = (field: string) => `roster-${item.equipmentId}-${field}`;

              return (
                <div
                  key={item.equipmentId}
                  className={`equipment-card${item.collapsed ? ' is-collapsed' : ''}`}
                  id={`roster-${item.equipmentId}`}
                >
                  <div className="equipment-card-header">
                    <div className="equipment-card-heading">
                      <span className="equipment-card-code">{item.equipmentCode}</span>
                      <span className="equipment-card-type">
                        {item.equipmentType === 'truck' ? 'Camión tolva' : 'Maquinaria'}
                      </span>
                      {hasError ? (
                        <StatusChip status="error" label="Revisar datos" />
                      ) : ready ? (
                        <StatusChip status="ready" label="Completo" />
                      ) : (
                        <StatusChip status="pending" label="Pendiente" />
                      )}
                      {item.collapsed && (
                        <span className="equipment-card-summary">
                          Operador: <strong>{item.operator || '—'}</strong>
                        </span>
                      )}
                    </div>
                    <CollapseToggle
                      collapsed={item.collapsed}
                      subject={item.equipmentCode}
                      onToggle={() => dispatch({ type: 'TOGGLE_ROSTER', equipmentId: item.equipmentId })}
                    />
                  </div>

                  {!item.collapsed && (
                    <div className="equipment-card-body">
                      <div className="form-grid cols-3">
                        <div className="form-field" data-field={`${prefix}.operator`}>
                          <label className="field-label" htmlFor={fieldId('operator')}>Operador</label>
                          <input
                            id={fieldId('operator')}
                            type="text"
                            className={invalidFieldClass(Boolean(errors[`${prefix}.operator`]))}
                            value={item.operator}
                            onChange={(e) =>
                              dispatch({
                                type: 'UPDATE_ROSTER',
                                equipmentId: item.equipmentId,
                                field: 'operator',
                                value: e.target.value,
                              })
                            }
                          />
                          <ValidationMessage message={errors[`${prefix}.operator`]} />
                        </div>
                        <div className="form-row-triple">
                          <div className="form-field" data-field={`${prefix}.hourmeterStart`}>
                            <label className="field-label" htmlFor={fieldId('hourmeterStart')}>Horómetro Inicial</label>
                            <input
                              id={fieldId('hourmeterStart')}
                              type="number"
                              step="any"
                              className={invalidFieldClass(Boolean(errors[`${prefix}.hourmeterStart`]))}
                              value={item.hourmeterStart}
                              onChange={(e) =>
                                dispatch({
                                  type: 'UPDATE_ROSTER',
                                  equipmentId: item.equipmentId,
                                  field: 'hourmeterStart',
                                  value: e.target.value,
                                })
                              }
                            />
                            <ValidationMessage message={errors[`${prefix}.hourmeterStart`]} />
                          </div>
                          <div className="form-field" data-field={`${prefix}.hourmeterEnd`}>
                            <label className="field-label" htmlFor={fieldId('hourmeterEnd')}>Horómetro Final</label>
                            <input
                              id={fieldId('hourmeterEnd')}
                              type="number"
                              step="any"
                              className={invalidFieldClass(Boolean(errors[`${prefix}.hourmeterEnd`]))}
                              value={item.hourmeterEnd}
                              onChange={(e) =>
                                dispatch({
                                  type: 'UPDATE_ROSTER',
                                  equipmentId: item.equipmentId,
                                  field: 'hourmeterEnd',
                                  value: e.target.value,
                                })
                              }
                            />
                            <ValidationMessage message={errors[`${prefix}.hourmeterEnd`]} />
                          </div>
                          <ComputedField label="Horas de operación" displayValue={`${formatMetric(opHours)} h`} />
                        </div>
                        {item.equipmentType === 'truck' && (
                          <div className="form-row-triple">
                            <div className="form-field" data-field={`${prefix}.kmStart`}>
                              <label className="field-label" htmlFor={fieldId('kmStart')}>KM Inicial</label>
                              <input
                                id={fieldId('kmStart')}
                                type="number"
                                step="any"
                                className={invalidFieldClass(Boolean(errors[`${prefix}.kmStart`]))}
                                value={item.kmStart ?? ''}
                                onChange={(e) =>
                                  dispatch({
                                    type: 'UPDATE_ROSTER',
                                    equipmentId: item.equipmentId,
                                    field: 'kmStart',
                                    value: e.target.value,
                                  })
                                }
                              />
                              <ValidationMessage message={errors[`${prefix}.kmStart`]} />
                            </div>
                            <div className="form-field" data-field={`${prefix}.kmEnd`}>
                              <label className="field-label" htmlFor={fieldId('kmEnd')}>KM Final</label>
                              <input
                                id={fieldId('kmEnd')}
                                type="number"
                                step="any"
                                className={invalidFieldClass(Boolean(errors[`${prefix}.kmEnd`]))}
                                value={item.kmEnd ?? ''}
                                onChange={(e) =>
                                  dispatch({
                                    type: 'UPDATE_ROSTER',
                                    equipmentId: item.equipmentId,
                                    field: 'kmEnd',
                                    value: e.target.value,
                                  })
                                }
                              />
                              <ValidationMessage message={errors[`${prefix}.kmEnd`]} />
                            </div>
                            <ComputedField label="KM recorridos" displayValue={`${formatMetric(km)} km`} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
