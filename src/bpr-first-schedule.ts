/**
 * B(P)R First Schedule Lookup
 *
 * Encodes maximum plot ratio and site coverage percentages from
 * Cap. 123F Building (Planning) Regulations First Schedule.
 *
 * Official sources:
 * - https://www.elegislation.gov.hk/hk/cap123F
 * - https://hklii.hk/en/legis/reg/123F/sch1
 *
 * The First Schedule specifies:
 * - Maximum plot ratio by site class (A/B/C), use type (domestic/non-domestic),
 *   and building height bands
 * - Maximum site coverage by the same factors
 *
 * Composite buildings (reg 21(2)):
 * For composite buildings, the permissible plot ratio is calculated as:
 *   PR_composite = (domesticShare × PR_domestic) + ((1 - domesticShare) × PR_nonDomestic)
 * Site coverage uses the stricter of domestic and non-domestic limits.
 */

import type { SiteClass, UseType, TowerLimit, DerivedBuildingHeight } from './types';

export interface FirstScheduleResult {
  maxPr: number;
  maxSc: number;
  bandLabel: string;
  isComposite?: boolean;
  domesticPr?: number;
  nonDomesticPr?: number;
}

export interface FirstScheduleLookupParams {
  siteClass: SiteClass;
  useType: UseType;
  buildingHeightM: number;
  domesticShare?: number;
}

export interface TowerHeights {
  [towerId: string]: string;
}

interface HeightBand {
  maxHeightM: number;
  label: string;
  domestic: { pr: number; sc: number };
  nonDomestic: { pr: number; sc: number };
}

interface SiteClassTable {
  bands: HeightBand[];
}

/**
 * First Schedule tables by site class.
 *
 * Height bands and values from Cap. 123F First Schedule (eLegislation).
 * Site coverage is expressed as decimal (e.g., 0.6667 = 66.67%).
 *
 * Class A: Most permissive (urban core)
 * Class B: Intermediate
 * Class C: Least permissive (lower density areas)
 */
