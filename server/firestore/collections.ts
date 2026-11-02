/**
 * Single source of Firestore collection names.
 *
 * The (default) database is shared with another project: Informe Octavio V2 must never
 * read, modify or delete any collection outside this namespace.
 */
export const FIRESTORE_COLLECTIONS = {
  config: 'informeOctavioConfig',
  reports: 'informeOctavioReports',
  approvals: 'informeOctavioReportApprovals',
  users: 'informeOctavioUsers',
} as const;

export const CONFIG_DOCUMENT_ID = 'main';
