import { Fragment } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export type ChartData = {
  title: string;
  subtitle?: string;
  chartType?: "line" | "heatmap";
  series: Array<{ key: string; label: string; color: string; unit?: string; yAxisId?: "left" | "right" }>;
  data: Array<{ date: string; [key: string]: number | string }>;
  yAxes?: Array<{ id: "left" | "right"; label: string; unit?: string }>;
  heatmap?: {
    rows: string[];
    columns: string[];
    cells: Array<{ row: string; column: string; value: number }>;
  };
};

type Props = { data: ChartData };

export function ChartBlock({ data }: Props) {
  if (data.chartType === "heatmap" && data.heatmap) {
    return <HeatmapBlock data={data} />;
  }

  const tickInterval = Math.max(1, Math.floor(data.data.length / 8));
  const leftAxis = data.yAxes?.find((axis) => axis.id === "left") || { id: "left" as const, label: "", unit: "%" };
  const rightAxis = data.yAxes?.find((axis) => axis.id === "right");

  return (
    <div className="chart-block">
      <p className="chart-block__title">{data.title}</p>
      {data.subtitle ? <p className="chart-block__subtitle">{data.subtitle}</p> : null}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval={tickInterval}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={(v: number) => formatAxisTick(v, leftAxis.unit)}
          />
          {rightAxis ? (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={(v: number) => formatAxisTick(v, rightAxis.unit)}
            />
          ) : null}
          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--panel-border)",
              fontSize: 12,
              color: "var(--text)"
            }}
            formatter={(value, name) => {
              const series = data.series.find((item) => item.label === name || item.key === name);
              return [formatTooltipValue(value, series?.unit), name ?? ""];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {data.series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              yAxisId={s.yAxisId || "left"}
              dot={false}
              strokeWidth={1.5}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HeatmapBlock({ data }: Props) {
  const heatmap = data.heatmap!;
  const valueFor = (row: string, column: string) =>
    heatmap.cells.find((cell) => cell.row === row && cell.column === column)?.value ?? 0;

  return (
    <div className="chart-block chart-block--heatmap">
      <p className="chart-block__title">{data.title}</p>
      {data.subtitle ? <p className="chart-block__subtitle">{data.subtitle}</p> : null}
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: `minmax(92px, 1.2fr) repeat(${heatmap.columns.length}, minmax(52px, 1fr))` }}
      >
        <div className="heatmap-grid__corner" />
        {heatmap.columns.map((column) => (
          <div key={`column-${column}`} className="heatmap-grid__label heatmap-grid__label--column" title={column}>
            {shortLabel(column)}
          </div>
        ))}
        {heatmap.rows.map((row) => (
          <Fragment key={`row-fragment-${row}`}>
            <div key={`row-${row}`} className="heatmap-grid__label heatmap-grid__label--row" title={row}>
              {shortLabel(row)}
            </div>
            {heatmap.columns.map((column) => {
              const value = valueFor(row, column);
              return (
                <div
                  key={`${row}-${column}`}
                  className="heatmap-grid__cell"
                  title={`${row} vs ${column}: ${formatCorrelation(value)}`}
                  style={{ background: heatmapColor(value) }}
                >
                  {formatCorrelation(value)}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function formatAxisTick(value: number, unit?: string): string {
  if (unit === "$/bbl") return `$${value}`;
  if (unit === "bps") return `${value}`;
  if (unit === "%") return `${value}%`;
  return `${value}`;
}

function formatTooltipValue(value: unknown, unit?: string): string {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return String(value);
  if (unit === "$/bbl") return `$${numberValue.toFixed(1)}/bbl`;
  if (unit === "bps") return `${numberValue.toFixed(0)}bps`;
  if (unit === "%") return `${numberValue.toFixed(1)}%`;
  return numberValue.toFixed(1);
}

function formatCorrelation(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function heatmapColor(value: number): string {
  const clamped = Math.max(-1, Math.min(1, value));
  const alpha = 0.16 + Math.abs(clamped) * 0.62;
  return clamped >= 0
    ? `rgba(22, 163, 74, ${alpha})`
    : `rgba(220, 38, 38, ${alpha})`;
}

function shortLabel(label: string): string {
  return label
    .replace("Broad Dollar", "Dollar")
    .replace("WTI YoY%", "WTI")
    .replace("CPI YoY%", "CPI")
    .replace("SPY YoY%", "SPY")
    .replace("US 10Y yield", "10Y")
    .replace("HY OAS", "HY");
}
