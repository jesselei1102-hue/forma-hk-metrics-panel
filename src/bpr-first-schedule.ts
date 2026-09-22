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
 * Note: "composite" buildings (domestic + non-domestic mixed) require
 * advanced calculation per reg 21(2) and are NOT auto-calculated here.
 */

import type { SiteClass, UseType } from './types';

export interface FirstScheduleResult {
  maxPr: number;
  maxSc: number;
  bandLabel: string;
}

export interface FirstScheduleLookupParams {
  siteClass: SiteClass;
  useType: UseType;
  buildingHeightM: number;
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
 * Look up First Schedule limits for a given site class, use type, and building height.
 *
 * @returns FirstScheduleResult with maxPr (plot ratio), maxSc (site coverage as 0-1), bandLabel
 * @returns null if useType is 'composite' (requires manual calculation per reg 21(2))
 * @returns null if any required param is missing
 */
export function lookupFirstSchedule(
  params: Partial<FirstScheduleLookupParams>
): FirstScheduleResult | null {
  const { siteClass, useType, buildingHeightM } = params;

  if (!siteClass || !useType || buildingHeightM === undefined || buildingHeightM === null) {
    return null;
  }

  if (buildingHeightM <= 0) {
    return null;
  }

  if (useType === 'composite') {
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

/**
 * Get a user-friendly message about why First Schedule lookup is not available.
 */
export function getFirstScheduleHint(
  siteClass: SiteClass | null | undefined,
  useType: UseType | null | undefined,
  buildingHeightM: number | null | undefined
): string | null {
  if (useType === 'composite') {
    return 'Composite use requires manual B(P)R calculation per reg 21(2)';
  }
  const missing: string[] = [];
  if (!siteClass) missing.push('site class');
  if (!useType) missing.push('use type');
  if (buildingHeightM === undefined || buildingHeightM === null || buildingHeightM <= 0) {
    missing.push('building height (m)');
  }
  if (missing.length > 0) {
    return `Set ${missing.join(', ')} in Profile to unlock B(P)R First Schedule`;
  }
  return null;
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