const FIRST_SCHEDULE_TABLES: Record<SiteClass, SiteClassTable> = {
  A: {
    bands: [
      {
        maxHeightM: 15,
        label: '≤15m',
        domestic: { pr: 5, sc: 0.6667 },
        nonDomestic: { pr: 5, sc: 0.6667 },
      },
      {
        maxHeightM: 18,
        label: '>15m–18m',
        domestic: { pr: 6, sc: 0.6667 },
        nonDomestic: { pr: 6, sc: 0.6667 },
      },
      {
        maxHeightM: 21,
        label: '>18m–21m',
        domestic: { pr: 7, sc: 0.6667 },
        nonDomestic: { pr: 7, sc: 0.6667 },
      },
      {
        maxHeightM: 24,
        label: '>21m–24m',
        domestic: { pr: 7.5, sc: 0.6667 },
        nonDomestic: { pr: 8, sc: 0.6667 },
      },
      {
        maxHeightM: 27,
        label: '>24m–27m',
        domestic: { pr: 7.5, sc: 0.6667 },
        nonDomestic: { pr: 9, sc: 0.6667 },
      },
      {
        maxHeightM: 30,
        label: '>27m–30m',
        domestic: { pr: 8, sc: 0.6667 },
        nonDomestic: { pr: 10, sc: 0.6667 },
      },
      {
        maxHeightM: 36,
        label: '>30m–36m',
        domestic: { pr: 8, sc: 0.6667 },
        nonDomestic: { pr: 11, sc: 0.6667 },
      },
      {
        maxHeightM: 43,
        label: '>36m–43m',
        domestic: { pr: 8, sc: 0.6667 },
        nonDomestic: { pr: 12, sc: 0.6667 },
      },
      {
        maxHeightM: 49,
        label: '>43m–49m',
        domestic: { pr: 8, sc: 0.6667 },
        nonDomestic: { pr: 13, sc: 0.6667 },
      },
      {
        maxHeightM: 55,
        label: '>49m–55m',
        domestic: { pr: 8, sc: 0.6667 },
        nonDomestic: { pr: 14, sc: 0.6667 },
      },
      {
        maxHeightM: 61,
        label: '>55m–61m',
        domestic: { pr: 8, sc: 0.6667 },
        nonDomestic: { pr: 15, sc: 0.6667 },
      },
      {
        maxHeightM: Infinity,
        label: '>61m',
        domestic: { pr: 8, sc: 0.6667 },
        nonDomestic: { pr: 15, sc: 0.6 },
      },
    ],
  },
  B: {
    bands: [
      {
        maxHeightM: 15,
        label: '≤15m',
        domestic: { pr: 3.6, sc: 0.6667 },
        nonDomestic: { pr: 5, sc: 0.6667 },
      },
      {
        maxHeightM: 18,
        label: '>15m–18m',
        domestic: { pr: 4.3, sc: 0.6667 },
        nonDomestic: { pr: 6, sc: 0.6667 },
      },
      {
        maxHeightM: 21,
        label: '>21m–21m',
        domestic: { pr: 5, sc: 0.6667 },
        nonDomestic: { pr: 7, sc: 0.6667 },
      },
      {
        maxHeightM: 24,
        label: '>21m–24m',
        domestic: { pr: 5.4, sc: 0.6667 },
        nonDomestic: { pr: 8, sc: 0.6667 },
      },
      {
        maxHeightM: 27,
        label: '>24m–27m',
        domestic: { pr: 5.4, sc: 0.6667 },
        nonDomestic: { pr: 9, sc: 0.6667 },
      },
      {
        maxHeightM: 30,
        label: '>27m–30m',
        domestic: { pr: 5.8, sc: 0.6667 },
        nonDomestic: { pr: 10, sc: 0.6667 },
      },
      {
        maxHeightM: 36,
        label: '>30m–36m',
        domestic: { pr: 6, sc: 0.6667 },
        nonDomestic: { pr: 11, sc: 0.6667 },
      },
      {
        maxHeightM: 43,
        label: '>36m–43m',
        domestic: { pr: 6.3, sc: 0.6667 },
        nonDomestic: { pr: 12, sc: 0.6667 },
      },
      {
        maxHeightM: 49,
        label: '>43m–49m',
        domestic: { pr: 6.6, sc: 0.6667 },
        nonDomestic: { pr: 13, sc: 0.6667 },
      },
      {
        maxHeightM: 55,
        label: '>49m–55m',
        domestic: { pr: 6.9, sc: 0.6667 },
        nonDomestic: { pr: 14, sc: 0.6667 },
      },
      {
        maxHeightM: 61,
        label: '>55m–61m',
        domestic: { pr: 7.2, sc: 0.6667 },
        nonDomestic: { pr: 15, sc: 0.6667 },
      },
      {
        maxHeightM: Infinity,
        label: '>61m',
        domestic: { pr: 7.5, sc: 0.6667 },
        nonDomestic: { pr: 15, sc: 0.6 },
      },
    ],
  },
  C: {
    bands: [
      {
        maxHeightM: 15,
        label: '≤15m',
        domestic: { pr: 2.5, sc: 0.5 },
        nonDomestic: { pr: 3.3, sc: 0.6667 },
      },
      {
        maxHeightM: 18,
        label: '>15m–18m',
        domestic: { pr: 3, sc: 0.5 },
        nonDomestic: { pr: 4, sc: 0.6667 },
      },
      {
        maxHeightM: 21,
        label: '>18m–21m',
        domestic: { pr: 3.5, sc: 0.5 },
        nonDomestic: { pr: 4.6, sc: 0.6667 },
      },
      {
        maxHeightM: 24,
        label: '>21m–24m',
        domestic: { pr: 3.8, sc: 0.5 },
        nonDomestic: { pr: 5.3, sc: 0.6667 },
      },
      {
        maxHeightM: 27,
        label: '>24m–27m',
        domestic: { pr: 3.8, sc: 0.5 },
        nonDomestic: { pr: 6, sc: 0.6667 },
      },
      {
        maxHeightM: 30,
        label: '>27m–30m',
        domestic: { pr: 4.0, sc: 0.5 },
        nonDomestic: { pr: 6.6, sc: 0.6667 },
      },
      {
        maxHeightM: 36,
        label: '>30m–36m',
        domestic: { pr: 4.2, sc: 0.5 },
        nonDomestic: { pr: 7.3, sc: 0.6667 },
      },
      {
        maxHeightM: 43,
        label: '>36m–43m',
        domestic: { pr: 4.4, sc: 0.5 },
        nonDomestic: { pr: 8, sc: 0.6667 },
      },
      {
        maxHeightM: 49,
        label: '>43m–49m',
        domestic: { pr: 4.6, sc: 0.5 },
        nonDomestic: { pr: 8.6, sc: 0.6667 },
      },
      {
        maxHeightM: 55,
        label: '>49m–55m',
        domestic: { pr: 4.8, sc: 0.5 },
        nonDomestic: { pr: 9.3, sc: 0.6667 },
      },
      {
        maxHeightM: 61,
        label: '>55m–61m',
        domestic: { pr: 5, sc: 0.5 },
        nonDomestic: { pr: 10, sc: 0.6667 },
      },
      {
        maxHeightM: Infinity,
        label: '>61m',
        domestic: { pr: 5, sc: 0.5 },
        nonDomestic: { pr: 10, sc: 0.6 },
      },
    ],
  },
};

