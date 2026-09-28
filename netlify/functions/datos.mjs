/* ============================================================
   /api/datos — base de datos del CRM
   ------------------------------------------------------------
   GET   devuelve el conjunto completo {updated, clientes,
         pedidos, notas, prospectos} para que el panel funcione
         igual desde cualquier dispositivo.
   POST  guarda el conjunto completo (el mismo que descarga GET).

   Requiere sesión válida (header Authorization: Bearer …), el
   mismo token que emite /api/auth. Sin AUTH_SECRET configurado
   la función responde 500 con instrucciones.

   Guarda en Netlify Blobs (incluido en Netlify). En local, el
   servidor de desarrollo (npm run dev) usa .datos-locales/ para
   que se pueda probar todo sin cuenta de Netlify.
   ============================================================ */
import { json, secreto, verificarToken, tokenDePeticion } from '../lib/auth.mjs';
import { tienda as abrirTienda, motivo } from '../lib/store.mjs';

const CLAVE = 'crm';
const MAX_BYTES = 6 * 1024 * 1024;   // 6 MB: sobra para años de clientes
const VACIO = { updated: '', clientes: [], pedidos: [], notas: [], prospectos: [] };


const campos = ['clientes', 'pedidos', 'notas', 'prospectos'];

function normalizar(datos) {
  const salida = { updated: new Date().toISOString() };
  for (const campo of campos) {
    salida[campo] = Array.isArray(datos && datos[campo]) ? datos[campo].slice(0, 5000) : [];
  }
  return salida;
}

export default async (req) => {
  const secret = secreto();
  if (!secret) {
    return json({ error: 'Falta configurar AUTH_SECRET en las variables de entorno del sitio (ver README.md).' }, 500);
  }
  if (!verificarToken(tokenDePeticion(req), secret)) return json({ error: 'No autorizado' }, 401);

  const store = await abrirTienda('porcicentro-crm');
  if (motivo('porcicentro-crm').includes('Falta el paquete')) {
    return json({ error: motivo('porcicentro-crm'), sinAlmacen: true }, 503);
  }

  if (req.method === 'GET') {
    try {
      const datos = await store.get(CLAVE, { type: 'json' });
      return json({ ok: true, datos: datos && typeof datos === 'object' ? datos : VACIO });
    } catch (e) {
      return json({ ok: true, datos: VACIO, aviso: 'Sin datos guardados todavía.' });
    }
  }

  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  let body = null;
  try { body = await req.json(); } catch (e) { return json({ error: 'Cuerpo inválido' }, 400); }

  const datos = normalizar(body);
  const tamano = JSON.stringify(datos).length;
  if (tamano > MAX_BYTES) return json({ error: 'Los datos superan el tamaño máximo permitido.' }, 413);

  try {
    await store.setJSON(CLAVE, datos);
    return json({ ok: true, updated: datos.updated, bytes: tamano });
  } catch (e) {
    return json({ error: 'No se pudieron guardar los datos en el servidor. ' + (e && e.message ? e.message : ''), sinAlmacen: true }, 500);
  }
};
