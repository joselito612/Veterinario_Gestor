import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface StockEvolutionPoint {
  date: string;
  entries: number;
  exits: number;
}

interface StockEvolutionChartProps {
  data: StockEvolutionPoint[];
}

export function StockEvolutionChart({ data }: StockEvolutionChartProps) {
  return (
    <div className="vet-card">
      <div className="vet-card-header">
        <h3 className="card-title">Evolución de entradas y salidas</h3>
        <p className="card-description">Variación de unidades de inventario por fecha</p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="entries"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="Entradas"
            />
            <Line
              type="monotone"
              dataKey="exits"
              stroke="#EF4444"
              strokeWidth={2}
              dot={false}
              name="Salidas"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
