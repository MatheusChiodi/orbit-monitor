import { TimeSeriesChart, type TimeSeriesProps } from '../core/TimeSeriesChart';

/** Mode 7: area chart (volume over time). */
export function AreaChart(props: TimeSeriesProps) {
  return <TimeSeriesChart variant="area" {...props} />;
}
