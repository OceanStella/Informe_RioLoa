import { Check } from 'lucide-react';
import {
  HARDNESS_OPTIONS,
  WATERMASTER_DEPTH_OPTIONS,
  formatDepthLabel,
} from '../data/constants';
import { useReport } from '../context/ReportContext';
import {
  formatMetric,
  getWatermasterEffectiveHours,
  getWatermasterHourlyPerformance,
  getWatermasterPumpHours,
  getWatermasterTotalM3,
} from '../utils/calculations';
import type { FlatValidationErrors } from '../utils/validation';
import { ComputedField } from './ComputedField';
import { invalidFieldClass } from './fieldUtils';
import { Select } from './ui/Select';
import { ValidationMessage } from './ValidationMessage';

interface WatermasterSectionProps {
  activityId: string;
  errors: FlatValidationErrors;
}

export function WatermasterSection({ activityId, errors }: WatermasterSectionProps) {
  const { report, dispatch } = useReport();
  const activity = report.activities.find((a) => a.id === activityId);
  const wm = activity?.watermaster;
  if (!wm) return null;

  const prefix = `activity.${activityId}.wm`;
  const effectiveHours = getWatermasterEffectiveHours(wm);
  const pumpHours = getWatermasterPumpHours(wm);
  const totalM3 = getWatermasterTotalM3(wm);
  const hourlyPerf = getWatermasterHourlyPerformance(wm);
  const hardnessError = errors[`${prefix}.hardness`];
  const fieldId = (field: string) => `${prefix}-${field}`;

  return (
    <div className="subsection watermaster-block">
      <div className="subsection-header">
        <h4 className="subsection-title">Draga Watermaster</h4>
      </div>
      <div className="form-grid cols-3">
        <div className="form-field" data-field={`${prefix}.sector`}>
          <label className="field-label" htmlFor={fieldId('sector')}>Poza / Sector Draga</label>
          <input
            id={fieldId('sector')}
            type="text"
            className={invalidFieldClass(Boolean(errors[`${prefix}.sector`]))}
            value={wm.sector}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_WATERMASTER', activityId, field: 'sector', value: e.target.value })
            }
          />
          <ValidationMessage message={errors[`${prefix}.sector`]} />
        </div>
        <div className="form-field" data-field={`${prefix}.operator`}>
          <label className="field-label" htmlFor={fieldId('operator')}>Operador</label>
          <input
            id={fieldId('operator')}
            type="text"
            className={invalidFieldClass(Boolean(errors[`${prefix}.operator`]))}
            value={wm.operator}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_WATERMASTER', activityId, field: 'operator', value: e.target.value })
            }
          />
          <ValidationMessage message={errors[`${prefix}.operator`]} />
        </div>
        <div className="form-field" data-field={`${prefix}.depth`}>
          <label className="field-label" htmlFor={fieldId('depth')}>Profundidad de Triturado (m)</label>
          <Select
            id={fieldId('depth')}
            invalid={Boolean(errors[`${prefix}.depth`])}
            value={wm.depth === null ? '' : String(wm.depth)}
            options={WATERMASTER_DEPTH_OPTIONS.map((d) => ({ value: String(d), label: formatDepthLabel(d) }))}
            onChange={(value) =>
              dispatch({
                type: 'UPDATE_WATERMASTER',
                activityId,
                field: 'depth',
                value: value === '' ? null : Number(value),
              })
            }
          />
          <ValidationMessage message={errors[`${prefix}.depth`]} />
        </div>

        <div className="form-row-triple">
          <div className="form-field" data-field={`${prefix}.hourmeterStart`}>
            <label className="field-label" htmlFor={fieldId('hourmeterStart')}>Horómetro Inicial Draga</label>
            <input
              id={fieldId('hourmeterStart')}
              type="number"
              step="any"
              className={invalidFieldClass(Boolean(errors[`${prefix}.hourmeterStart`]))}
              value={wm.hourmeterStart}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_WATERMASTER', activityId, field: 'hourmeterStart', value: e.target.value })
              }
            />
            <ValidationMessage message={errors[`${prefix}.hourmeterStart`]} />
          </div>
          <div className="form-field" data-field={`${prefix}.hourmeterEnd`}>
            <label className="field-label" htmlFor={fieldId('hourmeterEnd')}>Horómetro Final Draga</label>
            <input
              id={fieldId('hourmeterEnd')}
              type="number"
              step="any"
              className={invalidFieldClass(Boolean(errors[`${prefix}.hourmeterEnd`]))}
              value={wm.hourmeterEnd}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_WATERMASTER', activityId, field: 'hourmeterEnd', value: e.target.value })
              }
            />
            <ValidationMessage message={errors[`${prefix}.hourmeterEnd`]} />
          </div>
          <ComputedField label="Horas efectivas" displayValue={`${formatMetric(effectiveHours)} h`} />
        </div>

        <div className="form-row-triple">
          <div className="form-field" data-field={`${prefix}.pumpHourmeterStart`}>
            <label className="field-label" htmlFor={fieldId('pumpHourmeterStart')}>Horómetro Inicial Bomba</label>
            <input
              id={fieldId('pumpHourmeterStart')}
              type="number"
              step="any"
              className={invalidFieldClass(Boolean(errors[`${prefix}.pumpHourmeterStart`]))}
              value={wm.pumpHourmeterStart}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_WATERMASTER', activityId, field: 'pumpHourmeterStart', value: e.target.value })
              }
            />
            <ValidationMessage message={errors[`${prefix}.pumpHourmeterStart`]} />
          </div>
          <div className="form-field" data-field={`${prefix}.pumpHourmeterEnd`}>
            <label className="field-label" htmlFor={fieldId('pumpHourmeterEnd')}>Horómetro Final Bomba</label>
            <input
              id={fieldId('pumpHourmeterEnd')}
              type="number"
              step="any"
              className={invalidFieldClass(Boolean(errors[`${prefix}.pumpHourmeterEnd`]))}
              value={wm.pumpHourmeterEnd}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_WATERMASTER', activityId, field: 'pumpHourmeterEnd', value: e.target.value })
              }
            />
            <ValidationMessage message={errors[`${prefix}.pumpHourmeterEnd`]} />
          </div>
          <ComputedField label="Horas bomba" displayValue={`${formatMetric(pumpHours)} h`} />
        </div>

        <div className="form-field full-width" data-field={`${prefix}.hardness`}>
          <span className="field-label" id={fieldId('hardness')}>Dureza del Material</span>
          <div
            className={`hardness-grid${hardnessError ? ' field-invalid-group' : ''}`}
            role="group"
            aria-labelledby={fieldId('hardness')}
          >
            {HARDNESS_OPTIONS.map((opt) => {
              const selected = wm.hardness === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`hardness-btn ${opt.className}${selected ? ' selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() =>
                    dispatch({ type: 'UPDATE_WATERMASTER', activityId, field: 'hardness', value: opt.value })
                  }
                >
                  {opt.label}
                  {selected && <Check size={16} className="hardness-check" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <ValidationMessage message={hardnessError} />
        </div>

        <div className="form-row-triple">
          <div className="form-field" data-field={`${prefix}.manufacturerPerformance`}>
            <label className="field-label" htmlFor={fieldId('manufacturerPerformance')}>
              Rendimiento según fabricante (m³/h)
            </label>
            <input
              id={fieldId('manufacturerPerformance')}
              type="number"
              step="any"
              className={invalidFieldClass(Boolean(errors[`${prefix}.manufacturerPerformance`]))}
              value={wm.manufacturerPerformance}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_WATERMASTER',
                  activityId,
                  field: 'manufacturerPerformance',
                  value: e.target.value,
                })
              }
            />
            <ValidationMessage message={errors[`${prefix}.manufacturerPerformance`]} />
          </div>
          <ComputedField label="Total M³ / Volumen removido" displayValue={`${formatMetric(totalM3)} m³`} highlight />
          <ComputedField label="Rendimiento horario real" displayValue={`${formatMetric(hourlyPerf)} m³/h`} />
        </div>
      </div>
    </div>
  );
}
