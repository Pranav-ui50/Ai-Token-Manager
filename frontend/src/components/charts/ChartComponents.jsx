/**
 * Chart Components
 *
 * Reusable chart components built with Recharts for data visualization.
 */

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter
} from 'recharts';

// Color palette for charts
const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  chartColors: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#64748b']
};

/**
 * Custom tooltip component
 */
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

/**
 * Line Chart Component
 */
export const LineChartComponent = ({
  data,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisKey = 'name',
  formatter,
  className = ''
}) => {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis dataKey={xAxisKey} stroke="#6b7280" fontSize={12} />
        <YAxis stroke="#6b7280" fontSize={12} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type={line.type || 'monotone'}
            dataKey={line.dataKey}
            name={line.name || line.dataKey}
            stroke={line.color || COLORS.chartColors[index % COLORS.chartColors.length]}
            strokeWidth={line.strokeWidth || 2}
            dot={line.dot !== false}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Area Chart Component
 */
export const AreaChartComponent = ({
  data,
  areas,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisKey = 'name',
  stacked = false,
  formatter,
  className = ''
}) => {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis dataKey={xAxisKey} stroke="#6b7280" fontSize={12} />
        <YAxis stroke="#6b7280" fontSize={12} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {areas.map((area, index) => (
          <Area
            key={area.dataKey}
            type={area.type || 'monotone'}
            dataKey={area.dataKey}
            name={area.name || area.dataKey}
            stroke={area.color || COLORS.chartColors[index % COLORS.chartColors.length]}
            fill={area.color || COLORS.chartColors[index % COLORS.chartColors.length]}
            fillOpacity={0.3}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

/**
 * Bar Chart Component
 */
export const BarChartComponent = ({
  data,
  bars,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisKey = 'name',
  stacked = false,
  formatter,
  horizontal = false,
  className = ''
}) => {
  const ChartComponent = horizontal ? BarChart : BarChart;
  const AxisComponent = horizontal ? YAxis : XAxis;

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ChartComponent
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        {horizontal ? (
          <>
            <XAxis type="number" stroke="#6b7280" fontSize={12} />
            <YAxis dataKey={xAxisKey} type="category" stroke="#6b7280" fontSize={12} width={100} />
          </>
        ) : (
          <>
            <XAxis dataKey={xAxisKey} stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
          </>
        )}
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name || bar.dataKey}
            fill={bar.color || COLORS.chartColors[index % COLORS.chartColors.length]}
            stackId={stacked ? 'stack' : undefined}
            radius={bar.radius || [4, 4, 0, 0]}
          />
        ))}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

/**
 * Pie Chart Component
 */
export const PieChartComponent = ({
  data,
  dataKey = 'value',
  nameKey = 'name',
  height = 300,
  showLegend = true,
  showLabels = true,
  innerRadius = 0,
  formatter,
  className = ''
}) => {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={innerRadius}
          label={showLabels ? ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)` : false}
          labelLine={showLabels}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || COLORS.chartColors[index % COLORS.chartColors.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * Donut Chart Component
 */
export const DonutChartComponent = ({
  data,
  dataKey = 'value',
  nameKey = 'name',
  height = 300,
  showLegend = true,
  centerText,
  formatter,
  className = ''
}) => {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height} className={className}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={50}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS.chartColors[index % COLORS.chartColors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
      {centerText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{centerText}</div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Composed Chart Component (for mixed chart types)
 */
export const ComposedChartComponent = ({
  data,
  components,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisKey = 'name',
  formatter,
  className = ''
}) => {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis dataKey={xAxisKey} stroke="#6b7280" fontSize={12} />
        <YAxis stroke="#6b7280" fontSize={12} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {components.map((comp, index) => {
          const color = comp.color || COLORS.chartColors[index % COLORS.chartColors.length];
          switch (comp.type) {
            case 'area':
              return (
                <Area
                  key={comp.dataKey}
                  type="monotone"
                  dataKey={comp.dataKey}
                  name={comp.name || comp.dataKey}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.3}
                />
              );
            case 'bar':
              return (
                <Bar
                  key={comp.dataKey}
                  dataKey={comp.dataKey}
                  name={comp.name || comp.dataKey}
                  fill={color}
                  radius={[4, 4, 0, 0]}
                />
              );
            case 'line':
            default:
              return (
                <Line
                  key={comp.dataKey}
                  type="monotone"
                  dataKey={comp.dataKey}
                  name={comp.name || comp.dataKey}
                  stroke={color}
                  strokeWidth={2}
                />
              );
          }
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

/**
 * Usage Chart - Specialized chart for token/API usage
 */
export const UsageChart = ({ data, type = 'tokens', height = 300 }) => {
  const lineConfig = {
    tokens: {
      lines: [
        { dataKey: 'inputTokens', name: 'Input Tokens', color: COLORS.primary },
        { dataKey: 'outputTokens', name: 'Output Tokens', color: COLORS.secondary }
      ],
      formatter: (v) => v?.toLocaleString()
    },
    cost: {
      lines: [{ dataKey: 'cost', name: 'Cost ($)', color: COLORS.success }],
      formatter: (v) => `$${v?.toFixed(2)}`
    },
    requests: {
      lines: [{ dataKey: 'requests', name: 'API Requests', color: COLORS.info }],
      formatter: (v) => v?.toLocaleString()
    }
  };

  const config = lineConfig[type] || lineConfig.tokens;

  return (
    <LineChartComponent
      data={data}
      lines={config.lines}
      height={height}
      xAxisKey="date"
      formatter={config.formatter}
    />
  );
};

/**
 * Export all chart components
 */
export default {
  LineChartComponent,
  AreaChartComponent,
  BarChartComponent,
  PieChartComponent,
  DonutChartComponent,
  ComposedChartComponent,
  UsageChart,
  COLORS
};