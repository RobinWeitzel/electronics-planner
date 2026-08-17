import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPowerMw } from '../lib/format';
import { categoryColor } from '../lib/palette';
import { useResolvedTheme } from '../lib/useResolvedTheme';
import type { ComponentCategory } from '../types';

export interface BreakdownItem {
  id: string;
  label: string;
  category: ComponentCategory;
  valueMw: number;
}

const CATEGORY_NAME: Record<ComponentCategory, string> = { battery: 'Battery', converter: 'Converter loss', load: 'Load', other: 'Other' };

export default function PowerBreakdownChart({ items }: { items: BreakdownItem[] }) {
  const theme = useResolvedTheme();
  const sorted = [...items].filter((i) => i.valueMw > 0).sort((a, b) => b.valueMw - a.valueMw);
  if (sorted.length === 0) return <p className="muted small">Nothing draws current in this circuit yet.</p>;

  const usedCategories = Array.from(new Set(sorted.map((i) => i.category)));
  const height = Math.max(120, sorted.length * 34 + 16);
  const tickColor = 'var(--text-secondary)';
  const gridColor = 'var(--gridline)';

  return (
    <div className="breakdown-chart">
      <div className="chart-legend">
        {usedCategories.map((c) => (
          <span key={c} className="chart-legend-item">
            <i className="legend-swatch" style={{ background: categoryColor(c, theme) }} />
            {CATEGORY_NAME[c]}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }} barCategoryGap={8}>
          <XAxis type="number" tick={{ fontSize: 11, fill: tickColor }} axisLine={{ stroke: gridColor }} tickLine={false} tickFormatter={(v: number) => formatPowerMw(v)} />
          <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12, fill: tickColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--hover-wash)' }}
            formatter={(value) => formatPowerMw(Number(value))}
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-hairline)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
            labelStyle={{ color: 'var(--text-primary)' }}
          />
          <Bar dataKey="valueMw" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {sorted.map((item) => (
              <Cell key={item.id} fill={categoryColor(item.category, theme)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
