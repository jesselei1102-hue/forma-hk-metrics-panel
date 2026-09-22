import type { MetricRow } from '../types';
import { formatValue, formatPercent } from '../metrics';

interface Props {
  metrics: MetricRow[];
}

function StatusDot({ status }: { status: MetricRow['status'] }) {
  return <span class={`status-dot status-${status}`} />;
}

export function MetricsTable({ metrics }: Props) {
  return (
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
                <span class="metric-name-en">{metric.name}</span>
                {metric.nameZh && <span class="metric-name-zh">{metric.nameZh}</span>}
              </div>
            </td>
            <td>
              {metric.name === 'Plot Ratio' || metric.name === 'Site Coverage'
                ? formatValue(metric.actual, 3)
                : formatValue(metric.actual, 0)}
            </td>
            <td>
              {metric.name === 'Plot Ratio' || metric.name === 'Site Coverage'
                ? formatValue(metric.limit, 3)
                : formatValue(metric.limit, 0)}
            </td>
            <td>{formatPercent(metric.usagePercent)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
