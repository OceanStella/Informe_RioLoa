import { Download, Eye, Info, Plus, Send, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActiveRosterSection } from '../components/ActiveRosterSection';
import { ActivitiesSummary } from '../components/ActivitiesSummary';
import { ActivityCard } from '../components/ActivityCard';
import { GeneralInfoForm } from '../components/GeneralInfoForm';
import { buildReportOverview } from '../components/reportOverview';
import { ReportSentModal } from '../components/ReportSentModal';
import { SendReportModal } from '../components/SendReportModal';
import { PageHead } from '../components/ui/PageHead';
import { ProgressRing } from '../components/ui/ProgressRing';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useShellSlots } from '../components/ui/shellSlots';
import { StepNav, type StepNavItem } from '../components/ui/StepNav';
import { useConfig } from '../context/ConfigContext';
import { useReport } from '../context/ReportContext';
import { resolveActivityArea } from '../utils/calculations';
import { formatShortDate } from '../utils/dates';
import { prepareReportForPdf } from '../utils/images';
import { downloadBlob, generateReportPdfBlob, getReportFileName, openBlobInNewTab } from '../utils/pdf';
import { scrollToValidationField } from '../utils/scrollToField';
import { countPhotos } from '../utils/reportDraft';
import { collectLiveErrors, validateReport, type FlatValidationErrors } from '../utils/validation';
import { pluralize } from '../utils/text';
import { refreshDisplayedErrors } from '../utils/validationDisplay';
import { buildExpandActions } from '../utils/validationExpand';

