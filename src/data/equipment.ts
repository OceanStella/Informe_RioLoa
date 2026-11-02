import type { AppConfig, EquipmentConfigItem, EquipmentType } from '../types/config';

export type { EquipmentType };

export function getEquipmentById(config: AppConfig, id: string): EquipmentConfigItem | undefined {
  return config.equipment.find((item) => item.id === id);
}

export function getTrucks(config: AppConfig): EquipmentConfigItem[] {
  return config.equipment.filter((item) => item.type === 'truck');
}

export function getMachinery(config: AppConfig): EquipmentConfigItem[] {
  return config.equipment.filter((item) => item.type === 'machinery');
}

export function sortEquipmentForActivity(
  items: EquipmentConfigItem[],
  rosterIds: Set<string>,
): EquipmentConfigItem[] {
  return [...items].sort((a, b) => {
    const aRoster = rosterIds.has(a.id) ? 0 : 1;
    const bRoster = rosterIds.has(b.id) ? 0 : 1;
    if (aRoster !== bRoster) return aRoster - bRoster;
    return 0;
  });
}
