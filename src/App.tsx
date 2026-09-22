import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import type { Profile, AreaMetricsData, StatusThresholds, TowerHeights, MetricRow, MixTargetEntry } from './types';
import {
  loadProfiles,
  saveProfiles,
  loadSelectedProfileId,
  saveSelectedProfileId,
  BLANK_PROFILE,
} from './profiles';
import { fetchAreaMetrics, isFormaEnvironment } from './forma-api';
import { calculateMetricsWithInfo, type MetricsCalculationResult } from './metrics';
import { MetricsTable } from './components/MetricsTable';
import { ProfileEditor } from './components/ProfileEditor';
import { getBprStatus, type BprStatusInfo } from './bpr-first-schedule';

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

const CORE_METRIC_NAMES = [
  'Site Area',
  'GFA Total',
  'Plot Ratio',
  'Site Coverage',
  'POS Area',
];

function isCoreOrMixMetric(metric: MetricRow, mixTargetLabels: string[]): boolean {
  if (metric.customMetricId) return false;
  if (CORE_METRIC_NAMES.includes(metric.name)) return true;
  if (metric.name.startsWith('Height (')) return true;
  if (mixTargetLabels.includes(metric.name)) return true;
  return false;
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
  const [mixTargetsExpanded, setMixTargetsExpanded] = useState(false);

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

  const updateProfileMixTargets = useCallback((newMixTargets: MixTargetEntry[]) => {
    const updatedProfile: Profile = {
      ...selectedProfile,
      mixTargets: newMixTargets,
    };
    const updatedProfiles = profiles.map((p) =>
      p.id === selectedProfile.id ? updatedProfile : p
    );
    setProfiles(updatedProfiles);
    saveProfiles(updatedProfiles);
  }, [selectedProfile, profiles]);

  const handleMixTargetUpdate = useCallback((index: number, field: keyof MixTargetEntry, value: string | string[] | number) => {
    const mixTargets = selectedProfile.mixTargets || [];
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
    updateProfileMixTargets(updated);
  }, [selectedProfile, updateProfileMixTargets]);

  const handleAddMixTarget = useCallback(() => {
    const mixTargets = selectedProfile.mixTargets || [];
    const newTarget: MixTargetEntry = {
      id: `mix-${Date.now()}`,
      label: 'New Mix Target',
      match: [],
      share: 0,
    };
    updateProfileMixTargets([...mixTargets, newTarget]);
  }, [selectedProfile, updateProfileMixTargets]);

  const handleRemoveMixTarget = useCallback((index: number) => {
    const mixTargets = selectedProfile.mixTargets || [];
    updateProfileMixTargets(mixTargets.filter((_, i) => i !== index));
  }, [selectedProfile, updateProfileMixTargets]);

  const handleAddFromFunction = useCallback((functionName: string) => {
    const mixTargets = selectedProfile.mixTargets || [];
    const newTarget: MixTargetEntry = {
      id: `mix-${Date.now()}`,
      label: `${functionName} GFA`,
      match: [functionName.toLowerCase()],
      share: 0,
    };
    updateProfileMixTargets([...mixTargets, newTarget]);
  }, [selectedProfile, updateProfileMixTargets]);

  const mixTargetShareSum = useMemo(() => {
    const targets = selectedProfile.mixTargets || [];
    return targets.reduce((sum, t) => sum + t.share, 0);
  }, [selectedProfile.mixTargets]);

  const handleNormalizeMixTargets = useCallback(() => {
    const mixTargets = selectedProfile.mixTargets || [];
    if (mixTargets.length === 0 || mixTargetShareSum === 0) return;
    const normalized = mixTargets.map((t) => ({
      ...t,
      share: t.share / mixTargetShareSum,
    }));
    updateProfileMixTargets(normalized);
  }, [selectedProfile, mixTargetShareSum, updateProfileMixTargets]);

  const availableFunctions = useMemo(() => {
    if (!areaMetrics) return [];
    const usedMatches = new Set<string>();
    for (const target of selectedProfile.mixTargets || []) {
      for (const m of target.match) {
        usedMatches.add(m.toLowerCase());
      }
    }
    return areaMetrics.functionBreakdown
      .map((f) => f.functionName)
      .filter((name) => !usedMatches.has(name.toLowerCase()));
  }, [areaMetrics, selectedProfile.mixTargets]);

  const metricsResult: MetricsCalculationResult | null = areaMetrics
    ? calculateMetricsWithInfo(areaMetrics, selectedProfile, thresholds, towerHeights)
    : null;

  const allMetrics = metricsResult?.metrics ?? [];
  const derivedHeight = metricsResult?.derivedHeight ?? null;
  const bprResult = metricsResult?.bprResult ?? null;

  const effectiveHeightM = derivedHeight?.heightM ?? null;
  const bprStatus: BprStatusInfo = getBprStatus(
    selectedProfile.siteClass,
    selectedProfile.useType,
    effectiveHeightM,
    selectedProfile.domesticShare
  );

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

  const mixTargetLabels = useMemo(() => {
    return (selectedProfile.mixTargets || []).map((t) => t.label);
  }, [selectedProfile.mixTargets]);

  const getVisibility = useCallback((metric: MetricRow): boolean => {
    const key = getMetricKey(metric);
    if (key in visibility) return visibility[key];
    if (isCoreOrMixMetric(metric, mixTargetLabels)) return true;
    if (metric.customMetricId && seenCustomMetrics.has(metric.customMetricId)) {
      return true;
    }
    return true;
  }, [visibility, seenCustomMetrics, mixTargetLabels]);

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

      <div class="mix-targets-section">
        <button
          class="config-toggle"
          onClick={() => setMixTargetsExpanded(!mixTargetsExpanded)}
        >
          {mixTargetsExpanded ? '▾' : '▸'} Mix targets
          {(selectedProfile.mixTargets?.length ?? 0) > 0 && (
            <span class="mix-count">({selectedProfile.mixTargets?.length})</span>
          )}
        </button>
        {mixTargetsExpanded && (
          <div class="mix-targets-content">
            {(selectedProfile.mixTargets || []).map((target, index) => (
              <div class="mix-target-entry" key={target.id}>
                <div class="mix-target-entry-row">
                  <input
                    type="text"
                    class="mix-target-label-input"
                    value={target.label}
                    onInput={(e) => handleMixTargetUpdate(index, 'label', (e.target as HTMLInputElement).value)}
                    placeholder="Label"
                  />
                  <input
                    type="text"
                    class="mix-target-match-input"
                    value={target.match.join(', ')}
                    onInput={(e) => handleMixTargetUpdate(index, 'match', (e.target as HTMLInputElement).value)}
                    placeholder="Match keywords"
                  />
                  <input
                    type="number"
                    class="mix-target-share-input"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(target.share * 100)}
                    onInput={(e) => handleMixTargetUpdate(index, 'share', (e.target as HTMLInputElement).value)}
                  />
                  <span class="mix-target-percent">%</span>
                  <button
                    class="btn btn-icon-sm"
                    onClick={() => handleRemoveMixTarget(index)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <div class="mix-targets-actions">
              <button class="btn btn-sm" onClick={handleAddMixTarget}>
                + Add target
              </button>
              {Math.abs(mixTargetShareSum - 1) > 0.001 && (selectedProfile.mixTargets?.length ?? 0) > 0 && (
                <div class="mix-sum-hint">
                  Sum: {Math.round(mixTargetShareSum * 100)}%
                  <button class="btn btn-sm" onClick={handleNormalizeMixTargets}>
                    Normalize
                  </button>
                </div>
              )}
            </div>
            {availableFunctions.length > 0 && (
              <div class="mix-functions-hint">
                <span class="hint-label">Add from Forma:</span>
                <div class="function-chips">
                  {availableFunctions.slice(0, 5).map((fn) => (
                    <button
                      key={fn}
                      class="function-chip"
                      onClick={() => handleAddFromFunction(fn)}
                    >
                      + {fn}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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

      <div class="gfa-disclaimer">
        <strong>Early Design Aid</strong> — Forma GFA is modelling area, not Buildings Department
        accountable GFA (B(P)R reg 23 / PNAP APP-2). Traffic lights compare against profile and/or
        indicative B(P)R First Schedule caps only. Not a Cap. 123 statutory compliance check.
      </div>

      {loading ? (
        <div class="loading">Loading metrics...</div>
      ) : (
        <>
          {!bprStatus.isReady && (
            <div class="bpr-status-panel">
              <div class="bpr-status-header">
                <span class="bpr-status-icon">📋</span>
                <span>B(P)R First Schedule</span>
              </div>
              <div class="bpr-status-missing">
                {bprStatus.missing.map((field) => (
                  <div class="bpr-missing-item" key={field}>
                    <span class="missing-check">☐</span>
                    <span>{field}</span>
                  </div>
                ))}
              </div>
              <div class="bpr-status-hint">
                {bprStatus.hint}
              </div>
            </div>
          )}

          {bprStatus.isReady && bprResult && (
            <div class="bpr-active-panel">
              <div class="bpr-active-header">
                <span class="bpr-status-icon">✓</span>
                <span>B(P)R First Schedule Active</span>
              </div>
              <div class="bpr-active-info">
                <span class="bpr-band">{bprResult.bandLabel}</span>
                {derivedHeight && derivedHeight.source === 'derived' && derivedHeight.governingTowerId && (
                  <span class="bpr-derived">
                    Height from {derivedHeight.governingTowerId}: {derivedHeight.heightM.toFixed(1)}m
                  </span>
                )}
                {derivedHeight && derivedHeight.source === 'manual' && (
                  <span class="bpr-derived">Manual height: {derivedHeight.heightM.toFixed(1)}m</span>
                )}
              </div>
              {bprResult.isComposite && (
                <div class="bpr-composite-detail">
                  <div>Indicative PR: {bprResult.maxPr} (permitted dom. {bprResult.domesticPr} / non-dom. {bprResult.nonDomesticPr})</div>
                  <div>SC: {(bprResult.maxSc * 100).toFixed(1)}% (dom. {((bprResult.domesticSc ?? 0) * 100).toFixed(1)}% / non-dom. {((bprResult.nonDomesticSc ?? 0) * 100).toFixed(1)}%)</div>
                  {bprResult.compositeNote && (
                    <div class="bpr-composite-note">{bprResult.compositeNote}</div>
                  )}
                </div>
              )}
            </div>
          )}

          <MetricsTable
            metrics={visibleMetrics}
            liveSiteArea={areaMetrics?.siteArea}
            profileSiteArea={selectedProfile.siteAreaM2}
            bprHint={null}
          />
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
