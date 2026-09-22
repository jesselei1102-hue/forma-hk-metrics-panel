export interface TowerLimit {
  id: string;
  maxBhMpd: number;
}

export interface MixTarget {
  officeShare: number;
  commercialShare: number;
}

export interface Profile {
  id: string;
  projectName: string;
  siteAreaM2: number | null;
  maxGfaM2: number | null;
  maxPr: number | null;
  maxSc: number | null;
  gfMpd: number;
  towers: TowerLimit[];
  useMix?: boolean;
  mixTarget?: MixTarget;
  minPosM2?: number | null;
  minParking?: number | null;
  sourceNote?: string;
}

export interface FunctionGfa {
  functionName: string;
  value: number;
}

export interface CustomMetricData {
  id: string;
  name: string;
  actual: number | null;
}

export interface AreaMetricsData {
  siteArea: number | null;
  grossFloorArea: number | null;
  buildingCoverage: number | null;
  functionBreakdown: FunctionGfa[];
  customMetrics: CustomMetricData[];
}

export type TowerHeights = Record<string, string>;

export interface MetricRow {
  name: string;
  actual: number | null;
  limit: number | null;
  usagePercent: number | null;
  status: 'green' | 'yellow' | 'red' | 'none';
  customMetricId?: string;
}

export type StatusThresholds = {
  yellowEnabled: boolean;
  yellowMax: number;
};
