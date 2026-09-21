import type { MetricRow } from '../types';
import { formatValue, formatPercent } from '../metrics';

interface Props {
  metrics: MetricRow[];
}

function StatusIcon({ status }: { status: MetricRow['status'] }) {
  const icons = {
    green: '✓',
    yellow: '!',
    red: '✗',
    none: '—',
  };
  return (
    <span class={`status-indicator status-${status}`}>
      {icons[status]}
    </span>
  );
}

export function MetricsTable({ metrics }: Props) {
  return (
    <table class="metrics-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Actual</th>
          <th>Limit</th>
          <th>Usage</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((metric) => (
          <tr key={metric.name}>
            <td>
              <div class="metric-name">
                <span>{metric.name}</span>
                {metric.nameZh && <span class="metric-name-zh">{metric.nameZh}</span>}
              </div>
            </td>
            <td>
              {metric.name === 'Plot Ratio' || metric.name === 'Site Coverage'
                ? formatValue(metric.actual, 3)
                : formatValue(metric.actual, 0)}
              {metric.name.includes('Height') && metric.actual !== null && ' mPD'}
              {(metric.name.includes('Area') || metric.name === 'GFA Total') &&
                metric.actual !== null &&
                ' m²'}
            </td>
            <td>
              {metric.name === 'Plot Ratio' || metric.name === 'Site Coverage'
                ? formatValue(metric.limit, 3)
                : formatValue(metric.limit, 0)}
              {metric.name.includes('Height') && metric.limit !== null && ' mPD'}
              {(metric.name.includes('Area') || metric.name === 'GFA Total') &&
                metric.limit !== null &&
                ' m²'}
            </td>
            <td>{formatPercent(metric.usagePercent)}</td>
            <td>
              <StatusIcon status={metric.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
