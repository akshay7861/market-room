import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export type ChartData = {
  title: string;
  series: Array<{ key: string; label: string; color: string }>;
  data: Array<{ date: string; [key: string]: number | string }>;
};

type Props = { data: ChartData };

export function ChartBlock({ data }: Props) {
  const tickInterval = Math.max(1, Math.floor(data.data.length / 8));

  return (
    <div className="chart-block">
      <p className="chart-block__title">{data.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--panel-border)",
              fontSize: 12,
              color: "var(--text)"
            }}
            formatter={(value, name) => [`${value}%`, name ?? ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {data.series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              dot={false}
              strokeWidth={1.5}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
