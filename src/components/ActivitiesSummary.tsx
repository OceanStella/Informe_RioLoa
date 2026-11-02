import { TableProperties } from 'lucide-react';
import { useState } from 'react';
import { useReport } from '../context/ReportContext';
import { getActivityEquipmentCodes, resolveActivityArea, resolveActivityType } from '../utils/calculations';
import { CollapseToggle } from './ui/CollapseToggle';
import { SectionHeader } from './ui/SectionHeader';

export function ActivitiesSummary() {
  const { report } = useReport();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="report-section summary-card" id="sec-summary" aria-labelledby="sec-summary-title">
      <SectionHeader
        step={4}
        icon={TableProperties}
        tone="sand"
        title="Resumen de Actividades"
        titleId="sec-summary-title"
        description="Revisa las actividades registradas antes de generar el informe."
        actions={
          <CollapseToggle
            collapsed={collapsed}
            subject="resumen"
            onToggle={() => setCollapsed((c) => !c)}
          />
        }
      />
      {!collapsed && (
        <div className="panel panel-flush">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-index">#</th>
                  <th>Poza/Área</th>
                  <th>Tipo Actividad</th>
                  <th>Descripción</th>
                  <th>Equipos</th>
                </tr>
              </thead>
              <tbody>
                {report.activities.map((activity, index) => {
                  const area = resolveActivityArea(activity);
                  const type = resolveActivityType(activity);
                  const codes = getActivityEquipmentCodes(activity);
                  return (
                    <tr key={activity.id}>
                      <td className="col-index">{index + 1}</td>
                      <td className={area ? undefined : 'is-empty'}>{area || '—'}</td>
                      <td className={type ? undefined : 'is-empty'}>{type || '—'}</td>
                      <td className={`col-description${activity.description ? '' : ' is-empty'}`}>
                        {activity.description || '—'}
                      </td>
                      <td className={codes.length ? undefined : 'is-empty'}>
                        {codes.length ? (
                          <span className="equipment-codes">
                            {codes.map((code, i) => (
                              <span key={`${code}-${i}`} className="code-token">{code}</span>
                            ))}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
