import type { MetricRow } from '../types';
import { formatValue, formatPercent } from '../metrics';

interface Props {
  metrics: MetricRow[];
  liveSiteArea?: number | null;
  profileSiteArea?: number | null;
  bprHint?: string | null;
}

function StatusDot({ status }: { status: MetricRow['status'] }) {
  return <span class={`status-dot status-${status}`} />;
}

function formatSiteCoverage(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function DualLimitDisplay({ metric }: { metric: MetricRow }) {
  const isPrOrSc = metric.name === 'Plot Ratio' || metric.name === 'Site Coverage';
  const isSc = metric.name === 'Site Coverage';

  if (!isPrOrSc) {
    return <>{formatValue(metric.limit, 0)}</>;
  }

  const profileLimit = metric.profileLimit ?? null;
  const bprLimit = metric.bprLimit ?? null;
  const hasProfileLimit = profileLimit !== null;
  const hasBprLimit = bprLimit !== null;
  const hasBoth = hasProfileLimit && hasBprLimit;

  if (!hasProfileLimit && !hasBprLimit) {
    return <>—</>;
  }

  const formatLimit = (val: number | null) => {
    if (val === null) return '—';
    return isSc ? formatSiteCoverage(val) : formatValue(val, 2);
  };

  if (hasBoth) {
    const isProfileStricter = profileLimit <= bprLimit;
    return (
      <div class="dual-limit">
        <span class={`limit-value ${isProfileStricter ? 'stricter' : ''}`} title="Profile limit">
          P: {formatLimit(profileLimit)}
        </span>
        <span class={`limit-value ${!isProfileStricter ? 'stricter' : ''}`} title={`B(P)R ${metric.bprBandLabel || ''}`}>
          B: {formatLimit(bprLimit)}
        </span>
      </div>
    );
  }

  if (hasProfileLimit) {
    return (
      <span class="limit-value" title="Profile limit">
        {formatLimit(profileLimit)}
      </span>
    );
  }

  return (
    <span class="limit-value bpr-only" title={`B(P)R ${metric.bprBandLabel || ''}`}>
      {formatLimit(bprLimit)}
    </span>
  );
}

function SiteAreaWarning({ liveSiteArea, profileSiteArea }: { liveSiteArea: number; profileSiteArea: number }) {
  const diff = Math.abs(liveSiteArea - profileSiteArea);
  const pctDiff = (diff / profileSiteArea) * 100;

  if (pctDiff < 2) {
    return null;
  }

  return (
    <div class="site-area-warning">
      <span class="warning-icon">⚠</span>
      <span>
        Forma site area ({formatValue(liveSiteArea, 0)} m²) differs from profile ({formatValue(profileSiteArea, 0)} m²) by {pctDiff.toFixed(1)}%.
        PR/SC denominator uses profile value.
      </span>
    </div>
  );
}

export function MetricsTable({ metrics, liveSiteArea, profileSiteArea, bprHint }: Props) {
  const showSiteAreaWarning =
    liveSiteArea !== null &&
    liveSiteArea !== undefined &&
    profileSiteArea !== null &&
    profileSiteArea !== undefined &&
    profileSiteArea > 0;

  return (
    <div class="metrics-table-container">
      {showSiteAreaWarning && (
        <SiteAreaWarning liveSiteArea={liveSiteArea!} profileSiteArea={profileSiteArea!} />
      )}

      <table class="metrics-table">
        <thead>
          <tr>
            <th></th>
            <th>Actual</th>
            <th>Limit</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.name}>
              <td>
                <div class="metric-name">
                  <StatusDot status={metric.status} />
                  <span>{metric.name}</span>
                </div>
              </td>
              <td>
                {metric.name === 'Plot Ratio'
                  ? formatValue(metric.actual, 3)
                  : metric.name === 'Site Coverage'
                  ? formatSiteCoverage(metric.actual)
                  : formatValue(metric.actual, 0)}
              </td>
              <td>
                <DualLimitDisplay metric={metric} />
              </td>
              <td>{formatPercent(metric.usagePercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {bprHint && (
        <div class="bpr-hint-row">
          {bprHint}
        </div>
      )}
    </div>
  );
}
