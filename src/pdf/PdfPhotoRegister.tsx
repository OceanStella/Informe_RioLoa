import { Image, Page, Text, View } from '@react-pdf/renderer';
import { resolveActivityArea } from '../utils/calculations';
import type { PdfReportData } from '../types/report';
import { PdfPageFooter } from './PdfPageFooter';
import { pdfStyles } from './pdfStyles';

interface PdfPhotoRegisterProps {
  data: PdfReportData;
}

function PhotoBodyCell({ src }: { src?: string }) {
  return (
    <View style={pdfStyles.photoBodyCell}>
      {src ? (
        <Image src={src} style={pdfStyles.photoImage} />
      ) : (
        <Text style={pdfStyles.photoPlaceholder}>Sin fotografía</Text>
      )}
    </View>
  );
}

export function PdfPhotoRegister({ data }: PdfPhotoRegisterProps) {
  const withPhotos = data.activities.filter((a) => a.beforePhoto?.dataUrl || a.afterPhoto?.dataUrl);
  if (withPhotos.length === 0) return null;

  return (
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.sectionTitle}>REGISTRO FOTOGRÁFICO</Text>
      {withPhotos.map((activity) => (
        <View key={activity.id} wrap={false} minPresenceAhead={210} style={{ marginBottom: 8 }}>
          <Text style={pdfStyles.activityPhotoTitle}>Actividad: {resolveActivityArea(activity)}</Text>
          <View style={pdfStyles.photoTable}>
            <View style={pdfStyles.photoHeaderRow}>
              <View style={pdfStyles.photoHeaderCell}>
                <Text style={pdfStyles.photoHeaderText}>Antes</Text>
              </View>
              <View style={[pdfStyles.photoHeaderCell, { borderRightWidth: 0 }]}>
                <Text style={pdfStyles.photoHeaderText}>Después</Text>
              </View>
            </View>
            <View style={pdfStyles.photoBodyRow}>
              <PhotoBodyCell src={activity.beforePhoto?.dataUrl} />
              <PhotoBodyCell src={activity.afterPhoto?.dataUrl} />
            </View>
          </View>
        </View>
      ))}
      <PdfPageFooter />
    </Page>
  );
}
