/* ============================================================
   POST /api/auth — inicio de sesión del CRM
   ------------------------------------------------------------
   Variables de entorno necesarias en Netlify:
     ADMIN_USERS  {"erik":"scrypt$<sal>$<hash>"}   (node scripts/hash-password.mjs)
     AUTH_SECRET  cadena larga y aleatoria          (openssl rand -hex 32)

   Antes el CRM comparaba usuario/contraseña EN EL NAVEGADOR con
   las credenciales escritas en el HTML. Ahora la verificación
   ocurre solo aquí, en el servidor.
   ============================================================ */
import { json, usuarios, secreto, verificarPassword, firmarToken, verificarToken } from '../lib/auth.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const secret = secreto();
  if (!secret) return json({ error: 'Falta configurar AUTH_SECRET en las variables de entorno del sitio.' }, 500);

  const lista = usuarios();
  if (!Object.keys(lista).length) {
    return json({ error: 'Falta configurar ADMIN_USERS en las variables de entorno del sitio.' }, 500);
  }

  let body = {};
  try { body = await req.json(); } catch (e) { /* body vacío */ }

  const accion = body.accion || 'login';

  if (accion === 'verificar') {
    const datos = verificarToken(body.token, secret);
    if (!datos) return json({ valido: false }, 401);
    return json({ valido: true, usuario: datos.u });
  }

  const usuario = String(body.usuario || '').trim().toLowerCase();
  const password = String(body.password || '');

  // Pequeña espera para dificultar la fuerza bruta automatizada
  await new Promise((r) => setTimeout(r, 350));

  const almacenado = lista[usuario] || (lista[body.usuario] || null);
  if (!almacenado || !verificarPassword(password, almacenado)) {
    return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
  }

  return json({ ok: true, usuario, token: firmarToken(usuario, secret) });
};
