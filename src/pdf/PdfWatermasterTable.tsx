import { Text, View } from '@react-pdf/renderer';
import { formatDepthLabel } from '../data/constants';
import {
  formatMetric,
  getWatermasterEffectiveHours,
  getWatermasterHourlyPerformance,
  getWatermasterPumpHours,
  getWatermasterTotalM3,
} from '../utils/calculations';
import type { WatermasterData } from '../types/report';
import { pdfStyles } from './pdfStyles';

interface PdfWatermasterTableProps {
  wm: WatermasterData;
}

const COL_WIDTHS = ['28%', '32%', '22%', '18%'] as const;

function HeaderCell({ width, children }: { width: string; children: string }) {
  return (
    <View style={[pdfStyles.tableCell, pdfStyles.tableCellCentered, { width }]}>
      <Text style={pdfStyles.tableHeaderTextLg}>{children}</Text>
    </View>
  );
}

function DataCell({ width, children }: { width: string; children: string }) {
  return (
    <View style={[pdfStyles.tableCell, pdfStyles.tableCellCentered, { width }]}>
      <Text style={pdfStyles.tableCellTextLg}>{children || ' '}</Text>
    </View>
  );
}

function Row({
  col1,
  col2,
  col3,
  col4,
}: {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
}) {
  return (
    <View style={pdfStyles.tableRow} wrap={false}>
      <DataCell width={COL_WIDTHS[0]}>{col1}</DataCell>
      <DataCell width={COL_WIDTHS[1]}>{col2}</DataCell>
      <DataCell width={COL_WIDTHS[2]}>{col3}</DataCell>
      <DataCell width={COL_WIDTHS[3]}>{col4}</DataCell>
    </View>
  );
}

export function PdfWatermasterTable({ wm }: PdfWatermasterTableProps) {
  const eff = getWatermasterEffectiveHours(wm);
  const pump = getWatermasterPumpHours(wm);
  const totalM3 = getWatermasterTotalM3(wm);
  const hourly = getWatermasterHourlyPerformance(wm);
  const depthLabel = wm.depth !== null ? formatDepthLabel(wm.depth) : '-';

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>REPORTE WATERMASTER</Text>
      <View style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]} wrap={false}>
          <HeaderCell width={COL_WIDTHS[0]}>Indicador Operativo</HeaderCell>
          <HeaderCell width={COL_WIDTHS[1]}>Detalle de Medición</HeaderCell>
          <HeaderCell width={COL_WIDTHS[2]}>Valor Registrado</HeaderCell>
          <HeaderCell width={COL_WIDTHS[3]}>Unidad / Equipo</HeaderCell>
        </View>
        <Row
          col1="Watermaster Classic V (C4123)"
          col2={`Ubicación: ${wm.sector} / Operador: ${wm.operator}`}
          col3=""
          col4=""
        />
        <Row col1="Horómetro Inicial" col2="Registro de inicio de turno" col3={wm.hourmeterStart || '-'} col4="h" />
        <Row col1="Horómetro Final" col2="Registro de término de turno" col3={wm.hourmeterEnd || '-'} col4="h" />
        <Row col1="Horas Efectivas" col2="Horóm. final - Horóm. inicial" col3={formatMetric(eff)} col4="h" />
        <Row col1="Horómetro Inicial Bomba" col2="Registro de inicio bomba" col3={wm.pumpHourmeterStart || '-'} col4="h" />
        <Row col1="Horómetro Final Bomba" col2="Registro de término bomba" col3={wm.pumpHourmeterEnd || '-'} col4="h" />
        <Row col1="Horas Bomba" col2="Horóm. bomba final - inicial" col3={formatMetric(pump)} col4="h" />
        <Row col1="Profundidad Operativa" col2="Penetración del brazo triturador" col3={depthLabel} col4="m" />
        <Row
          col1="Dureza del Material"
          col2="Clasificación ingresada en formulario"
          col3={wm.hardness !== null ? String(wm.hardness) : '-'}
          col4="%"
        />
        <Row
          col1="Rendimiento según fabricante"
          col2="Capacidad teórica por profundidad"
          col3={wm.manufacturerPerformance || '-'}
          col4="m³/h"
        />
        <Row col1="Volumen Removido" col2="Rendimiento × horas efectivas" col3={formatMetric(totalM3)} col4="m³" />
        <Row col1="Rendimiento Horario Real" col2="Volumen / Horas efectivas" col3={formatMetric(hourly)} col4="m³/h" />
      </View>
    </View>
  );
}
