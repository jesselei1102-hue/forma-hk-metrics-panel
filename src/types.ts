export interface TowerLimit {
  id: string;
  maxBhMpd: number;
}

export interface MixTargetEntry {
  id: string;
  label: string;
  match: string[];
  share: number;
}

export interface LegacyMixTarget {
  officeShare: number;
  retailShare: number;
}

export type SiteClass = 'A' | 'B' | 'C';
export type UseType = 'domestic' | 'non-domestic' | 'composite';

export interface Profile {
  id: string;
  projectName: string;
  siteAreaM2: number | null;
  maxGfaM2: number | null;
  maxPr: number | null;
  maxSc: number | null;
  gfMpd: number;
  towers: TowerLimit[];
  mixTargets?: MixTargetEntry[];
  mixTarget?: LegacyMixTarget;
  useMix?: boolean;
  minPosM2?: number | null;
  minParking?: number | null;
  sourceNote?: string;
  /** B(P)R First Schedule site class (reg 18A) */
  siteClass?: SiteClass | null;
  /** B(P)R use classification for First Schedule lookup */
  useType?: UseType | null;
  /** Building height in metres (NOT mPD) for First Schedule bands */
  buildingHeightM?: number | null;
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

export type LimitSource = 'profile' | 'bpr' | 'stricter';

export interface MetricRow {
  name: string;
  actual: number | null;
  limit: number | null;
  usagePercent: number | null;
  status: 'green' | 'yellow' | 'red' | 'none';
  customMetricId?: string;
  /** Profile-defined limit (OZP / lease / brief) */
  profileLimit?: number | null;
  /** B(P)R First Schedule limit when available */
  bprLimit?: number | null;
  /** Label for B(P)R limit (e.g. "Class A ≤61m") */
  bprBandLabel?: string | null;
  /** Which limit is effective / stricter */
  limitSource?: LimitSource | null;
}

export type StatusThresholds = {
  yellowEnabled: boolean;
  yellowMax: number;
};
