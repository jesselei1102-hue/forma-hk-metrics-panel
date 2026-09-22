import type { Profile, MixTargetEntry, LegacyMixTarget } from './types';

export const BLANK_PROFILE: Profile = {
  id: 'blank',
  projectName: 'Blank',
  siteAreaM2: null,
  maxGfaM2: null,
  maxPr: null,
  maxSc: null,
  gfMpd: 0,
  towers: [],
  mixTargets: [],
  minPosM2: null,
  minParking: null,
  sourceNote: 'User-defined blank profile',
};

export const CENTRAL_YARD_PROFILE: Profile = {
  id: 'central-yard',
  projectName: 'Central Yard',
  siteAreaM2: 47967,
  maxGfaM2: 150000,
  maxPr: 3.13,
  maxSc: 0.65,
  gfMpd: 3.45,
  towers: [
    { id: 'T1', maxBhMpd: 47 },
    { id: 'T2', maxBhMpd: 50 },
    { id: 'T3', maxBhMpd: 50 },
  ],
  mixTargets: [
    { id: 'office', label: 'Office GFA', match: ['office', '办公'], share: 0.43 },
    { id: 'retail', label: 'Retail GFA', match: ['retail', 'commercial', '零售', '商业'], share: 0.57 },
  ],
  minPosM2: 28750,
  minParking: null,
  sourceNote: 'Central Yard development limits — Office:Retail ≈ 43:57',
};

export const DEFAULT_PROFILES: Profile[] = [BLANK_PROFILE, CENTRAL_YARD_PROFILE];

const STORAGE_KEY = 'forma-hk-metrics-profiles';
const SELECTED_PROFILE_KEY = 'forma-hk-metrics-selected-profile';

function migrateLegacyMixTarget(profile: Profile): Profile {
  if (profile.mixTargets && profile.mixTargets.length > 0) {
    return profile;
  }
  const legacy = profile.mixTarget as LegacyMixTarget | undefined;
  if (legacy && (legacy.officeShare > 0 || legacy.retailShare > 0)) {
    const mixTargets: MixTargetEntry[] = [];
    if (legacy.officeShare > 0) {
      mixTargets.push({
        id: 'office',
        label: 'Office GFA',
        match: ['office', '办公'],
        share: legacy.officeShare,
      });
    }
    if (legacy.retailShare > 0) {
      mixTargets.push({
        id: 'retail',
        label: 'Retail GFA',
        match: ['retail', 'commercial', '零售', '商业'],
        share: legacy.retailShare,
      });
    }
    return { ...profile, mixTargets, mixTarget: undefined, useMix: undefined };
  }
  if (profile.useMix && !profile.mixTargets) {
    return { ...profile, mixTargets: [], useMix: undefined, mixTarget: undefined };
  }
  return profile;
}

export function loadProfiles(): Profile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Profile[];
      const defaultIds = DEFAULT_PROFILES.map((p) => p.id);
      const customProfiles = parsed
        .filter((p) => !defaultIds.includes(p.id))
        .map(migrateLegacyMixTarget);
      return [...DEFAULT_PROFILES, ...customProfiles.map(migrateLegacyMixTarget)];
    }
  } catch {
    console.warn('Failed to load profiles from localStorage');
  }
  return [...DEFAULT_PROFILES];
}

export function saveProfiles(profiles: Profile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    console.warn('Failed to save profiles to localStorage');
  }
}

export function loadSelectedProfileId(): string {
  try {
    return localStorage.getItem(SELECTED_PROFILE_KEY) || 'central-yard';
  } catch {
    return 'central-yard';
  }
}

export function saveSelectedProfileId(id: string): void {
  try {
    localStorage.setItem(SELECTED_PROFILE_KEY, id);
  } catch {
    console.warn('Failed to save selected profile to localStorage');
  }
}
