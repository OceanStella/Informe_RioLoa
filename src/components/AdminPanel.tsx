import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  MapPin,
  Pencil,
  Plus,
  Tractor,
  Trash2,
  Truck,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useConfig } from '../context/ConfigContext';
import { useReport } from '../context/ReportContext';
import type { AppConfig, EquipmentConfigItem, NamedConfigItem } from '../types/config';
import { PageHead } from './ui/PageHead';
import { SectionHeader, type Tone } from './ui/SectionHeader';

interface AdminPanelProps {
  onBack: () => void;
  backLabel?: string;
}

interface NamedDraft {
  id: string;
  name: string;
}

interface EquipmentDraft {
  id: string;
  code: string;
  type: 'truck' | 'machinery';
  capacityM3: string;
}

function cloneConfig(config: AppConfig): AppConfig {
  return {
    generalAreas: config.generalAreas.map((item) => ({ ...item })),
    activityAreas: config.activityAreas.map((item) => ({ ...item })),
    equipment: config.equipment.map((item) => ({ ...item })),
  };
}

type AdminTab = 'general' | 'activity' | 'trucks' | 'machinery';

export function AdminPanel({ onBack, backLabel = 'Volver al informe' }: AdminPanelProps) {
  const { config, setConfig } = useConfig();
  const { report } = useReport();
  const [draft, setDraft] = useState<AppConfig>(() => cloneConfig(config));
  const [editingNamed, setEditingNamed] = useState<Record<string, NamedDraft>>({});
  const [editingEquipment, setEditingEquipment] = useState<Record<string, EquipmentDraft>>({});
  const [adding, setAdding] = useState<{
    general?: NamedDraft;
    activity?: NamedDraft;
    truck?: EquipmentDraft;
    machinery?: EquipmentDraft;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('general');

  const usedEquipmentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of report.roster) ids.add(item.equipmentId);
    for (const activity of report.activities) {
      for (const assignment of activity.equipmentAssignments) ids.add(assignment.equipmentId);
    }
    return ids;
  }, [report]);

  const persist = async (next: AppConfig) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(next),
      });
      const payload = (await response.json()) as { ok?: boolean; config?: AppConfig; message?: string };
      if (!response.ok || !payload.ok || !payload.config) {
        setError(payload.message || 'No fue posible guardar la configuración.');
        return false;
      }
      setDraft(cloneConfig(payload.config));
      setConfig(payload.config);
      setSuccess('Configuración guardada.');
      return true;
    } catch {
      setError('No fue posible guardar la configuración.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveNamed = async (key: 'generalAreas' | 'activityAreas', item: NamedDraft) => {
    const name = item.name.trim();
    if (!name) {
      setError('El nombre es obligatorio.');
      return;
    }
    const next = {
      ...draft,
      [key]: draft[key].map((entry) => (entry.id === item.id ? { ...entry, name } : entry)),
    };
    const ok = await persist(next);
    if (ok) {
      setEditingNamed((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    }
  };

  const addNamed = async (key: 'generalAreas' | 'activityAreas', item: NamedDraft) => {
    const name = item.name.trim();
    if (!name) {
      setError('El nombre es obligatorio.');
      return;
    }
    const next = { ...draft, [key]: [...draft[key], { id: crypto.randomUUID(), name }] };
    const ok = await persist(next);
    if (ok) {
      setAdding((prev) => ({ ...prev, [key === 'generalAreas' ? 'general' : 'activity']: undefined }));
    }
  };

  const deleteNamed = async (key: 'generalAreas' | 'activityAreas', item: NamedConfigItem) => {
    const okConfirm = window.confirm(`¿Eliminar "${item.name}"?`);
    if (!okConfirm) return;
    const next = { ...draft, [key]: draft[key].filter((entry) => entry.id !== item.id) };
    await persist(next);
  };

  const saveEquipment = async (item: EquipmentDraft) => {
    const code = item.code.trim();
    if (!code) {
      setError('El código es obligatorio.');
      return;
    }
    const capacity = item.capacityM3.trim() === '' ? null : Number(item.capacityM3);
    const nextItem: EquipmentConfigItem = {
      id: item.id,
      code,
      type: item.type,
      capacityM3: capacity,
    };
    const next = {
      ...draft,
      equipment: draft.equipment.map((entry) => (entry.id === item.id ? nextItem : entry)),
    };
    const ok = await persist(next);
    if (ok) {
      setEditingEquipment((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    }
  };

  const addEquipment = async (item: EquipmentDraft, kind: 'truck' | 'machinery') => {
    const code = item.code.trim();
    if (!code) {
      setError('El código es obligatorio.');
      return;
    }
    const capacity = item.capacityM3.trim() === '' ? null : Number(item.capacityM3);
    const nextItem: EquipmentConfigItem = {
      id: crypto.randomUUID(),
      code,
      type: kind,
      capacityM3: capacity,
    };
    const next = { ...draft, equipment: [...draft.equipment, nextItem] };
    const ok = await persist(next);
    if (ok) {
      setAdding((prev) => ({ ...prev, [kind]: undefined }));
    }
  };

  const deleteEquipment = async (item: EquipmentConfigItem) => {
    const inUse = usedEquipmentIds.has(item.id);
    const message = inUse
      ? 'Este equipo está actualmente utilizado en el informe. Si lo eliminas de la configuración seguirá disponible en este informe hasta recargar, pero no aparecerá en nuevos informes. ¿Deseas continuar?'
      : `¿Eliminar el equipo ${item.code}?`;
    const okConfirm = window.confirm(message);
    if (!okConfirm) return;
    const next = { ...draft, equipment: draft.equipment.filter((entry) => entry.id !== item.id) };
    await persist(next);
  };

  const trucks = draft.equipment.filter((item) => item.type === 'truck');
  const machinery = draft.equipment.filter((item) => item.type === 'machinery');

  const tabs: { id: AdminTab; label: string; icon: LucideIcon; tone: Tone; count: number }[] = [
    { id: 'general', label: 'Pozas generales', icon: MapPin, tone: 'cyan', count: draft.generalAreas.length },
    { id: 'activity', label: 'Pozas de actividades', icon: Waves, tone: 'aqua', count: draft.activityAreas.length },
    { id: 'trucks', label: 'Camiones Tolva', icon: Truck, tone: 'sand', count: trucks.length },
    { id: 'machinery', label: 'Maquinaria', icon: Tractor, tone: 'coral', count: machinery.length },
  ];

  return (
    <>
        <main className="app-main admin-main">
          <PageHead
            title="Administración de parámetros"
            actions={
              <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
                <ArrowLeft size={16} aria-hidden="true" />
                {backLabel}
              </button>
            }
          />

          {(error || success) && (
            <div className="alert-stack">
              {error && (
                <div className="global-alert" role="alert">
                  <CircleAlert size={16} aria-hidden="true" />
                  {error}
                </div>
              )}
              {success && (
                <div className="global-alert global-alert-success" role="status">
                  <CircleCheck size={16} aria-hidden="true" />
                  {success}
                </div>
              )}
            </div>
          )}

          <div className="admin-tabs" role="tablist" aria-label="Parámetros">
            {tabs.map(({ id, label, icon: Icon, tone, count }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`admin-tab-${id}`}
                aria-selected={activeTab === id}
                aria-controls="admin-tabpanel"
                className={`admin-tab tone-${tone}${activeTab === id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <span className="admin-tab-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span className="admin-tab-label">{label}</span>
                <span className="admin-tab-count">{count}</span>
              </button>
            ))}
          </div>

          <div className="admin-tabpanel" id="admin-tabpanel" role="tabpanel" aria-labelledby={`admin-tab-${activeTab}`}>
            {activeTab === 'general' && (
              <NamedSection
                id="admin-general"
                icon={MapPin}
                tone="cyan"
                title="Pozas / áreas de antecedentes generales"
                items={draft.generalAreas}
                editing={editingNamed}
                adding={adding.general}
                disabled={saving}
                onStartAdd={() => setAdding((prev) => ({ ...prev, general: { id: 'new', name: '' } }))}
                onCancelAdd={() => setAdding((prev) => ({ ...prev, general: undefined }))}
                onChangeAdd={(name) => setAdding((prev) => ({ ...prev, general: { id: 'new', name } }))}
                onSaveAdd={() => adding.general && addNamed('generalAreas', adding.general)}
                onStartEdit={(item) => setEditingNamed((prev) => ({ ...prev, [item.id]: { ...item } }))}
                onChangeEdit={(id, name) => setEditingNamed((prev) => ({ ...prev, [id]: { id, name } }))}
                onSaveEdit={(id) => editingNamed[id] && saveNamed('generalAreas', editingNamed[id])}
                onCancelEdit={(id) =>
                  setEditingNamed((prev) => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                  })
                }
                onDelete={(item) => deleteNamed('generalAreas', item)}
              />
            )}

            {activeTab === 'activity' && (
              <NamedSection
                id="admin-activity"
                icon={Waves}
                tone="aqua"
                title="Pozas / áreas de actividades"
                items={draft.activityAreas}
                editing={editingNamed}
                adding={adding.activity}
                disabled={saving}
                onStartAdd={() => setAdding((prev) => ({ ...prev, activity: { id: 'new', name: '' } }))}
                onCancelAdd={() => setAdding((prev) => ({ ...prev, activity: undefined }))}
                onChangeAdd={(name) => setAdding((prev) => ({ ...prev, activity: { id: 'new', name } }))}
                onSaveAdd={() => adding.activity && addNamed('activityAreas', adding.activity)}
                onStartEdit={(item) => setEditingNamed((prev) => ({ ...prev, [item.id]: { ...item } }))}
                onChangeEdit={(id, name) => setEditingNamed((prev) => ({ ...prev, [id]: { id, name } }))}
                onSaveEdit={(id) => editingNamed[id] && saveNamed('activityAreas', editingNamed[id])}
                onCancelEdit={(id) =>
                  setEditingNamed((prev) => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                  })
                }
                onDelete={(item) => deleteNamed('activityAreas', item)}
              />
            )}

            {activeTab === 'trucks' && (
              <EquipmentSection
                id="admin-trucks"
                icon={Truck}
                tone="sand"
                title="Camiones Tolva"
                addLabel="Agregar camión"
                capacityLabel="Capacidad M³ por vuelta"
                items={trucks}
                editing={editingEquipment}
                adding={adding.truck}
                disabled={saving}
                onStartAdd={() =>
                  setAdding((prev) => ({ ...prev, truck: { id: 'new', code: '', type: 'truck', capacityM3: '18' } }))
                }
                onCancelAdd={() => setAdding((prev) => ({ ...prev, truck: undefined }))}
                onChangeAdd={(patch) =>
                  setAdding((prev) => ({ ...prev, truck: { ...(prev.truck as EquipmentDraft), ...patch } }))
                }
                onSaveAdd={() => adding.truck && addEquipment(adding.truck, 'truck')}
                onStartEdit={(item) =>
                  setEditingEquipment((prev) => ({
                    ...prev,
                    [item.id]: {
                      id: item.id,
                      code: item.code,
                      type: 'truck',
                      capacityM3: item.capacityM3 == null ? '' : String(item.capacityM3),
                    },
                  }))
                }
                onChangeEdit={(id, patch) =>
                  setEditingEquipment((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
                }
                onSaveEdit={(id) => editingEquipment[id] && saveEquipment(editingEquipment[id])}
                onCancelEdit={(id) =>
                  setEditingEquipment((prev) => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                  })
                }
                onDelete={deleteEquipment}
              />
            )}

            {activeTab === 'machinery' && (
              <EquipmentSection
                id="admin-machinery"
                icon={Tractor}
                tone="coral"
                title="Maquinaria"
                addLabel="Agregar maquinaria"
                capacityLabel="Capacidad M³"
                items={machinery}
                editing={editingEquipment}
                adding={adding.machinery}
                disabled={saving}
                onStartAdd={() =>
                  setAdding((prev) => ({
                    ...prev,
                    machinery: { id: 'new', code: '', type: 'machinery', capacityM3: '' },
                  }))
                }
                onCancelAdd={() => setAdding((prev) => ({ ...prev, machinery: undefined }))}
                onChangeAdd={(patch) =>
                  setAdding((prev) => ({ ...prev, machinery: { ...(prev.machinery as EquipmentDraft), ...patch } }))
                }
                onSaveAdd={() => adding.machinery && addEquipment(adding.machinery, 'machinery')}
                onStartEdit={(item) =>
                  setEditingEquipment((prev) => ({
                    ...prev,
                    [item.id]: {
                      id: item.id,
                      code: item.code,
                      type: 'machinery',
                      capacityM3: item.capacityM3 == null ? '' : String(item.capacityM3),
                    },
                  }))
                }
                onChangeEdit={(id, patch) =>
                  setEditingEquipment((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
                }
                onSaveEdit={(id) => editingEquipment[id] && saveEquipment(editingEquipment[id])}
                onCancelEdit={(id) =>
                  setEditingEquipment((prev) => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                  })
                }
                onDelete={deleteEquipment}
              />
            )}
          </div>
        </main>
    </>
  );
}

interface NamedSectionProps {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  items: NamedConfigItem[];
  editing: Record<string, NamedDraft>;
  adding?: NamedDraft;
  disabled: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onChangeAdd: (name: string) => void;
  onSaveAdd: () => void;
  onStartEdit: (item: NamedConfigItem) => void;
  onChangeEdit: (id: string, name: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onDelete: (item: NamedConfigItem) => void;
}

interface RowActionsProps {
  editing: boolean;
  disabled: boolean;
  label: string;
  onSave: () => void;
  onCancel: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function RowActions({ editing, disabled, label, onSave, onCancel, onEdit, onDelete }: RowActionsProps) {
  return (
    <span className="table-actions">
      {editing ? (
        <>
          <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={onSave}>
            Guardar
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancelar
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit} aria-label={`Editar ${label}`}>
            <Pencil size={14} aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            className="btn btn-danger-ghost btn-sm"
            disabled={disabled}
            onClick={onDelete}
            aria-label={`Eliminar ${label}`}
          >
            <Trash2 size={14} aria-hidden="true" />
            Eliminar
          </button>
        </>
      )}
    </span>
  );
}

function NamedSection(props: NamedSectionProps) {
  return (
    <section className="report-section" id={props.id}>
      <SectionHeader title={props.title} icon={props.icon} tone={props.tone} />
      <div className="panel panel-flush">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {props.items.map((item) => {
                const draft = props.editing[item.id];
                return (
                  <tr key={item.id} className={draft ? 'row-editing' : undefined}>
                    <td>
                      {draft ? (
                        <input
                          type="text"
                          aria-label="Nombre"
                          value={draft.name}
                          onChange={(e) => props.onChangeEdit(item.id, e.target.value)}
                        />
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="col-actions">
                      <RowActions
                        editing={Boolean(draft)}
                        disabled={props.disabled}
                        label={item.name}
                        onSave={() => props.onSaveEdit(item.id)}
                        onCancel={() => props.onCancelEdit(item.id)}
                        onEdit={() => props.onStartEdit(item)}
                        onDelete={() => props.onDelete(item)}
                      />
                    </td>
                  </tr>
                );
              })}
              {props.adding && (
                <tr className="row-editing">
                  <td>
                    <input
                      type="text"
                      aria-label="Nombre"
                      value={props.adding.name}
                      onChange={(e) => props.onChangeAdd(e.target.value)}
                      placeholder="Nombre"
                    />
                  </td>
                  <td className="col-actions">
                    <RowActions
                      editing
                      disabled={props.disabled}
                      label="nuevo elemento"
                      onSave={props.onSaveAdd}
                      onCancel={props.onCancelAdd}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!props.adding && (
          <div className="panel-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={props.onStartAdd}>
              <Plus size={15} aria-hidden="true" />
              Agregar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

interface EquipmentSectionProps {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  addLabel: string;
  capacityLabel: string;
  items: EquipmentConfigItem[];
  editing: Record<string, EquipmentDraft>;
  adding?: EquipmentDraft;
  disabled: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onChangeAdd: (patch: Partial<EquipmentDraft>) => void;
  onSaveAdd: () => void;
  onStartEdit: (item: EquipmentConfigItem) => void;
  onChangeEdit: (id: string, patch: Partial<EquipmentDraft>) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onDelete: (item: EquipmentConfigItem) => void;
}

function EquipmentSection(props: EquipmentSectionProps) {
  return (
    <section className="report-section" id={props.id}>
      <SectionHeader title={props.title} icon={props.icon} tone={props.tone} />
      <div className="panel panel-flush">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>{props.capacityLabel}</th>
                <th className="col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {props.items.map((item) => {
                const draft = props.editing[item.id];
                return (
                  <tr key={item.id} className={draft ? 'row-editing' : undefined}>
                    <td>
                      {draft ? (
                        <input
                          type="text"
                          aria-label="Código"
                          value={draft.code}
                          onChange={(e) => props.onChangeEdit(item.id, { code: e.target.value })}
                        />
                      ) : (
                        <span className="num">{item.code}</span>
                      )}
                    </td>
                    <td className="col-num">
                      {draft ? (
                        <input
                          type="number"
                          step="any"
                          aria-label={props.capacityLabel}
                          value={draft.capacityM3}
                          onChange={(e) => props.onChangeEdit(item.id, { capacityM3: e.target.value })}
                        />
                      ) : (
                        item.capacityM3 ?? '—'
                      )}
                    </td>
                    <td className="col-actions">
                      <RowActions
                        editing={Boolean(draft)}
                        disabled={props.disabled}
                        label={item.code}
                        onSave={() => props.onSaveEdit(item.id)}
                        onCancel={() => props.onCancelEdit(item.id)}
                        onEdit={() => props.onStartEdit(item)}
                        onDelete={() => props.onDelete(item)}
                      />
                    </td>
                  </tr>
                );
              })}
              {props.adding && (
                <tr className="row-editing">
                  <td>
                    <input
                      type="text"
                      aria-label="Código"
                      value={props.adding.code}
                      onChange={(e) => props.onChangeAdd({ code: e.target.value })}
                      placeholder="Código"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      aria-label={props.capacityLabel}
                      value={props.adding.capacityM3}
                      onChange={(e) => props.onChangeAdd({ capacityM3: e.target.value })}
                      placeholder={props.capacityLabel}
                    />
                  </td>
                  <td className="col-actions">
                    <RowActions
                      editing
                      disabled={props.disabled}
                      label="nuevo equipo"
                      onSave={props.onSaveAdd}
                      onCancel={props.onCancelAdd}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!props.adding && (
          <div className="panel-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={props.onStartAdd}>
              <Plus size={15} aria-hidden="true" />
              {props.addLabel}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
