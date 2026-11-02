import type { Response } from 'express';
import { pipeline } from 'stream/promises';
import { openStoredFile } from '../repositories/pdfStorage.js';
import type { StoredPdfLocation } from './reportTypes.js';

/** Serves the stored PDF as is: the historical document is never regenerated. */
export async function streamReportPdf(
  res: Response,
  storage: StoredPdfLocation,
  disposition: 'inline' | 'attachment',
): Promise<void> {
  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${storage.filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    await pipeline(openStoredFile(storage), res);
  } catch (error) {
    console.error('Failed to stream report PDF:', error);
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.removeHeader('Content-Disposition');
    res.status(502).json({ ok: false, message: 'No fue posible obtener el PDF.' });
  }
}
