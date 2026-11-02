import { pdf, type DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { DailyReportPdf } from '../pdf/DailyReportPdf';
import type { AppConfig } from '../types/config';
import type { PdfReportData } from '../types/report';

export async function generateReportPdfBlob(data: PdfReportData, config: AppConfig): Promise<Blob> {
  const doc = (<DailyReportPdf data={data} config={config} />) as ReactElement<DocumentProps>;
  return pdf(doc).toBlob();
}

export function getReportFileName(date: string): string {
  return `INFORME_DIARIO_${date}.pdf`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function openBlobInNewTab(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  return url;
}
