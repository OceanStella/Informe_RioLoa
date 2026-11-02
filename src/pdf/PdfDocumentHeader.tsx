import { Image, Text, View } from '@react-pdf/renderer';
import rioloaLogo from '../assets/rioloa-logo.png';
import { pdfStyles } from './pdfStyles';

export function PdfDocumentHeader() {
  return (
    <View style={pdfStyles.headerRow}>
      <Image src={rioloaLogo} style={pdfStyles.brandLogo} />
      <Text style={pdfStyles.brandText}>NOVANDINO</Text>
    </View>
  );
}
