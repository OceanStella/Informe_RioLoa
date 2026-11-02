import { ArrowRight, CircleAlert, Copy, Plus, RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHead } from '../components/ui/PageHead';
import { ReportStatusChip } from '../components/ui/ReportStatusChip';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ChartsSkeleton, RecentReportsSkeleton, Skeleton } from '../components/ui/Skeletons';
import { useConfig } from '../context/ConfigContext';
import { useReport } from '../context/ReportContext';
import { REPORT_TYPES } from '../data/reportTypes';
import type { DashboardSummary, ReportListItem } from '../types/reports';
import { formatMetric } from '../utils/calculations';
import { formatShortDate } from '../utils/dates';
import { hasReportContent } from '../utils/reportDraft';
import { loadReportFromLast } from '../utils/reportSubmission';
import { pluralize } from '../utils/text';

const AXIS_TICK = { fontSize: 12, fill: 'var(--text-muted)' };
const GRID_STROKE = 'var(--border-subtle)';
const BAR_FILL = 'var(--rio-teal)';
const RECENT_REPORTS = 5;

function formatAmount(value: number, maxDecimals = 0): string {
  return value.toLocaleString('es-CL', { maximumFractionDigits: maxDecimals });
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { value?: number | string; name?: string; payload?: { label?: string } }[];
  unit: string;
}

function ChartTooltip({ active, label, payload, unit }: ChartTooltipProps) {
  const entry = payload?.[0];
  if (!active || !entry) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{entry.payload?.label ?? label}</p>
      <p className="num">
        {formatMetric(Number(entry.value))} {unit}
      </p>
    </div>
  );
}

interface ChartPanelProps {
  title: string;
  figure?: string;
  unit?: string;
  note?: string;
  hero?: boolean;
  children: ReactNode;
}

function ChartPanel({ title, figure, unit, note, hero, children }: ChartPanelProps) {
  return (
    <figure className={`panel chart-panel${hero ? ' is-hero' : ''}`}>
      <figcaption className="chart-head">
        <span className="chart-title">{title}</span>
        {figure && (
          <span className="chart-figure num">
            {figure}
            {unit && <small>{unit}</small>}
          </span>
        )}
        {note && <span className="chart-note">{note}</span>}
      </figcaption>
      {children}
    </figure>
  );
}

function StatusBreakdown({ summary }: { summary: DashboardSummary }) {
  const { approved, inReview, rejected, sendFailed, reports } = summary.totals;
  const rows = [
    { label: 'Aprobados', value: approved, color: 'var(--rio-teal)' },
    { label: 'En revisión', value: inReview, color: 'var(--sand)' },
    { label: 'Rechazados', value: rejected, color: 'var(--coral)' },
    ...(sendFailed > 0 ? [{ label: 'Error de envío', value: sendFailed, color: 'var(--rio-cyan)' }] : []),
  ];

  return (
    <ChartPanel
      title="Informes"
      figure={formatAmount(reports)}
      note={
        summary.approvalRate === null
          ? undefined
          : `${formatAmount(summary.approvalRate * 100, 1)} % de aprobación`
      }
    >
      <ul className="status-list">
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <span className="status-track" aria-hidden="true">
              <span style={{ width: `${(row.value / reports) * 100}%`, background: row.color }} />
            </span>
            <strong className="num">{formatAmount(row.value)}</strong>
          </li>
        ))}
      </ul>
    </ChartPanel>
  );
}

function VolumeByDate({ summary }: { summary: DashboardSummary }) {
  const data = summary.byDate.map((row) => ({ ...row, label: formatShortDate(row.date) }));
  const hourly = summary.watermasterHourlyAverage;
  return (
    <ChartPanel
      hero
      title="M³ transportados"
      figure={formatAmount(summary.totals.truckM3, 1)}
      unit="m³"
      note={
        hourly === null
          ? 'Camiones tolva'
          : `Camiones tolva · Watermaster ${formatAmount(hourly, 1)} m³/h en promedio`
      }
    >
      <div role="img" aria-label="Metros cúbicos transportados por fecha">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} minTickGap={24} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'var(--rio-teal-tint)' }} content={<ChartTooltip unit="m³" />} />
            <Bar dataKey="truckM3" fill={BAR_FILL} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
}

function ReportsByDate({ summary }: { summary: DashboardSummary }) {
  const data = summary.byDate.map((row) => ({ ...row, label: formatShortDate(row.date) }));
  return (
    <ChartPanel title="Informes por fecha" note={`${pluralize(summary.totals.activities, 'actividad registrada', 'actividades registradas')}`}>
      <div role="img" aria-label="Cantidad de informes por fecha">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} minTickGap={24} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'var(--rio-teal-tint)' }} content={<ChartTooltip unit="informes" />} />
            <Bar dataKey="reports" fill={BAR_FILL} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
}

