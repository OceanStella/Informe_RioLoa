import { G, Line, Rect, Svg, Text, View } from '@react-pdf/renderer';
import type { AppConfig } from '../types/config';
import type { PdfReportData } from '../types/report';
import { collectTruckM3ByCode } from '../utils/calculations';
import { pdfStyles } from './pdfStyles';

const BAR_BLUE = '#2E75B6';
const GRID = '#D9D9D9';
const AXIS = '#7F7F7F';

interface PdfProductionChartProps {
  data: PdfReportData;
  config: AppConfig;
}

function niceMax(value: number): number {
  if (value <= 0) return 50;
  const padded = value * 1.08;
  const step = padded <= 100 ? 25 : padded <= 250 ? 50 : 100;
  return Math.ceil(padded / step) * step;
}

export function PdfProductionChart({ data, config }: PdfProductionChartProps) {
  const rows = collectTruckM3ByCode(data.activities, config);
  if (rows.length === 0) return null;

  const width = 540;
  const height = 280;
  const left = 42;
  const right = 16;
  const top = 28;
  const bottom = 48;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = niceMax(Math.max(...rows.map((row) => row.totalM3)));
  const ticks = 5;
  const gap = Math.max(14, 36 - rows.length);
  const barWidth = Math.max(28, Math.min(52, (chartWidth - gap * (rows.length + 1)) / rows.length));
  const groupWidth = chartWidth / rows.length;

  return (
    <View wrap={false} style={pdfStyles.chartBlock}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
        <Text x={left} y={16} style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }} fill="#222222">
          Total m³ por camión
        </Text>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const value = (maxValue / ticks) * (ticks - i);
          const y = top + (chartHeight / ticks) * i;
          return (
            <G key={`tick-${i}`}>
              <Line x1={left} y1={y} x2={left + chartWidth} y2={y} stroke={GRID} strokeWidth={0.8} />
              <Text x={left - 6} y={y + 3} style={{ fontSize: 8, textAnchor: 'end' }} fill={AXIS}>
                {String(Math.round(value))}
              </Text>
            </G>
          );
        })}
        <Line x1={left} y1={top} x2={left} y2={top + chartHeight} stroke={AXIS} strokeWidth={1} />
        <Line
          x1={left}
          y1={top + chartHeight}
          x2={left + chartWidth}
          y2={top + chartHeight}
          stroke={AXIS}
          strokeWidth={1}
        />
        {rows.map((row, index) => {
          const barHeight = (row.totalM3 / maxValue) * chartHeight;
          const x = left + index * groupWidth + (groupWidth - barWidth) / 2;
          const y = top + chartHeight - barHeight;
          return (
            <G key={row.equipmentId}>
              <Rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} fill={BAR_BLUE} />
              <Text
                x={x + barWidth / 2}
                y={top + chartHeight + 14}
                style={{ fontSize: 8, textAnchor: 'middle', fontFamily: 'Helvetica-Bold' }}
                fill="#222222"
              >
                {row.code}
              </Text>
            </G>
          );
        })}
        <Text
          x={left + chartWidth / 2}
          y={height - 8}
          style={{ fontSize: 9, textAnchor: 'middle' }}
          fill={AXIS}
        >
          Camión
        </Text>
      </Svg>
    </View>
  );
}
