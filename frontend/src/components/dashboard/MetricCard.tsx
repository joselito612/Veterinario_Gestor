interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
}

export function MetricCard({ title, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="vet-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <p className="text-sm font-medium text-vet-muted">{title}</p>
          {subtitle && <p className="text-xs text-vet-muted">{subtitle}</p>}
        </div>
        {trend && (
          <p className={`text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.value}
          </p>
        )}
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-vet-dark">{value}</p>
      </div>
    </div>
  );
}
