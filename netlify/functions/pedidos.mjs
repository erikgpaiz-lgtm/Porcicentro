/* ============================================================
   /api/pedidos — pedidos del sitio web
   ------------------------------------------------------------
   POST  (público)  el carrito registra el pedido ANTES de abrir
                    WhatsApp, con precios validados en el servidor
                    contra data.js (si alguien manipula el carrito,
                    aquí se recalcula el total real).
   GET   (privado)  el CRM sincroniza los pedidos recibidos.

   Almacenamiento: Netlify Blobs (incluido en Netlify, sin costo
   extra ni base de datos externa). En local se usa
   .datos-locales/ (npm run dev). Si el almacén no estuviera
   disponible, el pedido se valida igual y el sitio sigue
   funcionando por WhatsApp.
   ============================================================ */
import datos from '../../data.js';
import { json, secreto, verificarToken, tokenDePeticion } from '../lib/auth.mjs';
import { tienda as abrirTienda, motivo } from '../lib/store.mjs';

const { buscar, fmtQ, unidadCorta } = datos;
const MAX_PEDIDOS = 300;

/* ── Almacenamiento ──────────────────────────────────────── */
const memoria = []; // respaldo por instancia cuando no hay almacén

async function leerTodos() {
  const store = await abrirTienda('porcicentro-pedidos');
  if (!store) return memoria;
  try {
    const guardados = await store.get('pedidos', { type: 'json' });
    return Array.isArray(guardados) ? guardados : [];
  } catch (e) {
    return memoria;
  }
}

async function guardar(pedido) {
  const store = await abrirTienda('porcicentro-pedidos');
  try {
    if (!store) throw new Error('sin-almacen');
    const todos = await leerTodos();
    todos.unshift(pedido);
    await store.setJSON('pedidos', todos.slice(0, MAX_PEDIDOS));
    return { persistido: true };
  } catch (e) {
    // Aunque no se pueda guardar, el pedido se atiende igual por WhatsApp.
    memoria.unshift(pedido);
    if (memoria.length > MAX_PEDIDOS) memoria.pop();
    return { persistido: false };
  }
}

/* ── Validación del pedido contra el catálogo ────────────── */
function validar(items) {
  if (!Array.isArray(items) || !items.length) return { error: 'El pedido está vacío.' };
  if (items.length > 40) return { error: 'Demasiados productos distintos en un solo pedido.' };

  const lineas = [];
  for (const item of items) {
    const producto = buscar(String(item && item.id));
    if (!producto) return { error: 'Producto desconocido: ' + (item && item.id) };
    const cantidad = Number(item.qty);
    if (!isFinite(cantidad) || cantidad <= 0 || cantidad > 500) {
      return { error: 'Cantidad inválida para ' + producto.name };
    }
    const qty = Math.max(producto.min, Math.round(cantidad * 100) / 100);
    lineas.push({ id: producto.id, nombre: producto.name, qty, unit: producto.unit, precio: producto.price });
  }

  const total = lineas.reduce((s, l) => s + l.precio * l.qty, 0);
  const libras = lineas.filter((l) => l.unit === 'libra').reduce((s, l) => s + l.qty, 0);
  const detalle = lineas
    .map((l) => l.qty + ' ' + unidadCorta(l) + ' ' + l.nombre)
    .join(' · ');

  return {
    lineas,
    total: Math.round(total * 100) / 100,
    libras: Math.round(libras * 100) / 100,
    detalle
  };
}

/* ── Manejo de la petición ───────────────────────────────── */
export default async (req) => {
  /* Autenticación del CRM con el mismo token de /api/auth */
  const autorizado = () => {
    const secret = secreto();
    return secret ? !!verificarToken(tokenDePeticion(req), secret) : false;
  };

  if (req.method === 'GET') {
    if (!autorizado()) return json({ error: 'No autorizado' }, 401);
    const pedidos = await leerTodos();
    return json({ ok: true, pedidos });
  }

  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  let body = {};
  try { body = await req.json(); } catch (e) { return json({ error: 'Cuerpo inválido' }, 400); }

  const validado = validar(body.items);
  if (validado.error) return json({ error: validado.error }, 400);

  const pedido = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    fecha: datos.fechaGT(),
    creado: new Date().toISOString(),
    cliente: String(body.cliente || 'Pedido del sitio web').slice(0, 120),
    telefono: String(body.telefono || '').slice(0, 30),
    detalle: validado.detalle,
    items: validado.lineas.map((l) => ({ id: l.id, qty: l.qty })),
    total: validado.total,
    libras: validado.libras,
    envioGratis: validado.libras >= datos.CONFIG.ENVIO_GRATIS_LB,
    estado: 'Pendiente',
    origen: 'web',
    pagina: String(body.pagina || '').slice(0, 60),
    notas: String(body.notas || '').slice(0, 500)
  };

  const { persistido } = await guardar(pedido);

  return json({
    ok: true,
    id: pedido.id,
    total: pedido.total,
    libras: pedido.libras,
    detalle: pedido.detalle,
    envioGratis: pedido.envioGratis,
    fecha: pedido.fecha,
    persistido,
    aviso: persistido ? undefined : ('El pedido se validó pero no se pudo guardar. ' + (motivo('porcicentro-pedidos') || '') + ' Se atiende igual por WhatsApp.'),
    whatsapp: 'https://wa.me/' + datos.CONFIG.WHATSAPP,
    totalTexto: 'Q' + fmtQ(pedido.total)
  });
};
