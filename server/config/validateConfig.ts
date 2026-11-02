import type { AppConfig, EquipmentConfigItem, NamedConfigItem } from './configTypes.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUuidLike(value: string): boolean {
  return value.trim().length > 0;
}

function validateNamedList(list: unknown, label: string, errors: string[]): NamedConfigItem[] {
  if (!Array.isArray(list)) {
    errors.push(`${label} debe ser un arreglo.`);
    return [];
  }

  const items: NamedConfigItem[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const raw of list) {
    if (!raw || typeof raw !== 'object') {
      errors.push(`Cada ítem de ${label} debe ser un objeto.`);
      continue;
    }
    const record = raw as Record<string, unknown>;
    if (!isNonEmptyString(record.id) || !isUuidLike(record.id)) {
      errors.push(`Cada ítem de ${label} requiere un id.`);
      continue;
    }
    if (!isNonEmptyString(record.name)) {
      errors.push(`Cada ítem de ${label} requiere un nombre.`);
      continue;
    }
    const id = record.id.trim();
    const name = record.name.trim();
    if (ids.has(id)) {
      errors.push(`Id duplicado en ${label}: ${id}`);
      continue;
    }
    const nameKey = name.toLowerCase();
    if (names.has(nameKey)) {
      errors.push(`Nombre duplicado en ${label}: ${name}`);
      continue;
    }
    ids.add(id);
    names.add(nameKey);
    items.push({ id, name });
  }

  return items;
}

function validateEquipment(list: unknown, errors: string[]): EquipmentConfigItem[] {
  if (!Array.isArray(list)) {
    errors.push('equipment debe ser un arreglo.');
    return [];
  }

  const items: EquipmentConfigItem[] = [];
  const ids = new Set<string>();
  const codes = new Set<string>();

  for (const raw of list) {
    if (!raw || typeof raw !== 'object') {
      errors.push('Cada equipo debe ser un objeto.');
      continue;
    }
    const record = raw as Record<string, unknown>;
    if (!isNonEmptyString(record.id)) {
      errors.push('Cada equipo requiere un id.');
      continue;
    }
    if (!isNonEmptyString(record.code)) {
      errors.push('El código de equipo es obligatorio.');
      continue;
    }
    if (record.type !== 'truck' && record.type !== 'machinery') {
      errors.push('El tipo de equipo debe ser truck o machinery.');
      continue;
    }

    const id = record.id.trim();
    const code = record.code.trim();
    const type = record.type;
    if (ids.has(id)) {
      errors.push(`Id de equipo duplicado: ${id}`);
      continue;
    }
    const codeKey = code.toLowerCase();
    if (codes.has(codeKey)) {
      errors.push(`Código de equipo duplicado: ${code}`);
      continue;
    }

    let capacityM3: number | null = null;
    if (record.capacityM3 === null || record.capacityM3 === undefined || record.capacityM3 === '') {
      capacityM3 = null;
    } else if (typeof record.capacityM3 === 'number' && Number.isFinite(record.capacityM3)) {
      capacityM3 = record.capacityM3;
    } else if (typeof record.capacityM3 === 'string' && record.capacityM3.trim() !== '') {
      const parsed = Number(record.capacityM3);
      if (!Number.isFinite(parsed)) {
        errors.push(`Capacidad inválida para ${code}.`);
        continue;
      }
      capacityM3 = parsed;
    } else {
      errors.push(`Capacidad inválida para ${code}.`);
      continue;
    }

    if (capacityM3 !== null && capacityM3 < 0) {
      errors.push(`La capacidad de ${code} no puede ser negativa.`);
      continue;
    }
    if (type === 'truck' && (capacityM3 === null || capacityM3 <= 0)) {
      errors.push(`El camión ${code} requiere capacidad M³ mayor a 0.`);
      continue;
    }

    ids.add(id);
    codes.add(codeKey);
    items.push({ id, code, type, capacityM3 });
  }

  return items;
}

export function validateAppConfig(input: unknown): { ok: true; config: AppConfig } | { ok: false; message: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'La configuración enviada no es válida.' };
  }

  const record = input as Record<string, unknown>;
  const errors: string[] = [];
  const generalAreas = validateNamedList(record.generalAreas, 'Pozas / áreas de antecedentes', errors);
  const activityAreas = validateNamedList(record.activityAreas, 'Pozas / áreas de actividades', errors);
  const equipment = validateEquipment(record.equipment, errors);

  if (errors.length > 0) {
    return { ok: false, message: errors[0] ?? 'La configuración enviada no es válida.' };
  }

  return {
    ok: true,
    config: { generalAreas, activityAreas, equipment },
  };
}
