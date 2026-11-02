import { Page, Text, View } from '@react-pdf/renderer';
import type { AppConfig } from '../types/config';
import type { PdfReportData } from '../types/report';
import { collectTruckParticipations } from '../utils/calculations';
import { PdfPageFooter } from './PdfPageFooter';
import { pdfStyles } from './pdfStyles';

interface PdfTruckTableProps {
  data: PdfReportData;
  config: AppConfig;
}

const COLS = [
  { key: 'truck', label: 'Camión Tolva', width: '14%' },
  { key: 'operator', label: 'Operador', width: '18%' },
  { key: 'hi', label: 'Hr. Inicial', width: '10%' },
  { key: 'hf', label: 'Hr. Final', width: '10%' },
  { key: 'ki', label: 'Km. Inicial', width: '10%' },
  { key: 'kf', label: 'Km. Final', width: '10%' },
  { key: 'trips', label: 'N° Vueltas', width: '12%' },
  { key: 'zone', label: 'Zona de trabajo', width: '16%' },
] as const;

function HeaderCell({ width, label }: { width: string; label: string }) {
  return (
    <View style={[pdfStyles.tableCell, pdfStyles.tableCellCentered, { width }]}>
      <Text style={pdfStyles.tableHeaderTextLg}>{label}</Text>
    </View>
  );
}

function BodyCell({ width, children }: { width: string; children: string }) {
  return (
    <View style={[pdfStyles.tableCell, pdfStyles.tableCellCentered, { width }]}>
      <Text style={pdfStyles.tableCellTextLg}>{children || ' '}</Text>
    </View>
  );
}

export function PdfTruckTable({ data, config }: PdfTruckTableProps) {
  const rows = collectTruckParticipations(data.activities, data.roster, config);
  if (rows.length === 0) return null;

  return (
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.sectionTitle}>CAMIONES TOLVA</Text>
      <View style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]} wrap={false}>
          {COLS.map((col) => (
            <HeaderCell key={col.key} width={col.width} label={col.label} />
          ))}
        </View>
        {rows.map((row) => {
          const a = row.assignment;
          return (
            <View key={`${row.activityId}-${a.id}`} wrap={false} style={pdfStyles.tableRow}>
              <BodyCell width={COLS[0].width}>{a.equipmentCode}</BodyCell>
              <BodyCell width={COLS[1].width}>{row.operator}</BodyCell>
              <BodyCell width={COLS[2].width}>{row.hourmeterStart}</BodyCell>
              <BodyCell width={COLS[3].width}>{row.hourmeterEnd}</BodyCell>
              <BodyCell width={COLS[4].width}>{row.kmStart}</BodyCell>
              <BodyCell width={COLS[5].width}>{row.kmEnd}</BodyCell>
              <BodyCell width={COLS[6].width}>{a.trips ?? ''}</BodyCell>
              <BodyCell width={COLS[7].width}>{row.zone}</BodyCell>
            </View>
          );
        })}
      </View>
      <PdfPageFooter />
    </Page>
  );
}