/**
 * Derive building height in metres from tower mPD inputs.
 *
 * Formula: buildingHeightM = max(tower roof mPD values) - gfMpd
 *
 * This assumes the tallest tower governs the First Schedule lookup,
 * which is the conservative approach for intensity caps.
 *
 * @param towers - Profile tower definitions
 * @param towerHeights - User-entered roof mPD values
 * @param gfMpd - Ground floor mPD datum
 * @param manualOverride - Optional manual override (if set, use this instead)
 * @returns DerivedBuildingHeight with source info, or null if cannot derive
 */
export function deriveBuildingHeight(
  towers: TowerLimit[],
  towerHeights: TowerHeights,
  gfMpd: number,
  manualOverride?: number | null
): DerivedBuildingHeight | null {
  if (manualOverride !== undefined && manualOverride !== null && manualOverride > 0) {
    return {
      heightM: manualOverride,
      source: 'manual',
    };
  }

  if (towers.length === 0 || gfMpd <= 0) {
    return null;
  }

  let maxRoofMpd = 0;
  let governingTowerId: string | undefined;

  for (const tower of towers) {
    const roofMpdStr = towerHeights[tower.id];
    if (!roofMpdStr) continue;
    const roofMpd = parseFloat(roofMpdStr);
    if (!Number.isFinite(roofMpd) || roofMpd <= 0) continue;
    if (roofMpd > maxRoofMpd) {
      maxRoofMpd = roofMpd;
      governingTowerId = tower.id;
    }
  }

  if (maxRoofMpd <= gfMpd) {
    return null;
  }

  const heightM = maxRoofMpd - gfMpd;
  return {
    heightM,
    source: 'derived',
    governingTowerId,
  };
}

/**
 * Look up First Schedule limits for a given site class, use type, and building height.
 *
 * @returns FirstScheduleResult with maxPr (plot ratio), maxSc (site coverage as 0-1), bandLabel
 * @returns null if any required param is missing
 *
 * For composite use, if domesticShare is provided (0-1), calculates weighted PR per reg 21(2):
 *   PR = domesticShare × PR_domestic + (1 - domesticShare) × PR_nonDomestic
 * SC uses the stricter (lower) of domestic/non-domestic limits.
 */
export function lookupFirstSchedule(
  params: Partial<FirstScheduleLookupParams>
): FirstScheduleResult | null {
  const { siteClass, useType, buildingHeightM, domesticShare } = params;

  if (!siteClass || !useType || buildingHeightM === undefined || buildingHeightM === null) {
    return null;
  }

  if (buildingHeightM <= 0) {
    return null;
  }

  const table = FIRST_SCHEDULE_TABLES[siteClass];
  if (!table) {
    return null;
  }

  const band = table.bands.find((b) => buildingHeightM <= b.maxHeightM);
  if (!band) {
    return null;
  }

  if (useType === 'composite') {
    if (domesticShare === undefined || domesticShare === null) {
      return null;
    }
    const clampedShare = Math.max(0, Math.min(1, domesticShare));
    const domesticPr = band.domestic.pr;
    const nonDomesticPr = band.nonDomestic.pr;
    const compositePr = clampedShare * domesticPr + (1 - clampedShare) * nonDomesticPr;
    const compositeSc = Math.min(band.domestic.sc, band.nonDomestic.sc);

    return {
      maxPr: Math.round(compositePr * 100) / 100,
      maxSc: compositeSc,
      bandLabel: `Class ${siteClass} ${band.label} (composite ${Math.round(clampedShare * 100)}% dom.)`,
      isComposite: true,
      domesticPr,
      nonDomesticPr,
    };
  }

  const values = useType === 'domestic' ? band.domestic : band.nonDomestic;

  return {
    maxPr: values.pr,
    maxSc: values.sc,
    bandLabel: `Class ${siteClass} ${band.label}`,
  };
}

/**
 * Check if B(P)R First Schedule lookup is possible with given profile fields.
 */
export function canLookupFirstSchedule(
  siteClass: SiteClass | null | undefined,
  useType: UseType | null | undefined,
  buildingHeightM: number | null | undefined
): boolean {
  if (!siteClass || !useType || buildingHeightM === undefined || buildingHeightM === null) {
    return false;
  }
  if (useType === 'composite') {
    return false;
  }
  if (buildingHeightM <= 0) {
    return false;
  }
  return true;
}

export interface BprStatusInfo {
  isReady: boolean;
  hint: string | null;
  missing: string[];
  unlocks: string[];
}

