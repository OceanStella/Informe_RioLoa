import { CircleAlert, CircleCheck, Download, Eye, History, MessageSquare, Pencil, Plus, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommentModal, EditRejectedModal, ResendReportModal } from '../components/HistoryModals';
import { AppShell } from '../components/ui/AppShell';
import { ReportStatusChip } from '../components/ui/ReportStatusChip';
import { SectionHeader } from '../components/ui/SectionHeader';
import { TopBar } from '../components/ui/TopBar';
import { useReport } from '../context/ReportContext';
import type { ReportListItem } from '../types/reports';
import { formatMetric } from '../utils/calculations';
import { formatShortDate } from '../utils/dates';
import { loadRejectedReport } from '../utils/reportSubmission';

const PAGE_SIZE = 25;

interface ReportHandlers {
  onResend: (report: ReportListItem) => void;
  onEdit: (report: ReportListItem) => void;
  onShowComment: (report: ReportListItem) => void;
}

function ReportActions({ report, onResend, onEdit }: { report: ReportListItem } & Omit<ReportHandlers, 'onShowComment'>) {
  return (
    <div className="table-actions">
      <a className="btn btn-ghost btn-sm" href={`/api/reports/${report.id}/pdf`} target="_blank" rel="noreferrer">
        <Eye size={14} aria-hidden="true" />
        Vista previa
      </a>
      <a className="btn btn-ghost btn-sm" href={`/api/reports/${report.id}/pdf?download=true`}>
        <Download size={14} aria-hidden="true" />
        Descargar
      </a>
      {report.status === 'SEND_FAILED' && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onResend(report)}>
          <Send size={14} aria-hidden="true" />
          Reenviar
        </button>
      )}
      {report.status === 'REJECTED' && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onEdit(report)}
          disabled={!report.canEdit}
          title={report.canEdit ? undefined : 'Este informe se generó antes de que se guardaran sus datos.'}
        >
          <Pencil size={14} aria-hidden="true" />
          Volver a editar
        </button>
      )}
    </div>
  );
}

function CommentCell({ report, onShowComment }: { report: ReportListItem; onShowComment: ReportHandlers['onShowComment'] }) {
  if (!report.rejectionComment) return <span className="is-empty">—</span>;
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onShowComment(report)}>
      <MessageSquare size={14} aria-hidden="true" />
      Ver comentario
    </button>
  );
}

function ReportDate({ report }: { report: ReportListItem }) {
  return (
    <span className="history-date">
      <span className="num">{formatShortDate(report.reportDate)}</span>
      {report.revisedFromReportId && <span className="tag">Corrección</span>}
    </span>
  );
}

