import { Text, View } from '@react-pdf/renderer';
import { getActivityEquipmentCodes, resolveActivityArea, resolveActivityType } from '../utils/calculations';
import type { Activity } from '../types/report';
import { isActivityEmptyForPdf } from '../utils/roster';
import { pdfStyles } from './pdfStyles';

interface PdfActivitiesDetailProps {
  activities: Activity[];
}

export function PdfActivitiesDetail({ activities }: PdfActivitiesDetailProps) {
  const visible = activities.filter((activity) => !isActivityEmptyForPdf(activity));

  if (visible.length === 0) {
    return <Text style={pdfStyles.mutedNote}>No hay actividades con información para este informe.</Text>;
  }

  return (
    <View>
      {visible.map((activity, index) => {
        const codes = getActivityEquipmentCodes(activity);
        return (
          <View key={activity.id} wrap={false} minPresenceAhead={90} style={pdfStyles.activityCard}>
            <Text style={pdfStyles.activityTitle}>Actividad {index + 1}</Text>
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.infoLabel}>Poza / Área</Text>
              <Text style={pdfStyles.infoValue}>{resolveActivityArea(activity) || '—'}</Text>
            </View>
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.infoLabel}>Tipo</Text>
              <Text style={pdfStyles.infoValue}>{resolveActivityType(activity) || '—'}</Text>
            </View>
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.infoLabel}>Equipos</Text>
              <Text style={pdfStyles.infoValue}>{codes.length > 0 ? codes.join(', ') : '—'}</Text>
            </View>
            {activity.supportEquipment?.trim() ? (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Apoyo</Text>
                <Text style={pdfStyles.infoValue}>{activity.supportEquipment}</Text>
              </View>
            ) : null}
            {activity.description.trim() ? (
              <Text style={pdfStyles.activityDescription}>{`"${activity.description.trim()}"`}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