/**
 * Get detailed status about B(P)R First Schedule readiness.
 */
export function getBprStatus(
  siteClass: SiteClass | null | undefined,
  useType: UseType | null | undefined,
  buildingHeightM: number | null | undefined,
  domesticShare: number | null | undefined
): BprStatusInfo {
  const missing: string[] = [];
  const unlocks: string[] = [];

  if (!siteClass) {
    missing.push('Site Class');
    unlocks.push('Site class determines base intensity zone (A=urban, B=intermediate, C=low-density)');
  }
  if (!useType) {
    missing.push('Use Type');
    unlocks.push('Use type (domestic/non-domestic/composite) affects PR caps');
  }
  if (buildingHeightM === undefined || buildingHeightM === null || buildingHeightM <= 0) {
    missing.push('Building Height (m)');
    unlocks.push('Height band determines PR/SC caps — enter tower mPD or set manual override');
  }
  if (useType === 'composite' && (domesticShare === undefined || domesticShare === null)) {
    missing.push('Domestic Share %');
    unlocks.push('Composite PR = weighted average per reg 21(2)');
  }

  const isReady = missing.length === 0;
  let hint: string | null = null;

  if (!isReady) {
    hint = `Set ${missing.join(', ')} to unlock B(P)R First Schedule limits`;
  }

  return { isReady, hint, missing, unlocks };
}

/**
 * Get a user-friendly message about why First Schedule lookup is not available.
 * @deprecated Use getBprStatus for more detailed info
 */
export function getFirstScheduleHint(
  siteClass: SiteClass | null | undefined,
  useType: UseType | null | undefined,
  buildingHeightM: number | null | undefined,
  domesticShare?: number | null | undefined
): string | null {
  const status = getBprStatus(siteClass, useType, buildingHeightM, domesticShare);
  return status.hint;
}

/**
 * Self-check: verify a few known cells from the official schedule.
 * Call this during development/testing to ensure table accuracy.
 */
export function verifyFirstScheduleTable(): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  const testCases: Array<{
    siteClass: SiteClass;
    useType: 'domestic' | 'non-domestic';
    heightM: number;
    expectedPr: number;
    expectedSc: number;
  }> = [
    { siteClass: 'A', useType: 'non-domestic', heightM: 70, expectedPr: 15, expectedSc: 0.6 },
    { siteClass: 'A', useType: 'non-domestic', heightM: 61, expectedPr: 15, expectedSc: 0.6667 },
    { siteClass: 'A', useType: 'domestic', heightM: 30, expectedPr: 8, expectedSc: 0.6667 },
    { siteClass: 'A', useType: 'domestic', heightM: 15, expectedPr: 5, expectedSc: 0.6667 },
    { siteClass: 'B', useType: 'non-domestic', heightM: 61, expectedPr: 15, expectedSc: 0.6667 },
    { siteClass: 'B', useType: 'domestic', heightM: 61, expectedPr: 7.2, expectedSc: 0.6667 },
    { siteClass: 'C', useType: 'non-domestic', heightM: 70, expectedPr: 10, expectedSc: 0.6 },
    { siteClass: 'C', useType: 'domestic', heightM: 70, expectedPr: 5, expectedSc: 0.5 },
    { siteClass: 'C', useType: 'domestic', heightM: 15, expectedPr: 2.5, expectedSc: 0.5 },
  ];

  for (const tc of testCases) {
    const result = lookupFirstSchedule({
      siteClass: tc.siteClass,
      useType: tc.useType,
      buildingHeightM: tc.heightM,
    });
    if (!result) {
      errors.push(
        `Failed lookup: Class ${tc.siteClass}, ${tc.useType}, ${tc.heightM}m - got null`
      );
      continue;
    }
    if (result.maxPr !== tc.expectedPr) {
      errors.push(
        `PR mismatch: Class ${tc.siteClass}, ${tc.useType}, ${tc.heightM}m - ` +
          `expected ${tc.expectedPr}, got ${result.maxPr}`
      );
    }
    if (Math.abs(result.maxSc - tc.expectedSc) > 0.0001) {
      errors.push(
        `SC mismatch: Class ${tc.siteClass}, ${tc.useType}, ${tc.heightM}m - ` +
          `expected ${tc.expectedSc}, got ${result.maxSc}`
      );
    }
  }

  const compositeResult = lookupFirstSchedule({
    siteClass: 'A',
    useType: 'composite',
    buildingHeightM: 50,
  });
  if (compositeResult !== null) {
    errors.push('Composite should return null, but got a result');
  }

  return { passed: errors.length === 0, errors };
}
