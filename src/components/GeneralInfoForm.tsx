import { ClipboardList } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useReport } from '../context/ReportContext';
import { invalidFieldClass } from './fieldUtils';
import { SectionHeader } from './ui/SectionHeader';
import { ValidationMessage } from './ValidationMessage';
import type { FlatValidationErrors } from '../utils/validation';

interface GeneralInfoFormProps {
  errors: FlatValidationErrors;
}

export function GeneralInfoForm({ errors }: GeneralInfoFormProps) {
  const { config } = useConfig();
  const { report, dispatch } = useReport();

  return (
    <section className="report-section" id="sec-general" aria-labelledby="sec-general-title">
      <SectionHeader
        step={1}
        icon={ClipboardList}
        tone="cyan"
        title="Antecedentes generales"
        titleId="sec-general-title"
        description="Datos de identificación del turno y responsables."
      />
      <div className="panel">
        <div className="form-grid cols-4">
          <div className="form-field" data-field="general.date">
            <label className="field-label" htmlFor="report-date">
              <span>Fecha<span className="required">*</span></span>
            </label>
            <input
              id="report-date"
              type="date"
              className={invalidFieldClass(Boolean(errors['general.date']))}
              value={report.date}
              onChange={(e) => dispatch({ type: 'UPDATE_GENERAL_INFO', field: 'date', value: e.target.value })}
            />
            <ValidationMessage message={errors['general.date']} />
          </div>
          <div className="form-field" data-field="general.supervisor">
            <label className="field-label" htmlFor="report-supervisor">
              <span>Supervisor<span className="required">*</span></span>
            </label>
            <input
              id="report-supervisor"
              type="text"
              className={invalidFieldClass(Boolean(errors['general.supervisor']))}
              value={report.supervisor}
              onChange={(e) => dispatch({ type: 'UPDATE_GENERAL_INFO', field: 'supervisor', value: e.target.value })}
            />
            <ValidationMessage message={errors['general.supervisor']} />
          </div>
          <div className="form-field" data-field="general.area">
            <label className="field-label" htmlFor="report-area">
              <span>Área<span className="required">*</span></span>
            </label>
            <select
              id="report-area"
              className={invalidFieldClass(Boolean(errors['general.area']))}
              value={report.area}
              onChange={(e) => dispatch({ type: 'UPDATE_GENERAL_INFO', field: 'area', value: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {config.generalAreas.map((opt) => (
                <option key={opt.id} value={opt.name}>{opt.name}</option>
              ))}
            </select>
            <ValidationMessage message={errors['general.area']} />
          </div>
          <div className="form-field" data-field="general.apr">
            <label className="field-label" htmlFor="report-apr">
              <span>APR / Responsable<span className="required">*</span></span>
            </label>
            <input
              id="report-apr"
              type="text"
              className={invalidFieldClass(Boolean(errors['general.apr']))}
              value={report.apr}
              onChange={(e) => dispatch({ type: 'UPDATE_GENERAL_INFO', field: 'apr', value: e.target.value })}
            />
            <ValidationMessage message={errors['general.apr']} />
          </div>
        </div>
      </div>
    </section>
  );
}
