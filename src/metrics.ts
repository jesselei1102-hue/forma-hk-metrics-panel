import type { MetricRow, Profile, AreaMetricsData, StatusThresholds, TowerHeights, FunctionGfa, MixTargetEntry, LimitSource } from './types';
import { lookupFirstSchedule, type FirstScheduleResult } from './bpr-first-schedule';

function calculateStatus(
  usagePercent: number | null,
  thresholds: StatusThresholds
): 'green' | 'yellow' | 'red' | 'none' {
  if (usagePercent === null) return 'none';
  if (usagePercent <= 100) return 'green';
  if (thresholds.yellowEnabled && usagePercent <= thresholds.yellowMax) return 'yellow';
  return 'red';
}

function calculateMixStatus(
  usagePercent: number | null,
  thresholds: StatusThresholds
): 'green' | 'yellow' | 'red' | 'none' {
  if (usagePercent === null) return 'none';
  const deviation = Math.abs(usagePercent - 100);
  if (deviation <= 5) return 'green';
  if (thresholds.yellowEnabled && deviation <= 10) return 'yellow';
  return 'red';
}

function matchesMixTarget(functionName: string, matchTokens: string[]): boolean {
  const lower = functionName.toLowerCase();
  return matchTokens.some((token) => lower.includes(token.toLowerCase()));
}

function calculateMixTargetActual(
  breakdown: FunctionGfa[],
  target: MixTargetEntry
): number | null {
  let sum: number | null = null;
  for (const fn of breakdown) {
    if (matchesMixTarget(fn.functionName, target.match)) {
      sum = (sum ?? 0) + fn.value;
    }
  }
  return sum;
}

function determineEffectiveLimit(
  profileLimit: number | null,
  bprLimit: number | null
): { limit: number | null; source: LimitSource | null } {
  if (profileLimit !== null && bprLimit !== null) {
    if (profileLimit <= bprLimit) {
      return { limit: profileLimit, source: 'stricter' };
    } else {
      return { limit: bprLimit, source: 'stricter' };
    }
  }
  if (profileLimit !== null) {
    return { limit: profileLimit, source: 'profile' };
  }
  if (bprLimit !== null) {
    return { limit: bprLimit, source: 'bpr' };
  }
  return { limit: null, source: null };
}

