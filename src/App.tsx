import { useState, useEffect, useCallback } from 'preact/hooks';
import type { Profile, AreaMetricsData, StatusThresholds, TowerHeights } from './types';
import {
  loadProfiles,
  saveProfiles,
  loadSelectedProfileId,
  saveSelectedProfileId,
  BLANK_PROFILE,
} from './profiles';
import { fetchAreaMetrics, isFormaEnvironment } from './forma-api';
import { calculateMetrics } from './metrics';
import { MetricsTable } from './components/MetricsTable';
import { ProfileEditor } from './components/ProfileEditor';
import { Disclaimer } from './components/Disclaimer';

export function App() {
  const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles());
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => loadSelectedProfileId());
  const [areaMetrics, setAreaMetrics] = useState<AreaMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForma, setIsForma] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [towerHeights, setTowerHeights] = useState<TowerHeights>({});
  const [yellowEnabled, setYellowEnabled] = useState(true);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  const thresholds: StatusThresholds = {
    yellowEnabled,
    yellowMax: 105,
  };

  const refreshMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const inForma = await isFormaEnvironment();
      setIsForma(inForma);

      if (inForma) {
        const metrics = await fetchAreaMetrics();
        setAreaMetrics(metrics);
      } else {
        setAreaMetrics({
          siteArea: null,
          grossFloorArea: null,
          buildingCoverage: null,
          functionBreakdown: [],
        });
        setError(
          'Not running inside Forma. Load this extension in Autodesk Forma to see live metrics.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const handleProfileChange = (e: Event) => {
    const id = (e.target as HTMLSelectElement).value;
    setSelectedProfileId(id);
    saveSelectedProfileId(id);
  };

  const handleEditProfile = () => {
    if (selectedProfile) {
      setEditingProfile({ ...selectedProfile });
      setIsCreatingProfile(false);
    }
  };

  const handleCreateProfile = () => {
    const newProfile: Profile = {
      ...BLANK_PROFILE,
      id: `custom-${Date.now()}`,
      projectName: 'New Profile',
    };
    setEditingProfile(newProfile);
    setIsCreatingProfile(true);
  };

  const handleSaveProfile = (profile: Profile) => {
    let updatedProfiles: Profile[];
    if (isCreatingProfile) {
      updatedProfiles = [...profiles, profile];
      setSelectedProfileId(profile.id);
      saveSelectedProfileId(profile.id);
    } else {
      updatedProfiles = profiles.map((p) => (p.id === profile.id ? profile : p));
    }
    setProfiles(updatedProfiles);
    saveProfiles(updatedProfiles);
    setEditingProfile(null);
    setIsCreatingProfile(false);
  };

  const handleCancelEdit = () => {
    setEditingProfile(null);
    setIsCreatingProfile(false);
  };

  const handleTowerHeightChange = (towerId: string, value: string) => {
    setTowerHeights((prev) => ({ ...prev, [towerId]: value }));
  };

  const metrics = areaMetrics
    ? calculateMetrics(areaMetrics, selectedProfile, thresholds, towerHeights)
    : [];

  return (
    <div class="panel">
      <div class="header">
        <h1 class="title">HK Metrics Panel</h1>
      </div>

      <Disclaimer />

      <div class="profile-section">
        <div class="profile-row">
          <select class="profile-select" value={selectedProfileId} onChange={handleProfileChange}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectName}
              </option>
            ))}
          </select>
          <button class="btn" onClick={handleEditProfile} title="Edit profile">
            ✎
          </button>
          <button class="btn" onClick={handleCreateProfile} title="Create new profile">
            +
          </button>
        </div>
        {selectedProfile.sourceNote && (
          <div class="source-note">{selectedProfile.sourceNote}</div>
        )}
      </div>

      {selectedProfile.towers.length > 0 && (
        <div class="height-input-section">
          {selectedProfile.towers.map((tower) => (
            <div class="height-input-row" key={tower.id}>
              <label>{tower.id}:</label>
              <input
                type="number"
                step="0.1"
                value={towerHeights[tower.id] || ''}
                onInput={(e) => handleTowerHeightChange(tower.id, (e.target as HTMLInputElement).value)}
                placeholder={`≤${tower.maxBhMpd}`}
              />
              <span>mPD</span>
            </div>
          ))}
        </div>
      )}

      <div class="toolbar">
        <div class="checkbox-row">
          <input
            type="checkbox"
            id="yellow-toggle"
            checked={yellowEnabled}
            onChange={(e) => setYellowEnabled((e.target as HTMLInputElement).checked)}
          />
          <label for="yellow-toggle">Yellow zone (100-105%)</label>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-primary" onClick={refreshMetrics} disabled={loading}>
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div class="error">{error}</div>}

      {loading ? (
        <div class="loading">Loading metrics...</div>
      ) : (
        <MetricsTable metrics={metrics} />
      )}

      {!isForma && !loading && (
        <div class="error">
          <strong>Development Mode:</strong> Metrics will be populated when loaded inside Autodesk
          Forma. See README for setup instructions.
        </div>
      )}

      {editingProfile && (
        <ProfileEditor
          profile={editingProfile}
          onSave={handleSaveProfile}
          onCancel={handleCancelEdit}
          isNew={isCreatingProfile}
        />
      )}
    </div>
  );
}
