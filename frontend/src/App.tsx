import { useEffect, useState } from 'react';
import { api, login } from './api.js';
import { SweetAlert } from './sweetalert.js';

type Session = { token: string; name: string; role: string };
type Patient = { id: string; name: string; species: string };
type Product = {
  id: string; sku: string; barcode?: string; name: string; category: string;
  subcategory?: string; brand?: string; description?: string; unit?: string;
  batch?: string; sanitary_reg?: string; cost_price?: number; sale_price?: number;
  current_stock: number; min_stock?: number; expiration_date?: string | null;
  supplier?: string; is_active: boolean; stock_disponible?: string;
};
type RecetaItem = { productId: string; quantity: number; dosis: string };
type Attention = {
  id: string; status: string; diagnosis?: string; treatment?: string;
  patient_name?: string; patient_species?: string;
  attention_date?: string; created_at?: string;
  items: { product_id: string; quantity: number; dosis: string; product_name: string; product_sku: string }[];
  avisosStock?: string[];
};
type Client = { id: string; name: string; rut: string; phone: string; email: string };
type Appointment = { id: string; patient_id: string; scheduled_at: string; reason: string; status: string };

type Tab = 'productos' | 'pacientes' | 'atenciones' | 'clientes' | 'citas' | 'pagos' | 'auditoria';
type Sub = 'registrar' | 'listar';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('admin@veterinaria.cl');
  const [password, setPassword] = useState('Admin123!');
  const [tab, setTab] = useState<Tab>('atenciones');
  const [sub, setSub] = useState<Sub>('registrar');
  function irTab(t: Tab, s?: Sub) {
    setTab(t);
    setSub(s ?? (t === 'atenciones' ? 'registrar' : 'listar'));
    setMensaje('');
  }
  const [data, setData] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');

  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
  const [pacienteId, setPacienteId] = useState('');
  const [fecha, setFecha] = useState('2026-09-29');
  const [atencionId, setAtencionId] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [receta, setReceta] = useState<RecetaItem[]>([]);
  const [prodSel, setProdSel] = useState('');
  const [cant, setCant] = useState(1);
  const [dosis, setDosis] = useState('');
  const [detalle, setDetalle] = useState<Attention | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [ficha, setFicha] = useState<any>(null);
  const [atenciones, setAtenciones] = useState<any[]>([]);
  const [pendienteReceta, setPendienteReceta] = useState<RecetaItem | null>(null);
  const [exitoCierre, setExitoCierre] = useState<string | null>(null);
  const [fichaExpandida, setFichaExpandida] = useState<string | null>(null);

  const [clientes, setClientes] = useState<Client[]>([]);
  const [cliNombre, setCliNombre] = useState('');
  const [cliRut, setCliRut] = useState('');
  const [cliTelefono, setCliTelefono] = useState('');
  const [cliEmail, setCliEmail] = useState('');
  const [cliSel, setCliSel] = useState('');
  const [masNombre, setMasNombre] = useState('');
  const [masEspecie, setMasEspecie] = useState('Canino');
  const [masRaza, setMasRaza] = useState('');
  const [masEdad, setMasEdad] = useState(1);
  const [masPeso, setMasPeso] = useState(5);
  const [cliDetalle, setCliDetalle] = useState<any>(null);

  const [citas, setCitas] = useState<Appointment[]>([]);
  const [citaFecha, setCitaFecha] = useState('');
  const [citaMotivo, setCitaMotivo] = useState('');

  const [pagos, setPagos] = useState<any[]>([]);
  const [pagoCitaId, setPagoCitaId] = useState('');
  const [pagoMonto, setPagoMonto] = useState(0);
  const [pagoMetodo, setPagoMetodo] = useState('Efectivo');

  const [prodList, setProdList] = useState<Product[]>([]);
  const [editProdId, setEditProdId] = useState('');
  const [fNombre, setFNombre] = useState('');
  const [fTipo, setFTipo] = useState('MEDICAMENTOS');
  const [fCategoria, setFCategoria] = useState('');
  const [fMarca, setFMarca] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fBarras, setFBarras] = useState('');
  const [fCompra, setFCompra] = useState(0);
  const [fVenta, setFVenta] = useState(0);
  const [fUnidad, setFUnidad] = useState('');
  const [fProveedor, setFProveedor] = useState('');
  const [fStock, setFStock] = useState(0);
  const [fMin, setFMin] = useState(0);
  const [fLote, setFLote] = useState('');
  const [fVence, setFVence] = useState('');
  const [fRegistro, setFRegistro] = useState('');

  const [busProd, setBusProd] = useState('');
  const [filtroProd, setFiltroProd] = useState('');
  const [filtroCatProd, setFiltroCatProd] = useState('');
  const [filtroDueno, setFiltroDueno] = useState('');

  const [editPacId, setEditPacId] = useState('');
  const [epNombre, setEpNombre] = useState('');
  const [epEspecie, setEpEspecie] = useState('');
  const [epRaza, setEpRaza] = useState('');
  const [epEdad, setEpEdad] = useState(0);
  const [epPeso, setEpPeso] = useState(0);

  const [editCliId, setEditCliId] = useState('');
  const [ecNombre, setEcNombre] = useState('');
  const [ecTelefono, setEcTelefono] = useState('');
  const [ecEmail, setEcEmail] = useState('');

  async function cerrarSesion() {
    const quiere = await SweetAlert.confirmarCerrarSesion();
    if (!quiere) return;
    setSession(null);
    setMensaje('');
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje('');
    try {
      const res = await login(email, password);
      setSession({ token: res.token, name: res.user.name, role: res.user.role });
    } catch (err: any) {
      setMensaje(err.message);
    }
  }

  async function cargarBase() {
    if (!session) return;
    try {
      const [pacs, prods] = await Promise.all([
        api<Patient[]>('/pacientes', session.token),
        api<Product[]>('/productos', session.token)
      ]);
      setPacientes(pacs);
      setProductos(prods.filter((p) => p.is_active !== false));
      if (pacs.length > 0 && !pacienteId) setPacienteId(pacs[0].id);
      if (prods.length > 0 && !prodSel) setProdSel(prods[0].id);
    } catch (err: any) { setMensaje(err.message); }
  }

  async function cargarAdmin() {
    if (!session || session.role !== 'ADMIN') return;
    try {
      const [clis, cits, pays, pacs] = await Promise.all([
        api<Client[]>('/clientes', session.token),
        api<Appointment[]>('/citas', session.token),
        api<any[]>('/pagos', session.token),
        api<Patient[]>('/pacientes', session.token)
      ]);
      setClientes(clis);
      setCitas(cits);
      setPagos(pays);
      setPacientes(pacs);
      if (clis.length > 0 && !cliSel) setCliSel(clis[0].id);
      if (pacs.length > 0 && !pacienteId) setPacienteId(pacs[0].id);
    } catch (err: any) { setMensaje(err.message); }
  }

  useEffect(() => {
    if (!session) return;
    if (tab === 'productos') {
      void cargarProductos();
      return;
    }
    if (tab === 'pacientes' || tab === 'auditoria') {
      const path = tab === 'pacientes' ? '/pacientes' : '/auditoria';
      api<any[]>(path, session.token).then(setData).catch((err: Error) => setMensaje(err.message));
    }
    if (tab === 'atenciones') {
      void cargarBase();
      api<any[]>('/atenciones', session.token).then(setAtenciones).catch((err: Error) => setMensaje(err.message));
    }
    if (tab === 'clientes' || tab === 'citas' || tab === 'pagos') void cargarAdmin();
    if (tab === 'pacientes' && session.role === 'ADMIN') void cargarAdmin();
  }, [session, tab]);

  function confirmarAgregarItem(item: RecetaItem) {
    setReceta((prev) => {
      const i = prev.findIndex((r) => r.productId === item.productId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { productId: item.productId, quantity: next[i].quantity + item.quantity, dosis: item.dosis };
        return next;
      }
      return [...prev, item];
    });
    setDosis('');
  }

  async function agregarItem() {
    if (!prodSel) { await SweetAlert.avisar('Seleccione un medicamento.'); return; }
    if (!Number.isInteger(cant) || cant <= 0) { await SweetAlert.avisar('Cantidad debe ser mayor que cero.'); return; }
    if (!dosis.trim()) { await SweetAlert.avisar('Dosis es obligatoria.'); return; }
    const item: RecetaItem = { productId: prodSel, quantity: cant, dosis: dosis.trim() };
    const prod = productos.find((p) => p.id === prodSel);
    const enReceta = receta.find((r) => r.productId === prodSel)?.quantity ?? 0;
    if (prod && prod.current_stock < enReceta + cant) {
      setPendienteReceta(item);
      return;
    }
    confirmarAgregarItem(item);
    setDosis('');
  }

  async function crearBorrador() {
    setMensaje(''); setAvisos([]); setDetalle(null);
    try {
      if (!pacienteId) { setMensaje('Seleccione un paciente.'); return; }
      const draft = await api<{ id: string }>('/atenciones', session!.token, {
        method: 'POST', body: JSON.stringify({ patientId: pacienteId, attentionDate: fecha })
      });
      setAtencionId(draft.id);
      setMensaje(`Atención en borrador creada: ${draft.id}`);
    } catch (err: any) { setMensaje(err.message); }
  }

  async function cerrarAtencion() {
    setAvisos([]); setExitoCierre(null);
    try {
      if (!diagnostico.trim() || !tratamiento.trim()) { await SweetAlert.avisar('Diagnóstico y tratamiento son obligatorios.'); return; }
      for (const r of receta) {
        if (!r.dosis.trim()) { await SweetAlert.avisar('Cada ítem de receta requiere dosis.'); return; }
      }
      if (receta.length === 0) {
        await SweetAlert.avisar('Aún no hay medicamentos agregados a la receta.');
        return;
      }
      const quiereCerrarReceta = await SweetAlert.confirmar('¿Desea cerrar la receta?');
      if (!quiereCerrarReceta) return;
      let id = atencionId;
      if (!id) {
        const draft = await api<{ id: string }>('/atenciones', session!.token, {
          method: 'POST', body: JSON.stringify({ patientId: pacienteId, attentionDate: fecha })
        });
        id = draft.id;
        setAtencionId(id);
      }
      const closed = await api<Attention>(`/atenciones/${id}/cierre`, session!.token, {
        method: 'POST', body: JSON.stringify({ diagnosis: diagnostico.trim(), treatment: tratamiento.trim(), items: receta })
      });
      setDetalle(closed);
      setAvisos(closed.avisosStock ?? []);
      setExitoCierre('Atención cerrada correctamente.');
      const prod = await api<Product[]>('/productos', session!.token);
      setProductos(prod.filter((p) => p.is_active !== false));
      api<any[]>('/atenciones', session!.token).then(setAtenciones).catch(() => undefined);
      const msg = (closed.avisosStock?.length ?? 0) > 0
        ? 'Receta registrada con aviso de stock: el paciente debe adquirirlo por otros medios.'
        : 'Atención cerrada y receta registrada en la ficha.';
      await SweetAlert.exito(msg);
    } catch (err: any) { await SweetAlert.error(err.message); }
  }

  async function verDetalle(id?: string) {
    setMensaje('');
    try {
      const aid = id ?? atencionId;
      if (!aid) { setMensaje('Cree o indique una atención primero.'); return; }
      const att = await api<Attention>(`/atenciones/${aid}`, session!.token);
      setAtencionId(aid);
      setDetalle(att);
    } catch (err: any) { setMensaje(err.message); }
  }

  async function verFicha() {
    setMensaje('');
    try {
      if (!pacienteId) return;
      const f = await api<any>(`/pacientes/${pacienteId}`, session!.token);
      setFicha(f);
    } catch (err: any) { setMensaje(err.message); }
  }

  async function anular(id?: string) {
    setMensaje('');
    try {
      const aid = id ?? atencionId;
      if (!aid) { setMensaje('Cree o indique una atención primero.'); return; }
      const att = await api<Attention>(`/atenciones/${aid}/anulacion`, session!.token, { method: 'POST' });
      setAtencionId(aid);
      setDetalle(att);
      setMensaje('Atención anulada. La receta se conserva sin vigencia.');
      if (session) {
        api<any[]>('/atenciones', session.token).then(setAtenciones).catch(() => undefined);
      }
    } catch (err: any) { setMensaje(err.message); }
  }

  function estadoAtencion(status: string): { texto: string; clase: string } {
    if (status === 'ANULADA') return { texto: 'Anulada', clase: 'vet-stock-bad' };
    if (status === 'BORRADOR') return { texto: 'Borrador', clase: 'vet-stock-warn' };
    return { texto: 'Vigente', clase: 'vet-stock-ok' };
  }

  async function registrarCliente() {
    setMensaje('');
    try {
      const c = await api<Client>('/clientes', session!.token, {
        method: 'POST', body: JSON.stringify({ name: cliNombre, rut: cliRut, phone: cliTelefono, email: cliEmail })
      });
      setClientes((prev) => [c, ...prev]);
      setCliSel(c.id);
      setMensaje(`Cliente registrado: ${c.name} (${c.rut}).`);
    } catch (err: any) { setMensaje(err.message); }
  }

  async function registrarMascota() {
    try {
      if (!cliSel) { await SweetAlert.avisar('Seleccione un cliente dueño.'); return; }
      if (!masNombre.trim()) { await SweetAlert.avisar('Nombre de la mascota es obligatorio.'); return; }
      if (!masEspecie.trim()) { await SweetAlert.avisar('Especie es obligatoria.'); return; }
      if (!masRaza.trim()) { await SweetAlert.avisar('Raza es obligatoria.'); return; }
      if (masEdad < 0) { await SweetAlert.avisar('Edad no puede ser negativa.'); return; }
      if (masPeso < 0) { await SweetAlert.avisar('Peso no puede ser negativo.'); return; }
      const quiere = await SweetAlert.confirmar('¿Desea registrar a la mascota?');
      if (!quiere) return;
      const p = await api<Patient>('/mascotas', session!.token, {
        method: 'POST',
        body: JSON.stringify({ clientId: cliSel, name: masNombre, species: masEspecie, breed: masRaza, age: masEdad, weight: masPeso })
      });
      setPacientes((prev) => [{ id: p.id, name: masNombre, species: masEspecie }, ...prev]);
      setPacienteId(p.id);
      await SweetAlert.exito(`Mascota registrada: ${masNombre}.`);
    } catch (err: any) { await SweetAlert.error(err.message); }
  }

  async function verCliente() {
    setMensaje('');
    try {
      const c = await api<any>(`/clientes/${cliSel}`, session!.token);
      setCliDetalle(c);
    } catch (err: any) { setMensaje(err.message); }
  }

  async function verClientePara(id: string) {
    setMensaje('');
    try {
      const c = await api<any>(`/clientes/${id}`, session!.token);
      setCliDetalle(c);
    } catch (err: any) { setMensaje(err.message); }
  }

  async function agendarCita() {
    setMensaje('');
    try {
      const c = await api<Appointment>('/citas', session!.token, {
        method: 'POST', body: JSON.stringify({ patientId: pacienteId, scheduledAt: citaFecha, reason: citaMotivo })
      });
      setCitas((prev) => [c, ...prev]);
      setMensaje(`Cita agendada: ${c.id}.`);
    } catch (err: any) { setMensaje(err.message); }
  }

  async function checkin(id: string) {
    setMensaje('');
    try {
      const c = await api<Appointment>(`/citas/${id}/checkin`, session!.token, { method: 'POST' });
      setCitas((prev) => prev.map((x) => (x.id === id ? c : x)));
      setMensaje('Check-in registrado.');
    } catch (err: any) { setMensaje(err.message); }
  }

  async function registrarPago() {
    setMensaje('');
    try {
      const p = await api<any>('/pagos', session!.token, {
        method: 'POST', body: JSON.stringify({ appointmentId: pagoCitaId, amount: pagoMonto, method: pagoMetodo })
      });
      setPagos((prev) => [p, ...prev]);
      setMensaje(`Pago registrado: ${p.amount} (${p.method}).`);
    } catch (err: any) { setMensaje(err.message); }
  }

  async function cargarProductos() {
    setMensaje('');
    try {
      const path = filtroCatProd ? `/productos?category=${encodeURIComponent(filtroCatProd)}` : '/productos';
      const list = await api<Product[]>(path, session!.token);
      setProdList(list);
    } catch (err: any) { setMensaje(err.message); }
  }

  function limpiarProd() {
    setEditProdId(''); setFNombre(''); setFTipo('MEDICAMENTOS'); setFCategoria('');
    setFMarca(''); setFDesc(''); setFBarras(''); setFCompra(0); setFVenta(0);
    setFUnidad(''); setFProveedor(''); setFStock(0); setFMin(0);
    setFLote(''); setFVence(''); setFRegistro('');
  }

  async function guardarProducto() {
    try {
      if (!fNombre.trim()) { await SweetAlert.avisar('Nombre es obligatorio.'); return; }
      if (!fBarras.trim()) { await SweetAlert.avisar('Código de barras es obligatorio.'); return; }
      if (!fUnidad.trim()) { await SweetAlert.avisar('Unidad de medida es obligatoria.'); return; }
      if (!fProveedor.trim()) { await SweetAlert.avisar('Proveedor es obligatorio.'); return; }
      if (fTipo === 'MEDICAMENTOS' && (!fLote.trim() || !fVence || !fRegistro.trim())) {
        await SweetAlert.avisar('Para medicamentos, lote, fecha de vencimiento y registro sanitario son obligatorios.');
        return;
      }
      const accion = editProdId ? 'modificar' : 'agregar';
      const quiere = await SweetAlert.confirmar(`¿Desea ${accion} este producto?`);
      if (!quiere) return;
      const payload: any = {
        name: fNombre.trim(), category: fTipo, subcategory: fCategoria.trim(),
        brand: fMarca.trim(), description: fDesc.trim(), barcode: fBarras.trim(),
        costPrice: fCompra, salePrice: fVenta, unit: fUnidad.trim(),
        supplier: fProveedor.trim(), currentStock: fStock, minStock: fMin,
        batch: fLote.trim(), sanitaryReg: fRegistro.trim()
      };
      if (fVence) payload.expirationDate = fVence;
      if (editProdId) {
        await api(`/productos/${editProdId}`, session!.token, { method: 'PUT', body: JSON.stringify(payload) });
        await SweetAlert.exito('Producto modificado.');
      } else {
        await api('/productos', session!.token, { method: 'POST', body: JSON.stringify(payload) });
        await SweetAlert.exito('Producto registrado.');
      }
      limpiarProd();
      await cargarProductos();
    } catch (err: any) { await SweetAlert.error(err.message); }
  }

  function editarProducto(p: Product) {
    setEditProdId(p.id);
    setFNombre(p.name ?? ''); setFTipo(p.category ?? 'MEDICAMENTOS');
    setFCategoria(p.subcategory ?? ''); setFMarca(p.brand ?? ''); setFDesc(p.description ?? '');
    setFBarras(p.barcode ?? p.sku ?? ''); setFCompra(Number(p.cost_price ?? 0)); setFVenta(Number(p.sale_price ?? 0));
    setFUnidad(p.unit ?? ''); setFProveedor(p.supplier ?? '');
    setFStock(Number(p.current_stock ?? 0)); setFMin(Number(p.min_stock ?? 0));
    setFLote(p.batch ?? ''); setFVence(p.expiration_date ? String(p.expiration_date).slice(0, 10) : '');
    setFRegistro(p.sanitary_reg ?? '');
  }

  async function bajaProducto(id: string, nombre: string) {
    const quiere = await SweetAlert.confirmar(`¿Eliminar el producto ${nombre}? Se dará de baja conservando su historial.`);
    if (!quiere) return;
    try {
      await api(`/productos/${id}/baja`, session!.token, { method: 'PATCH' });
      await SweetAlert.exito('Producto dado de baja.');
      await cargarProductos();
    } catch (err: any) { await SweetAlert.error(err.message); }
  }

  async function cancelarCita(id: string) {
    const quiere = await SweetAlert.confirmar('¿Cancelar esta cita?');
    if (!quiere) return;
    try {
      const c = await api<Appointment>(`/citas/${id}/cancelacion`, session!.token, { method: 'POST' });
      setCitas((prev) => prev.map((x) => (x.id === id ? c : x)));
      await SweetAlert.exito('Cita cancelada.');
    } catch (err: any) { await SweetAlert.error(err.message); }
  }

  function limpiarPac() {
    setEditPacId(''); setEpNombre(''); setEpEspecie(''); setEpRaza(''); setEpEdad(0); setEpPeso(0);
  }

  function editarPaciente(p: any) {
    setEditPacId(p.id);
    setEpNombre(p.name ?? ''); setEpEspecie(p.species ?? ''); setEpRaza(p.breed ?? '');
    setEpEdad(Number(p.age ?? 0)); setEpPeso(Number(p.weight ?? 0));
  }

  async function guardarPaciente() {
    setMensaje('');
    try {
      if (!epNombre.trim()) { setMensaje('Nombre es obligatorio.'); return; }
      await api(`/pacientes/${editPacId}`, session!.token, {
        method: 'PUT',
        body: JSON.stringify({ name: epNombre.trim(), species: epEspecie.trim(), breed: epRaza.trim(), age: epEdad, weight: epPeso })
      });
      setMensaje('Paciente modificado.');
      limpiarPac();
      const list = await api<any[]>('/pacientes', session!.token);
      setData(list);
    } catch (err: any) { setMensaje(err.message); }
  }

  function limpiarCli() {
    setEditCliId(''); setEcNombre(''); setEcTelefono(''); setEcEmail('');
  }

  function editarCliente(c: Client) {
    setEditCliId(c.id);
    setEcNombre(c.name ?? ''); setEcTelefono(c.phone ?? ''); setEcEmail(c.email ?? '');
  }

  async function guardarCliente() {
    setMensaje('');
    try {
      if (!ecNombre.trim()) { setMensaje('Nombre es obligatorio.'); return; }
      const actualizado = await api<Client>(`/clientes/${editCliId}`, session!.token, {
        method: 'PUT',
        body: JSON.stringify({ name: ecNombre.trim(), phone: ecTelefono.trim(), email: ecEmail.trim() })
      });
      setClientes((prev) => prev.map((x) => (x.id === editCliId ? actualizado : x)));
      setMensaje('Cliente modificado.');
      limpiarCli();
    } catch (err: any) { setMensaje(err.message); }
  }

  function productosFiltrados(): Product[] {
    const q = filtroProd.trim().toLowerCase();
    const cat = filtroCatProd.trim();
    return prodList.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.barcode ?? p.sku ?? '').toLowerCase().includes(q);
    });
  }

  function etiquetaStock(stock: string): { texto: string; clase: string } {
    if (stock === 'sin_stock') return { texto: 'Sin stock', clase: 'vet-stock-bad' };
    if (stock === 'bajo_stock') return { texto: 'Bajo stock', clase: 'vet-stock-warn' };
    return { texto: 'Disponible', clase: 'vet-stock-ok' };
  }

  function formatearFecha(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch { return String(iso); }
  }

  function fechaUltimaConsulta(attentions: any[]): string {
    if (!attentions || attentions.length === 0) return '—';
    const fechada = attentions[0].closed_at ?? attentions[0].attention_date ?? attentions[0].created_at;
    return formatearFecha(fechada);
  }

  function pacientesFiltrados(): any[] {
    const q = filtroDueno.trim().toLowerCase();
    if (!q) return data;
    return data.filter((p: any) =>
      String(p.owner_name ?? '').toLowerCase().includes(q) || String(p.owner_rut ?? '').toLowerCase().includes(q)
    );
  }

  if (!session) {
    return (
      <main className="vet-shell max-w-md">
        <div className="vet-card">
        <h1>Gestión veterinaria</h1>
        <p className="text-sm text-slate-600">Inicie sesión para continuar.</p>
        <form onSubmit={entrar} className="mt-3 grid gap-3">
          <label>Correo<input value={email} onChange={(e) => setEmail(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
          <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
          <button type="submit">Ingresar</button>
        </form>
        {mensaje && <p role="alert">{mensaje}</p>}
        </div>
      </main>
    );
  }

  const esAdmin = session.role === 'ADMIN';

  return (
    <main className="vet-shell">
      <div className="vet-header">
      <h1>Gestión veterinaria</h1>
      <p className="text-sm text-slate-600">Bienvenido, {session.name} ({session.role}).</p>
      <nav className="vet-nav">
        <button onClick={() => irTab('productos')}>Productos</button>
        <button onClick={() => irTab('pacientes')}>Pacientes</button>
        <button onClick={() => irTab('atenciones')}>Atenciones</button>
        {esAdmin && <button onClick={() => irTab('clientes')}>Clientes</button>}
        {esAdmin && <button onClick={() => irTab('citas')}>Citas</button>}
        {esAdmin && <button onClick={() => irTab('pagos')}>Pagos</button>}
        {esAdmin && <button onClick={() => irTab('auditoria')}>Auditoría</button>}
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </nav>
      {tab !== 'auditoria' && (
        <nav className="vet-subnav">
          {(esAdmin || tab === 'atenciones') && (
            <>
              <button onClick={() => setSub('registrar')} disabled={sub === 'registrar'}>
                Registrar {tab === 'productos' ? 'producto' : tab === 'pacientes' ? 'mascota' : tab === 'atenciones' ? 'atención' : tab === 'clientes' ? 'cliente' : tab === 'citas' ? 'cita' : 'pago'}
              </button>{' '}
            </>
          )}
          <button onClick={() => setSub('listar')} disabled={sub === 'listar'}>
            Listar {tab === 'productos' ? 'productos' : tab === 'pacientes' ? 'pacientes' : tab === 'atenciones' ? 'atenciones' : tab === 'clientes' ? 'clientes' : tab === 'citas' ? 'citas' : 'pagos'}
          </button>
        </nav>
      )}
      {mensaje && <p role="alert">{mensaje}</p>}
      </div>

      {tab === 'auditoria' && (
        <div>
          <h2>Auditoría</h2>
          {data.length === 0 && <p>Sin eventos de auditoría.</p>}
          {data.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Acción</th>
                  <th>Módulo</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {data.map((e: any) => (
                  <tr key={e.id}>
                    <td>{e.created_at ? String(e.created_at).replace('T', ' ').slice(0, 19) : '—'}</td>
                    <td>{e.user_name ?? '—'}</td>
                    <td>{e.user_role ?? '—'}</td>
                    <td>{e.action}</td>
                    <td>{e.entity}{e.entity_id ? ` · ${String(e.entity_id).slice(0, 8)}` : ''}</td>
                    <td>{e.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'pacientes' && (
        <section>
          <h2>Pacientes {esAdmin ? '(administrador)' : '(solo lectura)'}</h2>
          {esAdmin && sub === 'registrar' && (
            <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
              <h3>Registrar mascota</h3>
              <label>Cliente
                <select value={cliSel} onChange={(e) => setCliSel(e.target.value)} style={{ display: 'block', width: '100%' }}>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.rut})</option>)}
                </select>
              </label>
              <label>Nombre mascota<input value={masNombre} onChange={(e) => setMasNombre(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
              <label>Especie<input value={masEspecie} onChange={(e) => setMasEspecie(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
              <label>Raza<input value={masRaza} onChange={(e) => setMasRaza(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
              <label>Edad<input type="number" min={0} value={masEdad} onChange={(e) => setMasEdad(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
              <label>Peso<input type="number" min={0} value={masPeso} onChange={(e) => setMasPeso(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
              <div><button onClick={registrarMascota}>Registrar mascota</button></div>
            </div>
          )}
          {sub === 'listar' && (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
                <label>Filtrar por dueño (nombre o RUT)
                  <input value={filtroDueno} onChange={(e) => setFiltroDueno(e.target.value)} placeholder="Nombre o RUT del dueño" style={{ display: 'block', width: 320 }} />
                </label>
              </div>
              {pacientesFiltrados().length === 0 && <p>Sin pacientes para el filtro indicado.</p>}
              {pacientesFiltrados().length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Especie</th>
                      <th>Raza</th>
                      <th>Dueño</th>
                      <th>RUT dueño</th>
                      {esAdmin && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pacientesFiltrados().map((p: any) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.species}</td>
                        <td>{p.breed}</td>
                        <td>{p.owner_name}</td>
                        <td>{p.owner_rut}</td>
                        {esAdmin && (
                          <td><button onClick={() => editarPaciente(p)}>Editar</button></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {esAdmin && editPacId && (
            <div className="vet-modal-overlay" role="dialog" aria-label="Modificar paciente">
              <div className="vet-modal-box">
                <h3>Modificar paciente</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label>Nombre*<input value={epNombre} onChange={(e) => setEpNombre(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Especie<input value={epEspecie} onChange={(e) => setEpEspecie(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Raza<input value={epRaza} onChange={(e) => setEpRaza(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Edad<input type="number" min={0} value={epEdad} onChange={(e) => setEpEdad(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Peso<input type="number" min={0} value={epPeso} onChange={(e) => setEpPeso(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                  <div>
                    <button onClick={guardarPaciente}>Guardar cambios</button>{' '}
                    <button onClick={limpiarPac}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === 'productos' && (
        <section>
          <h2>Productos {esAdmin ? '(administrador)' : '(solo lectura)'}</h2>
          {esAdmin && sub === 'registrar' && (
            <div>
              <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
                <h3>Agregar producto</h3>
                <label>Nombre*<input value={fNombre} onChange={(e) => setFNombre(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                <label>Tipo*
                  <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} style={{ display: 'block', width: '100%' }}>
                    <option value="ALIMENTOS">Alimento</option>
                    <option value="MEDICAMENTOS">Medicamento</option>
                    <option value="ACCESORIOS">Accesorio</option>
                  </select>
                </label>
                <label>Categoría<input value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                <label>Marca<input value={fMarca} onChange={(e) => setFMarca(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                <label>Descripción<input value={fDesc} onChange={(e) => setFDesc(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                <label>Código de barras*<input value={fBarras} onChange={(e) => setFBarras(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                <label>Precio de compra*<input type="number" min={0} value={fCompra} onChange={(e) => setFCompra(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                <label>Precio de venta*<input type="number" min={0} value={fVenta} onChange={(e) => setFVenta(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                <label>Unidad de medida*<input value={fUnidad} onChange={(e) => setFUnidad(e.target.value)} placeholder="Unidad, caja, frasco..." style={{ display: 'block', width: '100%' }} /></label>
                <label>Proveedor*<input value={fProveedor} onChange={(e) => setFProveedor(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                <label>Stock actual<input type="number" min={0} value={fStock} onChange={(e) => setFStock(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                <label>Stock mínimo<input type="number" min={0} value={fMin} onChange={(e) => setFMin(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                {fTipo === 'MEDICAMENTOS' && (
                  <>
                    <label>Lote*<input value={fLote} onChange={(e) => setFLote(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                    <label>Fecha de vencimiento*<input type="date" value={fVence} onChange={(e) => setFVence(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                    <label>Registro sanitario*<input value={fRegistro} onChange={(e) => setFRegistro(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  </>
                )}
                <div>
                  <button onClick={guardarProducto}>Agregar producto</button>{' '}
                  <button onClick={limpiarProd}>Limpiar</button>
                </div>
              </div>
            </div>
          )}
          {(!esAdmin || sub === 'listar') && (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0', flexWrap: 'wrap' }}>
                <label>Filtrar por categoría
                  <select value={filtroCatProd} onChange={(e) => setFiltroCatProd(e.target.value)} style={{ display: 'block', width: 200 }}>
                    <option value="">Todas las categorías</option>
                    <option value="ALIMENTOS">Alimento para animales</option>
                    <option value="MEDICAMENTOS">Medicamento</option>
                    <option value="ACCESORIOS">Accesorio</option>
                  </select>
                </label>
                <label>Buscar por nombre o código de barras
                  <input value={busProd} onChange={(e) => setBusProd(e.target.value)} placeholder="Nombre o código de barras" style={{ display: 'block', width: 320 }} />
                </label>
                <button onClick={() => setFiltroProd(busProd)}>Buscar</button>{' '}
                <button onClick={cargarProductos}>Recargar lista</button>
              </div>
              {productosFiltrados().length === 0 && <p>Sin productos para los filtros indicados.</p>}
              {productosFiltrados().length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Código de barras</th>
                      <th>Stock</th>
                      <th>Disponibilidad</th>
                      <th>Estado</th>
                      {esAdmin && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados().map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.category}</td>
                        <td>{p.barcode ?? p.sku}</td>
                        <td>{p.current_stock}</td>
                        <td><span className={etiquetaStock(p.stock_disponible ?? 'disponible').clase}>{etiquetaStock(p.stock_disponible ?? 'disponible').texto}</span></td>
                        <td><span className={p.is_active ? 'vet-stock-ok' : 'vet-stock-bad'}>{p.is_active ? 'Activo' : 'Inactivo'}</span></td>
                        {esAdmin && (
                          <td>
                            <button onClick={() => editarProducto(p)}>Editar</button>{' '}
                            {p.is_active && <button onClick={() => bajaProducto(p.id, p.name)}>Eliminar</button>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {esAdmin && editProdId && (
            <div className="vet-modal-overlay" role="dialog" aria-label="Modificar producto">
              <div className="vet-modal-box">
                <h3>Modificar producto</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label>Nombre*<input value={fNombre} onChange={(e) => setFNombre(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Tipo*
                    <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} style={{ display: 'block', width: '100%' }}>
                      <option value="ALIMENTOS">Alimento</option>
                      <option value="MEDICAMENTOS">Medicamento</option>
                      <option value="ACCESORIOS">Accesorio</option>
                    </select>
                  </label>
                  <label>Categoría<input value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Marca<input value={fMarca} onChange={(e) => setFMarca(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Descripción<input value={fDesc} onChange={(e) => setFDesc(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Código de barras*<input value={fBarras} onChange={(e) => setFBarras(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Precio de compra*<input type="number" min={0} value={fCompra} onChange={(e) => setFCompra(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Precio de venta*<input type="number" min={0} value={fVenta} onChange={(e) => setFVenta(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Unidad de medida*<input value={fUnidad} onChange={(e) => setFUnidad(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Proveedor*<input value={fProveedor} onChange={(e) => setFProveedor(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Stock actual<input type="number" min={0} value={fStock} onChange={(e) => setFStock(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Stock mínimo<input type="number" min={0} value={fMin} onChange={(e) => setFMin(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
                  {fTipo === 'MEDICAMENTOS' && (
                    <>
                      <label>Lote*<input value={fLote} onChange={(e) => setFLote(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                      <label>Fecha de vencimiento*<input type="date" value={fVence} onChange={(e) => setFVence(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                      <label>Registro sanitario*<input value={fRegistro} onChange={(e) => setFRegistro(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                    </>
                  )}
                  <div>
                    <button onClick={guardarProducto}>Guardar cambios</button>{' '}
                    <button onClick={limpiarProd}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === 'atenciones' && (
        <section>
          <h2>Atención con receta (no mueve stock)</h2>
          {avisos.length > 0 && (
            <div role="alert" className="border-amber-200 bg-amber-50 text-amber-900">
              <strong>Aviso de stock:</strong>
              <ul>{avisos.map((a) => <li key={a}>{a} — debe adquirirse por otros medios.</li>)}</ul>
            </div>
          )}
          {sub === 'registrar' && (
          <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
            <label>Paciente
              <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} style={{ display: 'block', width: '100%' }}>
                {pacientes.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
              </select>
            </label>
            <label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
            <div>
              <button onClick={crearBorrador}>Crear borrador</button>{' '}
              <button onClick={verFicha}>Ver ficha del paciente</button>
            </div>

            <h3>Receta</h3>
            <label>Medicamento
              <select value={prodSel} onChange={(e) => setProdSel(e.target.value)} style={{ display: 'block', width: '100%' }}>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — stock {p.current_stock}</option>)}
              </select>
            </label>
            <label>Cantidad<input type="number" min={1} value={cant} onChange={(e) => setCant(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
            <label>Dosis (obligatoria)<input value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="Ej: 1 tableta cada 12 h por 7 días" style={{ display: 'block', width: '100%' }} /></label>
            <div><button onClick={agregarItem}>Agregar a la receta</button></div>
            {receta.length === 0 && <p>Aún no hay medicamentos agregados a la receta.</p>}
            {receta.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Dosis</th>
                    <th>Disponibilidad</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {receta.map((r) => {
                    const prod = productos.find((p) => p.id === r.productId);
                    const sinStock = prod ? prod.current_stock < r.quantity : false;
                    return (
                      <tr key={r.productId}>
                        <td>{prod?.name ?? r.productId}</td>
                        <td>{r.quantity}</td>
                        <td>{r.dosis}</td>
                        <td>
                          {sinStock
                            ? <span className="vet-stock-bad">Sin stock: quedará registrado para compra externa</span>
                            : <span className="vet-stock-ok">Disponible</span>}
                        </td>
                        <td><button onClick={() => setReceta((prev) => prev.filter((x) => x.productId !== r.productId))}>Quitar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <label>Diagnóstico<input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
            <label>Tratamiento<input value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
            <div>
              <button onClick={cerrarAtencion}>Cerrar atención con receta</button>
            </div>
          </div>
          )}
          {sub === 'listar' && (
          <div>
            <h3>Listar atenciones</h3>
            {atenciones.length === 0 && <p>Sin atenciones registradas.</p>}
            {atenciones.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Paciente</th>
                    <th>Estado</th>
                    <th>Diagnóstico</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {atenciones.map((a: any) => {
                    const est = estadoAtencion(a.status);
                    return (
                      <tr key={a.id}>
                        <td>{String(a.attention_date ?? '').slice(0, 10)}</td>
                        <td>{a.patient_name} ({a.patient_species})</td>
                        <td><span className={est.clase}>{est.texto}</span></td>
                        <td>{a.diagnosis || '—'}</td>
                        <td>
                          <button onClick={() => verDetalle(a.id)}>Ver detalle</button>{' '}
                          {esAdmin && a.status === 'CERRADA' && <button onClick={() => anular(a.id)}>Anular</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          )}

          {pendienteReceta && (
            <div className="vet-modal-overlay" role="dialog" aria-label="Confirmar receta sin stock">
              <div className="vet-modal-box">
                <h3>Sin stock suficiente</h3>
                <p>Sin stock suficiente: quedará registrado para compra externa.</p>
                <div>
                  <button onClick={() => { confirmarAgregarItem(pendienteReceta); setPendienteReceta(null); }}>Aceptar</button>{' '}
                  <button onClick={() => setPendienteReceta(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {exitoCierre && (
            <div className="vet-modal-overlay" role="dialog" aria-label="Atención cerrada correctamente">
              <div className="vet-modal-box">
                <h3>Atención cerrada correctamente</h3>
                <p>{exitoCierre}</p>
                <div>
                  <button onClick={() => setExitoCierre(null)}>Aceptar</button>
                </div>
              </div>
            </div>
          )}

          {detalle && (
            <div className="vet-modal-overlay" role="dialog" aria-label="Detalle de atención cerrada">
              <div className="vet-modal-box">
                <h3>Detalle de atención cerrada</h3>
                <table>
                  <tbody>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600 }}>Paciente</td>
                      <td>{detalle.patient_name ?? '—'} ({detalle.patient_species ?? '—'})</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600 }}>Fecha</td>
                      <td>{formatearFecha(detalle.attention_date ?? detalle.created_at ?? null)}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600 }}>Estado</td>
                      <td>{detalle.status === 'ANULADA' ? 'Anulada' : detalle.status === 'CERRADA' ? 'Vigente' : 'Borrador'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600 }}>Diagnóstico</td>
                      <td>{detalle.diagnosis ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600 }}>Tratamiento</td>
                      <td>{detalle.treatment ?? '—'}</td>
                    </tr>
                    {detalle.items && detalle.items.length > 0 && (
                      <>
                        <tr>
                          <td style={{ width: 140, fontWeight: 600 }}>Receta</td>
                          <td>
                            <table style={{ width: '100%', marginTop: 6 }}>
                              <thead>
                                <tr>
                                  <th>Producto</th>
                                  <th>Cantidad</th>
                                  <th>Dosis</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalle.items.map((i: any) => (
                                  <tr key={i.product_id}>
                                    <td>{i.product_name ?? i.product_sku ?? '—'}</td>
                                    <td>{i.quantity}</td>
                                    <td>{i.dosis ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </>
                    )}
                    {detalle.avisosStock && detalle.avisosStock.length > 0 && (
                      <tr>
                        <td style={{ width: 140, fontWeight: 600 }}>Avisos de stock</td>
                        <td>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {detalle.avisosStock.map((a: string) => (
                              <li key={a}>{a}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDetalle(null)}>Cerrar</button>
                </div>
              </div>
            </div>
          )}
          {ficha && (
            <div className="vet-modal-negro-overlay" role="dialog" aria-modal="true" aria-label="Ficha clínica del paciente">
              <div className="vet-modal-negro-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3>Ficha clínica</h3>
                  <button onClick={() => setFicha(null)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer' }}>Cerrar</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                  <tbody>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>Nombre</td>
                      <td style={{ padding: 6 }}>{ficha.patient?.name ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>Especie</td>
                      <td style={{ padding: 6 }}>{ficha.patient?.species ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>Raza</td>
                      <td style={{ padding: 6 }}>{ficha.patient?.breed ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>Edad</td>
                      <td style={{ padding: 6 }}>{ficha.patient?.age ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>Peso</td>
                      <td style={{ padding: 6 }}>{ficha.patient?.weight ?? '—'} kg</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>Dueño</td>
                      <td style={{ padding: 6 }}>{ficha.patient?.owner_name ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>RUT dueño</td>
                      <td style={{ padding: 6 }}>{ficha.patient?.owner_rut ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>Teléfono dueño</td>
                      <td style={{ padding: 6 }}>{ficha.patient?.owner_phone ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>Correo dueño</td>
                      <td style={{ padding: 6 }}>{ficha.patient?.owner_email ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: 140, fontWeight: 600, padding: 6 }}>Fecha de creación de la ficha</td>
                      <td style={{ padding: 6 }}>{formatearFecha(ficha.patient?.created_at ?? null)}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginBottom: 8, fontWeight: 600, color: '#38bdf8' }}>Atenciones</div>
                {ficha.attentions && ficha.attentions.length > 0 ? (
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #bae6fd', borderRadius: 6 }}>
                    {ficha.attentions.map((a: any) => {
                      const expandida = fichaExpandida === a.id;
                      return (
                        <div key={a.id} style={{ borderBottom: '1px solid #e0f2fe', cursor: 'pointer' }}>
                          <div
                            onClick={() => setFichaExpandida(expandida ? null : a.id)}
                            style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expandida ? '#e0f2fe' : 'transparent' }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>{formatearFecha(a.attention_date ?? a.created_at)}</div>
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {a.status === 'ANULADA' ? 'Anulada' : a.status === 'CERRADA' ? 'Vigente' : 'Borrador'}
                              </div>
                            </div>
                            <div style={{ color: '#38bdf8' }}>{expandida ? '▲' : '▼'}</div>
                          </div>
                          {expandida && (
                            <div style={{ padding: 10, background: '#f0f9ff' }}>
                              <div style={{ fontWeight: 600, marginBottom: 6 }}>Diagnóstico y tratamiento</div>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ width: 100, fontWeight: 600, padding: 4 }}>Diagnóstico</td>
                                    <td style={{ padding: 4 }}>{a.diagnosis ?? '—'}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ width: 100, fontWeight: 600, padding: 4 }}>Tratamiento</td>
                                    <td style={{ padding: 4 }}>{a.treatment ?? '—'}</td>
                                  </tr>
                                  {a.items && a.items.length > 0 && (
                                    <tr>
                                      <td style={{ width: 100, fontWeight: 600, padding: 4, verticalAlign: 'top' }}>Receta</td>
                                      <td style={{ padding: 4 }}>
                                        <table style={{ width: '100%', marginTop: 4 }}>
                                          <thead>
                                            <tr>
                                              <th style={{ textAlign: 'left' }}>Producto</th>
                                              <th style={{ textAlign: 'left' }}>Cantidad</th>
                                              <th style={{ textAlign: 'left' }}>Dosis</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {a.items.map((i: any) => (
                                              <tr key={i.product_id}>
                                                <td style={{ padding: 2 }}>{i.product_name ?? i.product_sku ?? '—'}</td>
                                                <td style={{ padding: 2 }}>{i.quantity}</td>
                                                <td style={{ padding: 2 }}>{i.dosis ?? '—'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sin atenciones registradas.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === 'clientes' && esAdmin && (
        <section>
          <h2>Clientes</h2>
          {sub === 'registrar' && (
            <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
              <h3>Registrar cliente (dueño)</h3>
              <label>Nombre<input value={cliNombre} onChange={(e) => setCliNombre(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
              <label>RUT (12345678-9)<input value={cliRut} onChange={(e) => setCliRut(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
              <label>Teléfono<input value={cliTelefono} onChange={(e) => setCliTelefono(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
              <label>Correo<input value={cliEmail} onChange={(e) => setCliEmail(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
              <div><button onClick={registrarCliente}>Registrar cliente</button></div>
            </div>
          )}
          {sub === 'listar' && (
            <div>
              {clientes.length === 0 && <p>Sin clientes registrados.</p>}
              {clientes.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>RUT</th>
                      <th>Teléfono</th>
                      <th>Correo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.rut}</td>
                        <td>{c.phone}</td>
                        <td>{c.email}</td>
                        <td>
                          <button onClick={() => { setCliSel(c.id); void verClientePara(c.id); }}>Ver mascotas</button>{' '}
                          <button onClick={() => editarCliente(c)}>Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {cliDetalle && (
            <pre className="mt-3">{JSON.stringify(cliDetalle, null, 2)}</pre>
          )}
          {editCliId && (
            <div className="vet-modal-overlay" role="dialog" aria-label="Modificar cliente">
              <div className="vet-modal-box">
                <h3>Modificar cliente</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label>Nombre*<input value={ecNombre} onChange={(e) => setEcNombre(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Teléfono<input value={ecTelefono} onChange={(e) => setEcTelefono(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <label>Correo<input value={ecEmail} onChange={(e) => setEcEmail(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
                  <div>
                    <button onClick={guardarCliente}>Guardar cambios</button>{' '}
                    <button onClick={limpiarCli}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === 'citas' && esAdmin && (
        <section>
          <h2>Agenda y check-in</h2>
          {sub === 'registrar' && (
            <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
              <h3>Agendar cita</h3>
              <label>Paciente
                <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} style={{ display: 'block', width: '100%' }}>
                  {pacientes.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
                </select>
              </label>
              <label>Fecha y hora<input type="datetime-local" value={citaFecha} onChange={(e) => setCitaFecha(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
              <label>Motivo<input value={citaMotivo} onChange={(e) => setCitaMotivo(e.target.value)} style={{ display: 'block', width: '100%' }} /></label>
              <div><button onClick={agendarCita}>Agendar cita</button></div>
            </div>
          )}
          {sub === 'listar' && (
            <div>
              {citas.length === 0 && <p>Sin citas registradas.</p>}
              {citas.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Fecha y hora</th>
                      <th>Motivo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citas.map((c) => (
                      <tr key={c.id}>
                        <td>{c.scheduled_at}</td>
                        <td>{c.reason}</td>
                        <td>{c.status}</td>
                        <td>
                          {c.status === 'PROGRAMADA' && <button onClick={() => checkin(c.id)}>Check-in</button>}{' '}
                          {(c.status === 'PROGRAMADA' || c.status === 'REGISTRADA') && <button onClick={() => cancelarCita(c.id)}>Cancelar</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      )}

      {tab === 'pagos' && esAdmin && (
        <section>
          <h2>Historial de pagos por cita</h2>
          {sub === 'registrar' && (
            <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
              <h3>Registrar pago</h3>
              <label>Cita
                <select value={pagoCitaId} onChange={(e) => setPagoCitaId(e.target.value)} style={{ display: 'block', width: '100%' }}>
                  <option value="">Seleccione una cita</option>
                  {citas.map((c) => <option key={c.id} value={c.id}>{c.scheduled_at} — {c.reason} ({c.status})</option>)}
                </select>
              </label>
              <label>Monto<input type="number" min={1} value={pagoMonto} onChange={(e) => setPagoMonto(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
              <label>Método
                <select value={pagoMetodo} onChange={(e) => setPagoMetodo(e.target.value)} style={{ display: 'block', width: '100%' }}>
                  <option>Efectivo</option>
                  <option>Tarjeta</option>
                  <option>Transferencia</option>
                </select>
              </label>
              <div><button onClick={registrarPago}>Registrar pago</button></div>
            </div>
          )}
          {sub === 'listar' && (
            <div>
              {pagos.length === 0 && <p>Sin pagos registrados.</p>}
              {pagos.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Cita</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Fecha de pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((p: any) => (
                      <tr key={p.id}>
                        <td>{p.appointment_id}</td>
                        <td>{p.amount}</td>
                        <td>{p.method}</td>
                        <td>{p.paid_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
