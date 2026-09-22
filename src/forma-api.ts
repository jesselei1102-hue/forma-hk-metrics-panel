import { Forma } from 'forma-embedded-view-sdk/auto';
import type { AreaMetricsData } from './types';

function extractValue(val: number | 'UNABLE_TO_CALCULATE' | undefined): number | null {
  if (val === undefined || val === 'UNABLE_TO_CALCULATE') return null;
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  return val;
}

function sumFunctionBreakdown(
  breakdown: Array<{ value: number | 'UNABLE_TO_CALCULATE' }> | undefined
): number | null {
  if (!breakdown || breakdown.length === 0) return null;
  let sum = 0;
  let hasValue = false;
  for (const item of breakdown) {
    const val = extractValue(item.value);
    if (val !== null) {
      sum += val;
      hasValue = true;
    }
  }
  return hasValue ? sum : null;
}

function extractGrossFloorArea(gfa: {
  value?: number | 'UNABLE_TO_CALCULATE';
  functionBreakdown?: Array<{ value: number | 'UNABLE_TO_CALCULATE' }>;
}): number | null {
  const directValue = extractValue(gfa.value);
  if (directValue !== null) {
    return directValue;
  }
  return sumFunctionBreakdown(gfa.functionBreakdown);
}

export async function fetchAreaMetrics(): Promise<AreaMetricsData> {
  try {
    const sitePaths = await Forma.geometry.getPathsByCategory({
      category: 'site_limit',
    });

    const metrics = await Forma.areaMetrics.calculate({
      paths: sitePaths.length > 0 ? sitePaths : undefined,
    });

    const gfa = extractGrossFloorArea(metrics.builtInMetrics.grossFloorArea);
    const buildingCoverage = extractValue(metrics.builtInMetrics.buildingCoverage?.value);

    return {
      siteArea: extractValue(metrics.builtInMetrics.siteArea?.value),
      grossFloorArea: gfa,
      buildingCoverage: buildingCoverage,
    };
  } catch (error) {
    console.error('Error fetching area metrics:', error);
    return {
      siteArea: null,
      grossFloorArea: null,
      buildingCoverage: null,
    };
  }
}

export async function isFormaEnvironment(): Promise<boolean> {
  try {
    await Forma.getProjectId();
    return true;
  } catch {
    return false;
  }
}

export { Forma };
