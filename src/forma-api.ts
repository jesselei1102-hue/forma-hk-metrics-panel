import { Forma } from 'forma-embedded-view-sdk/auto';
import type { AreaMetricsData, FunctionGfa, CustomMetricData } from './types';

function extractValue(val: number | 'UNABLE_TO_CALCULATE' | undefined): number | null {
  if (val === undefined || val === 'UNABLE_TO_CALCULATE') return null;
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  return val;
}

function extractFunctionBreakdown(
  breakdown: Array<{ functionName: string; value: number | 'UNABLE_TO_CALCULATE' }> | undefined
): { total: number | null; functions: FunctionGfa[] } {
  if (!breakdown || breakdown.length === 0) {
    return { total: null, functions: [] };
  }
  let sum = 0;
  let hasValue = false;
  const functions: FunctionGfa[] = [];
  for (const item of breakdown) {
    const val = extractValue(item.value);
    if (val !== null) {
      sum += val;
      hasValue = true;
      functions.push({ functionName: item.functionName, value: val });
    }
  }
  return { total: hasValue ? sum : null, functions };
}

type SdkCustomMetric = {
  id: string;
  name: string;
  unitOfMeasurement?: string;
  functionBreakdown?: Array<{ value: number | 'UNABLE_TO_CALCULATE' }>;
  value?: number | 'UNABLE_TO_CALCULATE';
};

function extractCustomMetrics(
  customMetrics: SdkCustomMetric[] | undefined
): CustomMetricData[] {
  if (!customMetrics || customMetrics.length === 0) return [];
  const result: CustomMetricData[] = [];
  for (const metric of customMetrics) {
    let actual: number | null = null;
    if (metric.functionBreakdown && metric.functionBreakdown.length > 0) {
      let sum = 0;
      let hasValue = false;
      for (const item of metric.functionBreakdown) {
        const val = extractValue(item.value);
        if (val !== null) {
          sum += val;
          hasValue = true;
        }
      }
      if (hasValue) actual = sum;
    } else if (metric.value !== undefined) {
      actual = extractValue(metric.value);
    }
    result.push({ id: metric.id, name: metric.name, actual });
  }
  return result;
}

async function getBuildingPaths(): Promise<string[]> {
  try {
    const buildingsPaths = await Forma.geometry.getPathsByCategory({ category: 'buildings' });
    if (buildingsPaths.length > 0) return buildingsPaths;
  } catch {
    // buildings category not available
  }
  try {
    const buildingPaths = await Forma.geometry.getPathsByCategory({ category: 'building' });
    if (buildingPaths.length > 0) return buildingPaths;
  } catch {
    // building category not available
  }
  return [];
}

export async function fetchAreaMetrics(): Promise<AreaMetricsData> {
  try {
    const [sitePaths, buildingPaths] = await Promise.all([
      Forma.geometry.getPathsByCategory({ category: 'site_limit' }),
      getBuildingPaths(),
    ]);

    const siteMetricsPromise =
      sitePaths.length > 0
        ? Forma.areaMetrics.calculate({ paths: sitePaths })
        : Promise.resolve(null);

    const buildingMetricsPromise =
      buildingPaths.length > 0
        ? Forma.areaMetrics.calculate({ paths: buildingPaths })
        : Forma.areaMetrics.calculate({});

    const [siteMetrics, buildingMetrics] = await Promise.all([
      siteMetricsPromise,
      buildingMetricsPromise,
    ]);

    const siteArea = siteMetrics
      ? extractValue(siteMetrics.builtInMetrics.siteArea?.value)
      : null;

    const { total: gfa, functions: functionBreakdown } = extractFunctionBreakdown(
      buildingMetrics.builtInMetrics.grossFloorArea.functionBreakdown
    );
    const buildingCoverage = extractValue(buildingMetrics.builtInMetrics.buildingCoverage?.value);

    const customMetrics = extractCustomMetrics(
      (buildingMetrics as { customMetrics?: SdkCustomMetric[] }).customMetrics
    );

    return {
      siteArea,
      grossFloorArea: gfa,
      buildingCoverage,
      functionBreakdown,
      customMetrics,
    };
  } catch (error) {
    console.error('Error fetching area metrics:', error);
    return {
      siteArea: null,
      grossFloorArea: null,
      buildingCoverage: null,
      functionBreakdown: [],
      customMetrics: [],
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