export function calculateMetrics(
  areaData: AreaMetricsData,
  profile: Profile,
  thresholds: StatusThresholds,
  towerHeights: TowerHeights
): MetricRow[] {
  const metrics: MetricRow[] = [];

  const bprResult: FirstScheduleResult | null = lookupFirstSchedule({
    siteClass: profile.siteClass ?? undefined,
    useType: profile.useType ?? undefined,
    buildingHeightM: profile.buildingHeightM ?? undefined,
  });

  const siteAreaActual = areaData.siteArea;
  const siteLimit = profile.siteAreaM2;
  const siteUsage =
    siteAreaActual !== null && siteLimit !== null && siteLimit > 0
      ? (siteAreaActual / siteLimit) * 100
      : null;
  metrics.push({
    name: 'Site Area',
    actual: siteAreaActual,
    limit: siteLimit,
    usagePercent: siteUsage,
    status: calculateStatus(siteUsage, thresholds),
    profileLimit: siteLimit,
    bprLimit: null,
    bprBandLabel: null,
    limitSource: siteLimit !== null ? 'profile' : null,
  });

  const gfaActual = areaData.grossFloorArea;
  const gfaLimit = profile.maxGfaM2;
  const gfaUsage =
    gfaActual !== null && gfaLimit !== null && gfaLimit > 0
      ? (gfaActual / gfaLimit) * 100
      : null;
  metrics.push({
    name: 'GFA Total',
    actual: gfaActual,
    limit: gfaLimit,
    usagePercent: gfaUsage,
    status: calculateStatus(gfaUsage, thresholds),
    profileLimit: gfaLimit,
    bprLimit: null,
    bprBandLabel: null,
    limitSource: gfaLimit !== null ? 'profile' : null,
  });

  const siteForRatio = profile.siteAreaM2;
  const prActual =
    gfaActual !== null && siteForRatio !== null && siteForRatio > 0
      ? gfaActual / siteForRatio
      : null;
  const prProfileLimit = profile.maxPr;
  const prBprLimit = bprResult?.maxPr ?? null;
  const prEffective = determineEffectiveLimit(prProfileLimit, prBprLimit);
  const prUsage =
    prActual !== null && prEffective.limit !== null && prEffective.limit > 0
      ? (prActual / prEffective.limit) * 100
      : null;
  metrics.push({
    name: 'Plot Ratio',
    actual: prActual,
    limit: prEffective.limit,
    usagePercent: prUsage,
    status: calculateStatus(prUsage, thresholds),
    profileLimit: prProfileLimit,
    bprLimit: prBprLimit,
    bprBandLabel: bprResult?.bandLabel ?? null,
    limitSource: prEffective.source,
  });

  const coverageActual = areaData.buildingCoverage;
  const scProfileLimit = profile.maxSc;
  const scBprLimit = bprResult?.maxSc ?? null;
  const scEffective = determineEffectiveLimit(scProfileLimit, scBprLimit);
  const scActual =
    coverageActual !== null && siteForRatio !== null && siteForRatio > 0
      ? coverageActual / siteForRatio
      : null;
  const scUsage =
    scActual !== null && scEffective.limit !== null && scEffective.limit > 0
      ? (scActual / scEffective.limit) * 100
      : null;
  metrics.push({
    name: 'Site Coverage',
    actual: scActual,
    limit: scEffective.limit,
    usagePercent: scUsage,
    status: calculateStatus(scUsage, thresholds),
    profileLimit: scProfileLimit,
    bprLimit: scBprLimit,
    bprBandLabel: bprResult?.bandLabel ?? null,
    limitSource: scEffective.source,
  });

  for (const tower of profile.towers) {
    const heightStr = towerHeights[tower.id];
    const heightActual = heightStr ? parseFloat(heightStr) : null;
    const parsedHeight = heightActual !== null && Number.isFinite(heightActual) ? heightActual : null;
    const heightLimit = tower.maxBhMpd;
    const heightUsage =
      parsedHeight !== null && heightLimit > 0
        ? (parsedHeight / heightLimit) * 100
        : null;
    metrics.push({
      name: `Height (${tower.id})`,
      actual: parsedHeight,
      limit: heightLimit,
      usagePercent: heightUsage,
      status: calculateStatus(heightUsage, thresholds),
    });
  }

  if (profile.mixTargets && profile.mixTargets.length > 0) {
    for (const target of profile.mixTargets) {
      const actual = calculateMixTargetActual(areaData.functionBreakdown, target);
      const limit = gfaActual !== null && target.share > 0 ? gfaActual * target.share : null;
      const usage =
        actual !== null && limit !== null && limit > 0
          ? (actual / limit) * 100
          : null;
      metrics.push({
        name: target.label,
        actual,
        limit,
        usagePercent: usage,
        status: calculateMixStatus(usage, thresholds),
      });
    }
  }

  if (profile.minPosM2 !== null && profile.minPosM2 !== undefined) {
    metrics.push({
      name: 'POS Area',
      actual: null,
      limit: profile.minPosM2,
      usagePercent: null,
      status: 'none',
    });
  }

  for (const customMetric of areaData.customMetrics) {
    metrics.push({
      name: customMetric.name,
      actual: customMetric.actual,
      limit: null,
      usagePercent: null,
      status: 'none',
      customMetricId: customMetric.id,
    });
  }

  return metrics;
}

export function formatValue(value: number | null, decimals: number = 2): string {
  if (value === null) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}%`;
}
