import type { Profile } from './types';

export const BLANK_PROFILE: Profile = {
  id: 'blank',
  projectName: 'Blank',
  siteAreaM2: null,
  maxGfaM2: null,
  maxPr: null,
  maxSc: null,
  gfMpd: 0,
  towers: [],
  useMix: false,
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
  useMix: true,
  mixTarget: { officeShare: 0.43, commercialShare: 0.57 },
  minPosM2: 28750,
  minParking: null,
  sourceNote: 'Central Yard development limits — Office:Retail ≈ 43:57',
};

export const DEFAULT_PROFILES: Profile[] = [BLANK_PROFILE, CENTRAL_YARD_PROFILE];

const STORAGE_KEY = 'forma-hk-metrics-profiles';
const SELECTED_PROFILE_KEY = 'forma-hk-metrics-selected-profile';

export function loadProfiles(): Profile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Profile[];
      const defaultIds = DEFAULT_PROFILES.map((p) => p.id);
      const customProfiles = parsed.filter((p) => !defaultIds.includes(p.id));
      return [...DEFAULT_PROFILES, ...customProfiles];
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
