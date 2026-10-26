import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  Legend
} from 'recharts';

interface StockRankingChartProps {
  data: { name: string; stock: number; sku?: string }[];
  title: string;
}

export function StockRankingChart({ data, title }: StockRankingChartProps) {
  const sorted = [...data].sort((a, b) => b.stock - a.stock);
  const top5 = sorted.slice(0, 5);

  return (
    <div className="vet-card">
      <div className="vet-card-header">
        <h3 className="card-title">{title}</h3>
        <p className="card-description">Top 5 productos ordenados por stock actual</p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top5}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="stock" fill="#38BDF8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
