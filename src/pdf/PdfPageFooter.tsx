import { Text } from '@react-pdf/renderer';
import { pdfStyles } from './pdfStyles';

const PDF_FOOTER_TEXT =
  'RT RIOLOA - NOVANDINO  |  www.rio-loa.cl  |  Antofagasta: Av. Industrial 7363';

export function PdfPageFooter() {
  return (
    <Text style={pdfStyles.footer} fixed>
      {PDF_FOOTER_TEXT}
    </Text>
  );
}
