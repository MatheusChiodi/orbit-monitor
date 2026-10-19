import type { ComponentType } from 'react';
import { AreaChart } from './AreaChart/AreaChart';
import { BarRanking } from './BarRanking/BarRanking';
import { BigNumber } from './BigNumber/BigNumber';
import { BulletChart } from './BulletChart/BulletChart';
import { CalendarHeatmap } from './CalendarHeatmap/CalendarHeatmap';
import type { DisplayModeId } from './compatibility';
import { Donut } from './Donut/Donut';
import { HeadroomBar } from './HeadroomBar/HeadroomBar';
import { HexGrid } from './HexGrid/HexGrid';
import { Histogram } from './Histogram/Histogram';
import { KpiCard } from './KpiCard/KpiCard';
import { LineChart } from './LineChart/LineChart';
import { LiveTable } from './LiveTable/LiveTable';
import { RadialGauge } from './RadialGauge/RadialGauge';
import { SmallMultiples } from './SmallMultiples/SmallMultiples';
import { StackedBar } from './StackedBar/StackedBar';
import { StepLine } from './StepLine/StepLine';
import { TextStatus } from './TextStatus/TextStatus';
import { TrafficLight } from './TrafficLight/TrafficLight';
import type { ModeProps } from './types';
import { UptimeRibbon } from './UptimeRibbon/UptimeRibbon';
import { WeekdayHourHeatmap } from './WeekdayHourHeatmap/WeekdayHourHeatmap';

/** One component per display mode (FE-24), keyed like `DISPLAY_MODES`. */
export const MODE_COMPONENTS: Record<DisplayModeId, ComponentType<ModeProps>> = {
  'big-number': BigNumber,
  'radial-gauge': RadialGauge,
  bullet: BulletChart,
  'headroom-bar': HeadroomBar,
  'kpi-card': KpiCard,
  line: LineChart,
  area: AreaChart,
  'step-line': StepLine,
  'bar-ranking': BarRanking,
  'stacked-bar': StackedBar,
  donut: Donut,
  'weekday-hour-heatmap': WeekdayHourHeatmap,
  'calendar-heatmap': CalendarHeatmap,
  'uptime-ribbon': UptimeRibbon,
  'traffic-light': TrafficLight,
  'status-pill': TextStatus,
  'live-table': LiveTable,
  'small-multiples': SmallMultiples,
  histogram: Histogram,
  'hex-grid': HexGrid,
};
