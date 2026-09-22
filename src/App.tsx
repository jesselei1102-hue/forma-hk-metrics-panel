import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import type { Profile, AreaMetricsData, StatusThresholds, TowerHeights, MetricRow } from './types';
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

const VISIBILITY_STORAGE_KEY = 'forma-hk-metrics-visibility';
const SEEN_CUSTOM_METRICS_KEY = 'forma-hk-metrics-seen-custom';

type MetricVisibility = Record<string, boolean>;

function loadVisibility(): MetricVisibility {
  try {
    const stored = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveVisibility(visibility: MetricVisibility): void {
  try {
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // localStorage unavailable
  }
}

function loadSeenCustomMetrics(): Set<string> {
  try {
    const stored = localStorage.getItem(SEEN_CUSTOM_METRICS_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function saveSeenCustomMetrics(seen: Set<string>): void {
  try {
    localStorage.setItem(SEEN_CUSTOM_METRICS_KEY, JSON.stringify([...seen]));
  } catch {
    // localStorage unavailable
  }
}

function getMetricKey(metric: MetricRow): string {
  return metric.customMetricId ? `custom:${metric.customMetricId}` : `builtin:${metric.name}`;
}

const BUILTIN_METRIC_NAMES = [
  'Site Area',
  'GFA Total',
  'Plot Ratio',
  'Site Coverage',
  'Office GFA',
  'Retail GFA',
  'POS Area',
];

function isBuiltinMetric(metric: MetricRow): boolean {
  if (metric.customMetricId) return false;
  return BUILTIN_METRIC_NAMES.includes(metric.name) || metric.name.startsWith('Height (');
}

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
  const [visibility, setVisibility] = useState<MetricVisibility>(() => loadVisibility());
  const [seenCustomMetrics, setSeenCustomMetrics] = useState<Set<string>>(() => loadSeenCustomMetrics());
  const [configExpanded, setConfigExpanded] = useState(false);

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
          customMetrics: [],
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

  const allMetrics = areaMetrics
    ? calculateMetrics(areaMetrics, selectedProfile, thresholds, towerHeights)
    : [];

  useEffect(() => {
    if (allMetrics.length === 0) return;
    const newSeen = new Set(seenCustomMetrics);
    let changed = false;
    for (const metric of allMetrics) {
      if (metric.customMetricId && !seenCustomMetrics.has(metric.customMetricId)) {
        newSeen.add(metric.customMetricId);
        changed = true;
      }
    }
    if (changed) {
      setSeenCustomMetrics(newSeen);
      saveSeenCustomMetrics(newSeen);
    }
  }, [allMetrics, seenCustomMetrics]);

  const getVisibility = useCallback((metric: MetricRow): boolean => {
    const key = getMetricKey(metric);
    if (key in visibility) return visibility[key];
    if (isBuiltinMetric(metric)) return true;
    if (metric.customMetricId && seenCustomMetrics.has(metric.customMetricId)) {
      return true;
    }
    return true;
  }, [visibility, seenCustomMetrics]);

  const handleVisibilityChange = useCallback((metric: MetricRow, checked: boolean) => {
    const key = getMetricKey(metric);
    const newVis = { ...visibility, [key]: checked };
    setVisibility(newVis);
    saveVisibility(newVis);
  }, [visibility]);

  const visibleMetrics = useMemo(() => {
    return allMetrics.filter(getVisibility);
  }, [allMetrics, getVisibility]);

  return (
    <div class="panel">
      <div class="header">
        <h1 class="title">Design Metric Track</h1>
      </div>

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
              <label>{tower.id} mPD</label>
              <input
                type="number"
                step="0.1"
                value={towerHeights[tower.id] || ''}
                onInput={(e) => handleTowerHeightChange(tower.id, (e.target as HTMLInputElement).value)}
                placeholder={`≤${tower.maxBhMpd}`}
              />
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
        <>
          <MetricsTable metrics={visibleMetrics} />
          <div class="config-section">
            <button
              class="config-toggle"
              onClick={() => setConfigExpanded(!configExpanded)}
            >
              {configExpanded ? '▾' : '▸'} Configure metrics
            </button>
            {configExpanded && (
              <div class="config-content">
                <div class="config-label">Metrics to show:</div>
                {allMetrics.map((metric) => {
                  const key = getMetricKey(metric);
                  const checked = getVisibility(metric);
                  return (
                    <div class="checkbox-row" key={key}>
                      <input
                        type="checkbox"
                        id={`vis-${key}`}
                        checked={checked}
                        onChange={(e) =>
                          handleVisibilityChange(metric, (e.target as HTMLInputElement).checked)
                        }
                      />
                      <label for={`vis-${key}`}>{metric.name}</label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
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
