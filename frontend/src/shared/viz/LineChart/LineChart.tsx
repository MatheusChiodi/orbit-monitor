import { TimeSeriesChart, type TimeSeriesProps } from '../core/TimeSeriesChart';

/** Mode 6: line chart (stored series). */
export function LineChart(props: TimeSeriesProps) {
  return <TimeSeriesChart variant="line" {...props} />;
}
