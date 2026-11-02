export const ACTIVITY_TYPE_OPTIONS = [
  'Cosecha perimetral',
  'Retiro de Material',
  'Movimiento de material',
  'Reparación y mantenimiento de Botadero',
  'Confección de bafle',
  'Carguío',
  'Perfilado de accesos',
  'Excavación',
  'Otro',
] as const;

export const WATERMASTER_DEPTH_OPTIONS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8,
] as const;

export const HARDNESS_OPTIONS: Array<{ value: 25 | 50 | 75 | 100; label: string; className: string }> = [
  { value: 25, label: '25% - Baja', className: 'hardness-25' },
  { value: 50, label: '50% - Media', className: 'hardness-50' },
  { value: 75, label: '75% - Alta', className: 'hardness-75' },
  { value: 100, label: '100% - Muy alta', className: 'hardness-100' },
];

export function formatDepthLabel(depth: number): string {
  const str = depth.toString().replace('.', ',');
  return `${str} m`;
}
