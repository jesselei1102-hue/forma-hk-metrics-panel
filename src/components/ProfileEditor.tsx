import { useState, useEffect, useMemo } from 'preact/hooks';
import type { Profile, TowerLimit, MixTargetEntry } from '../types';

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
