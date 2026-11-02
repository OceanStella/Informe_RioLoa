import {
  CircleAlert,
  CircleCheck,
  CircleX,
  ClipboardList,
  Droplets,
  Gauge,
  Hourglass,
  Layers,
  LayoutDashboard,
  Percent,
  Send,
  Truck,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '../components/ui/AppShell';
import { KpiStrip } from '../components/ui/KpiStrip';
import { SectionHeader } from '../components/ui/SectionHeader';
import { TopBar } from '../components/ui/TopBar';
import type { DashboardSummary } from '../types/reports';
import { formatMetric } from '../utils/calculations';
import { formatShortDate } from '../utils/dates';

const AXIS_TICK = { fontSize: 12, fill: 'var(--text-muted)' };
const GRID_STROKE = 'var(--border-subtle)';

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

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="panel chart-panel">
      <figcaption className="chart-title">{title}</figcaption>
      {children}
    </figure>
  );
}

function StatusDonut({ summary }: { summary: DashboardSummary }) {
  const { approved, inReview, rejected, sendFailed, reports } = summary.totals;
  const slices = [
    { label: 'Aprobado', value: approved, color: 'var(--rio-teal)' },
    { label: 'En revisión', value: inReview, color: 'var(--sand)' },
    { label: 'Rechazado', value: rejected, color: 'var(--coral)' },
    ...(sendFailed > 0 ? [{ label: 'Error de envío', value: sendFailed, color: 'var(--rio-cyan)' }] : []),
  ];

  return (
    <ChartPanel title="Estado de los informes">
      <div className="donut-layout">
        <div
          className="donut-chart"
          role="img"
          aria-label={`${approved} aprobados, ${inReview} en revisión, ${rejected} rechazados y ${sendFailed} con error de envío`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius={58}
                outerRadius={80}
                stroke="var(--surface)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices.map((slice) => (
                  <Cell key={slice.label} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip unit="informes" />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-total">
            <strong className="num">{reports}</strong>
            <span>informes</span>
          </div>
        </div>
        <ul className="chart-legend">
          {slices.map((slice) => (
            <li key={slice.label}>
              <span className="chart-legend-dot" style={{ background: slice.color }} aria-hidden="true" />
              <span>{slice.label}</span>
              <strong className="num">{slice.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </ChartPanel>
  );
}

function ReportsByDate({ summary }: { summary: DashboardSummary }) {
  const data = summary.byDate.map((row) => ({ ...row, label: formatShortDate(row.date) }));
  return (
    <ChartPanel title="Informes por fecha">
      <div role="img" aria-label="Cantidad de informes por fecha">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} minTickGap={24} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'var(--rio-teal-tint)' }} content={<ChartTooltip unit="informes" />} />
            <Bar dataKey="reports" fill="var(--rio-teal)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
}

function VolumeByDate({ summary }: { summary: DashboardSummary }) {
  const data = summary.byDate.map((row) => ({ ...row, label: formatShortDate(row.date) }));
  return (
    <ChartPanel title="M³ transportados por fecha">
      <div role="img" aria-label="Metros cúbicos transportados por fecha">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} minTickGap={24} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ stroke: 'var(--border-control)' }} content={<ChartTooltip unit="m³" />} />
            <Line
              type="monotone"
              dataKey="truckM3"
              stroke="var(--sand-strong)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--sand-strong)', stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
}

function EquipmentUsage({ summary }: { summary: DashboardSummary }) {
  const data = summary.equipmentUsage;
  return (
    <ChartPanel title="Uso de equipos (participaciones en actividades)">
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
              <Bar dataKey="participations" fill="var(--aqua-strong)" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard/summary', { credentials: 'include' });
        const payload = (await response.json()) as { ok?: boolean; summary?: DashboardSummary };
        if (!response.ok || !payload.ok || !payload.summary) throw new Error();
        setSummary(payload.summary);
      } catch {
        setError('No fue posible cargar el dashboard.');
      }
    };
    void load();
  }, []);

  const totals = summary?.totals;

  return (
    <AppShell>
      <div className="topbar-sticky">
        <TopBar
          eyebrow="Operaciones · Área de Pozas"
          title="Dashboard"
          actions={
            <Link to="/report" className="btn btn-primary topbar-generate">
              <Send size={15} aria-hidden="true" />
              <span>Generar informe</span>
            </Link>
          }
        />
      </div>

      <main className="app-main">
        {error && (
          <div className="global-alert" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            {error}
          </div>
        )}

        {!summary && !error && <p className="page-note">Cargando…</p>}

        {summary && totals && (
          <>
            <div className="dashboard-kpis">
              <KpiStrip
                items={[
                  { label: 'Total informes', value: String(totals.reports), icon: ClipboardList, tone: 'teal' },
                  { label: 'En revisión', value: String(totals.inReview), icon: Hourglass, tone: 'sand' },
                  { label: 'Aprobados', value: String(totals.approved), icon: CircleCheck, tone: 'aqua' },
                  { label: 'Rechazados', value: String(totals.rejected), icon: CircleX, tone: 'coral' },
                ]}
              />
              <KpiStrip
                items={[
                  {
                    label: 'M³ transportados',
                    value: formatMetric(totals.truckM3),
                    unit: 'm³',
                    sub: 'Camiones tolva',
                    icon: Truck,
                    tone: 'sand',
                  },
                  {
                    label: 'Actividades registradas',
                    value: String(totals.activities),
                    icon: Layers,
                    tone: 'teal',
                  },
                  {
                    label: 'Tasa de aprobación',
                    value: summary.approvalRate === null ? '—' : formatMetric(summary.approvalRate * 100, 1),
                    unit: summary.approvalRate === null ? undefined : '%',
                    sub: 'Aprobados / decididos',
                    icon: Percent,
                    tone: 'aqua',
                  },
                  {
                    label: 'Rendimiento Watermaster',
                    value:
                      summary.watermasterHourlyAverage === null ? '—' : formatMetric(summary.watermasterHourlyAverage),
                    unit: summary.watermasterHourlyAverage === null ? undefined : 'm³/h',
                    sub: 'Promedio horario',
                    icon: summary.watermasterHourlyAverage === null ? Droplets : Gauge,
                    tone: 'cyan',
                  },
                ]}
              />
            </div>

            <section className="report-section" aria-labelledby="dashboard-charts-title">
              <SectionHeader
                icon={LayoutDashboard}
                tone="teal"
                title="Evolución de la operación"
                titleId="dashboard-charts-title"
                description="Datos calculados de los informes registrados."
              />
              {totals.reports === 0 ? (
                <div className="panel">
                  <p className="empty-state">
                    Aún no hay informes registrados. Los gráficos aparecerán con el primer informe generado.
                  </p>
                </div>
              ) : (
                <div className="chart-grid">
                  <StatusDonut summary={summary} />
                  <ReportsByDate summary={summary} />
                  <VolumeByDate summary={summary} />
                  <EquipmentUsage summary={summary} />
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
