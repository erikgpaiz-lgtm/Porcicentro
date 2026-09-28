/* ============================================================
   Almacenamiento de datos (una sola puerta para las funciones)
   ------------------------------------------------------------
   · En Netlify: usa Netlify Blobs (getStore dentro del handler).
   · En local (`npm run dev`): guarda en archivos JSON dentro de
     .datos-locales/ para poder probar el CRM completo sin cuenta
     de Netlify.

   API que exponemos (igual que la de Blobs):
     store.get(clave, { type:'json' })   store.setJSON(clave, valor)
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const CACHE = new Map();
const MOTIVOS = new Map();

// Archivos locales: <raíz del repo>/.datos-locales/<nombre>.json
const raizLocal = process.env.PC_LOCAL_DIR || path.join(process.cwd(), '.datos-locales');

function faltaEntorno(e) {
  return !!e && (e.name === 'MissingBlobsEnvironmentError' || /MissingBlobsEnvironmentError/i.test(String(e && e.message)));
}

function archivoStore(nombre) {
  const ruta = path.join(raizLocal, nombre + '.json');
  const leerTodo = () => {
    try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch (e) { return {}; }
  };
  return {
    local: true,
    async get(clave, opciones) {
      const datos = leerTodo()[clave];
      if (datos === undefined) return null;
      return opciones && opciones.type === 'json' ? datos : JSON.stringify(datos);
    },
    async setJSON(clave, valor) {
      const todo = leerTodo();
      todo[clave] = valor;
      fs.mkdirSync(path.dirname(ruta), { recursive: true });
      fs.writeFileSync(ruta, JSON.stringify(todo, null, 2));
    }
  };
}

export async function tienda(nombre) {
  if (CACHE.has(nombre)) return CACHE.get(nombre);

  let getStore = null;
  try {
    ({ getStore } = await import('@netlify/blobs'));
  } catch (e) {
    MOTIVOS.set(nombre, 'Falta el paquete @netlify/blobs (ejecuta npm install).');
  }

  if (getStore) {
    try {
      const store = getStore(nombre);
      CACHE.set(nombre, store);
      return store;
    } catch (e) {
      // Fuera de Netlify (o en un `netlify dev` sin contexto) no hay siteID/token:
      // caemos al almacén local en vez de dejar el CRM sin guardar nada.
      MOTIVOS.set(nombre, faltaEntorno(e)
        ? 'Netlify Blobs no está disponible en este entorno; se usa el almacén local.'
        : 'No se pudo abrir Netlify Blobs; se usa el almacén local.');
    }
  }

  const local = archivoStore(nombre);
  CACHE.set(nombre, local);
  return local;
}

export function motivo(nombre) {
  return MOTIVOS.get(nombre) || '';
}
