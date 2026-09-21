import type { MetricRow, Profile, AreaMetricsData, StatusThresholds } from './types';

function calculateStatus(
  usagePercent: number | null,
  thresholds: StatusThresholds
): 'green' | 'yellow' | 'red' | 'none' {
  if (usagePercent === null) return 'none';
  if (usagePercent <= 100) return 'green';
  if (thresholds.yellowEnabled && usagePercent <= thresholds.yellowMax) return 'yellow';
  return 'red';
}

export function calculateMetrics(
  areaData: AreaMetricsData,
  profile: Profile,
  thresholds: StatusThresholds,
  manualRoofMpd: number | null
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
    nameZh: '地盘面积',
    actual: siteAreaActual,
    limit: siteLimit,
    usagePercent: siteUsage,
    status: 'none',
  });

  const gfaActual = areaData.grossFloorArea;
  const gfaLimit = profile.maxGfaM2;
  const gfaUsage =
    gfaActual !== null && gfaLimit !== null && gfaLimit > 0
      ? (gfaActual / gfaLimit) * 100
      : null;
  metrics.push({
    name: 'GFA Total',
    nameZh: '总建筑面积',
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
    nameZh: '地积比率',
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
    nameZh: '建筑覆盖率',
    actual: scActual,
    limit: coverageLimit,
    usagePercent: scUsage,
    status: calculateStatus(scUsage, thresholds),
  });

  if (profile.towers.length > 0) {
    const primaryTower = profile.towers[0];
    const heightLimit = primaryTower.maxBhMpd;
    const heightUsage =
      manualRoofMpd !== null && heightLimit > 0
        ? (manualRoofMpd / heightLimit) * 100
        : null;
    metrics.push({
      name: `Height (${primaryTower.id})`,
      nameZh: `高度 (${primaryTower.id})`,
      actual: manualRoofMpd,
      limit: heightLimit,
      usagePercent: heightUsage,
      status: calculateStatus(heightUsage, thresholds),
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
