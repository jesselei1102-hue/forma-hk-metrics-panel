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
 * Site Class Definition (reg 18A):
 * - Class A: Site abutting on ONE street only (LEAST permissive for domestic)
 * - Class B: Site abutting on TWO streets
 * - Class C: Site abutting on THREE or more streets (MOST permissive)
 *
 * The First Schedule specifies:
 * - Maximum site coverage by site class (A/B/C), use type (domestic/non-domestic),
 *   and building height bands
 * - Maximum plot ratio by the same factors
 *
 * Composite buildings (reg 21(2)):
 * The permissible domestic PR when non-domestic is also present is constrained by:
 *   PR_dom_permitted_composite = (PR_nd_permitted - PR_nd_actual) × (PR_dom_permitted / PR_nd_permitted)
 * This is NOT a simple weighted average. See calculateCompositePermitted() for details.
 */

import type { SiteClass, UseType, TowerLimit, DerivedBuildingHeight } from './types';

export interface FirstScheduleResult {
  maxPr: number;
  maxSc: number;
  bandLabel: string;
  isComposite?: boolean;
  domesticPr?: number;
  nonDomesticPr?: number;
  domesticSc?: number;
  nonDomesticSc?: number;
  compositeNote?: string;
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
 * Values from Cap. 123F First Schedule (HKLII/eLegislation).
 * Site coverage is expressed as decimal (e.g., 33.33% → 0.3333, 66.6% → 0.666, 100% → 1.0).
 *
 * Class A: Site abutting 1 street (least permissive for domestic SC/PR)
 * Class B: Site abutting 2 streets (intermediate)
 * Class C: Site abutting 3+ streets (most permissive)
 *
 * Non-domestic SC can reach 100% for lower heights; domestic SC is more restricted.
 */
const FIRST_SCHEDULE_TABLES: Record<SiteClass, SiteClassTable> = {
  A: {
    bands: [
      {
        maxHeightM: 15,
        label: '≤15m',
        domestic: { pr: 3.3, sc: 0.666 },
        nonDomestic: { pr: 5, sc: 1.0 },
      },
      {
        maxHeightM: 18,
        label: '>15m–18m',
        domestic: { pr: 3.96, sc: 0.594 },
        nonDomestic: { pr: 6, sc: 0.9 },
      },
      {
        maxHeightM: 21,
        label: '>18m–21m',
        domestic: { pr: 4.62, sc: 0.55 },
        nonDomestic: { pr: 7, sc: 0.833 },
      },
      {
        maxHeightM: 24,
        label: '>21m–24m',
        domestic: { pr: 5.0, sc: 0.5 },
        nonDomestic: { pr: 8, sc: 0.8 },
      },
      {
        maxHeightM: 27,
        label: '>24m–27m',
        domestic: { pr: 5.4, sc: 0.48 },
        nonDomestic: { pr: 9, sc: 0.75 },
      },
      {
        maxHeightM: 30,
        label: '>27m–30m',
        domestic: { pr: 5.6, sc: 0.4667 },
        nonDomestic: { pr: 10, sc: 0.7143 },
      },
      {
        maxHeightM: 36,
        label: '>30m–36m',
        domestic: { pr: 6.0, sc: 0.4286 },
        nonDomestic: { pr: 10.5, sc: 0.7 },
      },
      {
        maxHeightM: 43,
        label: '>36m–43m',
        domestic: { pr: 6.2, sc: 0.3953 },
        nonDomestic: { pr: 11, sc: 0.6667 },
      },
      {
        maxHeightM: 49,
        label: '>43m–49m',
        domestic: { pr: 6.4, sc: 0.3721 },
        nonDomestic: { pr: 11.5, sc: 0.6389 },
      },
      {
        maxHeightM: 55,
        label: '>49m–55m',
        domestic: { pr: 6.6, sc: 0.3529 },
        nonDomestic: { pr: 12, sc: 0.6154 },
      },
      {
        maxHeightM: 61,
        label: '>55m–61m',
        domestic: { pr: 6.8, sc: 0.34 },
        nonDomestic: { pr: 12.2, sc: 0.6 },
      },
      {
        maxHeightM: Infinity,
        label: '>61m',
        domestic: { pr: 8.0, sc: 0.3333 },
        nonDomestic: { pr: 15, sc: 0.6 },
      },
    ],
  },
  B: {
    bands: [
      {
        maxHeightM: 15,
        label: '≤15m',
        domestic: { pr: 3.75, sc: 0.75 },
        nonDomestic: { pr: 5, sc: 1.0 },
      },
      {
        maxHeightM: 18,
        label: '>15m–18m',
        domestic: { pr: 4.5, sc: 0.675 },
        nonDomestic: { pr: 6, sc: 0.9 },
      },
      {
        maxHeightM: 21,
        label: '>18m–21m',
        domestic: { pr: 5.25, sc: 0.625 },
        nonDomestic: { pr: 7, sc: 0.833 },
      },
      {
        maxHeightM: 24,
        label: '>21m–24m',
        domestic: { pr: 5.7, sc: 0.5625 },
        nonDomestic: { pr: 8, sc: 0.8 },
      },
      {
        maxHeightM: 27,
        label: '>24m–27m',
        domestic: { pr: 6.15, sc: 0.5417 },
        nonDomestic: { pr: 9, sc: 0.75 },
      },
      {
        maxHeightM: 30,
        label: '>27m–30m',
        domestic: { pr: 6.4, sc: 0.5333 },
        nonDomestic: { pr: 10, sc: 0.7143 },
      },
      {
        maxHeightM: 36,
        label: '>30m–36m',
        domestic: { pr: 6.8, sc: 0.4857 },
        nonDomestic: { pr: 10.5, sc: 0.7 },
      },
      {
        maxHeightM: 43,
        label: '>36m–43m',
        domestic: { pr: 7.0, sc: 0.4419 },
        nonDomestic: { pr: 11, sc: 0.6667 },
      },
      {
        maxHeightM: 49,
        label: '>43m–49m',
        domestic: { pr: 7.25, sc: 0.4167 },
        nonDomestic: { pr: 11.5, sc: 0.6389 },
      },
      {
        maxHeightM: 55,
        label: '>49m–55m',
        domestic: { pr: 7.5, sc: 0.3947 },
        nonDomestic: { pr: 12, sc: 0.6154 },
      },
      {
        maxHeightM: 61,
        label: '>55m–61m',
        domestic: { pr: 7.6, sc: 0.38 },
        nonDomestic: { pr: 12.5, sc: 0.625 },
      },
      {
        maxHeightM: Infinity,
        label: '>61m',
        domestic: { pr: 9.0, sc: 0.375 },
        nonDomestic: { pr: 15, sc: 0.625 },
      },
    ],
  },
  C: {
    bands: [
      {
        maxHeightM: 15,
        label: '≤15m',
        domestic: { pr: 4.0, sc: 0.8 },
        nonDomestic: { pr: 5, sc: 1.0 },
      },
      {
        maxHeightM: 18,
        label: '>15m–18m',
        domestic: { pr: 4.8, sc: 0.72 },
        nonDomestic: { pr: 6, sc: 0.9 },
      },
      {
        maxHeightM: 21,
        label: '>18m–21m',
        domestic: { pr: 5.6, sc: 0.6667 },
        nonDomestic: { pr: 7, sc: 0.833 },
      },
      {
        maxHeightM: 24,
        label: '>21m–24m',
        domestic: { pr: 6.0, sc: 0.6 },
        nonDomestic: { pr: 8, sc: 0.8 },
      },
      {
        maxHeightM: 27,
        label: '>24m–27m',
        domestic: { pr: 6.6, sc: 0.5714 },
        nonDomestic: { pr: 9, sc: 0.75 },
      },
      {
        maxHeightM: 30,
        label: '>27m–30m',
        domestic: { pr: 6.8, sc: 0.5667 },
        nonDomestic: { pr: 10, sc: 0.7143 },
      },
      {
        maxHeightM: 36,
        label: '>30m–36m',
        domestic: { pr: 7.2, sc: 0.5143 },
        nonDomestic: { pr: 10.5, sc: 0.7 },
      },
      {
        maxHeightM: 43,
        label: '>36m–43m',
        domestic: { pr: 7.4, sc: 0.4651 },
        nonDomestic: { pr: 11, sc: 0.6667 },
      },
      {
        maxHeightM: 49,
        label: '>43m–49m',
        domestic: { pr: 7.7, sc: 0.4375 },
        nonDomestic: { pr: 11.5, sc: 0.6389 },
      },
      {
        maxHeightM: 55,
        label: '>49m–55m',
        domestic: { pr: 7.9, sc: 0.4118 },
        nonDomestic: { pr: 12, sc: 0.6154 },
      },
      {
        maxHeightM: 61,
        label: '>55m–61m',
        domestic: { pr: 8.0, sc: 0.41 },
        nonDomestic: { pr: 13.0, sc: 0.65 },
      },
      {
        maxHeightM: Infinity,
        label: '>61m',
        domestic: { pr: 10.0, sc: 0.4 },
        nonDomestic: { pr: 15, sc: 0.65 },
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
 * Get the raw domestic and non-domestic limits for a height band.
 * Used for composite calculations.
 */
function getRawLimits(
  siteClass: SiteClass,
  buildingHeightM: number
): { domestic: { pr: number; sc: number }; nonDomestic: { pr: number; sc: number }; bandLabel: string } | null {
  const table = FIRST_SCHEDULE_TABLES[siteClass];
  if (!table) return null;

  const band = table.bands.find((b) => buildingHeightM <= b.maxHeightM);
  if (!band) return null;

  return {
    domestic: band.domestic,
    nonDomestic: band.nonDomestic,
    bandLabel: `Class ${siteClass} ${band.label}`,
  };
}

/**
 * Calculate composite building limits per reg 21(2).
 *
 * Reg 21(2) formula for permissible domestic PR when non-domestic is present:
 *   PR_dom_max = (PR_nd_permitted - PR_nd_actual) × (PR_dom_permitted / PR_nd_permitted)
 *
 * For early design (before we know actual non-domestic PR), we show:
 * - Permitted PR_dom and PR_nd from schedule
 * - An "indicative max total PR" assuming full use of both allowances
 * - The stricter SC (min of domestic/non-domestic)
 *
 * This is INDICATIVE only — actual reg 21(2) compliance depends on the specific
 * domestic/non-domestic GFA split at BA submission.
 */
export interface CompositeResult {
  permittedPrDom: number;
  permittedPrNonDom: number;
  permittedScDom: number;
  permittedScNonDom: number;
  indicativeMaxTotalPr: number;
  effectiveSc: number;
  bandLabel: string;
  note: string;
}

export function calculateCompositePermitted(
  siteClass: SiteClass,
  buildingHeightM: number,
  domesticShare?: number | null
): CompositeResult | null {
  const raw = getRawLimits(siteClass, buildingHeightM);
  if (!raw) return null;

  const { domestic, nonDomestic, bandLabel } = raw;

  const effectiveSc = Math.min(domestic.sc, nonDomestic.sc);

  let indicativeMaxTotalPr: number;
  let note: string;

  if (domesticShare !== undefined && domesticShare !== null && domesticShare >= 0 && domesticShare <= 1) {
    indicativeMaxTotalPr = domesticShare * domestic.pr + (1 - domesticShare) * nonDomestic.pr;
    note = `Indicative blend (${Math.round(domesticShare * 100)}% dom.) — actual reg 21(2) limits depend on specific GFA split at BA.`;
  } else {
    indicativeMaxTotalPr = Math.max(domestic.pr, nonDomestic.pr);
    note = 'Set domestic share % for indicative blended PR. Reg 21(2) constrains actual mix.';
  }

  return {
    permittedPrDom: domestic.pr,
    permittedPrNonDom: nonDomestic.pr,
    permittedScDom: domestic.sc,
    permittedScNonDom: nonDomestic.sc,
    indicativeMaxTotalPr: Math.round(indicativeMaxTotalPr * 100) / 100,
    effectiveSc,
    bandLabel,
    note,
  };
}

/**
 * Look up First Schedule limits for a given site class, use type, and building height.
 *
 * @returns FirstScheduleResult with maxPr (plot ratio), maxSc (site coverage as 0-1), bandLabel
 * @returns null if any required param is missing
 *
 * For composite use, shows indicative blended limits with clear labeling that
 * actual reg 21(2) compliance depends on specific GFA split.
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
    const composite = calculateCompositePermitted(siteClass, buildingHeightM, domesticShare);
    if (!composite) return null;

    return {
      maxPr: composite.indicativeMaxTotalPr,
      maxSc: composite.effectiveSc,
      bandLabel: composite.bandLabel + ' (composite)',
      isComposite: true,
      domesticPr: composite.permittedPrDom,
      nonDomesticPr: composite.permittedPrNonDom,
      domesticSc: composite.permittedScDom,
      nonDomesticSc: composite.permittedScNonDom,
      compositeNote: composite.note,
    };
  }

  const values = useType === 'domestic' ? band.domestic : band.nonDomestic;

  return {
    maxPr: values.pr,
    maxSc: values.sc,
    bandLabel: `Class ${siteClass} ${band.label}`,
  };
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
    unlocks.push('Site class = streets abutting (A=1, B=2, C=3+)');
  }
  if (!useType) {
    missing.push('Use Type');
    unlocks.push('Use type (domestic/non-domestic/composite) affects PR/SC caps');
  }
  if (buildingHeightM === undefined || buildingHeightM === null || buildingHeightM <= 0) {
    missing.push('Building Height (m)');
    unlocks.push('Height band determines PR/SC caps — enter tower mPD or set manual override');
  }
  if (useType === 'composite' && (domesticShare === undefined || domesticShare === null)) {
    missing.push('Domestic Share %');
    unlocks.push('For composite: indicative blended PR (reg 21(2) governs actual)');
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
  if (buildingHeightM <= 0) {
    return false;
  }
  return true;
}

/**
 * Self-check: verify key cells from the official schedule.
 * Run this to ensure table accuracy before deployment.
 *
 * Values from HKLII Cap. 123F First Schedule:
 * - Class A/B/C = 1/2/3+ streets abutting
 * - SC as decimal, PR as ratio
 */
export function verifyFirstScheduleTable(): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  const testCases: Array<{
    siteClass: SiteClass;
    useType: 'domestic' | 'non-domestic';
    heightM: number;
    expectedPr: number;
    expectedSc: number;
    tolerance?: number;
  }> = [
    // ≤15m band
    { siteClass: 'A', useType: 'domestic', heightM: 15, expectedPr: 3.3, expectedSc: 0.666 },
    { siteClass: 'B', useType: 'domestic', heightM: 15, expectedPr: 3.75, expectedSc: 0.75 },
    { siteClass: 'C', useType: 'domestic', heightM: 15, expectedPr: 4.0, expectedSc: 0.8 },
    { siteClass: 'A', useType: 'non-domestic', heightM: 15, expectedPr: 5, expectedSc: 1.0 },
    { siteClass: 'B', useType: 'non-domestic', heightM: 15, expectedPr: 5, expectedSc: 1.0 },
    { siteClass: 'C', useType: 'non-domestic', heightM: 15, expectedPr: 5, expectedSc: 1.0 },

    // >55m–61m band
    { siteClass: 'A', useType: 'domestic', heightM: 61, expectedPr: 6.8, expectedSc: 0.34 },
    { siteClass: 'B', useType: 'domestic', heightM: 61, expectedPr: 7.6, expectedSc: 0.38 },
    { siteClass: 'C', useType: 'domestic', heightM: 61, expectedPr: 8.0, expectedSc: 0.41 },
    { siteClass: 'A', useType: 'non-domestic', heightM: 61, expectedPr: 12.2, expectedSc: 0.6 },
    { siteClass: 'B', useType: 'non-domestic', heightM: 61, expectedPr: 12.5, expectedSc: 0.625 },
    { siteClass: 'C', useType: 'non-domestic', heightM: 61, expectedPr: 13.0, expectedSc: 0.65 },

    // >61m band (critical for tall buildings)
    { siteClass: 'A', useType: 'domestic', heightM: 70, expectedPr: 8.0, expectedSc: 0.3333 },
    { siteClass: 'B', useType: 'domestic', heightM: 70, expectedPr: 9.0, expectedSc: 0.375 },
    { siteClass: 'C', useType: 'domestic', heightM: 70, expectedPr: 10.0, expectedSc: 0.4 },
    { siteClass: 'A', useType: 'non-domestic', heightM: 70, expectedPr: 15, expectedSc: 0.6 },
    { siteClass: 'B', useType: 'non-domestic', heightM: 70, expectedPr: 15, expectedSc: 0.625 },
    { siteClass: 'C', useType: 'non-domestic', heightM: 70, expectedPr: 15, expectedSc: 0.65 },
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
    const tolerance = tc.tolerance ?? 0.01;
    if (Math.abs(result.maxPr - tc.expectedPr) > tolerance) {
      errors.push(
        `PR mismatch: Class ${tc.siteClass}, ${tc.useType}, ${tc.heightM}m - ` +
          `expected ${tc.expectedPr}, got ${result.maxPr}`
      );
    }
    if (Math.abs(result.maxSc - tc.expectedSc) > tolerance) {
      errors.push(
        `SC mismatch: Class ${tc.siteClass}, ${tc.useType}, ${tc.heightM}m - ` +
          `expected ${tc.expectedSc}, got ${result.maxSc}`
      );
    }
  }

  const compositeResult = lookupFirstSchedule({
    siteClass: 'A',
    useType: 'composite',
    buildingHeightM: 70,
    domesticShare: 0.6,
  });
  if (!compositeResult) {
    errors.push('Composite lookup should return result when domesticShare is set');
  } else if (!compositeResult.isComposite) {
    errors.push('Composite lookup should have isComposite=true');
  }

  return { passed: errors.length === 0, errors };
}