export function ReportPage() {
  const { report, dispatch, lostPhotos, staleDraftDate } = useReport();
  const { config } = useConfig();
  const { panel, progress } = useShellSlots();
  const [flatErrors, setFlatErrors] = useState<FlatValidationErrors>({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sentResult, setSentResult] = useState<{ ccDelivered: boolean } | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const lastPreviewUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!validationAttempted) return;
    setFlatErrors((prev) => refreshDisplayedErrors(report, prev));
  }, [report, validationAttempted]);

  const runValidation = () => {
    setValidationAttempted(true);
    const result = validateReport(report);
    setFlatErrors(result.flatErrors);

    if (!result.valid) {
      const expandActions = buildExpandActions(report, result.errors);
      for (const action of expandActions) {
        dispatch(action);
      }
      requestAnimationFrame(() => {
        setTimeout(() => scrollToValidationField(result.firstErrorPath), 120);
      });
    }

    return result;
  };

  const buildPdf = async () => {
    const pdfData = await prepareReportForPdf(report);
    return generateReportPdfBlob(pdfData, config);
  };

  /** Only runs once the backend confirmed the send: a failure must keep everything the user typed. */
  const handleSent = (result: { ccDelivered: boolean }) => {
    dispatch({ type: 'RESET_REPORT' });
    setFlatErrors({});
    setValidationAttempted(false);
    setFormVersion((version) => version + 1);
    setSentResult(result);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleGenerate = () => {
    const result = runValidation();
    if (!result.valid) return;
    setSendModalOpen(true);
  };

  const handleDownloadPdf = async () => {
    const result = runValidation();
    if (!result.valid) return;
    setIsGenerating(true);
    try {
      const blob = await buildPdf();
      downloadBlob(blob, getReportFileName(report.date));
    } catch (err) {
      console.error(err);
      alert('No se pudo generar el PDF. Revise los datos e intente nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    const result = runValidation();
    if (!result.valid) return;
    setIsGenerating(true);
    try {
      const blob = await buildPdf();
      if (lastPreviewUrl.current) {
        URL.revokeObjectURL(lastPreviewUrl.current);
      }
      lastPreviewUrl.current = openBlobInNewTab(blob);
    } catch (err) {
      console.error(err);
      alert('No se pudo generar la vista previa.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddActivity = () => {
    dispatch({ type: 'ADD_ACTIVITY' });
    setTimeout(() => {
      const cards = document.querySelectorAll('.activity-card');
      const lastCard = cards[cards.length - 1] as HTMLElement | undefined;
      lastCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const liveErrors = collectLiveErrors(report);
  const displayErrors = validationAttempted ? { ...flatErrors, ...liveErrors } : liveErrors;
  const hasErrors = Object.keys(displayErrors).length > 0;

  const overview = buildReportOverview(report, config, displayErrors);
  const missingPhotos = lostPhotos > 0 && countPhotos(report) === 0;

  const stepItems: StepNavItem[] = [
    {
      id: 'sec-general',
      label: 'Antecedentes',
      meta: `${overview.generalFilled} de ${overview.generalTotal} campos`,
      status: overview.status.general,
    },
    {
      id: 'sec-roster',
      label: 'Dotación',
      meta: overview.rosterTotal
        ? `${overview.rosterReady} de ${overview.rosterTotal} fichas completas`
        : 'Sin equipos seleccionados',
      status: overview.status.roster,
    },
    {
      id: 'sec-activities',
      label: 'Actividades',
      meta: `${pluralize(overview.activityCount, 'registrada', 'registradas')} · ${pluralize(overview.activitiesReady, 'lista', 'listas')}`,
      status: overview.status.activities,
      children:
        report.activities.length > 1
          ? report.activities.map((activity, index) => {
              const area = resolveActivityArea(activity);
              return {
                id: `activity-${activity.id}`,
                label: area ? `Actividad ${index + 1} · ${area}` : `Actividad ${index + 1}`,
              };
            })
          : undefined,
    },
    {
      id: 'sec-summary',
      label: 'Resumen',
      meta: 'Revisión previa al envío',
    },
    {
      id: 'sec-generate',
      label: 'Generar y enviar',
      meta: overview.errorCount ? `${overview.errorCount} campos pendientes` : 'PDF y correo',
      status: overview.status.generate,
    },
  ];

  return (
    <>
      {panel &&
        createPortal(
          <>
            <div className="sidebar-card progress-card">
              <ProgressRing value={overview.progress} />
              <div>
                <p className="progress-title">Avance del informe</p>
                <p className="progress-sub">
                  {overview.errorCount
                    ? `${overview.errorCount} campos por revisar`
                    : overview.progress === 100
                      ? 'Listo para generar'
                      : 'Completa las secciones'}
                </p>
              </div>
            </div>
            <StepNav title="Secciones del informe" items={stepItems} />
          </>,
          panel,
        )}
      {progress &&
        createPortal(
          <div className="topbar-progress" aria-hidden="true">
            <span style={{ width: `${overview.progress}%` }} />
          </div>,
          progress,
        )}

        <main className="app-main">
          <PageHead title="Informe Diario de Operaciones" />

          {(report.revisedFrom || report.carriedFrom || staleDraftDate || missingPhotos || hasErrors) && (
            <div className="alert-stack">
              {report.revisedFrom && (
                <div className="global-alert global-alert-warning revision-notice" role="status">
                  <TriangleAlert size={16} aria-hidden="true" />
                  <div>
                    <p>
                      Estás corrigiendo el informe rechazado del {formatShortDate(report.revisedFrom.reportDate)}. Al
                      enviarlo se creará un informe nuevo y el rechazado no cambiará.
                    </p>
                    {report.revisedFrom.comment && (
                      <p className="comment-text">Comentario del supervisor: {report.revisedFrom.comment}</p>
                    )}
                  </div>
                </div>
              )}
              {report.carriedFrom && (
                <div className="global-alert global-alert-info" role="status">
                  <Info size={16} aria-hidden="true" />
                  Partes del informe del {formatShortDate(report.carriedFrom)}. Confirma operadores y horómetros iniciales.
                </div>
              )}
              {staleDraftDate && (
                <div className="global-alert global-alert-warning" role="status">
                  <TriangleAlert size={16} aria-hidden="true" />
                  Este borrador tiene fecha {formatShortDate(staleDraftDate)}. Si es el turno de hoy, cambia la fecha antes
                  de enviar.
                </div>
              )}
              {missingPhotos && (
                <div className="global-alert global-alert-warning" role="status">
                  <TriangleAlert size={16} aria-hidden="true" />
                  Recuperamos tu borrador, pero las fotos no se guardan: vuelve a adjuntarlas.
                </div>
              )}
              {hasErrors && (
                <div className="global-alert global-alert-warning" role="status">
                  <TriangleAlert size={16} aria-hidden="true" />
                  Hay campos pendientes de completar.
                </div>
              )}
            </div>
          )}

          <GeneralInfoForm errors={displayErrors} />
          <ActiveRosterSection errors={displayErrors} />

          <section className="report-section" id="sec-activities" aria-labelledby="sec-activities-title">
            <SectionHeader title="Detalle de actividades" titleId="sec-activities-title" />
            <div className="activities-list">
              {report.activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  index={index}
                  errors={displayErrors}
                  canDelete={index > 0}
                />
              ))}
              <button type="button" className="btn btn-dashed" onClick={handleAddActivity}>
                <Plus size={16} aria-hidden="true" />
                Agregar Actividad
              </button>
            </div>
          </section>

          <ActivitiesSummary key={formVersion} />

          <section className="report-section generate-section" id="sec-generate" aria-labelledby="sec-generate-title">
            <div className="generate-panel">
              <div className="generate-copy">
                <h2 className="generate-title" id="sec-generate-title">Generar y enviar informe</h2>
                <p>Antes de enviar se revisa todo el informe. Si falta algo, te llevamos al campo.</p>
                {hasErrors && (
                  <p className="generate-warning">
                    <TriangleAlert size={15} aria-hidden="true" />
                    Hay campos pendientes de completar.
                  </p>
                )}
              </div>
              <div className="generate-actions">
                <button
                  type="button"
                  className="btn btn-on-dark-ghost btn-preview"
                  onClick={handlePreview}
                  disabled={isGenerating}
                >
                  <Eye size={16} aria-hidden="true" />
                  Vista previa
                </button>
                <button
                  type="button"
                  className="btn btn-on-dark btn-preview"
                  onClick={handleDownloadPdf}
                  disabled={isGenerating}
                >
                  <Download size={16} aria-hidden="true" />
                  {isGenerating ? 'Generando...' : 'Descargar PDF'}
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-lg btn-generate"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <Send size={16} aria-hidden="true" />
                  Generar informe
                </button>
              </div>
            </div>
          </section>
        </main>

      <SendReportModal
        open={sendModalOpen}
        report={report}
        config={config}
        onClose={() => setSendModalOpen(false)}
        onSuccess={handleSent}
        buildPdf={buildPdf}
      />
      {sentResult && <ReportSentModal ccDelivered={sentResult.ccDelivered} onClose={() => setSentResult(null)} />}
    </>
  );
}
