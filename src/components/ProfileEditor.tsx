import { useState, useEffect } from 'preact/hooks';
import type { Profile, TowerLimit } from '../types';

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

  const handleMixShareChange = (field: 'officeShare' | 'retailShare', percentValue: number) => {
    const clamped = Math.max(0, Math.min(100, percentValue));
    const share = clamped / 100;
    const otherShare = (100 - clamped) / 100;

    const newMixTarget = field === 'officeShare'
      ? { officeShare: share, retailShare: otherShare }
      : { officeShare: otherShare, retailShare: share };

    setFormData((prev) => ({
      ...prev,
      useMix: true,
      mixTarget: newMixTarget,
    }));
  };

  const parseNumber = (value: string): number | null => {
    if (value === '' || value === null) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
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
            <label class="form-label">Office/Retail Mix Target</label>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" style={{ fontSize: '10px' }}>Office %</label>
                <input
                  class="form-input"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round((formData.mixTarget?.officeShare ?? 0) * 100)}
                  onInput={(e) => handleMixShareChange('officeShare', parseFloat((e.target as HTMLInputElement).value) || 0)}
                />
              </div>
              <div class="form-group">
                <label class="form-label" style={{ fontSize: '10px' }}>Retail %</label>
                <input
                  class="form-input"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round((formData.mixTarget?.retailShare ?? 0) * 100)}
                  onInput={(e) => handleMixShareChange('retailShare', parseFloat((e.target as HTMLInputElement).value) || 0)}
                />
              </div>
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
