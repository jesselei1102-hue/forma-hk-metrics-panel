import { useState, useEffect, useMemo } from 'preact/hooks';
import type { Profile, TowerLimit, MixTargetEntry, SiteClass, UseType } from '../types';

interface Props {
  profile: Profile;
  onSave: (profile: Profile) => void;
  onCancel: () => void;
  isNew?: boolean;
}

export function ProfileEditor({ profile, onSave, onCancel, isNew = false }: Props) {
  const [formData, setFormData] = useState<Profile>({ ...profile });
  const [towerInput, setTowerInput] = useState('');

  useEffect(() => {
    setFormData({ ...profile });
  }, [profile]);

  const handleChange = (field: keyof Profile, value: string | number | null | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const parseNumber = (value: string): number | null => {
    if (value === '' || value === null) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  const handleMixTargetUpdate = (index: number, field: keyof MixTargetEntry, value: string | string[] | number) => {
    const mixTargets = formData.mixTargets || [];
    const updated = mixTargets.map((t, i) => {
      if (i !== index) return t;
      if (field === 'share') {
        const percent = typeof value === 'number' ? value : parseFloat(value as string) || 0;
        return { ...t, share: Math.max(0, Math.min(100, percent)) / 100 };
      }
      if (field === 'match') {
        const matchArray = typeof value === 'string'
          ? value.split(',').map((s) => s.trim()).filter(Boolean)
          : value as string[];
        return { ...t, match: matchArray };
      }
      return { ...t, [field]: value };
    });
    setFormData((prev) => ({ ...prev, mixTargets: updated }));
  };

  const handleAddMixTarget = () => {
    const mixTargets = formData.mixTargets || [];
    const newTarget: MixTargetEntry = {
      id: `mix-${Date.now()}`,
      label: 'New Mix Target',
      match: [],
      share: 0,
    };
    setFormData((prev) => ({ ...prev, mixTargets: [...mixTargets, newTarget] }));
  };

  const handleRemoveMixTarget = (index: number) => {
    const mixTargets = formData.mixTargets || [];
    setFormData((prev) => ({ ...prev, mixTargets: mixTargets.filter((_, i) => i !== index) }));
  };

  const mixTargetShareSum = useMemo(() => {
    const targets = formData.mixTargets || [];
    return targets.reduce((sum, t) => sum + t.share, 0);
  }, [formData.mixTargets]);

  const handleNormalizeMixTargets = () => {
    const mixTargets = formData.mixTargets || [];
    if (mixTargets.length === 0 || mixTargetShareSum === 0) return;
    const normalized = mixTargets.map((t) => ({
      ...t,
      share: t.share / mixTargetShareSum,
    }));
    setFormData((prev) => ({ ...prev, mixTargets: normalized }));
  };

  const addTower = () => {
    if (!towerInput.trim()) return;
    const newTower: TowerLimit = {
      id: towerInput.trim(),
      maxBhMpd: 50,
    };
    setFormData((prev) => ({
      ...prev,
      towers: [...prev.towers, newTower],
    }));
    setTowerInput('');
  };

  const updateTower = (index: number, field: keyof TowerLimit, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      towers: prev.towers.map((t, i) =>
        i === index ? { ...t, [field]: field === 'maxBhMpd' ? parseNumber(String(value)) ?? 0 : value } : t
      ),
    }));
  };

  const removeTower = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      towers: prev.towers.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div class="edit-modal" onClick={onCancel}>
      <div class="edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div class="edit-modal-header">
          <h3 class="edit-modal-title">
            {isNew ? 'Create Profile' : `Edit: ${profile.projectName}`}
          </h3>
          <button class="btn btn-icon" onClick={onCancel}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label class="form-label">Project Name</label>
            <input
              class="form-input"
              type="text"
              value={formData.projectName}
              onInput={(e) => handleChange('projectName', (e.target as HTMLInputElement).value)}
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Site Area (m²)</label>
              <input
                class="form-input"
                type="number"
                step="0.01"
                value={formData.siteAreaM2 ?? ''}
                onInput={(e) =>
                  handleChange('siteAreaM2', parseNumber((e.target as HTMLInputElement).value))
                }
              />
            </div>
            <div class="form-group">
              <label class="form-label">Max GFA (m²)</label>
              <input
                class="form-input"
                type="number"
                step="0.01"
                value={formData.maxGfaM2 ?? ''}
                onInput={(e) =>
                  handleChange('maxGfaM2', parseNumber((e.target as HTMLInputElement).value))
                }
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Max Plot Ratio</label>
              <input
                class="form-input"
                type="number"
                step="0.01"
                value={formData.maxPr ?? ''}
                onInput={(e) =>
                  handleChange('maxPr', parseNumber((e.target as HTMLInputElement).value))
                }
              />
            </div>
            <div class="form-group">
              <label class="form-label">Max Site Coverage</label>
              <input
                class="form-input"
                type="number"
                step="0.01"
                max="1"
                value={formData.maxSc ?? ''}
                onInput={(e) =>
                  handleChange('maxSc', parseNumber((e.target as HTMLInputElement).value))
                }
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Ground Floor mPD</label>
              <input
                class="form-input"
                type="number"
                step="0.01"
                value={formData.gfMpd}
                onInput={(e) =>
                  handleChange('gfMpd', parseNumber((e.target as HTMLInputElement).value) ?? 0)
                }
              />
            </div>
            <div class="form-group">
              <label class="form-label">Min POS (m²)</label>
              <input
                class="form-input"
                type="number"
                step="0.01"
                value={formData.minPosM2 ?? ''}
                onInput={(e) =>
                  handleChange('minPosM2', parseNumber((e.target as HTMLInputElement).value))
                }
              />
            </div>
          </div>

          <div class="form-group bpr-section">
            <label class="form-label">B(P)R First Schedule (optional)</label>
            <div class="bpr-hint">
              Set these to see Cap. 123F statutory intensity caps alongside profile limits.
              Building height auto-derives from tower mPD inputs, or set manual override below.
            </div>
            <div class="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div class="form-group" style={{ marginBottom: 0 }}>
                <label class="form-label-sm">Site Class (reg 18A)</label>
                <select
                  class="form-input"
                  value={formData.siteClass ?? ''}
                  onChange={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    handleChange('siteClass', val === '' ? null : val as SiteClass);
                  }}
                >
                  <option value="">— Not set —</option>
                  <option value="A">Class A (urban)</option>
                  <option value="B">Class B (intermediate)</option>
                  <option value="C">Class C (low density)</option>
                </select>
              </div>
              <div class="form-group" style={{ marginBottom: 0 }}>
                <label class="form-label-sm">Use Type</label>
                <select
                  class="form-input"
                  value={formData.useType ?? ''}
                  onChange={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    handleChange('useType', val === '' ? null : val as UseType);
                  }}
                >
                  <option value="">— Not set —</option>
                  <option value="domestic">Domestic</option>
                  <option value="non-domestic">Non-domestic</option>
                  <option value="composite">Composite (mixed)</option>
                </select>
              </div>
            </div>
            <div class="form-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '8px' }}>
              <div class="form-group" style={{ marginBottom: 0 }}>
                <label class="form-label-sm">Building Height Override (m)</label>
                <input
                  class="form-input"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.buildingHeightM ?? ''}
                  onInput={(e) =>
                    handleChange('buildingHeightM', parseNumber((e.target as HTMLInputElement).value))
                  }
                  placeholder="Auto from towers"
                />
              </div>
              {formData.useType === 'composite' && (
                <div class="form-group" style={{ marginBottom: 0 }}>
                  <label class="form-label-sm">Domestic GFA Share (%)</label>
                  <input
                    class="form-input"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={formData.domesticShare !== null && formData.domesticShare !== undefined
                      ? Math.round(formData.domesticShare * 100)
                      : ''}
                    onInput={(e) => {
                      const pct = parseNumber((e.target as HTMLInputElement).value);
                      handleChange('domesticShare', pct !== null ? Math.max(0, Math.min(100, pct)) / 100 : null);
                    }}
                    placeholder="e.g. 60"
                  />
                </div>
              )}
            </div>
            {formData.useType === 'composite' && (
              <div class="bpr-composite-info">
                <strong>Note:</strong> Reg 21(2) constrains domestic PR based on actual non-domestic usage — 
                not a simple weighted average. The panel shows an indicative blend for early design; 
                actual compliance depends on the specific GFA split at BA submission.
                {formData.domesticShare === null || formData.domesticShare === undefined
                  ? ' Set domestic share % for indicative blend.'
                  : ` Indicative: ${Math.round((formData.domesticShare ?? 0) * 100)}% dom. / ${Math.round((1 - (formData.domesticShare ?? 0)) * 100)}% non-dom.`}
              </div>
            )}
          </div>

          <div class="form-group">
            <label class="form-label">Towers (Height Limits)</label>
            {formData.towers.map((tower, index) => (
              <div key={tower.id} class="form-row" style={{ marginBottom: '8px' }}>
                <input
                  class="form-input"
                  type="text"
                  value={tower.id}
                  onInput={(e) => updateTower(index, 'id', (e.target as HTMLInputElement).value)}
                  placeholder="Tower ID"
                />
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    class="form-input"
                    type="number"
                    step="0.1"
                    value={tower.maxBhMpd}
                    onInput={(e) =>
                      updateTower(index, 'maxBhMpd', (e.target as HTMLInputElement).value)
                    }
                    placeholder="Max Height mPD"
                    style={{ width: '100px' }}
                  />
                  <button type="button" class="btn btn-icon" onClick={() => removeTower(index)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <div class="form-row" style={{ marginTop: '8px' }}>
              <input
                class="form-input"
                type="text"
                value={towerInput}
                onInput={(e) => setTowerInput((e.target as HTMLInputElement).value)}
                placeholder="New tower ID"
              />
              <button type="button" class="btn" onClick={addTower}>
                Add Tower
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Mix Targets (GFA Share)</label>
            {(formData.mixTargets || []).map((target, index) => (
              <div key={target.id} class="form-row" style={{ marginBottom: '8px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input
                    class="form-input"
                    type="text"
                    value={target.label}
                    onInput={(e) => handleMixTargetUpdate(index, 'label', (e.target as HTMLInputElement).value)}
                    placeholder="Label (e.g. Office GFA)"
                    style={{ marginBottom: '4px' }}
                  />
                  <input
                    class="form-input"
                    type="text"
                    value={target.match.join(', ')}
                    onInput={(e) => handleMixTargetUpdate(index, 'match', (e.target as HTMLInputElement).value)}
                    placeholder="Match keywords (comma-separated)"
                    style={{ fontSize: '11px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                  <input
                    class="form-input"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(target.share * 100)}
                    onInput={(e) => handleMixTargetUpdate(index, 'share', (e.target as HTMLInputElement).value)}
                    style={{ width: '60px' }}
                  />
                  <span style={{ fontSize: '11px' }}>%</span>
                  <button type="button" class="btn btn-icon" onClick={() => handleRemoveMixTarget(index)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
              <button type="button" class="btn" onClick={handleAddMixTarget}>
                + Add Mix Target
              </button>
              {Math.abs(mixTargetShareSum - 1) > 0.001 && (formData.mixTargets?.length ?? 0) > 0 && (
                <>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                    Sum: {Math.round(mixTargetShareSum * 100)}%
                  </span>
                  <button type="button" class="btn" onClick={handleNormalizeMixTargets}>
                    Normalize
                  </button>
                </>
              )}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Source Note</label>
            <input
              class="form-input"
              type="text"
              value={formData.sourceNote ?? ''}
              onInput={(e) => handleChange('sourceNote', (e.target as HTMLInputElement).value)}
              placeholder="Optional reference or note"
            />
          </div>

          <div class="form-actions">
            <button type="button" class="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
