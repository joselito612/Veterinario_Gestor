import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api.js';
import { SweetAlert } from '../../sweetalert.js';
import { MetricCard } from './MetricCard.js';
import { CategoryDistributionChart } from './CategoryDistributionChart.js';
import { StockRankingChart } from './StockRankingChart.js';
import { StockEvolutionChart } from './StockEvolutionChart.js';
import { LowStockChart } from './LowStockChart.js';

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  cost_price?: number;
  current_stock: number;
  min_stock?: number;
  stock_disponible?: string;
  is_active: boolean;
};

type Movement = {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  reason: string;
  attentionId: string;
  createdBy: string;
  createdAt: string;
};

type Attention = {
  id: string;
  attention_date?: string;
  status: string;
  created_at?: string;
};

type CategoryStock = {
  category: string;
  units: number;
};

export function Dashboard({ token }: { token: string }) {
  const [productos, setProductos] = useState<Product[]>([]);
  const [movimientos, setMovimientos] = useState<Movement[]>([]);
  const [atenciones, setAtenciones] = useState<Attention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, movs, atts] = await Promise.all([
        api<Product[]>('/productos', token),
        api<Movement[]>('/movimientos', token),
        api<Attention[]>('/atenciones', token)
      ]);
      setProductos(prods.filter((p) => p.is_active !== false));
      setMovimientos(movs);
      setAtenciones(atts);
    } catch (err: any) {
      setError(err.message);
      await SweetAlert.error('No se pudieron cargar los datos del dashboard.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return (
      <div className="vet-card">
        <h2>Dashboard</h2>
        <p>Cargando métricas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vet-card">
        <h2>Dashboard</h2>
        <p role="alert">{error}</p>
      </div>
    );
  }

  /* ── Métricas ── */
  const valorTotalInventario = productos.reduce(
    (sum, p) => sum + Number(p.current_stock) * Number(p.cost_price ?? 0),
    0
  );
  const productosStockCritico = productos.filter(
    (p) => p.stock_disponible === 'bajo_stock' || p.stock_disponible === 'sin_stock'
  ).length;
  const mesActual = new Date().toISOString().slice(0, 7); // YYYY-MM
  const atencionesMes = atenciones.filter((a) =>
    String(a.created_at ?? a.attention_date ?? '').startsWith(mesActual)
  ).length;
  const totalProductos = productos.length;

  /* ── Distribución de unidades por categoría ── */
  const categoryMap = new Map<string, number>();
  for (const p of productos) {
    categoryMap.set(p.category, (categoryMap.get(p.category) ?? 0) + Number(p.current_stock));
  }
  const categoryData: CategoryStock[] = Array.from(categoryMap.entries()).map(
    ([category, units]) => ({ category, units })
  );

  /* ── Ranking de stock (mayor y menor) ── */
  const stockRanking = productos
    .map((p) => ({ name: p.name, stock: Number(p.current_stock), sku: p.sku }))
    .sort((a, b) => b.stock - a.stock);

  /* ── Evolución de entradas y salidas (agrupado por día) ── */
  const dayMap = new Map<string, { entries: number; exits: number }>();
  for (const m of movimientos) {
    const day = String(m.createdAt).slice(0, 10);
    const current = dayMap.get(day) ?? { entries: 0, exits: 0 };
    if (m.quantity > 0) current.entries += m.quantity;
    else current.exits += Math.abs(m.quantity);
    dayMap.set(day, current);
  }
  const evolutionData = Array.from(dayMap.entries())
    .map(([date, vals]) => ({ date, entries: vals.entries, exits: vals.exits }))
    .sort((a, b) => a.date.localeCompare(b.date));

  /* ── Productos próximos a agotarse ── */
  const lowStock = productos
    .filter((p) => Number(p.current_stock) <= Number(p.min_stock ?? 0))
    .map((p) => ({ name: p.name, stock: Number(p.current_stock), minStock: Number(p.min_stock ?? 0) }));

  return (
    <section className="space-y-6">
      <div>
        <h2>Dashboard</h2>
        <p className="text-sm text-vet-muted">
          Métricas y gráficos del inventario y las atenciones. Solo lectura.
        </p>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Valor total del inventario"
          value={`$ CLP ${valorTotalInventario.toLocaleString('es-CL')}`}
          subtitle="Suma de stock × precio de costo"
        />
        <MetricCard
          title="Productos con stock crítico"
          value={productosStockCritico}
          subtitle="Bajo stock o sin stock"
          trend={{
            value: productosStockCritico > 0 ? 'Requiere atención' : 'Sin alertas',
            positive: productosStockCritico === 0
          }}
        />
        <MetricCard
          title="Total de productos"
          value={totalProductos}
          subtitle="Productos activos en inventario"
        />
        <MetricCard
          title="Atenciones del mes"
          value={atencionesMes}
          subtitle={`Mes ${mesActual}`}
        />
      </div>

      {/* Fila de gráficos: distribución y ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDistributionChart data={categoryData} />
        <div className="grid grid-cols-1 gap-6">
          <StockRankingChart data={stockRanking} title="Productos con mayor stock" />
          <StockRankingChart
            data={[...stockRanking].reverse()}
            title="Productos con menor stock"
          />
        </div>
      </div>

      {/* Fila de gráficos: evolución y stock crítico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockEvolutionChart data={evolutionData} />
        <LowStockChart data={lowStock} />
      </div>
    </section>
  );
}
