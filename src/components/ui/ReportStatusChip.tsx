import type { ReportStatus } from '../../types/reports';
import { StatusChip } from './StatusChip';

const STATUS_DISPLAY = {
  IN_REVIEW: { status: 'pending', label: 'En revisión' },
  APPROVED: { status: 'ready', label: 'Aprobado' },
  REJECTED: { status: 'error', label: 'Rechazado' },
  SEND_FAILED: { status: 'warning', label: 'Error de envío' },
} as const;

export function ReportStatusChip({ status }: { status: ReportStatus }) {
  return <StatusChip {...STATUS_DISPLAY[status]} />;
}
