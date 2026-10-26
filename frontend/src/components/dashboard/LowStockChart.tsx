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

interface LowStockProduct {
  name: string;
  stock: number;
  minStock: number;
}

interface LowStockChartProps {
  data: LowStockProduct[];
}

export function LowStockChart({ data }: LowStockChartProps) {
  const sorted = [...data].sort((a, b) => a.stock - b.stock).slice(0, 10);

  return (
    <div className="vet-card">
      <div className="vet-card-header">
        <h3 className="card-title">Productos próximos a agotarse</h3>
        <p className="card-description">Stock actual cerca o por debajo del stock mínimo</p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sorted}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="stock" fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