function EquipmentUsage({ summary }: { summary: DashboardSummary }) {
  const data = summary.equipmentUsage;
  return (
    <ChartPanel hero title="Uso de equipos" note="Participaciones en actividades">
      {data.length === 0 ? (
        <p className="empty-state">Sin equipos asignados a actividades.</p>
      ) : (
        <div role="img" aria-label="Participaciones de cada equipo en actividades">
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="code" width={72} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'var(--rio-teal-tint)' }}
                content={<ChartTooltip unit="participaciones" />}
              />
              <Bar dataKey="participations" fill={BAR_FILL} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}

function CreateReport({ canStartFromLast }: { canStartFromLast: boolean | null }) {
  const { report, dispatch } = useReport();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDraft = hasReportContent(report);

  const startFromLast = async () => {
    setLoading(true);
    setError(null);
    try {
      dispatch({ type: 'LOAD_REPORT', report: await loadReportFromLast(config) });
      navigate('/report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar el último informe.');
      setLoading(false);
    }
  };

  const discardDraft = () => {
    if (!window.confirm('¿Descartar el borrador y empezar un informe nuevo?')) return;
    dispatch({ type: 'RESET_REPORT' });
    navigate('/report');
  };

  return (
    <section className="panel create-panel" aria-labelledby="create-title">
      <h2 className="panel-title" id="create-title">Crear informe</h2>
      <ul className="create-list">
        {REPORT_TYPES.map((type) => (
          <li key={type.id} className="create-row">
            <div className="create-copy">
              <h3>{type.name}</h3>
              {hasDraft ? (
                <p>
                  {report.revisedFrom ? 'Corrección' : 'Borrador'} sin enviar del {formatShortDate(report.date)} ·{' '}
                  {pluralize(report.roster.length, 'equipo', 'equipos')} ·{' '}
                  {pluralize(report.activities.length, 'actividad', 'actividades')}
                </p>
              ) : (
                <p>{type.description}</p>
              )}
            </div>
            <div className="create-actions">
              {hasDraft ? (
                <>
                  <Link to={type.path} className="btn btn-primary">
                    <ArrowRight size={16} aria-hidden="true" />
                    Continuar
                  </Link>
                  <button type="button" className="btn btn-secondary" onClick={discardDraft}>
                    <RotateCcw size={15} aria-hidden="true" />
                    Empezar de cero
                  </button>
                </>
              ) : (
                <>
                  <Link to={type.path} className="btn btn-primary">
                    <Plus size={16} aria-hidden="true" />
                    Nuevo informe
                  </Link>
                  {canStartFromLast === null && <Skeleton width={160} height={40} />}
                  {canStartFromLast && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void startFromLast()}
                      disabled={loading}
                      title="Copia supervisor y dotación, y abre cada horómetro donde cerró el último informe"
                    >
                      <Copy size={15} aria-hidden="true" />
                      {loading ? 'Cargando…' : 'Partir del último'}
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <div className="global-alert" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          {error}
        </div>
      )}
    </section>
  );
}

function RecentReports({ reports, failed }: { reports: ReportListItem[] | null; failed: boolean }) {
  const pending = reports?.filter((report) => report.status === 'SEND_FAILED' || report.canEdit).length ?? 0;

  return (
    <section className="panel recent-panel" aria-labelledby="recent-title">
      <div className="panel-head">
        <h2 className="panel-title" id="recent-title">Últimos informes</h2>
        <Link to="/history" className="panel-link">Ver historial</Link>
      </div>
      {pending > 0 && (
        <Link to="/history" className="recent-pending">
          <TriangleAlert size={14} aria-hidden="true" />
          {pending} por corregir o reenviar
        </Link>
      )}
      {failed && <p className="empty-state">No fue posible cargar los últimos informes.</p>}
      {!reports && !failed && <RecentReportsSkeleton />}
      {reports?.length === 0 && <p className="empty-state">Aún no hay informes.</p>}
      {reports && reports.length > 0 && (
        <ul className="recent-list">
          {reports.map((report) => (
            <li key={report.id}>
              <a className="recent-row" href={`/api/reports/${report.id}/pdf`} target="_blank" rel="noreferrer">
                <span className="recent-date num">{formatShortDate(report.reportDate)}</span>
                <span className="recent-who">{report.supervisor}</span>
                <ReportStatusChip status={report.status} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<ReportListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentFailed, setRecentFailed] = useState(false);

  // Each block loads on its own: a failing chart must not leave the recent reports loading forever.
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch('/api/dashboard/summary', { credentials: 'include' });
        const payload = (await response.json()) as { ok?: boolean; summary?: DashboardSummary };
        if (!payload.ok || !payload.summary) throw new Error();
        setSummary(payload.summary);
      } catch {
        setError('No fue posible cargar los gráficos del dashboard.');
      }
    };
    const loadRecent = async () => {
      try {
        const response = await fetch(`/api/reports?limit=${RECENT_REPORTS}`, { credentials: 'include' });
        const payload = (await response.json()) as { ok?: boolean; reports?: ReportListItem[] };
        if (!payload.ok || !payload.reports) throw new Error();
        setRecent(payload.reports);
      } catch {
        setRecentFailed(true);
      }
    };
    void loadSummary();
    void loadRecent();
  }, []);

  // Null until known, so the button does not pop in beside "Nuevo informe".
  const canStartFromLast = recentFailed
    ? false
    : (recent?.some((report) => report.status === 'IN_REVIEW' || report.status === 'APPROVED') ?? null);

  return (
    <main className="app-main">
        <PageHead title="Dashboard" />

        {error && (
          <div className="global-alert" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="dashboard-top">
          <CreateReport canStartFromLast={canStartFromLast} />
          <RecentReports reports={recent} failed={recentFailed} />
        </div>

        {!summary && !error && <ChartsSkeleton />}

        {summary && (
          <section className="report-section" aria-labelledby="dashboard-charts-title">
            <SectionHeader title="Evolución de la operación" titleId="dashboard-charts-title" />
            {summary.totals.reports === 0 ? (
              <div className="panel">
                <p className="empty-state">Los gráficos aparecerán con el primer informe generado.</p>
              </div>
            ) : (
              <div className="chart-grid">
                <VolumeByDate summary={summary} />
                <StatusBreakdown summary={summary} />
                <ReportsByDate summary={summary} />
                <EquipmentUsage summary={summary} />
              </div>
            )}
          </section>
        )}
    </main>
  );
}
