import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Label
} from 'recharts';

const COLORS = ['#38BDF8', '#0EA5E9', '#0369A1', '#7DD3FC', '#BAE6FD'];

interface CategoryDistributionChartProps {
  data: { category: string; units: number }[];
}

export function CategoryDistributionChart({ data }: CategoryDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.units, 0);

  return (
    <div className="vet-card">
      <div className="vet-card-header">
        <h3 className="card-title">Distribución de unidades por categoría</h3>
        <p className="card-description">Unidades en stock agrupadas por categoría</p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip />
            <Label />
            <Pie
              data={data}
              dataKey="units"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              fill="#8884d8"
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="legend">
          {data.map((d, index) => (
            <div key={d.category} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="legend-label">{d.category}</span>
              <span className="legend-value">{d.units} ({total > 0 ? Math.round((d.units / total) * 100) : 0}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
