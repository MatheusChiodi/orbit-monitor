import { TimeSeriesChart, type TimeSeriesProps } from '../core/TimeSeriesChart';

/** Mode 8: step line (states or discrete values over time). */
export function StepLine(props: TimeSeriesProps) {
  return <TimeSeriesChart variant="step-line" {...props} />;
}
