import { Trash2 } from 'lucide-react';
import { ACTIVITY_TYPE_OPTIONS } from '../data/constants';
import { useConfig } from '../context/ConfigContext';
import { useReport } from '../context/ReportContext';
import type { Activity } from '../types/report';
import { getActivityEquipmentCodes, resolveActivityArea, resolveActivityType } from '../utils/calculations';
import type { FlatValidationErrors } from '../utils/validation';
import { EquipmentSelector } from './EquipmentSelector';
import { invalidFieldClass } from './fieldUtils';
import { PhotoInput } from './PhotoInput';
import { CollapseToggle } from './ui/CollapseToggle';
import { ValidationMessage } from './ValidationMessage';
import { WatermasterSection } from './WatermasterSection';

interface ActivityCardProps {
  activity: Activity;
  index: number;
  errors: FlatValidationErrors;
  canDelete: boolean;
}

export function ActivityCard({ activity, index, errors, canDelete }: ActivityCardProps) {
  const { config } = useConfig();
  const { dispatch } = useReport();
  const prefix = `activity.${activity.id}`;
  const visualNumber = index + 1;
  const areaLabel = resolveActivityArea(activity);
  const typeLabel = resolveActivityType(activity);
  const equipmentCount = activity.equipmentAssignments.length;
  const fieldId = (field: string) => `activity-${activity.id}-${field}`;
  const hasErrors = Object.keys(errors).some((key) => key.startsWith(`${prefix}.`));

  const handleRemove = () => {
    const ok = window.confirm(
      '¿Seguro que deseas eliminar esta actividad? Se perderán todos sus datos.',
    );
    if (ok) dispatch({ type: 'REMOVE_ACTIVITY', activityId: activity.id });
  };

  const header = (
    <header className="activity-header">
      <div className="activity-heading">
        <span className="activity-index" aria-hidden="true">
          {String(visualNumber).padStart(2, '0')}
        </span>
        <div>
          <h3 className="activity-title">
            Actividad {visualNumber}
            {activity.kind === 'watermaster' && <span className="tag">Watermaster</span>}
            {hasErrors && <span className="tag tag-danger">Con errores</span>}
          </h3>
          <p className="activity-meta">
            {areaLabel ? (
              <span className="activity-meta-value">{areaLabel}</span>
            ) : (
              <span className="activity-meta-empty">Sin poza / área</span>
            )}
            <span className="activity-meta-sep" aria-hidden="true">·</span>
            {typeLabel ? (
              <span className="activity-meta-value">{typeLabel}</span>
            ) : (
              <span className="activity-meta-empty">Sin tipo</span>
            )}
            <span className="activity-meta-sep" aria-hidden="true">·</span>
            <span className="num">{equipmentCount} equipos seleccionados</span>
          </p>
        </div>
      </div>
      <div className="activity-actions">
        <CollapseToggle
          collapsed={activity.collapsed}
          subject={`actividad ${visualNumber}`}
          onToggle={() => dispatch({ type: 'TOGGLE_ACTIVITY', activityId: activity.id })}
        />
        {canDelete && (
          <button
            type="button"
            className="btn btn-danger-ghost btn-sm"
            onClick={handleRemove}
            aria-label={`Eliminar actividad ${visualNumber}`}
          >
            <Trash2 size={15} aria-hidden="true" />
            <span className="collapse-toggle-label">Eliminar</span>
          </button>
        )}
      </div>
    </header>
  );

  if (activity.collapsed) {
    return (
      <article className="activity-card collapsed" id={`activity-${activity.id}`}>
        {header}
      </article>
    );
  }

  return (
    <article className="activity-card" id={`activity-${activity.id}`}>
      {header}

      <div className="activity-body">
        <div className="subsection">
          <div className="subsection-header">
            <h4 className="subsection-title">Datos de la actividad</h4>
          </div>
          <div className="form-grid">
            <div className="form-field" data-field={`${prefix}.area`}>
              <label className="field-label" htmlFor={fieldId('area')}>Poza / Área</label>
              <select
                id={fieldId('area')}
                className={invalidFieldClass(Boolean(errors[`${prefix}.area`]))}
                value={activity.area}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_ACTIVITY',
                    activityId: activity.id,
                    patch: { area: e.target.value },
                  })
                }
              >
                <option value="">Seleccionar...</option>
                {config.activityAreas.map((opt) => (
                  <option key={opt.id} value={opt.name}>{opt.name}</option>
                ))}
              </select>
              <ValidationMessage message={errors[`${prefix}.area`]} />
            </div>

            {activity.area === 'Otro' && (
              <div className="form-field" data-field={`${prefix}.customArea`}>
                <label className="field-label" htmlFor={fieldId('customArea')}>Indicar poza / área</label>
                <input
                  id={fieldId('customArea')}
                  type="text"
                  className={invalidFieldClass(Boolean(errors[`${prefix}.customArea`]))}
                  value={activity.customArea ?? ''}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_ACTIVITY',
                      activityId: activity.id,
                      patch: { customArea: e.target.value },
                    })
                  }
                />
                <ValidationMessage message={errors[`${prefix}.customArea`]} />
              </div>
            )}

            <div className="form-field" data-field={`${prefix}.type`}>
              <label className="field-label" htmlFor={fieldId('type')}>Tipo de actividad</label>
              {activity.kind === 'watermaster' ? (
                <input id={fieldId('type')} type="text" value="Draga Watermaster" readOnly className="readonly-input" />
              ) : (
                <>
                  <select
                    id={fieldId('type')}
                    className={invalidFieldClass(Boolean(errors[`${prefix}.type`]))}
                    value={activity.type}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_ACTIVITY',
                        activityId: activity.id,
                        patch: { type: e.target.value },
                      })
                    }
                  >
                    <option value="">Seleccionar...</option>
                    {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ValidationMessage message={errors[`${prefix}.type`]} />
                </>
              )}
            </div>

            {activity.kind === 'generic' && activity.type === 'Otro' && (
              <div className="form-field" data-field={`${prefix}.customType`}>
                <label className="field-label" htmlFor={fieldId('customType')}>Tipo personalizado</label>
                <input
                  id={fieldId('customType')}
                  type="text"
                  className={invalidFieldClass(Boolean(errors[`${prefix}.customType`]))}
                  value={activity.customType ?? ''}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_ACTIVITY',
                      activityId: activity.id,
                      patch: { customType: e.target.value },
                    })
                  }
                />
                <ValidationMessage message={errors[`${prefix}.customType`]} />
              </div>
            )}

            <div className="form-field full-width" data-field={`${prefix}.description`}>
              <label className="field-label" htmlFor={fieldId('description')}>Descripción detallada</label>
              <textarea
                id={fieldId('description')}
                rows={4}
                className={invalidFieldClass(Boolean(errors[`${prefix}.description`]))}
                value={activity.description}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_ACTIVITY',
                    activityId: activity.id,
                    patch: { description: e.target.value },
                  })
                }
              />
              <ValidationMessage message={errors[`${prefix}.description`]} />
            </div>
          </div>
        </div>

        {activity.kind === 'watermaster' && (
          <WatermasterSection activityId={activity.id} errors={errors} />
        )}

        <EquipmentSelector activity={activity} errors={errors} />

        <div className="subsection">
          <div className="subsection-header">
            <h4 className="subsection-title">Registro fotográfico</h4>
          </div>
          <div className="photos-row">
            <PhotoInput
              activityId={activity.id}
              which="before"
              label="Foto antes (opcional)"
              photo={activity.beforePhoto}
            />
            <PhotoInput
              activityId={activity.id}
              which="after"
              label="Foto después (opcional)"
              photo={activity.afterPhoto}
            />
          </div>
        </div>

        {equipmentCount > 0 && (
          <p className="activity-footer-note">
            <strong>Equipos:</strong> {getActivityEquipmentCodes(activity).join(', ')}
          </p>
        )}
      </div>
    </article>
  );
}