function HistoryTable({ reports, ...handlers }: { reports: ReportListItem[] } & ReportHandlers) {
  return (
    <div className="table-wrap history-table">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Creado por</th>
            <th scope="col">Supervisor</th>
            <th scope="col" className="col-num">Actividades</th>
            <th scope="col" className="col-num">M³</th>
            <th scope="col">Estado</th>
            <th scope="col">Comentarios</th>
            <th scope="col" className="col-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td><ReportDate report={report} /></td>
              <td>{report.createdBy}</td>
              <td>{report.supervisor}</td>
              <td className="col-num num">{report.activitiesCount}</td>
              <td className="col-num num">{formatMetric(report.truckM3)}</td>
              <td><ReportStatusChip status={report.status} /></td>
              <td><CommentCell report={report} onShowComment={handlers.onShowComment} /></td>
              <td className="col-actions">
                <ReportActions report={report} onResend={handlers.onResend} onEdit={handlers.onEdit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryCards({ reports, ...handlers }: { reports: ReportListItem[] } & ReportHandlers) {
  return (
    <ul className="history-cards">
      {reports.map((report) => (
        <li key={report.id} className="equipment-card history-card">
          <div className="history-card-header">
            <span className="history-card-date"><ReportDate report={report} /></span>
            <ReportStatusChip status={report.status} />
          </div>
          <dl className="detail-list">
            <div><dt>Creado por</dt><dd>{report.createdBy}</dd></div>
            <div><dt>Supervisor</dt><dd>{report.supervisor}</dd></div>
            <div><dt>Actividades</dt><dd className="num">{report.activitiesCount}</dd></div>
            <div><dt>M³</dt><dd className="num">{formatMetric(report.truckM3)}</dd></div>
            <div>
              <dt>Comentarios</dt>
              <dd><CommentCell report={report} onShowComment={handlers.onShowComment} /></dd>
            </div>
          </dl>
          <ReportActions report={report} onResend={handlers.onResend} onEdit={handlers.onEdit} />
        </li>
      ))}
    </ul>
  );
}

export function HistoryPage() {
  const { dispatch } = useReport();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState<ReportListItem | null>(null);
  const [commentReport, setCommentReport] = useState<ReportListItem | null>(null);
  const [editing, setEditing] = useState<ReportListItem | null>(null);

  const loadPage = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE), ...(cursor ? { cursor } : {}) });
      const response = await fetch(`/api/reports?${query}`, { credentials: 'include' });
      const payload = (await response.json()) as {
        ok?: boolean;
        reports?: ReportListItem[];
        nextCursor?: string | null;
        message?: string;
      };
      if (!response.ok || !payload.ok || !payload.reports) {
        throw new Error(payload.message);
      }
      const page = payload.reports;
      setReports((current) => (cursor ? [...current, ...page] : page));
      setNextCursor(payload.nextCursor ?? null);
    } catch {
      setError('No fue posible cargar el historial.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const handlers: ReportHandlers = { onResend: setResending, onEdit: setEditing, onShowComment: setCommentReport };

  const startEditing = async (report: ReportListItem) => {
    const restored = await loadRejectedReport(report.id);
    dispatch({ type: 'LOAD_REPORT', report: restored });
    navigate('/report');
  };

  return (
    <AppShell>
      <div className="topbar-sticky">
        <TopBar
          eyebrow="Operaciones · Área de Pozas"
          title="Historial de informes"
          actions={
            <Link to="/report" className="btn btn-primary topbar-generate">
              <Send size={15} aria-hidden="true" />
              <span>Generar informe</span>
            </Link>
          }
        />
      </div>

      <main className="app-main">
        <section className="report-section" aria-labelledby="history-title">
          <SectionHeader
            icon={History}
            tone="teal"
            title="Informes generados"
            titleId="history-title"
            description="Cada informe conserva el PDF original enviado al supervisor."
          />

          {error && (
            <div className="global-alert" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              {error}
            </div>
          )}

          {notice && (
            <div className="global-alert global-alert-success" role="status">
              <CircleCheck size={16} aria-hidden="true" />
              {notice}
            </div>
          )}

          {!error && !loading && reports.length === 0 ? (
            <div className="panel">
              <p className="empty-state">No hay informes registrados.</p>
            </div>
          ) : (
            reports.length > 0 && (
              <div className="panel panel-flush">
                <HistoryTable reports={reports} {...handlers} />
                <HistoryCards reports={reports} {...handlers} />
                {nextCursor && (
                  <div className="panel-footer">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void loadPage(nextCursor)}
                      disabled={loading}
                    >
                      <Plus size={15} aria-hidden="true" />
                      {loading ? 'Cargando...' : 'Cargar más'}
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {loading && reports.length === 0 && <p className="page-note">Cargando…</p>}
        </section>
      </main>

      {resending && (
        <ResendReportModal
          report={resending}
          onClose={() => setResending(null)}
          onSent={() => {
            setResending(null);
            setNotice('El informe fue reenviado al supervisor.');
            void loadPage();
          }}
        />
      )}
      {commentReport && <CommentModal report={commentReport} onClose={() => setCommentReport(null)} />}
      {editing && (
        <EditRejectedModal report={editing} onCancel={() => setEditing(null)} onConfirm={() => startEditing(editing)} />
      )}
    </AppShell>
  );
}
