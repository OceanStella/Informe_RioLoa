import type { PhotoData, ReportData } from '../types/report';
import type { PdfReportData } from '../types/report';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function isAcceptedImageType(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

export function createPhotoFromFile(file: File): PhotoData {
  const previewUrl = URL.createObjectURL(file);
  return { file, previewUrl };
}

export function revokePhotoPreview(photo?: PhotoData): void {
  if (photo?.previewUrl) {
    URL.revokeObjectURL(photo.previewUrl);
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function prepareReportForPdf(report: ReportData): Promise<PdfReportData> {
  const activities = await Promise.all(
    report.activities.map(async (activity) => {
      let beforePhoto = activity.beforePhoto;
      let afterPhoto = activity.afterPhoto;

      if (beforePhoto) {
        const dataUrl = beforePhoto.dataUrl ?? await fileToDataUrl(beforePhoto.file);
        beforePhoto = { ...beforePhoto, dataUrl };
      }
      if (afterPhoto) {
        const dataUrl = afterPhoto.dataUrl ?? await fileToDataUrl(afterPhoto.file);
        afterPhoto = { ...afterPhoto, dataUrl };
      }

      return {
        ...activity,
        beforePhoto: beforePhoto as PdfReportData['activities'][0]['beforePhoto'],
        afterPhoto: afterPhoto as PdfReportData['activities'][0]['afterPhoto'],
      };
    }),
  );

  return { ...report, activities };
}
