import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { AppConfig } from '../types/config';
import type { PdfReportData } from '../types/report';
import { shouldIncludeWatermasterReport } from '../utils/roster';
import { PdfActivitiesDetail } from './PdfActivitiesDetail';
import { PdfDocumentHeader } from './PdfDocumentHeader';
import { PdfMachineryTable } from './PdfMachineryTable';
import { PdfPageFooter } from './PdfPageFooter';
import { PdfPhotoRegister } from './PdfPhotoRegister';
import { PdfTruckTable } from './PdfTruckTable';
import { PdfWatermasterTable } from './PdfWatermasterTable';
import { pdfStyles } from './pdfStyles';

interface DailyReportPdfProps {
  data: PdfReportData;
  config: AppConfig;
}

function SectionHeading({ children }: { children: string }) {
  return (
    <View style={pdfStyles.sectionHeader}>
      <View style={pdfStyles.sectionBar} />
      <Text style={pdfStyles.sectionTitle}>{children}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.infoRow}>
      <Text style={pdfStyles.infoLabel}>{label}</Text>
      <Text style={pdfStyles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export function DailyReportPdf({ data, config }: DailyReportPdfProps) {
  const watermasterActivities = data.activities.filter(
    (a) =>
      a.kind === 'watermaster' &&
      a.watermaster &&
      shouldIncludeWatermasterReport(a.watermaster.hourmeterStart, a.watermaster.hourmeterEnd),
  );

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfDocumentHeader />
        <Text style={pdfStyles.title}>INFORME DIARIO DE OPERACIONES</Text>
        <Text style={pdfStyles.subtitleAccent}>Área de Pozas</Text>
        <Text style={pdfStyles.subtitleAccent}>Fecha: {data.date}</Text>

        <SectionHeading>Antecedentes generales</SectionHeading>
        <View style={pdfStyles.infoBox}>
          <InfoRow label="Supervisor" value={data.supervisor} />
          <InfoRow label="Administrativo" value="Octavio Waiz" />
          <InfoRow label="APR" value={data.apr} />
        </View>

        <SectionHeading>Detalle de actividades</SectionHeading>
        <PdfActivitiesDetail activities={data.activities} />
        <PdfPageFooter />
      </Page>

      {watermasterActivities.map((activity) => (
        <Page key={activity.id} size="A4" style={pdfStyles.page}>
          <View wrap={false}>
            <PdfWatermasterTable wm={activity.watermaster!} />
          </View>
          <PdfPageFooter />
        </Page>
      ))}

      <PdfTruckTable data={data} config={config} />
      <PdfMachineryTable data={data} config={config} />
      <PdfPhotoRegister data={data} />
    </Document>
  );
}
