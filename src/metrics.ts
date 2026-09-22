import type { MetricRow, Profile, AreaMetricsData, StatusThresholds, TowerHeights, FunctionGfa } from './types';

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

function matchesOffice(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('office') || lower.includes('办公');
}

function matchesRetail(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('retail') || lower.includes('commercial') || lower.includes('零售') || lower.includes('商业');
}

function extractMixGfa(breakdown: FunctionGfa[]): { office: number | null; retail: number | null } {
  let office: number | null = null;
  let retail: number | null = null;
  for (const fn of breakdown) {
    if (matchesOffice(fn.functionName)) {
      office = (office ?? 0) + fn.value;
    } else if (matchesRetail(fn.functionName)) {
      retail = (retail ?? 0) + fn.value;
    }
  }
  return { office, retail };
}

export function calculateMetrics(
  areaData: AreaMetricsData,
  profile: Profile,
  thresholds: StatusThresholds,
  towerHeights: TowerHeights
): MetricRow[] {
  const metrics: MetricRow[] = [];

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
  });

  const siteForRatio = profile.siteAreaM2;
  const prActual =
    gfaActual !== null && siteForRatio !== null && siteForRatio > 0
      ? gfaActual / siteForRatio
      : null;
  const prLimit = profile.maxPr;
  const prUsage =
    prActual !== null && prLimit !== null && prLimit > 0
      ? (prActual / prLimit) * 100
      : null;
  metrics.push({
    name: 'Plot Ratio',
    actual: prActual,
    limit: prLimit,
    usagePercent: prUsage,
    status: calculateStatus(prUsage, thresholds),
  });

  const coverageActual = areaData.buildingCoverage;
  const coverageLimit = profile.maxSc;
  const scActual =
    coverageActual !== null && siteForRatio !== null && siteForRatio > 0
      ? coverageActual / siteForRatio
      : null;
  const scUsage =
    scActual !== null && coverageLimit !== null && coverageLimit > 0
      ? (scActual / coverageLimit) * 100
      : null;
  metrics.push({
    name: 'Site Coverage',
    actual: scActual,
    limit: coverageLimit,
    usagePercent: scUsage,
    status: calculateStatus(scUsage, thresholds),
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

  if (profile.useMix || profile.mixTarget) {
    const { office: officeGfa, retail: retailGfa } = extractMixGfa(areaData.functionBreakdown);
    const mixTarget = profile.mixTarget;

    const officeTargetGfa = mixTarget && gfaActual !== null ? gfaActual * mixTarget.officeShare : null;
    const retailTargetGfa = mixTarget && gfaActual !== null ? gfaActual * mixTarget.retailShare : null;

    const officeUsage =
      officeGfa !== null && officeTargetGfa !== null && officeTargetGfa > 0
        ? (officeGfa / officeTargetGfa) * 100
        : null;
    metrics.push({
      name: 'Office GFA',
      actual: officeGfa,
      limit: officeTargetGfa,
      usagePercent: officeUsage,
      status: calculateMixStatus(officeUsage, thresholds),
    });

    const retailUsage =
      retailGfa !== null && retailTargetGfa !== null && retailTargetGfa > 0
        ? (retailGfa / retailTargetGfa) * 100
        : null;
    metrics.push({
      name: 'Retail GFA',
      actual: retailGfa,
      limit: retailTargetGfa,
      usagePercent: retailUsage,
      status: calculateMixStatus(retailUsage, thresholds),
    });
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
