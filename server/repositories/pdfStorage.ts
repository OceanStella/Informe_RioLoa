import { Storage } from '@google-cloud/storage';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import type { Readable } from 'stream';

const LOCAL_BUCKET = 'local';

interface StoredLocation {
  bucket: string;
  path: string;
}

const PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function localFilePath(objectPath: string): string {
  return path.join(process.cwd(), '.local-reports', objectPath);
}

function bucketFile(location: StoredLocation) {
  return new Storage().bucket(location.bucket).file(location.path);
}

export function buildReportPdfLocation(reportId: string, reportDate: string) {
  const [year, month] = reportDate.split('-');
  const filename = `INFORME_DIARIO_${reportDate}.pdf`;
  return {
    bucket: process.env.CONFIG_BUCKET?.trim() || LOCAL_BUCKET,
    path: `reports/${year}/${month}/${reportId}/${filename}`,
    filename,
  };
}

/** The form photos live next to the report PDF, never in Firestore. */
export function buildFormPhotoPath(pdfPath: string, activityId: string, which: string, contentType: string) {
  const extension = PHOTO_EXTENSIONS[contentType];
  return extension ? `${path.posix.dirname(pdfPath)}/photos/${activityId}-${which}.${extension}` : null;
}

/** ifGenerationMatch: 0 makes GCS refuse any overwrite, so a stored file stays immutable. */
async function saveFile(location: StoredLocation, contents: Buffer, contentType: string): Promise<void> {
  if (location.bucket === LOCAL_BUCKET) {
    const filePath = localFilePath(location.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, contents, { flag: 'wx' });
    return;
  }
  await bucketFile(location).save(contents, {
    contentType,
    resumable: false,
    preconditionOpts: { ifGenerationMatch: 0 },
  });
}

export function savePdf(location: StoredLocation, pdf: Buffer): Promise<void> {
  return saveFile(location, pdf, 'application/pdf');
}

export function saveFormPhoto(location: StoredLocation, photo: Buffer, contentType: string): Promise<void> {
  return saveFile(location, photo, contentType);
}

export async function deleteStoredFile(location: StoredLocation): Promise<void> {
  if (location.bucket === LOCAL_BUCKET) {
    await fs.rm(localFilePath(location.path), { force: true });
    return;
  }
  await bucketFile(location).delete({ ignoreNotFound: true });
}

export async function readPdf(location: StoredLocation): Promise<Buffer> {
  if (location.bucket === LOCAL_BUCKET) {
    return fs.readFile(localFilePath(location.path));
  }
  const [contents] = await bucketFile(location).download();
  return contents;
}

export function openStoredFile(location: StoredLocation): Readable {
  if (location.bucket === LOCAL_BUCKET) {
    return createReadStream(localFilePath(location.path));
  }
  return bucketFile(location).createReadStream();
}
