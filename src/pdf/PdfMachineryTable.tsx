import { Page, Text, View } from '@react-pdf/renderer';
import type { AppConfig } from '../types/config';
import type { PdfReportData } from '../types/report';
import { calculateMachineryShareM3, formatMetric, resolveActivityArea } from '../utils/calculations';
import { resolveEquipmentOperationalData } from '../utils/roster';
import { PdfPageFooter } from './PdfPageFooter';
import { PdfProductionChart } from './PdfProductionChart';
import { pdfStyles } from './pdfStyles';

interface PdfMachineryTableProps {
  data: PdfReportData;
  config: AppConfig;
}

const COLS = [
  { key: 'code', label: 'Maquinaria', width: '22%' },
  { key: 'operator', label: 'Operador', width: '20%' },
  { key: 'hi', label: 'Horómetro Inicial', width: '15%' },
  { key: 'hf', label: 'Horómetro Final', width: '15%' },
  { key: 'zone', label: 'Zona de trabajo', width: '18%' },
  { key: 'm3', label: 'M3', width: '10%' },
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

export function PdfMachineryTable({ data, config }: PdfMachineryTableProps) {
  const rows: Array<{
    key: string;
    code: string;
    operator: string;
    hStart: string;
    hEnd: string;
    zone: string;
    m3: string;
  }> = [];

  for (const activity of data.activities) {
    const zone = resolveActivityArea(activity);
    const shareM3 = calculateMachineryShareM3(activity, config);
    const m3Str = shareM3 != null ? formatMetric(shareM3) : '-';
    for (const a of activity.equipmentAssignments) {
      if (a.equipmentType !== 'machinery') continue;
      const ops = resolveEquipmentOperationalData(a, data.roster);
      rows.push({
        key: `${activity.id}-${a.id}`,
        code: a.equipmentCode,
        operator: ops.operator,
        hStart: ops.hourmeterStart,
        hEnd: ops.hourmeterEnd,
        zone,
        m3: m3Str,
      });
    }
  }

  const hasChart = data.activities.some((activity) =>
    activity.equipmentAssignments.some((assignment) => assignment.equipmentType === 'truck'),
  );

  if (rows.length === 0 && !hasChart) return null;

  return (
    <Page size="A4" style={pdfStyles.page}>
      <View wrap={false}>
        {rows.length > 0 && (
          <>
            <Text style={pdfStyles.sectionTitle}>MAQUINARIA</Text>
            <View style={pdfStyles.table}>
              <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]} wrap={false}>
                {COLS.map((col) => (
                  <HeaderCell key={col.key} width={col.width} label={col.label} />
                ))}
              </View>
              {rows.map((row) => (
                <View key={row.key} wrap={false} style={pdfStyles.tableRow}>
                  <BodyCell width={COLS[0].width}>{row.code}</BodyCell>
                  <BodyCell width={COLS[1].width}>{row.operator}</BodyCell>
                  <BodyCell width={COLS[2].width}>{row.hStart}</BodyCell>
                  <BodyCell width={COLS[3].width}>{row.hEnd}</BodyCell>
                  <BodyCell width={COLS[4].width}>{row.zone}</BodyCell>
                  <BodyCell width={COLS[5].width}>{row.m3}</BodyCell>
                </View>
              ))}
            </View>
          </>
        )}
        {hasChart && <PdfProductionChart data={data} config={config} />}
      </View>
      <PdfPageFooter />
    </Page>
  );
}
