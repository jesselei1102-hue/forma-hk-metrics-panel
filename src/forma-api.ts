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

type RawCustomMetric = Record<string, unknown> & {
  id: string;
  name?: string;
  displayName?: string;
  label?: string;
  title?: string;
  unitOfMeasurement?: string;
  functionBreakdown?: Array<{ value: number | 'UNABLE_TO_CALCULATE' }>;
  value?: number | 'UNABLE_TO_CALCULATE';
};

function looksLikeUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

function pickDisplayName(metric: RawCustomMetric): string {
  const getString = (key: string): string | undefined => {
    const val = metric[key];
    return typeof val === 'string' && val.trim() ? val.trim() : undefined;
  };

  const displayName = getString('displayName');
  if (displayName && !looksLikeUuid(displayName)) return displayName;

  const label = getString('label');
  if (label && !looksLikeUuid(label)) return label;

  const title = getString('title');
  if (title && !looksLikeUuid(title)) return title;

  const name = getString('name');
  if (name && !looksLikeUuid(name)) return name;

  const id = getString('id');
  if (id && !looksLikeUuid(id)) return id;

  return 'Custom metric';
}

function extractCustomMetrics(
  customMetrics: RawCustomMetric[] | undefined
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
    result.push({ id: metric.id, name: pickDisplayName(metric), actual });
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

    const gfaMetric = buildingMetrics.builtInMetrics.grossFloorArea;
    let gfa: number | null = null;
    let functionBreakdown: FunctionGfa[] = [];

    if (gfaMetric.functionBreakdown && gfaMetric.functionBreakdown.length > 0) {
      const extracted = extractFunctionBreakdown(gfaMetric.functionBreakdown);
      gfa = extracted.total;
      functionBreakdown = extracted.functions;
    }

    if (gfa === null) {
      const gfaValue = (gfaMetric as { value?: number | 'UNABLE_TO_CALCULATE' }).value;
      gfa = extractValue(gfaValue);
    }

    const buildingCoverage = extractValue(buildingMetrics.builtInMetrics.buildingCoverage?.value);

    const rawCustomMetrics = (buildingMetrics as { customMetrics?: RawCustomMetric[] }).customMetrics;
    const customMetrics = extractCustomMetrics(rawCustomMetrics);

    console.debug('[forma-api] fetchAreaMetrics debug:', {
      sitePaths: sitePaths.length,
      buildingPaths: buildingPaths.length,
      siteArea,
      gfa,
      functionBreakdownCount: functionBreakdown.length,
      buildingCoverage,
      customMetricsCount: customMetrics.length,
      rawGfaMetric: gfaMetric,
      rawCustomMetric0Keys: rawCustomMetrics?.[0] ? Object.keys(rawCustomMetrics[0]) : null,
    });

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
