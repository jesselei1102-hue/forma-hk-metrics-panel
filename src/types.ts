export interface TowerLimit {
  id: string;
  maxBhMpd: number;
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
  minPosM2?: number | null;
  minParking?: number | null;
  sourceNote?: string;
}

export interface AreaMetricsData {
  siteArea: number | null;
  grossFloorArea: number | null;
  buildingCoverage: number | null;
}

export interface MetricRow {
  name: string;
  nameZh?: string;
  actual: number | null;
  limit: number | null;
  usagePercent: number | null;
  status: 'green' | 'yellow' | 'red' | 'none';
}

export type StatusThresholds = {
  yellowEnabled: boolean;
  yellowMax: number;
};
