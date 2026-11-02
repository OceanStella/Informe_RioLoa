export type EquipmentType = 'truck' | 'machinery';

export interface NamedConfigItem {
  id: string;
  name: string;
}

export interface EquipmentConfigItem {
  id: string;
  code: string;
  type: EquipmentType;
  capacityM3: number | null;
}

export interface AppConfig {
  generalAreas: NamedConfigItem[];
  activityAreas: NamedConfigItem[];
  equipment: EquipmentConfigItem[];
}
